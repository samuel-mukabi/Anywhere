import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SearchQuerySchema } from '../schema/search';
import { getCachedSearch, cacheRedis } from '../lib/cache';
import { searchQueue } from '../queue/searchQueue';

const airports = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/airports.json'), 'utf8'));

// Valid IATA codes are the values in airports.json (3-letter uppercase)
const knownIATAs = new Set<string>(Object.values(airports));

export async function searchRoutes(app: FastifyInstance) {

  /**
   * INITIATE SEARCH
   * Validates Request -> Checks Cache -> Dispatches Job
   */
  app.post('/', async (req: FastifyRequest, reply: FastifyReply) => {

    // 1. Zod Validation
    const parsed = SearchQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid Payload', details: parsed.error.issues });
    }

    const payload = parsed.data;

    // 2. Resolve and validate departure IATA
    const departureIATA: string = airports[payload.departureRegion] ?? payload.departureRegion;
    if (!knownIATAs.has(departureIATA)) {
      return reply.code(400).send({ error: 'Invalid departure region. Must be a known city or IATA code.' });
    }

    // 3. Deterministic cache hash — includes travelMonth and duration to prevent cross-search cache collisions
    const hashData = JSON.stringify({
      bdgt: payload.budget,
      dpIATA: departureIATA,
      from: payload.dateFrom,
      to: payload.dateTo,
      month: payload.travelMonth ?? null,
      dur: payload.duration,
      vibes: [...payload.vibes].sort(),
    });

    const searchHash = crypto.createHash('sha256').update(hashData).digest('hex');

    // 4. Search-specific rate limiting
    const userId = req.headers['x-user-id']?.toString() || 'anonymous';
    const userTier = req.headers['x-user-tier']?.toString() || 'free';

    app.log.info({ userId, userTier, searchHash }, 'Processing search request');

    const rateLimitKey = `rl:search:${userId}`;
    const limit = userTier === 'pro' ? 30 : 5;

    if (userId !== 'anonymous') {
      const currentCount = await cacheRedis.incr(rateLimitKey);
      if (currentCount === 1) {
        await cacheRedis.expire(rateLimitKey, 3600);
      }
      if (currentCount > limit) {
        const ttl = await cacheRedis.ttl(rateLimitKey);
        return reply.status(429).header('Retry-After', ttl).send({
          error: 'Search rate limit exceeded',
          limit,
          resetInSeconds: ttl
        });
      }
    }

    // 5. Cache short-circuit
    const cachedResponse = await getCachedSearch(searchHash);

    if (cachedResponse) {
       app.log.info({ hash: searchHash }, 'Returning cached results');
       return reply.status(200).send({
          status: 'ready',
          searchId: `cached_${searchHash}`,
          cached: true,
          hash: searchHash,
          results: cachedResponse
       });
    }

    // 6. Dispatch to queue
    try {
      const job = await searchQueue.add('evaluate-destination', {
          hash: searchHash,
          query: { ...payload, departureRegion: departureIATA },
          userTier: (userTier === 'pro' ? 'pro' : 'free') as 'free' | 'pro',
      }, { jobId: searchHash });

      app.log.info({ jobId: job.id }, 'Dispatched to background worker');

      return reply.status(202).send({
         status: 'pending',
         searchId: job.id,
         hash: searchHash
      });
    } catch (err) {
      app.log.error({ err, searchHash }, 'Failed to enqueue search job');
      return reply.status(503).send({ error: 'Search service temporarily unavailable. Please retry.' });
    }
  });

  /**
   * POLL SEARCH STATUS
   */
  app.get('/poll/:jobId', async (req: FastifyRequest<{ Params: { jobId: string }}>, reply: FastifyReply) => {

      const { jobId } = req.params;

      if (jobId.startsWith('cached_')) {
          const hashId = jobId.replace('cached_', '');
          const cachedResponse = await getCachedSearch(hashId);
          return reply.send({ status: 'ready', results: cachedResponse });
      }

      const job = await searchQueue.getJob(jobId);

      if (!job) {
          app.log.warn({ jobId }, 'Job not found during poll');
          return reply.status(404).send({ error: 'Search context missing. Please retry.' });
      }

      const isCompleted = await job.isCompleted();
      const isFailed = await job.isFailed();

      if (isFailed) {
         return reply.status(500).send({ status: 'failed', error: 'Search failed due to a downstream error. Please retry.' });
      }

      if (isCompleted) {
         const cachedResponse = await getCachedSearch(job.data.hash);
         return reply.send({ status: 'ready', results: cachedResponse || job.returnvalue });
      }

      return reply.code(202).send({ status: 'pending', progress: job.progress });
  });

}
