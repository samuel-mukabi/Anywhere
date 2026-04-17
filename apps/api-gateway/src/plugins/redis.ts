import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';
import { FastifyInstance } from 'fastify';

/**
 * Global Redis Connection Plugin
 * ==============================
 * Centralised connection pool using ioredis under the hood.
 * Used by Rate Limiter.
 */
export const setupRedis = fp(async (fastify: FastifyInstance) => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  
  await fastify.register(fastifyRedis, {
    url,
    // Add additional production options e.g. connectTimeout, maxRetriesPerRequest
  });
});
