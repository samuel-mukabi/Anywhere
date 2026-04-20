import { request } from 'undici';
import { redisClient } from '@repo/redis/src/client';
import pino from 'pino';
import {
  apiCacheEventsTotal,
  recordApiCall,
  type ApiLogContext,
} from '../observability';
import { createRateLimiter } from '../utils/withRateLimit';

const logger = pino({ level: 'info' });

export interface GeoCityResult {
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  population: number;
  timezone: string;
}

interface GeoDbSearchResponse {
  data: GeoCityResult[];
}

// GeoDB free tier: ~1,000 requests/day. We budget 900 to leave headroom.
// Rate limiter is module-level so all GeoDBClient instances share the same bucket.
const geoDbRateLimiter = createRateLimiter({
  requestsPerInterval: 900,
  intervalMs: 24 * 60 * 60 * 1000, // 24 hours
});

export class GeoDBClient {
  private baseUrl = 'https://geodb-free-service.wirefreethought.com/v1';

  // 90 days — results are stable (city coordinates don't change)
  private CACHE_TTL_SECONDS = 90 * 24 * 60 * 60;

  constructor() {}

  /**
   * Search City strictly bound via Country limits extracting exactly mapping standard coordinates dynamically safely.
   */
  public async searchCity(name: string, countryCode: string, context: ApiLogContext = {}): Promise<GeoCityResult | null> {
      // Normalize aggressively bypassing caching misses dynamically 
      const cleanName = name.trim().toLowerCase();
      const cleanCode = countryCode.trim().toLowerCase();
      
      const redisKey = `geodb:${cleanName}:${cleanCode}`;

      try {
          // 1. Memory Look aside cleanly mapping local state bypassing expensive RapidAPI checks strictly
          const cached = await redisClient.get(redisKey);
          if (cached) {
            apiCacheEventsTotal.inc({ api: 'geodb', event: 'hit' });
            return JSON.parse(cached) as GeoCityResult;
          }
          apiCacheEventsTotal.inc({ api: 'geodb', event: 'miss' });

          // Enforce daily rate limit before making a live API call
          if (geoDbRateLimiter.isThrottled()) {
            logger.warn({ name, countryCode }, 'GeoDBClient rate limit reached — skipping live call, returning null');
            return null;
          }
          await geoDbRateLimiter.throttle();

          // 2. Live API request
          const url = new URL(`${this.baseUrl}/geo/cities`);
          url.searchParams.set('namePrefix', cleanName);
          url.searchParams.set('countryIds', countryCode.toUpperCase());
          url.searchParams.set('minPopulation', '50000');
          url.searchParams.set('limit', '1');

          const startedAt = Date.now();
          const { statusCode, body } = await request(url.toString(), {
              method: 'GET',
              headers: {
                  'Accept': 'application/json'
              }
          });
          recordApiCall({
            api: 'geodb',
            method: 'GET',
            latencyMs: Date.now() - startedAt,
            status: statusCode,
            cacheHit: false,
            fallbackUsed: false,
            ...context,
          });

          if (statusCode === 429) {
             logger.fatal('RapidAPI Limit Structurally Breached. Terminate seed locally actively blocking IP.');
             return null;
          }

          if (statusCode !== 200) {
             logger.error({ statusCode }, 'Unexpected Response entirely explicitly blocking resolution sequence.');
             return null;
          }
          
          const raw = (await body.json()) as GeoDbSearchResponse;

          if (!raw || !raw.data || raw.data.length === 0) {
             logger.warn({ name, countryCode }, 'GeoDB explicitly returned empty matches logically avoiding coordinates');
             return null;
          }

          const target = raw.data[0];

          const mapped: GeoCityResult = {
             name: target.name,
             countryCode: target.countryCode,
             latitude: target.latitude,
             longitude: target.longitude,
             population: target.population,
             timezone: target.timezone
          };

          await redisClient.setex(redisKey, this.CACHE_TTL_SECONDS, JSON.stringify(mapped));
          
          return mapped;

      } catch (err) {
         recordApiCall({
          api: 'geodb',
          method: 'GET',
          latencyMs: 0,
          status: 'error',
          cacheHit: false,
          fallbackUsed: true,
          ...context,
         });
         logger.error({ err, name, countryCode }, 'GeoDBClient mapping sequence collapsed tracking dependencies.');
         return null;
      }
  }

  public async ping(context: ApiLogContext = {}): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    const startedAt = Date.now();
    try {
      const url = new URL(`${this.baseUrl}/geo/cities`);
      url.searchParams.set('namePrefix', 'london');
      url.searchParams.set('countryIds', 'GB');
      url.searchParams.set('limit', '1');
      const { statusCode, body } = await request(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });
      const latencyMs = Date.now() - startedAt;
      recordApiCall({
        api: 'geodb',
        method: 'GET',
        latencyMs,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });
      await body.dump(); // consume to avoid socket leak
      if (statusCode >= 500) return { status: 'down', latencyMs };
      if (statusCode >= 400) return { status: 'degraded', latencyMs };
      return { status: 'healthy', latencyMs };
    } catch (_error: unknown) {
      const latencyMs = Date.now() - startedAt;
      recordApiCall({
        api: 'geodb',
        method: 'GET',
        latencyMs,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
      });
      return { status: 'down', latencyMs };
    }
  }
}
