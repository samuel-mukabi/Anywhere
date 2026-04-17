import Fastify, { FastifyInstance } from 'fastify';
import pino from 'pino';
import { setupJwtPlugin } from './plugins/jwt';
import { setupRateLimit } from './plugins/rate-limit';
import { healthRoutes } from './routes/health';
import { proxyRoutes } from './routes/proxy';
import { setupRedis } from './plugins/redis';

export async function buildApp(): Promise<FastifyInstance> {
  // Configure root logger with transport for production/development
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' 
      ? { target: 'pino-pretty', options: { colorize: true } } 
      : undefined,
  });

  const app = Fastify({
    logger,
    disableRequestLogging: true, // We'll handle custom request logging
  });

  // Custom Request/Response Logging
  app.addHook('onRequest', async (req) => {
    req.log.info({ req: { method: req.method, url: req.url, id: req.id } }, 'Request received');
  });

  app.addHook('onResponse', async (req, reply) => {
    req.log.info({
      res: {
        statusCode: reply.statusCode,
      },
      responseTime: reply.elapsedTime,
    }, 'Request completed');
  });

  // 1. Setup Redis (Used by Rate Limiter)
  await app.register(setupRedis);

  // 2. Register JWT Authentication (extracts `req.user` & `tier`)
  await app.register(setupJwtPlugin);

  // 3. Register Rate Limiting
  await app.register(setupRateLimit);

  // 4. Register Health Routes
  await app.register(healthRoutes);

  // 5. Register Proxy wildcard routes
  await app.register(proxyRoutes);

  return app;
}
