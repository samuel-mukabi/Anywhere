import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { supabaseAdmin } from '../lib/supabase';
import { issueTokens } from '../lib/jwt';
import { storeRefreshToken } from '../lib/redis';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function authRoutes(app: FastifyInstance) {
  
  app.post('/auth/register', async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = registerSchema.parse(req.body);

    // 1. Check if user exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return reply.code(400).send({ error: 'User already exists' });
    }

    // 2. Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Create user in Supabase
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert([
        { id: crypto.randomUUID(), email, password_hash: passwordHash, tier: 'free' }
      ])
      .select()
      .single();

    if (createError || !newUser) {
      app.log.error(createError, 'Failed to create user');
      return reply.code(500).send({ error: 'Failed to create user' });
    }

    // 4. Issue tokens
    const { accessToken, refreshToken, accessExp } = issueTokens({
      sub: newUser.id,
      email: newUser.email,
      tier: newUser.tier,
    });

    // 5. Store refresh token
    await storeRefreshToken(newUser.id, refreshToken, 2592000);

    // 6. Set cookie (for web)
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 2592000
    });

    // 7. Return everything (for mobile)
    return reply.send({
      user: {
        id: newUser.id,
        email: newUser.email,
        tier: newUser.tier,
      },
      token: accessToken,
      refreshToken,
      expiresAt: accessExp
    });
  });

  app.post('/auth/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const { email, password } = loginSchema.parse(req.body);

    // 1. Find user
    const { data: user, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, tier')
      .eq('email', email)
      .single();

    if (findError || !user || !user.password_hash) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // 3. Issue tokens
    const { accessToken, refreshToken, accessExp } = issueTokens({
      sub: user.id,
      email: user.email,
      tier: user.tier,
    });

    // 4. Store refresh token
    await storeRefreshToken(user.id, refreshToken, 2592000);

    // 5. Set cookie (for web)
    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: 2592000
    });

    // 6. Return everything (for mobile)
    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        tier: user.tier,
      },
      token: accessToken,
      refreshToken,
      expiresAt: accessExp
    });
  });
}
