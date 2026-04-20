import pino from 'pino';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

export interface ApiLogContext {
  userId?: string;
  searchId?: string;
}

export interface ApiCallLogOptions extends ApiLogContext {
  api: string;
  method: string;
  status: string | number;
  latencyMs: number;
  cacheHit?: boolean;
  fallbackUsed?: boolean;
}

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const register = new Registry();
collectDefaultMetrics({ register });

export const apiCallsTotal = new Counter({
  name: 'api_calls_total',
  help: 'Total external API calls grouped by api/status',
  labelNames: ['api', 'status'] as const,
  registers: [register],
});

export const apiLatencyMs = new Histogram({
  name: 'api_latency_ms',
  help: 'External API latency in milliseconds grouped by api',
  labelNames: ['api'] as const,
  buckets: [25, 50, 100, 200, 400, 800, 1500, 3000, 5000, 10000],
  registers: [register],
});

export const apiCacheEventsTotal = new Counter({
  name: 'api_cache_events_total',
  help: 'Cache usage for external API-backed reads',
  labelNames: ['api', 'event'] as const,
  registers: [register],
});

export const apiFallbackEventsTotal = new Counter({
  name: 'api_fallback_events_total',
  help: 'Fallback path activations for external APIs',
  labelNames: ['api'] as const,
  registers: [register],
});

export function recordApiCall(options: ApiCallLogOptions): void {
  const {
    api,
    method,
    status,
    latencyMs,
    cacheHit = false,
    fallbackUsed = false,
    userId,
    searchId,
  } = options;

  const statusLabel = String(status);
  apiCallsTotal.inc({ api, status: statusLabel });
  apiLatencyMs.observe({ api }, latencyMs);

  if (cacheHit) {
    apiCacheEventsTotal.inc({ api, event: 'hit' });
  } else {
    apiCacheEventsTotal.inc({ api, event: 'miss' });
  }

  if (fallbackUsed) {
    apiFallbackEventsTotal.inc({ api });
  }

  logger.info(
    {
      api,
      method,
      latencyMs,
      status: statusLabel,
      cacheHit,
      fallbackUsed,
      userId,
      searchId,
    },
    'external_api_call',
  );
}

export async function getMetricsText(): Promise<string> {
  return register.metrics();
}

export function getMetricsContentType(): string {
  return register.contentType;
}
