import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface JwtPayload {
  sub: string; // The user ID
  tier?: 'free' | 'pro';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    tier: 'free' | 'pro';
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * JWT Authentication Plugin
 * =========================
 * Processes Supabase (or any provider) JWT tokens.
 * Extracts user ID and the pricing 'tier' from the token.
 */
export const setupJwtPlugin = fp(async (fastify: FastifyInstance) => {
  // Uses Doppler-provided JWT_SECRET
  const secret = process.env.JWT_SECRET || 'super-secret-default-string-development';

  await fastify.register(fastifyJwt, {
    secret,
  });

  // Provide an authenticate decorator that extracts the tokens and validates them
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Decode and verify the JWT header
      const decoded = await request.jwtVerify<JwtPayload>();
      
      // Default to "free" tier if unspecified 
      request.tier = decoded.tier || 'free';
      request.user = decoded;
    } catch (err) {
      // If token is missing or invalid, we treat them as 'free' anonymous users
      // For a public-facing API Gateway, we pass them through. If a route requires
      // strict auth, the downstream service or a strict endpoint policy can block it.
      request.user = { sub: 'anonymous' };
      request.tier = 'free';
    }
  });

  // Automatically execute our authentication extraction on every request
  // so `rate-limit` has access to `request.tier` during its evaluate phase.
  fastify.addHook('onRequest', fastify.authenticate);
});
