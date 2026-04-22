import Fastify, { FastifyInstance } from 'fastify';
import pino from 'pino';
import fastifyCookie = require('@fastify/cookie');
import { oauthRoutes } from './routes/oauth';
import { authRoutes } from './routes/auth';
import { sessionRoutes } from './routes/session';
import { webhookRoutes } from './routes/webhooks';
import { billingRoutes } from './routes/billing';
import { adminRoutes } from './routes/admin';

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
  await app.register(authRoutes);
  await app.register(sessionRoutes);
  await app.register(webhookRoutes);
  await app.register(billingRoutes);
  await app.register(adminRoutes, { prefix: '/admin' });

  // Health endpoint internally 
  app.get('/health', async () => ({ status: 'up' }));

  return app;
}
