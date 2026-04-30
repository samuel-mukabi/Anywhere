import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';
import { FastifyInstance } from 'fastify';

export const setupRedis = fp(async (fastify: FastifyInstance) => {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('FATAL: REDIS_URL env var is not set. Refusing to start.');

  await fastify.register(fastifyRedis, {
    url,
    connectTimeout: 5000,
    maxRetriesPerRequest: 3,
    enableOfflineQueue: false,
  });

  fastify.redis.on('error', (err) => {
    fastify.log.error({ err }, 'Redis connection error — rate limiting may be degraded');
  });
});
