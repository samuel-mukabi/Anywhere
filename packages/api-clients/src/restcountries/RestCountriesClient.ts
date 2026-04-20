import { request } from 'undici';
import { redisClient } from '@repo/redis/src/client';
import pino from 'pino';
import { z } from 'zod';
import {
  apiCacheEventsTotal,
  recordApiCall,
  type ApiLogContext,
} from '../observability';

const logger = pino({ level: 'info' });

// ---------------------------------------------------------------------------
// Schema Definition
// ---------------------------------------------------------------------------

export const CountryMetaSchema = z.object({
  name: z.object({
    common: z.string(),
    official: z.string(),
  }).passthrough(),
  cca2: z.string(),
  cca3: z.string(),
  flag: z.string(),
  currencies: z.record(
    z.string(), // e.g. "USD"
    z.object({
      name: z.string(),
      symbol: z.string().optional()
    }).passthrough()
  ).optional(),
  languages: z.record(z.string(), z.string()).optional(),
  region: z.string(),
  subregion: z.string().optional(),
  capital: z.array(z.string()).optional(),
  latlng: z.array(z.number()),
  population: z.number()
});

export type CountryMeta = z.infer<typeof CountryMetaSchema>;

// ---------------------------------------------------------------------------
// Client 
// ---------------------------------------------------------------------------

export class RestCountriesClient {
  private baseUrl = 'https://restcountries.com/v3.1';
  // Standard TTL for country data (30 days in seconds)
  private readonly CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

  /**
   * Retrieves specific target fields for a country by its ISO code (Alpha-2 or Alpha-3).
   * Result is comprehensively parsed and evaluated against strict Zod bounds.
   */
  public async getByAlpha2(code: string, context: ApiLogContext = {}): Promise<CountryMeta | null> {
    const alpha2 = code.trim().toUpperCase();
    const redisKey = `country:${alpha2}`;

    try {
      // 1. Transparent caching layer mapped directly to Redis memory
      const cached = await redisClient.get(redisKey);
      if (cached) {
        apiCacheEventsTotal.inc({ api: 'restcountries', event: 'hit' });
        return JSON.parse(cached) as CountryMeta;
      }
      apiCacheEventsTotal.inc({ api: 'restcountries', event: 'miss' });

      // 2. Transact with REST Countries API
      const url = new URL(`${this.baseUrl}/alpha/${alpha2}`);
      // Only request the specific properties strictly required
      url.searchParams.set('fields', 'name,cca2,cca3,flag,currencies,languages,region,subregion,capital,latlng,population');

      const startedAt = Date.now();
      const { statusCode, body } = await request(url.toString(), {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      recordApiCall({
        api: 'restcountries',
        method: 'GET',
        latencyMs: Date.now() - startedAt,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });

      if (statusCode === 404 || statusCode === 400) {
        logger.warn({ code: alpha2 }, 'RestCountries invalid country code');
        return null;
      }

      if (statusCode !== 200) {
        logger.error({ code: alpha2, statusCode }, 'RestCountries returned non-200 status');
        return null;
      }

      const rawJson: unknown = await body.json();
      
      // The API structurally returns an object when filtering via fields on the /alpha endpoint, 
      // but occasionally lists. If it happens to be an array, explicitly unwrap it.
      const rawData = Array.isArray(rawJson) ? rawJson[0] : rawJson;

      // 3. Strict schema validation to guarantee API compliance logically
      const parsedData = CountryMetaSchema.parse(rawData);

      // Buffer into Redis immediately protecting rate limits effectively against heavy lookups 
      await redisClient.setex(redisKey, this.CACHE_TTL_SECONDS, JSON.stringify(parsedData));

      return parsedData;

    } catch (err) {
      recordApiCall({
        api: 'restcountries',
        method: 'GET',
        latencyMs: 0,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
      });
      if (err instanceof z.ZodError) {
         logger.error({ err: err.issues, code: alpha2 }, 'RestCountries response failed schema validation');
      } else {
         logger.error({ err, code: alpha2 }, 'RestCountries request failed');
      }
      return null;
    }
  }

  /**
   * Dynamically fuses native backend IDestination bounds together with the deeply ingested external Country context.
   */
  public async enrichDestination<T extends { iso?: string, countryCode?: string; cca2?: string }>(
    destination: T
  ): Promise<T & { countryMeta?: CountryMeta }> {
     // Prefer explicit alpha-2 fields; fall back to 2-char ISO values.
     const codeToLookup = destination.countryCode || destination.cca2 || (destination.iso?.length === 2 ? destination.iso : undefined);
     
     if (!codeToLookup) {
        logger.warn('Destination missing alpha-2 country code for enrichment');
        return destination as (T & { countryMeta?: CountryMeta });
     }

     const meta = await this.getByAlpha2(codeToLookup);
     
     // Return fully hydrated composite natively mapped
     return {
        ...destination,
        ...(meta ? { countryMeta: meta } : {})
     };
  }

  public async ping(context: ApiLogContext = {}): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    const startedAt = Date.now();
    try {
      const url = new URL(`${this.baseUrl}/alpha/us`);
      url.searchParams.set('fields', 'cca2');
      const { statusCode, body } = await request(url.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const latencyMs = Date.now() - startedAt;
      recordApiCall({
        api: 'restcountries',
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
        api: 'restcountries',
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

/** Pre-instantiated singleton logically tracking caching constraints directly */
export const restCountriesClient = new RestCountriesClient();
