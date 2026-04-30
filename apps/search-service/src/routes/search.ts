import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { SearchQuerySchema } from '../schema/search';
import { getCachedSearch, cacheRedis } from '../lib/cache';
import { searchQueue } from '../queue/searchQueue';

const airports = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/airports.json'), 'utf8'));

export async function searchRoutes(app: FastifyInstance) {

  /**
   * INITIATE SEARCH
   * Validates Request -> Checks Cache -> Dispatches Job
   */
  app.post('/', async (req: FastifyRequest, reply: FastifyReply) => {
    
    // 1. Zod Validation Engine
    const parsed = SearchQuerySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid Payload', details: parsed.error.issues });
    }

    const payload = parsed.data;

    // Resolve IATA
    const departureIATA = airports[payload.departureRegion] || payload.departureRegion;
    // Update payload or pass it separately to hash

    // 2. Deterministic Request Hashing (Used as strict Cache Key AND Job Dedup strategy)
    const hashData = JSON.stringify({
      bdgt: payload.budget,
      dpIATA: departureIATA,
      from: payload.dateFrom,
      to: payload.dateTo,
      vibes: payload.vibes.sort() // Sort prevents Array order bypassing cache keys
    });
    
    const searchHash = crypto.createHash('sha256').update(hashData).digest('hex');

    // 2.5. Search-Specific Rate Limiting
    const userId = req.headers['x-user-id']?.toString() || 'anonymous';
    const userTier = req.headers['x-user-tier']?.toString() || 'free';
    
    app.log.info({ userId, userTier, searchHash }, 'Processing search request with identity');

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

    // 3. Cache Short-Circuit Evaluation
    const cachedResponse = await getCachedSearch(searchHash);
    
    if (cachedResponse) {
       app.log.info({ hash: searchHash }, 'Returning instantaneous cached algorithm results');
       return reply.status(200).send({
          status: 'ready',
          searchId: `cached_${searchHash}`,
          cached: true,
          hash: searchHash,
          results: cachedResponse
       });
    }

    // 4. Dispatch Async Queue processing
    // Uses searchHash as Job ID ensuring 10 simultaneous identical clicks don't DDOS downstream API targets
    const job = await searchQueue.add('evaluate-destination', {
        hash: searchHash,
        query: { ...payload, departureRegion: departureIATA },
        userTier: (userTier === 'pro' ? 'pro' : 'free') as 'free' | 'pro',
    }, { jobId: searchHash });

    app.log.info({ jobId: job.id }, 'Dispatched algorithm analysis strictly to background worker');

    // Respond immediately asking the frontend UI to activate its Loading animations
    // and begin polling the subsequent route.
    return reply.status(202).send({
       status: 'pending',
       searchId: job.id,
       hash: searchHash
    });
  });

  /**
   * POLL SEARCH STATUS
   * Designed to be checked safely heavily by users waiting for results
   */
  app.get('/poll/:jobId', async (req: FastifyRequest<{ Params: { jobId: string }}>, reply: FastifyReply) => {
      
      const { jobId } = req.params;

      // Handle simple cache bypasses seamlessly preventing polling infinite loops
      if (jobId.startsWith('cached_')) {
          const hashId = jobId.replace('cached_', '');
          const cachedResponse = await getCachedSearch(hashId);
          return reply.send({ status: 'ready', results: cachedResponse });
      }

      const job = await searchQueue.getJob(jobId);

      if (!job) {
          app.log.warn({ jobId }, 'Polling dropped - Failed to locate tracking Job internally');
          return reply.status(404).send({ error: 'Search Context Missing. Please retry.' });
      }

      const isCompleted = await job.isCompleted();
      const isFailed = await job.isFailed();

      if (isFailed) {
         return reply.status(200).send({ status: 'failed', error: 'Search Algorithm Engine failed processing due to downstream timeouts.' });
      }

      if (isCompleted) {
         // Because our queue natively saves final states back into cache, we can easily locate it 
         // without storing heavy JSON binaries deeply within the queue architecture natively.
         const cachedResponse = await getCachedSearch(job.data.hash);
         return reply.send({ status: 'ready', results: cachedResponse || job.returnvalue });
      }

      // 409 Conflict logic pattern indicates "Still building, wait" natively
      return reply.code(200).send({ status: 'pending', progress: job.progress });
  });

}
