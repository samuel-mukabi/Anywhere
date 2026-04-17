import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { issueTokens, verifyAccessToken } from '../lib/jwt';
import { rotateRefreshToken, storeRefreshToken, blacklistAccessToken } from '../lib/redis';

export async function sessionRoutes(app: FastifyInstance) {

  /**
   * REFRESH TOKEN (Rotation)
   * The client hits this endpoints when their 15m access token is dead.
   * We expect the `refresh_token` httpOnly cookie.
   */
  app.post('/auth/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    // We expect the original JWT payload's sub so we know WHICH user's list to check the refresh against
    // This allows O(1) Redis lookups without full table scans
    const { userId } = req.body as { userId?: string };
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken || !userId) {
      return reply.code(401).send({ error: 'Missing token or identifier' });
    }

    // 1. Verify and violently Rotate the Refresh Token
    // If rotateRefreshToken resolves false, the token is dead, missing or stolen!
    const valid = await rotateRefreshToken(userId, refreshToken);
    if (!valid) {
      app.log.warn({ userId }, 'Attempted to use invalid or recycled Refresh Token');
      return reply.code(403).send({ error: 'Invalid Refresh Token' });
    }

    // 2. The token was valid! Let's lookup their current exact Tier in the DB
    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('email, tier')
      .eq('id', userId)
      .single();

    if (error || !dbUser) {
      return reply.code(404).send({ error: 'User missing from Database' });
    }

    // 3. Re-issue fresh Access and rotating Refresh tokens
    const { accessToken, refreshToken: newRefresh, accessExp } = issueTokens({
      sub: userId,
      email: dbUser.email,
      tier: dbUser.tier, // Syncs Stripe Subscription upgrades dynamically right here!
    });

    // 4. Save new refresh hash explicitly into Redis mapping
    await storeRefreshToken(userId, newRefresh, 2592000);

    reply.setCookie('refresh_token', newRefresh, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 2592000
    });

    return reply.send({ accessToken, expiresAt: accessExp });
  });

  /**
   * SECURE LOGOUT (Blacklist Access & Kill Refresh)
   */
  app.post('/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    // Require standard HTTP Bearer to prove who is logging out
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing Access Token' });
    }

    const token = authHeader.split(' ')[1];
    const refreshToken = req.cookies.refresh_token;

    try {
      // Decode Access Token safely to evaluate its JTI and expiry
      const payload = verifyAccessToken(token);

      // We only need to securely blacklist the token for the seconds remaining
      // in its natural lifespan.
      const nowEpoch = Math.floor(Date.now() / 1000);
      const remainingLifetimeSeconds = payload.exp! - nowEpoch;

      if (remainingLifetimeSeconds > 0) {
        await blacklistAccessToken(payload.jti, remainingLifetimeSeconds);
      }

      // Rotate/kill the existing refresh token aggressively
      if (refreshToken) {
        await rotateRefreshToken(payload.sub, refreshToken);
      }

      // Clear the cookie header natively on the browser
      reply.clearCookie('refresh_token', { path: '/auth' });

      return reply.send({ success: true, message: 'Safely logged out globally.' });
    } catch (e) {
      // If verifying the token throws, it was already expired or invalid.
      // Easiest is just tracking if a refresh token was supplied and blowing it up anyway.
      if (refreshToken) {
        app.log.info('Blindly attempting to kill cookie-provided refresh token');
        
        reply.clearCookie('refresh_token', { path: '/auth' });
      }

      return reply.code(401).send({ error: 'Cannot safely logout. Token invalid.'});
    }
  });

}
