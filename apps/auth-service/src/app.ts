import Fastify, { FastifyInstance } from 'fastify';
import pino from 'pino';
import fastifyCookie from '@fastify/cookie';
import { oauthRoutes } from './routes/oauth';
import { sessionRoutes } from './routes/session';
import { webhookRoutes } from './routes/webhooks';

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
    req.log.info({ req: { method: req.method, url: req.url } }, 'Request received');
  });

  app.addHook('onResponse', async (req, reply) => {
    req.log.info({
      res: { statusCode: reply.statusCode },
      responseTime: reply.elapsedTime,
    }, 'Request completed');
  });

  await app.register(fastifyCookie);

  await app.register(oauthRoutes);
  await app.register(sessionRoutes);
  await app.register(webhookRoutes);

  // Health endpoint internally 
  app.get('/health', async () => ({ status: 'up' }));

  return app;
}
