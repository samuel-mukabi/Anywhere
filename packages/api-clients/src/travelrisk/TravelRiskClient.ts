import { request } from 'undici';
import { redisClient } from '@repo/redis/src/client';
import pino from 'pino';
import { z } from 'zod';
import {
  apiCacheEventsTotal,
  recordApiCall,
  type ApiLogContext,
} from '../observability';
import { createRateLimiter } from '../utils/withRateLimit';

// TravelRisk Pro: apply a conservative 20 req/min burst cap
// (Redis 6h cache means live calls only happen on cold misses)
const trkRateLimiter = createRateLimiter({ requestsPerInterval: 20, intervalMs: 60_000 });

const logger = pino({ level: 'info' });

export const TravelRiskScoreSchema = z.object({
  iso_code: z.string(),
  name: z.string(),
  risk_score: z.number(),
  advisory_level: z.number(),
  active_alerts: z.number(),
  calculation: z.object({
    base_score: z.number(),
    alert_impact: z.number(),
    composite: z.number(),
  }),
});

export type TravelRiskScore = z.infer<typeof TravelRiskScoreSchema>;

export class TravelRiskClient {
  private apiKey: string;
  private baseUrl = 'https://travelriskapi.com/api/v1';
  private readonly CACHE_TTL_SECONDS = 21600; // 6 hours

  constructor() {
    this.apiKey = process.env.TRAVEL_RISK_API_KEY || 'demo-key-travel-risk-2026';
  }

  private get headers() {
    return {
      'x-api-key': this.apiKey,
      'Accept': 'application/json',
    };
  }

  public async getRiskScore(isoCode: string, context: ApiLogContext = {}): Promise<TravelRiskScore | null> {
    const alpha3 = isoCode.trim().toUpperCase();
    const redisKey = `travelrisk:${alpha3}`;

    try {
      const cached = await redisClient.get(redisKey);
      if (cached) {
        apiCacheEventsTotal.inc({ api: 'travelrisk', event: 'hit' });
        return JSON.parse(cached) as TravelRiskScore;
      }
      apiCacheEventsTotal.inc({ api: 'travelrisk', event: 'miss' });

      await trkRateLimiter.throttle();

      const url = new URL(`${this.baseUrl}/risk-score/${alpha3}`);
      const startedAt = Date.now();

      const { statusCode, body } = await request(url.toString(), {
        method: 'GET',
        headers: this.headers,
      });

      recordApiCall({
        api: 'travelrisk',
        method: 'GET',
        latencyMs: Date.now() - startedAt,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });

      if (statusCode === 404 || statusCode === 400 || statusCode === 422) {
        logger.warn({ code: alpha3, statusCode }, 'TravelRisk invalid country code or not found');
        return null;
      }

      if (statusCode !== 200) {
        logger.error({ code: alpha3, statusCode }, 'TravelRisk returned non-200 status');
        return null;
      }

      const rawJson: unknown = await body.json();
      const parsedData = TravelRiskScoreSchema.parse(rawJson);

      await redisClient.setex(redisKey, this.CACHE_TTL_SECONDS, JSON.stringify(parsedData));

      return parsedData;
    } catch (err) {
      recordApiCall({
        api: 'travelrisk',
        method: 'GET',
        latencyMs: 0,
        status: 'error',
        cacheHit: false,
        fallbackUsed: true,
        ...context,
      });

      if (err instanceof z.ZodError) {
        logger.error({ err: err.issues, code: alpha3 }, 'TravelRisk response failed schema validation');
      } else {
        logger.error({ err, code: alpha3 }, 'TravelRisk request failed');
      }
      return null;
    }
  }

  public async ping(context: ApiLogContext = {}): Promise<{ status: 'healthy' | 'degraded' | 'down'; latencyMs: number }> {
    const startedAt = Date.now();
    try {
      const url = new URL(`${this.baseUrl}/health`);
      const { statusCode, body } = await request(url.toString(), {
        method: 'GET',
        headers: this.headers,
      });
      const latencyMs = Date.now() - startedAt;
      
      recordApiCall({
        api: 'travelrisk',
        method: 'GET',
        latencyMs,
        status: statusCode,
        cacheHit: false,
        fallbackUsed: false,
        ...context,
      });
      
      await body.dump(); // Consume to avoid socket leak
      
      if (statusCode >= 500) return { status: 'down', latencyMs };
      if (statusCode >= 400) return { status: 'degraded', latencyMs };
      return { status: 'healthy', latencyMs };
    } catch (_error: unknown) {
      const latencyMs = Date.now() - startedAt;
      recordApiCall({
        api: 'travelrisk',
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

export const travelRiskClient = new TravelRiskClient();
