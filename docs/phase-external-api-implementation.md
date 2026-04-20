# Phase: External API Implementation & Audit

> **Status**: Completed
> **Last Updated**: 2026-04-20

This document tracks all external API integration phases for the Anywhere platform — from initial implementation through production auditing and fixes.

---

## Phase 1 — Initial API Integrations (2026-04-19)

### 1A. Climate Signals — Open-Meteo

Replaced the mock `WeatherAdapter` stub with a production-grade climate pipeline backed by the **Open-Meteo Historical Archive API**.

- **`OpenMeteoClient`**: Fetches daily `temperature_2m_max`, `temperature_2m_min`, `precipitation_sum`, and `sunshine_duration` over a 10-year baseline, converting `sunshine_duration` from seconds to hours.
- **`ClimateScorer`**: Weighted scoring (0–100) per vibe filter (`Tropical`, `Snowy`, `Beach`, etc.).
- **Haversine Fallback**: If coordinates fall outside coverage, the client resolves to the nearest capital using Haversine distance.
- **Workers**: `seedClimateProfiles.ts` runs quarterly via BullMQ. Climate data is never fetched live on the request path.
- **90-day Redis cache** per `{lat}:{lng}:{year}`.

---

### 1B. Geospatial & Demographics — GeoDB + REST Countries

- **`GeoDBClient`**: City-level coordinate and population resolution. Workers only. 90-day Redis cache.
- **`RestCountriesClient`**: Country metadata (flags, currencies, region, latlng). 30-day Redis cache. Zod-validated.
- **Initial Safety Data**: `seedGPI.ts` seeded `safetyScore` into MongoDB from `data/gpi-2025.csv` (14-country subset of the Global Peace Index). Countries not in the CSV received the regional median.

---

### 1C. Flight Search — TravelPayouts (replacing Kiwi Tequila)

Migrated from Kiwi Tequila to **TravelPayouts Aviasales API**.

- **`TravelPayoutsClient`**: Two endpoints — `aviasales/v3/prices_for_dates` (specific destination) and `/v1/prices/cheap` (open-ended search from an origin).
- Zod-validated via `TravelPayoutsV3Schema` and `TravelPayoutsV1Schema`.
- Returns `FlightOffer` with deep links to `search.aviasales.com`.

---

### 1D. Booking — Duffel

- **`DuffelClient`**: Creates offer requests, polls offers, creates orders via `/air/offer_requests`, `/air/offers`, `/air/orders`.
- Uses `DUFFEL_TEST_TOKEN` in non-production; `DUFFEL_LIVE_TOKEN` in production.
- Returns `BookingOffer` with total amount, currency, airline, duration, and booking link.

---

### 1E. Cost-of-Living — WhereNext

- **`WhereNextClient`**: Pre-fetches all country data from `getwherenext.com/api/data/cost-of-living` on startup into an in-memory `Map<isoCode, data>`.
- Derives per-item daily estimates (`mealCheap`, `mealMid`, `transport`, `coffee`) proportionally from `monthly_estimate_usd` and sub-indices.
- FX conversion via `open.er-api.com` (24h Redis cache).

---

### 1F. Stripe Billing

- Checkout sessions, customer portal, and webhook handlers for `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`.
- BullMQ `notifications` queue for async email triggers.

---

## Phase 2 — API Audit & Production Hardening (2026-04-20)

A full production readiness audit identified and fixed the following bugs:

### Critical Fixes

| Issue | File | Fix |
|---|---|---|
| `DuffelClient` called with single arg `DUFFEL_ACCESS_TOKEN` (doesn't exist) | `routes/booking.ts` | Changed to `new DuffelClient(DUFFEL_TEST_TOKEN, DUFFEL_LIVE_TOKEN)` |
| `TravelPayoutsClient.ping()` hit missing `departure_at` → false `400 degraded` | `TravelPayoutsClient.ts` | Added `departure_at` param; treat `400` as `healthy` |

### Socket Leak Fixes

All `ping()` methods were reading `statusCode` but not consuming the response body, causing socket exhaustion under load. Fixed with `await body.dump()` in:

- `TravelPayoutsClient.ping()`
- `DuffelClient.ping()`
- `RestCountriesClient.ping()`
- `OpenMeteoClient.ping()`
- `GeoDBClient.ping()`

### HTTP → HTTPS Fixes

`undici` does not follow redirects automatically. Two clients were using `http://` which caused 308 redirects that silently discarded all responses:

| Client | Old | Fixed |
|---|---|---|
| `TravelPayoutsClient` (v1 path) | `http://api.travelpayouts.com/v1` | `https://api.travelpayouts.com/v1` |
| `GeoDBClient` | `http://geodb-free-service.wirefreethought.com/v1` | `https://geodb-free-service.wirefreethought.com/v1` |

### WhereNext Schema Fix

The `WhereNextColData` internal interface was mapping Numbeo-style fields (`meal_inexpensive`, `cappuccino_regular`, etc.) that **do not exist** in the real WhereNext API response. The API returns country-level indices (`cost_index`, `monthly_estimate_usd`, `transport_index`).

- Remapped `WhereNextColData` to match the real response.
- Updated`prefetchColData()` to index by `country_code` (ISO-2) instead of `city`.
- Updated `getDailyBudget()` to derive cost estimates from `monthly_estimate_usd`.

---

## Phase 3 — Travel Risk Live API Integration (2026-04-20)

Replaced the static GPI safety scores with the **Travel Risk Intelligence API** ([ADR-008](./adr/ADR-008-travel-risk-api.md)).

- **`TravelRiskClient`**: Queries `GET /api/v1/risk-score/{iso_code}`, maps `risk_score` (1.0–5.0) to `safetyScore` (0–100).
- **`travelRisk` payload**: `advisoryLevel` + `activeAlerts` added to `GET /destinations/:id` response.
- **`dataFreshness.safety`**: Returns `"live"` when TRK API responds, `"gpi2025"` on fallback.
- **Health check**: `travelRiskClient.ping()` added to `GET /health/apis`.
- **Redis cache**: 6-hour TTL per ISO-3 code.
- **Fallback**: MongoDB `dest.safetyScore` (seeded from GPI CSV) used when TRK API is unavailable.
- **Env var**: `TRAVEL_RISK_API_KEY` — use `demo-key-travel-risk-2026` for development.

---

## Current API Health Status (Verified 2026-04-20)

| API | Endpoint Verified | HTTP Status | Notes |
|---|---|---|---|
| TravelPayouts v3 | `/aviasales/v3/prices_for_dates` | ✅ 200 | Live flight prices |
| TravelPayouts v1 | `/v1/prices/cheap` | ✅ 200 | After HTTPS fix |
| Duffel | `/air/offer_requests` | ✅ 200 | Token valid |
| WhereNext | `/api/data/cost-of-living` | ✅ 200 | Correct schema now mapped |
| Open-Meteo | `/v1/archive` | ✅ 200 | No auth required |
| REST Countries | `/v3.1/alpha/{cca2}` | ✅ 200 | No auth required |
| GeoDB | `/v1/geo/cities` | ✅ 200 | After HTTPS fix |
| Travel Risk | `/api/v1/risk-score/{iso3}` | ✅ 200 | Live with production key |
