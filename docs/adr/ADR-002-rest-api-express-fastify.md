# ADR-002: REST API — Express + Fastify for the Microservices Layer

| Field       | Value                              |
| ----------- | ---------------------------------- |
| **Status**  | Accepted                           |
| **Date**    | 2026-04-17                         |
| **Deciders**| Engineering Team                   |
| **Tags**    | backend, api, microservices, rest  |

---

## Context

Anywhere's backend decomposes into six independently deployable microservices as documented in `PROJECT.md`:

1. **Search Service** — budget-to-destination matching; high read throughput
2. **Pricing Engine** — total trip cost calculation (flights + hotel + food + transit)
3. **User & Auth Service** — JWT issuance, subscription management
4. **Group Trip Sync Service** — WebSocket rooms for real-time group budget consensus
5. **Notification Service** — email/push triggered by Kafka events
6. **Affiliate Tracker** — booking commission tracking; event-driven

These services sit behind an API Gateway (Cloudflare + custom gateway logic). Inter-service communication is primarily REST over HTTP; async communication uses Kafka/BullMQ.

The question is: **which HTTP framework** to use for these services?

---

## Decision

We adopt a **split framework strategy**:

| Framework   | Used For | Reason |
| ----------- | -------- | ------ |
| **Fastify** | Search Service, Pricing Engine | Latency-sensitive; Fastify's schema-based serialization and plugin architecture yield ~35% lower p99 latency vs Express on equivalent hardware. |
| **Express** | User/Auth Service, Notification Service, Affiliate Tracker | Ecosystem breadth (Passport.js, express-rate-limit, mature middleware) outweighs raw throughput for these services. |
| **Fastify + @fastify/websocket** | Group Trip Sync Service | Fastify handles the HTTP upgrade to WebSocket natively in the same process, simplifying deployment. |

### Fastify Configuration (Search & Pricing Engine)

```ts
// apps/api/src/services/search/server.ts
import Fastify from 'fastify';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  trustProxy: true, // Behind Cloudflare
});

// Zod schema validation — no runtime surprises
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

// Health & readiness probes (required by Kubernetes / Railway)
app.get('/health', async () => ({ status: 'ok' }));
app.get('/ready', async () => checkDependencies()); // checks Redis + DB

export default app;
```

### Express Configuration (Auth Service)

```ts
// apps/api/src/services/auth/server.ts
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();
app.use(helmet());
app.use(express.json({ limit: '100kb' }));

// Auth endpoints are high-value scraping targets — aggressive rate limiting
app.use('/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
}));

export default app;
```

### Shared API Gateway Contract

All services expose a consistent contract enforced at the gateway:

```
GET  /health          → 200 { status: 'ok' }
GET  /ready           → 200 | 503
POST /v1/...          → 200 | 400 | 401 | 403 | 429 | 500
```

Error responses follow [RFC 7807 Problem Details](https://www.rfc-editor.org/rfc/rfc7807):

```json
{
  "type": "https://anywhere.travel/errors/rate-limited",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Search quota exceeded for free tier. Upgrade to Pro for unlimited searches.",
  "instance": "/v1/search?budget=500&from=NBO"
}
```

### Tier Enforcement at the Gateway

Free vs. Pro tier enforcement is **not** duplicated in each microservice. The API Gateway:
1. Validates the JWT and extracts `{ userId, tier, rateLimit }` claims.
2. Applies tier-specific rate limits (`X-RateLimit-*` headers).
3. Forwards `X-Tier` and `X-User-Id` headers downstream.
4. Microservices **trust these headers** — no re-validation needed (internal network only).

---

## Alternatives Considered

### Option A: Single Express Monolith
- **Rejected**: Does not align with the independent deployability requirement. A slow Amadeus call in the Pricing Engine would block Auth requests.

### Option B: NestJS for All Services
- **Rejected**: NestJS abstraction overhead (decorators, DI container) is non-trivial. The team's Node.js experience skews toward direct framework usage. NestJS would benefit larger teams with strong Java/Spring backgrounds.

### Option C: Hono (Edge-first)
- **Considered**: Excellent for edge functions (Cloudflare Workers). Kept as a future option for the API Gateway layer itself, but not for stateful microservices that need database connections (Hono's design discourages long-lived connections).

### Option D: gRPC for Inter-Service Communication
- **Considered**: gRPC's binary protocol reduces inter-service latency but adds tooling complexity (protobuf schemas, code generation). Deferred — REST over HTTP/2 with connection pooling is acceptable for current scale targets.

---

## Consequences

### Positive
- Fastify's JSON schema serialization is ~2× faster than Express's `res.json()` — measurable on the hot search path.
- `fastify-type-provider-zod` gives end-to-end type safety from route schema to TypeScript types, shared via `@anywhere/types`.
- Services evolve independently; the Auth service can upgrade to a new Passport strategy without touching the Search service.

### Negative
- Two framework ecosystems to maintain and keep updated.
- Developers must know which framework a given service uses. Mitigated by per-service `README.md` and consistent `src/server.ts` entry point naming.
- Fastify's plugin lifecycle (register order matters) has a steeper learning curve than Express's `app.use()`.

---

## References
- [Fastify Benchmarks](https://fastify.dev/benchmarks/)
- [fastify-type-provider-zod](https://github.com/turkerdev/fastify-type-provider-zod)
- [RFC 7807 — Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc7807)
- [PROJECT.md — API Gateway & Microservices Layers](../../PROJECT.md)
