import Fastify, { FastifyInstance } from 'fastify';
import { searchRoutes } from './routes/search';
import { climateRoutes } from './routes/climate';
import { bookingRoutes } from './routes/booking';
import { affiliateRoutes } from './routes/affiliate';
import { destinationRoutes } from './routes/destinations';
import mongoose from 'mongoose';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
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
  await app.register(climateRoutes, { prefix: '/climate' });
  await app.register(bookingRoutes, { prefix: '/booking' });
  await app.register(affiliateRoutes, { prefix: '/affiliate' });
  await app.register(destinationRoutes, { prefix: '/destinations' });

  // Optional: Connect to MongoDB here, or delay until first use.
  // We'll connect it here to ensure it's ready.
  const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_catalog_dev';
  mongoose.connect(MONGO_URI)
    .then(() => app.log.info('MongoDB natively connected locally'))
    .catch(err => app.log.error({ err }, 'Failed mongoose start'));

  // Internal healthcheck
  app.get('/health', async () => ({ status: 'search_engine_online' }));

  return app;
}
