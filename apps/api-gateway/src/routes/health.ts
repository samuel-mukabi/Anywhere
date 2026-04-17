import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { request } from 'undici';
import { SERVICE_REGISTRY } from '../lib/circuit-breaker';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (req: FastifyRequest, reply: FastifyReply) => {
    
    // 1. Verify Redis
    let redisStatus = 'down';
    try {
      if (fastify.redis.status === 'ready') {
         await fastify.redis.ping();
         redisStatus = 'up';
      }
    } catch (e) {
       req.log.warn('Redis Health check failed');
    }

    // 2. Verify Downstream Microservices
    const downstreamChecks = await Promise.allSettled(
      Object.entries(SERVICE_REGISTRY).map(async ([prefix, urlBase]) => {
         try {
           const res = await request(`${urlBase}/health`, { method: 'GET', headersTimeout: 2000 });
           return { service: prefix, status: res.statusCode === 200 ? 'up' : 'down' };
         } catch {
           return { service: prefix, status: 'down' };
         }
      })
    );

    const dependencies = downstreamChecks.reduce((acc, attempt) => {
       if (attempt.status === 'fulfilled') {
          acc[attempt.value.service] = attempt.value.status;
       }
       return acc;
    }, {} as Record<string, string>);

    // Overall node is healthy if reachable, but may be degraded if dependencies are out.
    // If Redis is down, we are heavily degraded since we can't rate limit or authorize complexly
    const isDegraded = redisStatus === 'down' || Object.values(dependencies).some(s => s === 'down');

    return reply.code(isDegraded ? 207 : 200).send({
      gateway: 'up',
      redis: redisStatus,
      dependencies,
      timestamp: new Date().toISOString(),
    });
  });
}
