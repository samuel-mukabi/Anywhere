import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2';
import { syncOAuthUser } from '../lib/supabase';
import { issueTokens } from '../lib/jwt';
import { storeRefreshToken } from '../lib/redis';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
    appleOAuth2: OAuth2Namespace;
  }
}

export async function oauthRoutes(app: FastifyInstance) {
  
  // --------------------------------------------------------
  // GOOGLE OAUTH
  // --------------------------------------------------------
  await app.register(oauthPlugin, {
    name: 'googleOAuth2',
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID || 'dummy-google-id',
        secret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-google-secret',
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION,
    },
    // The start redirect URL
    startRedirectPath: '/auth/google',
    // Where google redirects BACK to
    callbackUri: `${process.env.API_URL || 'http://localhost:8003'}/auth/google/callback`,
    scope: ['profile', 'email'],
  });

  app.get('/auth/google/callback', async (req: FastifyRequest, reply: FastifyReply) => {
    // 1. Get the Google access token
    const { token } = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
    
    // 2. Fetch User Profile from Google
    const userinfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    }).then(res => res.json());

    if (!userinfo.email) {
      return reply.code(400).send({ error: 'OAuth failed, missing email.' });
    }

    // 3. Sync Profile to Supabase using Admin wrapper
    const userParams = await syncOAuthUser(userinfo.email, `google|${userinfo.id}`);

    // 4. Issue Anywhere internal JWTs
    const { accessToken, refreshToken, accessExp } = issueTokens({
      sub: userParams.id, // Supabase internal PK
      email: userParams.email,
      tier: userParams.tier, 
    });

    // 5. Store the Refresh Token in Redis safely mapped to User ID (30 Days = 2592000s)
    await storeRefreshToken(userParams.id, refreshToken, 2592000);

    // 6. Respond securely with Access Token inline, and Refresh Token in HTTP-only Cookie
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 2592000 // 30 Days
    });

    // Redirect to frontend with Access Token (Or standard JSON reply depending on Web Client architecture)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return reply.redirect(`${frontendUrl}/login?access_token=${accessToken}&expires_at=${accessExp}`);
  });

  // --------------------------------------------------------
  // APPLE OAUTH (Similar architecture)
  // --------------------------------------------------------
  await app.register(oauthPlugin, {
    name: 'appleOAuth2',
    credentials: {
      client: {
        id: process.env.APPLE_CLIENT_ID || 'dummy-apple-id',
        secret: process.env.APPLE_CLIENT_SECRET || 'dummy-apple-secret',
      },
      auth: oauthPlugin.APPLE_CONFIGURATION,
    },
    startRedirectPath: '/auth/apple',
    callbackUri: `${process.env.API_URL || 'http://localhost:8003'}/auth/apple/callback`,
    scope: ['name', 'email'],
  });

  // Apple sends user info differently in callback, but the core token + sync logic aligns exactly
  // with Google above for token issuance.
}
