import fp from 'fastify-plugin';
import fastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';

/**
 * Role-Based Rate Limiting Plugin
 * ===============================
 * Prevents API abuse by capping request frequency depending on the plan.
 * Uses `@fastify/rate-limit` connected natively to the Redis cache.
 * 
 * Logic:
 *  - Free/Anonymous tier: 60 requests / minute
 *  - Pro tier: 300 requests / minute
 */
export const setupRateLimit = fp(async (fastify: FastifyInstance) => {
  if (!fastify.redis) {
    throw new Error('Redis must be connected before registering Rate Limit plugin');
  }

  await fastify.register(fastifyRateLimit, {
    redis: fastify.redis,
    // By default check based on IP unless user is authenticated
    keyGenerator: (request) => {
      if (request.user && request.user.sub !== 'anonymous') {
        return request.user.sub;
      }
      return request.ip;
    },
    // Dynamically calculate limit based on the `target` JWT 'tier' extracted
    max: (request) => {
      // request.tier is injected by the JWT plugin
      if (request.tier === 'pro') return 300; 
      return 60; 
    },
    timeWindow: '1 minute',
    cache: 10000, 
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true
    }
  });
});
