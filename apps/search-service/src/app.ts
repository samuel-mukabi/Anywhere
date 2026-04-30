import Fastify, { FastifyInstance } from 'fastify';
import { searchRoutes } from './routes/search';
import { climateRoutes } from './routes/climate';
import { bookingRoutes } from './routes/booking';
import { affiliateRoutes } from './routes/affiliate';
import { destinationRoutes } from './routes/destinations';
import mongoose from 'mongoose';
import {
  DuffelClient,
  OpenMeteoClient,
  RestCountriesClient,
  TravelPayoutsClient,
  travelRiskClient,
  getMetricsContentType,
  getMetricsText,
} from '@anywhere/api-clients';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    disableRequestLogging: true,
    ignoreTrailingSlash: true,
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

  if (process.env.NODE_ENV !== 'test') {
    const MONGO_URI = process.env.MONGODB_URI;
    if (!MONGO_URI) throw new Error('FATAL: MONGODB_URI env var is not set. Refusing to start.');
    await mongoose.connect(MONGO_URI);
    app.log.info('MongoDB connected');
  }

  // Internal healthcheck
  app.get('/health', async () => ({ status: 'search_engine_online' }));

  app.get('/metrics', async (_req, reply) => {
    reply.header('Content-Type', getMetricsContentType());
    return reply.send(await getMetricsText());
  });

  app.get('/health/apis', async (req, reply) => {
    const context = {
      userId: req.headers['x-user-id']?.toString(),
      searchId: req.headers['x-search-id']?.toString(),
    };

    const travelPayouts = new TravelPayoutsClient(process.env.TRAVELPAYOUTS_TOKEN || '');
    const duffel = new DuffelClient(
      process.env.DUFFEL_TEST_TOKEN || '', 
      process.env.DUFFEL_LIVE_TOKEN || ''
    );
    const restCountries = new RestCountriesClient();
    const openMeteo = new OpenMeteoClient();

    const checks = await Promise.all([
      travelPayouts.ping(context).then((result) => ({ api: 'travelpayouts', ...result })),
      duffel.ping(context).then((result) => ({ api: 'duffel', ...result })),
      restCountries.ping(context).then((result) => ({ api: 'restcountries', ...result })),
      openMeteo.ping(context).then((result) => ({ api: 'openmeteo', ...result })),
      travelRiskClient.ping(context).then((result) => ({ api: 'travelrisk', ...result })),
    ]);

    const overallDown = checks.some((item) => item.status === 'down');
    const overallDegraded = checks.some((item) => item.status === 'degraded');
    reply.code(overallDown ? 503 : (overallDegraded ? 207 : 200));
    return {
      status: overallDown ? 'down' : (overallDegraded ? 'degraded' : 'healthy'),
      apis: checks,
    };
  });

  return app;
}
