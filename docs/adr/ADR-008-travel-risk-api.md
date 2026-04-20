# ADR-008: Travel Risk Intelligence API for Safety Scores

> **Status**: Accepted
> **Date**: 2026-04-20
> **Deciders**: Engineering Team
> **Supersedes**: Static GPI CSV (`data/gpi-2025.csv` + `apps/workers/src/seedGPI.ts`)
> **Related**: [ADR-004 (Redis/Upstash)](./ADR-004-redis-upstash-bullmq.md), [external-api-dependencies.md](../external-api-dependencies.md)

---

## Context

The Anywhere platform previously derived country safety scores from a static CSV file containing 14 manually curated Global Peace Index (GPI) entries (`data/gpi-2025.csv`). The `seedGPI.ts` worker would seed `safetyScore`, `gpiRank`, and `gpiYear` into MongoDB destination documents at deploy time.

This approach had several problems:

1. **Only 14 countries** were covered — approximately 149 destinations received a regional median fallback instead of a real score.
2. **Annual staleness** — scores reflected the prior year's GPI release and would never update automatically.
3. **No live alerts** — there was no mechanism to surface active conflict alerts, natural disasters, or travel advisories to users.
4. **No programmatic GPI API** — the Institute for Economics and Peace does not publish a public REST API, so real-time updates from the authoritative source were not feasible.

---

## Decision

We adopt **[Travel Risk Intelligence API](https://travelriskapi.com)** (`travelriskapi.com`) as the live data source for country safety scores, advisory levels, and active alert counts.

The static GPI CSV and seed script are **retained as a fallback** only — if the TRK API is unreachable or returns an error, the platform degrades gracefully to the MongoDB-seeded `safetyScore`.

---

## Architecture

### Client

A dedicated `TravelRiskClient` singleton is instantiated in `packages/api-clients/src/travelrisk/TravelRiskClient.ts` and exported from `@anywhere/api-clients`.

```
GET /api/v1/risk-score/{iso_code}
Headers: x-api-key: {TRAVEL_RISK_API_KEY}
```

Response validated with `TravelRiskScoreSchema` (Zod).

### Score Transformation

The TRK API returns a `risk_score` on a 1.0–5.0 scale (1 = safest). The platform uses a linear inversion to map this onto the frontend's 0–100 `safetyScore` scale:

```ts
safetyScore = Math.max(0, Math.min(100, Math.round(((5.0 - riskScore) / 4.0) * 100)))
```

| risk_score | safetyScore |
|---|---|
| 1.0 | 100 |
| 2.0 | 75 |
| 3.0 | 50 |
| 4.0 | 25 |
| 5.0 | 0 |

### Response Payload Addition

The `GET /destinations/:id` route now includes a `travelRisk` object alongside `safetyScore`:

```json
{
  "safetyScore": 75,
  "travelRisk": {
    "riskScore": 2.0,
    "advisoryLevel": 2,
    "activeAlerts": 8
  },
  "dataFreshness": {
    "safety": "live"
  }
}
```

When the TRK API is unavailable, `travelRisk` is `null` and `dataFreshness.safety` is `"gpi2025"`.

### Caching

```
Cache Key:  travelrisk:{ISO3}
TTL:        21,600 seconds (6 hours)
Backend:    Upstash Redis (same instance as all other caches)
```

A 6-hour TTL is chosen because:
- Travel advisories rarely change faster than 6 hours.
- It reduces TRK API quota consumption by ~96% vs. uncached.
- The fallback to MongoDB ensures no degraded UX during cache misses.

### Health Check

`TravelRiskClient.ping()` is registered in the `GET /health/apis` endpoint. It calls `GET /api/v1/health` (no auth required) and returns `{ status, latencyMs }`.

---

## Alternatives Considered

### Continue with Static GPI CSV

- ❌ Only 14 countries covered
- ❌ Manually updated once a year
- ❌ No real-time alerts

### World Bank Worldwide Governance Indicators (WGI) — `PV.EST`

- ✅ Free, official, covers ~200 countries
- ❌ Updated once per year (2023 data is the most recent)
- ❌ No real-time alerts or advisories
- ❌ API endpoint `PV.EST` was verified as archived/unavailable during evaluation

### Scraping Travel Advisory Government Sites (FCDO, US State Dept.)

- ❌ Fragile, TOS violations likely
- ❌ High maintenance burden
- ❌ No structured JSON output

---

## Consequences

### Positive

- ✅ Live safety scores for all countries supported by the TRK API.
- ✅ `activeAlerts` and `advisoryLevel` surfaced directly to the frontend.
- ✅ `dataFreshness.safety` clearly communicates data provenance to clients.
- ✅ Graceful degradation to seeded scores ensures zero downtime on TRK API failures.
- ✅ Standard `ping()` / Redis caching pattern consistent with all other API clients.

### Negative / Trade-offs

- 🔶 The TRK API is a third-party service — uptime is not under our control. Mitigated by the 6-hour Redis cache and MongoDB fallback.
- 🔶 The Pro API key (`trk_...`) must be rotated if compromised. Documented in `docs/secret-rotation.log`.
- 🔶 `monthly_estimate_usd` is country-level, not city-level. City-specific CoL variance is not captured.

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `TRAVEL_RISK_API_KEY` | ✅ | Use `demo-key-travel-risk-2026` for development/staging. Set production key in `.env`. |

---

## References

- [travelriskapi.com OpenAPI spec](https://travelriskapi.com/openapi.json)
- [travelriskapi.com Swagger UI](https://travelriskapi.com/docs)
- `packages/api-clients/src/travelrisk/TravelRiskClient.ts`
- `apps/search-service/src/routes/destinations.ts`
- `apps/workers/src/seedGPI.ts` (fallback seed — retained)
- `data/gpi-2025.csv` (fallback data — retained)
