# Architecture Decision Records (ADRs)

This directory contains the Architecture Decision Records for the **Anywhere** monorepo.

ADRs document significant technical decisions, the context that drove them, the alternatives considered, and the consequences of the chosen approach. They are written at decision time and treated as immutable history — superseded ADRs are marked `Superseded by ADR-XXX` rather than deleted.

---

## Index

| ID | Title | Status | Date |
|----|-------|--------|------|
| [ADR-001](./ADR-001-nextjs-app-router.md) | Next.js App Router — SSR / SSG / ISR per route group | ✅ Accepted | 2026-04-17 |
| [ADR-002](./ADR-002-rest-api-express-fastify.md) | REST API — Express + Fastify for the microservices layer | ✅ Accepted | 2026-04-17 |
| [ADR-003](./ADR-003-postgresql-mongodb-data-stores.md) | PostgreSQL (Supabase) for transactional data + MongoDB Atlas for trip documents | ✅ Accepted | 2026-04-17 |
| [ADR-004](./ADR-004-redis-upstash-bullmq.md) | Redis (Upstash) for caching + BullMQ for background job queues | ✅ Accepted | 2026-04-17 |
| [ADR-005](./ADR-005-mapbox-gl-js.md) | Mapbox GL JS for custom budget map — replacing any Google Maps dependency | ✅ Accepted | 2026-04-17 |
| [ADR-006](./ADR-006-secrets-management.md) | Doppler as the single source of truth for all secrets | ✅ Accepted | 2026-04-17 |

---

## Status Definitions

| Status | Meaning |
|--------|---------|
| `Proposed` | Under discussion; not yet approved |
| `Accepted` | Decision made; implementation in progress or complete |
| `Deprecated` | No longer recommended but still in use |
| `Superseded` | Replaced by a newer ADR |

---

## How to Write an ADR

Copy the template below and save as `ADR-{NNN}-{short-title}.md`:

```markdown
# ADR-NNN: Title

| Field       | Value       |
| ----------- | ----------- |
| **Status**  | Proposed    |
| **Date**    | YYYY-MM-DD  |
| **Deciders**| Names       |
| **Tags**    | tag1, tag2  |

## Context
## Decision
## Alternatives Considered
## Consequences
## References
```

---

## Related Documents

- [External API Dependencies & Rate Limits](../external-api-dependencies.md)
- [Secrets Management Runbook](../secrets-management.md)
- [Secret Rotation Log](../secret-rotation.log)
- [Project Overview](../../PROJECT.md)
