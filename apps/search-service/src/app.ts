import Fastify, { FastifyInstance } from 'fastify';
import pino from 'pino';
import { searchRoutes } from './routes/search';

export async function buildApp(): Promise<FastifyInstance> {
  const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV !== 'production' 
      ? { target: 'pino-pretty', options: { colorize: true } } 
      : undefined,
  });

  const app = Fastify({
    logger,
    disableRequestLogging: true,
  });

  app.addHook('onRequest', async (req) => {
    req.log.info({ req: { method: req.method, url: req.url } }, 'Search API request received');
  });

  app.addHook('onResponse', async (req, reply) => {
    req.log.info({ res: { statusCode: reply.statusCode }, responseTime: reply.elapsedTime }, 'Search API request completed');
  });

  // Attach search routes
  await app.register(searchRoutes, { prefix: '/search' });

  // Internal healthcheck
  app.get('/health', async () => ({ status: 'search_engine_online' }));

  return app;
}
