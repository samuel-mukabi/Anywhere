# ADR-004: Redis (Upstash) for Caching + BullMQ for Background Job Queues

| Field       | Value                              |
| ----------- | ---------------------------------- |
| **Status**  | Accepted                           |
| **Date**    | 2026-04-17                         |
| **Deciders**| Engineering Team                   |
| **Tags**    | caching, redis, bullmq, background-jobs |

---

## Context

As documented in `PROJECT.md`, the **central scalability challenge** for Anywhere is not web traffic volume — it is **external API cost**. Every uncached search potentially hits:

- **Amadeus / Skyscanner**: billed per call; rate-limited (see ADR-006 for limits)
- **Numbeo**: strict daily limits; pre-fetch strategy required
- **OpenWeatherMap**: tier-limited; climate data changes daily at most

Redis is the primary mechanism for making these external API calls economically viable at scale. The architectural statement from `PROJECT.md` is exact:

> "Your 10,000th user searching '€500 budget, next month' hits Redis, not Amadeus."

Separately, several operations must be **decoupled from the request/response cycle**:
- Nightly Numbeo pre-fetch (background worker)
- Affiliate commission reconciliation (delayed processing)
- Group trip expiry cleanup (scheduled job)
- Email / push notifications (async, failure-tolerant)

---

## Decision

### Cache Layer: Upstash Redis

**Why Upstash over a self-hosted Redis or ElastiCache?**

| Criterion | Upstash | Self-Hosted Redis | ElastiCache |
|-----------|---------|------------------|-------------|
| Ops burden | Zero (serverless) | High | Medium |
| Pricing model | Per-request ($0.20/100K) | Instance hours | Instance hours |
| Cold-start latency | ~1ms (global edge replicas) | None (always-on) | None (always-on) |
| Connection pooling | HTTP/REST — no persistent connection needed | Required | Required |

At early stage, Upstash's per-request pricing is cheaper than a $50/month Redis instance that runs idle. We switch to ElastiCache or Upstash Pro when sustained throughput makes per-request pricing more expensive.

#### Cache Key Strategy

Cache keys are deterministic hashes of the query parameters. This is the single most important design decision for cache hit rate.

```ts
// packages/types/src/cache.ts
export function flightSearchCacheKey(params: {
  originRegion: string;   // NOT specific airport — grouped by region for higher hit rate
  destination: string;    // IATA code
  dateRange: string;      // ISO week, e.g., "2025-W42"
  tier: 'free' | 'pro';
}): string {
  // Example: "fs:SSA:BKK:2025-W42:free"
  return `fs:${params.originRegion}:${params.destination}:${params.dateRange}:${params.tier}`;
}
```

> **Key design choice**: `originRegion` (e.g., `SSA` = Sub-Saharan Africa) is used instead of the exact origin airport. This dramatically increases cache hit rate at the cost of slight price imprecision (±5%). Acceptable for discovery; actual booking hits the live API.

#### TTL Policy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Flight price snapshots | `900s` (15 min) | Prices change frequently; 15 min is the SLA agreed with Amadeus docs |
| Hotel price ranges | `1800s` (30 min) | Less volatile than flights |
| Cost-of-Living index | `86400s` (24 h) | Numbeo hourly data is unnecessary; daily pre-fetch is sufficient |
| Climate data | `86400s` (24 h) | Weather patterns change daily at most |
| User tier lookup | `300s` (5 min) | Avoid DB hit on every request; 5 min is acceptable stale window |
| Search result page | `60s` (1 min) | Protect against burst traffic on viral shares |

#### Cache Aside Pattern

```ts
// apps/api/src/services/search/priceCache.ts
import { redis } from '@/lib/redis';

export async function getCachedFlightPrice(key: string) {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached);
  return null;
}

export async function setCachedFlightPrice(
  key: string,
  data: FlightPriceResult,
  ttlSeconds = 900
) {
  await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
}
```

#### Session Storage

Redis also stores WebSocket room state for the Group Trip Sync service:

```ts
// Key: "room:{roomCode}" → JSON blob of participants + consensus budget
// TTL: 7 days (rooms expire if inactive)
await redis.set(`room:${roomCode}`, JSON.stringify(roomState), { ex: 604800 });
```

---

### Job Queue Layer: BullMQ

**Why BullMQ over alternatives?**

| | BullMQ | Agenda (MongoDB) | Inngest | AWS SQS |
|--|--------|-----------------|---------|---------|
| Backed by Redis | ✅ | ❌ | ❌ | ❌ |
| Rate limiting built-in | ✅ | ❌ | ✅ | ❌ |
| Repeatable scheduled jobs | ✅ | ✅ | ✅ | ❌ |
| Priority queues | ✅ | ❌ | ❌ | ❌ |
| TypeScript-native | ✅ | Partial | ✅ | Partial |

BullMQ uses Redis as its backing store (same Upstash instance) — reducing infrastructure components.

#### Queue Definitions

```ts
// apps/api/src/queues/index.ts
import { Queue, Worker } from 'bullmq';
import { redis } from '@/lib/redis';

// Queue 1: Nightly data pre-fetch (scheduled)
export const prefetchQueue = new Queue('data-prefetch', { connection: redis });

// Queue 2: Notifications (high priority, retry on failure)
export const notificationQueue = new Queue('notifications', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});

// Queue 3: Affiliate commission reconciliation (delayed)
export const affiliateQueue = new Queue('affiliate-reconcile', {
  connection: redis,
  defaultJobOptions: {
    delay: 60_000, // Process 60s after booking to wait for provider confirmation
    attempts: 5,
  },
});

// Queue 4: Trip room cleanup (low priority, scheduled)
export const cleanupQueue = new Queue('trip-cleanup', { connection: redis });
```

#### Repeatable Jobs (Cron)

```ts
// Nightly Numbeo pre-fetch at 02:00 UTC
await prefetchQueue.add(
  'numbeo-cost-of-living',
  { destinations: 'all' },
  { repeat: { pattern: '0 2 * * *' } }
);

// Hourly climate snapshot
await prefetchQueue.add(
  'openweather-snapshot',
  { regions: 'all' },
  { repeat: { pattern: '0 * * * *' } }
);

// Daily trip room cleanup (expire rooms older than 7 days)
await cleanupQueue.add(
  'expire-old-rooms',
  {},
  { repeat: { pattern: '0 3 * * *' } }
);
```

#### Worker Example

```ts
// apps/api/src/workers/prefetch.worker.ts
import { Worker } from 'bullmq';
import { fetchNumbeoData } from '@/integrations/numbeo';
import { setCachedFlightPrice } from '@/services/search/priceCache';
import { redis } from '@/lib/redis';

new Worker('data-prefetch', async (job) => {
  if (job.name === 'numbeo-cost-of-living') {
    const destinations = await getActiveDestinations();
    for (const dest of destinations) {
      const data = await fetchNumbeoData(dest.slug);
      await redis.set(`col:${dest.slug}`, JSON.stringify(data), { ex: 86400 });
    }
  }
}, { connection: redis, concurrency: 5 });
```

---

## Alternatives Considered

### Option A: In-Memory Cache (Node.js `Map` or `node-cache`)
- **Rejected**: State is not shared across multiple service instances. Unacceptable in a horizontally-scaled microservice architecture.

### Option B: Memcached
- **Rejected**: No support for data structures needed for WebSocket room state (hashes, lists). No native pub/sub for cache invalidation.

### Option C: Kafka for Job Queues (in addition to events)
- **Considered**: Kafka is appropriate for high-throughput event streaming (booking events, analytics). Using it as a job queue (retry semantics, delayed jobs, priority) adds consumer group complexity. BullMQ handles job queue semantics natively; Kafka handles event streaming. Both can coexist.

### Option D: Vercel KV (serverless Redis)
- **Rejected**: Tied to Vercel deployment. Upstash is deployment-agnostic and usable from any runtime (Node.js, edge, serverless).

---

## Consequences

### Positive
- Single Redis instance (Upstash) powers caching, session storage, WebSocket room state, and BullMQ queues — minimal infrastructure surface.
- BullMQ's `concurrency` and `rate-limiter` options give fine-grained control over how aggressively we hit external APIs in background workers.
- Pre-fetching Numbeo and climate data means these endpoints are never on the critical path for a user request.

### Negative
- Upstash has a **256KB per-value limit** on the free tier. Large flight search results (many destinations) may need to be chunked or compressed (`zlib`) before caching.
- BullMQ + Upstash requires HTTP-based `@upstash/redis` adapter (not native IORedis TCP connection). The `ioredis`-compatible adapter `@upstash/redis` supports BullMQ from v3+.
- If Redis goes down, BullMQ workers cannot process jobs. Implement dead-letter queues (BullMQ `failedQueue`) for critical jobs (affiliate reconciliation).

---

## References
- [Upstash Redis Documentation](https://upstash.com/docs/redis)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [BullMQ + Upstash Compatibility](https://docs.bullmq.io/guide/connections)
- [PROJECT.md — Caching Layer](../../PROJECT.md)
