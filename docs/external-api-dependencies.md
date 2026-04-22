# External API Dependencies & Rate Limit Constraints

> **Last Updated**: 2026-04-20
> **Owner**: Engineering Team
> **Related ADRs**: [ADR-002](./adr/ADR-002-rest-api-express-fastify.md), [ADR-004](./adr/ADR-004-redis-upstash-bullmq.md), [ADR-008](./adr/ADR-008-travel-risk-api.md)

This document enumerates every external API that Anywhere depends on, with their authentication method, current endpoint usage, caching strategy, failure behavior, and verified production status.

> [!IMPORTANT]
> The Redis caching layer (ADR-004) exists specifically to protect against rate limit exhaustion. **Never call external APIs on the hot request path without first checking the cache.**

> [!NOTE]
> All API clients live in `packages/api-clients/src/`. Each client has a `ping()` method that feeds into `GET /health/apis` for live monitoring. All `ping()` methods consume the response body with `await body.dump()` to prevent socket leaks.

---

## 1. Flight & Booking Data

### 1A. TravelPayouts (Aviasales)

| Field | Value |
|---|---|
| **Purpose** | Flight price search — primary data source for the Budget Map affordability layer |
| **Authentication** | `token` query param |
| **Base URL (V3)** | `https://api.travelpayouts.com/aviasales/v3` |
| **Base URL (V1)** | `https://api.travelpayouts.com/v1` |
| **Env Var** | `TRAVELPAYOUTS_TOKEN` |
| **Client** | `TravelPayoutsClient` |
| **Docs** | https://support.travelpayouts.com/hc/en-us/categories/200358578 |

#### Endpoints Used

| Endpoint | Method | Description |
|---|---|---|
| `/aviasales/v3/prices_for_dates` | GET | Cheapest flight to a specific IATA destination for a given month |
| `/v1/prices/cheap` | GET | Cheapest flights anywhere from an origin (used in `searchAnywhere`) |

#### Response Shape → Frontend

```ts
// TravelPayoutsClient.searchToDestination() returns:
FlightOffer {
  id: string;               // "{origin}-{dest}-{flightNumber}"
  destinationIATA: string;  // e.g. "BKK"
  price: number;            // cheapest fare in USD
  currency: "USD";
  stops: number;            // transfer count
  deepLink: string;         // "https://search.aviasales.com/flights/?origin=...&destination=..."
}
```

#### Caching Strategy

```
Cache Key:  (none — called per destination on demand; Redis caches at destination route level)
TTL:        destination route caches full response for 1200s (20 min)
```

#### Rate Limits

| Tier | Limit | Cost |
|---|---|---|
| Partner Free | Generous allocation | $0 |

#### Health Check Behavior

- `200` → `healthy`
- `400` (valid auth, no routes for date) → `healthy`
- `401`/`403` → `degraded`
- `5xx` / network error → `down`

---

### 1B. Duffel

| Field | Value |
|---|---|
| **Purpose** | Full booking checkout — creates offer requests, returns bookable itineraries, handles order creation |
| **Authentication** | `Authorization: Bearer <token>` + `Duffel-Version: v2` header |
| **Base URL** | `https://api.duffel.com` |
| **Env Vars** | `DUFFEL_TEST_TOKEN`, `DUFFEL_LIVE_TOKEN` |
| **Client** | `DuffelClient` |
| **Docs** | https://duffel.com/docs |

> [!IMPORTANT]
> `DuffelClient` requires **two tokens** — `(testToken, liveToken)`. The client automatically uses `DUFFEL_TEST_TOKEN` unless `NODE_ENV=production`, where it switches to `DUFFEL_LIVE_TOKEN`.
> **Dev-Mode Safety**: In `development` mode, the client will explicitly block any token that does not start with `duffel_test_` to prevent accidental live usage during local testing.

#### Endpoints Used

| Endpoint | Method | Description |
|---|---|---|
| `/air/offer_requests` | POST | Initiate a flight search (slices, passengers) |
| `/air/offers` | GET | Poll offers from a request ID |
| `/air/orders` | POST | Create a booking |

#### Response Shape → Frontend

```ts
// DuffelClient returns:
BookingOffer {
  offerId: string;
  totalAmount: number;
  currency: string;
  airline: string;
  durationMins: number;
  stops: number;
  expiresAt: string;         // ISO timestamp
  bookingLink: string;
}
```

#### Rate Limits

Pay-per-booking model. No hard rate limit on searches (sandbox). Production limits apply per contract.

---

### 1C. Skyscanner / RapidAPI

| Field | Value |
|---|---|
| **Purpose** | Background worker fallback only — not on the live request path |
| **Authentication** | `X-RapidAPI-Key` header |
| **Env Var** | `RAPIDAPI_SKYSCANNER_KEY` |

---

## 2. Safety & Travel Risk

### 2A. Travel Risk Intelligence API ⭐ (Primary)

| Field | Value |
|---|---|
| **Purpose** | Real-time country safety scores, advisory levels, and active disaster/conflict alerts — replaces static GPI CSV |
| **Authentication** | `x-api-key` header |
| **Base URL** | `https://travelriskapi.com/api/v1` |
| **Env Var** | `TRAVEL_RISK_API_KEY` |
| **Client** | `TravelRiskClient` (singleton: `travelRiskClient`) |
| **Docs** | https://travelriskapi.com/docs |

#### Endpoints Used

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Liveness check (no auth required) |
| `/risk-score/{iso_code}` | GET | Country risk score, advisory level, active alert count |
| `/alerts` | GET | Filterable active alert feed (by country, severity, type) |

#### Response Shape → Frontend

```ts
// destinations route appends:
travelRisk: {
  riskScore: number;        // 1.0 (safest) → 5.0 (most dangerous)
  advisoryLevel: number;    // 1–4 (1 = exercise normal caution, 4 = do not travel)
  activeAlerts: number;     // count of current active alerts for this country
}

// safetyScore is computed from riskScore:
safetyScore = Math.max(0, Math.min(100, Math.round(((5.0 - riskScore) / 4.0) * 100)))

// dataFreshness.safety = "live" when TRK API responds, "gpi2025" on fallback
```

#### Scale Reference

| riskScore | Advisory | safetyScore | Example Countries |
|---|---|---|---|
| 1.0 | 1 | 100 | Iceland |
| 1.5 | 1 | 88 | Japan, Singapore |
| 2.0 | 2 | 75 | France, Spain |
| 3.0 | 3 | 50 | Colombia |
| 4.0 | 4 | 25 | Sudan |
| 5.0 | 4 | 0 | Active conflict zones |

#### Caching Strategy

```
Cache Key:  travelrisk:{ISO3}
TTL:        21,600 seconds (6 hours)
Fallback:   dest.safetyScore from MongoDB (seeded by gpi-2025.csv via seedGPI.ts)
```

#### Rate Limits

| Tier | Notes |
|---|---|
| Free (demo key) | Limited requests — use for development only |
| Pro (`trk_...`) | Production tier — configured in `.env` |

---

### 2B. GPI Seed File (Fallback Only)

| Field | Value |
|---|---|
| **Purpose** | One-time seed of `safetyScore` into MongoDB `Destination` documents — **only used as fallback when TravelRisk API is unavailable** |
| **Status** | Static — updated annually |
| **File** | `data/gpi-2025.csv` |
| **Script** | `apps/workers/src/seedGPI.ts` |

The seeder runs once (or when GPI data is refreshed annually). It populates `safetyScore`, `gpiRank`, `gpiYear` on each `Destination` document. Countries not in the CSV receive the regional median score.

---

## 3. Cost-of-Living Data

### 3A. WhereNext API

| Field | Value |
|---|---|
| **Purpose** | Country-level cost-of-living indices — daily budget estimates for meals, transport, and overall spend |
| **Authentication** | None (free, no key required) |
| **Base URL** | `https://getwherenext.com/api/data/cost-of-living` |
| **Client** | `WhereNextClient` (singleton: `whereNextClient`) |
| **Docs** | https://getwherenext.com |

> [!NOTE]
> `WhereNextClient` pre-fetches all country data on startup and stores it in an in-memory `Map<isoCode, WhereNextColData>`. No per-request calls are made to WhereNext during user-facing requests.

#### Real API Response Shape

```json
{
  "data": [
    {
      "rank": 78,
      "country_code": "FR",
      "country": "France",
      "region": "Europe",
      "cost_index": 77,
      "monthly_estimate_usd": 2800,
      "grocery_index": 25.7,
      "rent_index": 25.41,
      "utilities_index": 32.9,
      "transport_index": 40.92
    }
  ]
}
```

#### Mapping to DailyBudgetEstimate

The client derives per-item costs proportionally from `monthly_estimate_usd`:

```ts
daily       = monthly_estimate_usd / 30
mealCheap   = daily * 0.18
mealMid     = daily * 0.35
transport   = daily * (transport_index / 100) * 0.12
coffee      = daily * 0.05
```

Lookup key is the **ISO-2 country code** (lowercased) — e.g. `"fr"` for France.

#### Frontend Output

```ts
DailyBudgetEstimate {
  mealCheap: number;
  mealMid: number;
  localTransport: number;
  coffee: number;
  dailyTotal: number;
  currency: string;          // target currency (FX-converted via open.er-api.com)
  colIndex: number;          // 0–100 relative cost index
  tier: "budget" | "mid" | "premium";
}
```

#### Fallback Chain

1. In-memory `Map` (prefetched from WhereNext on startup)
2. MongoDB `destinations.avgCosts` collection
3. Continental median hardcoded in `CONTINENTAL_FALLBACKS`

---

## 4. Weather & Climate

### 4A. Open-Meteo (Historical Archive)

| Field | Value |
|---|---|
| **Purpose** | Historical climate data for monthly temperature, precipitation, and sunshine duration profiles |
| **Authentication** | None (free, no key required) |
| **Base URL** | `https://archive-api.open-meteo.com/v1/archive` |
| **Client** | `OpenMeteoClient` |
| **Docs** | https://open-meteo.com/en/docs/historical-weather-api |

#### Endpoint Used

```
GET /v1/archive
  ?latitude={lat}
  &longitude={lng}
  &start_date={YYYY-MM-DD}
  &end_date={YYYY-MM-DD}
  &daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration
```

#### Response Shape → Frontend

```ts
// OpenMeteoClient.getMonthlyClimate() returns:
MonthlyClimate[] {
  month: number;           // 1–12
  avgTempC: number;
  avgPrecipMm: number;
  avgSunshineHours: number; // sunshine_duration ÷ 3600 (seconds → hours)
}
```

#### Caching Strategy

```
Cache Key:  climate:{lat}:{lng}:{year}
TTL:        7,776,000 seconds (90 days)
Trigger:    Quarterly BullMQ cron — not on request path
Fallback:   Haversine nearest capital city on 400 (coordinates out of range)
```

#### Rate Limits

| Tier | Limit | Cost |
|---|---|---|
| Free | 10,000 calls/day | $0 |

---

## 5. Geospatial & Demographics

### 5A. REST Countries API

| Field | Value |
|---|---|
| **Purpose** | Country metadata — flag emoji, currency codes, region, capital city, lat/lng, population |
| **Authentication** | None |
| **Base URL** | `https://restcountries.com/v3.1` |
| **Client** | `RestCountriesClient` (singleton: `restCountriesClient`) |
| **Docs** | https://restcountries.com |

#### Endpoint Used

```
GET /v3.1/alpha/{cca2 or cca3}?fields=name,cca2,cca3,flag,currencies,languages,region,capital,latlng,population
```

#### Response Shape

```ts
CountryMeta {
  name: { common: string; official: string };
  cca2: string;
  cca3: string;
  flag: string;           // e.g. "🇫🇷"
  currencies: Record<string, { name: string; symbol: string }>;
  languages: Record<string, string>;
  region: string;
  capital: string[];
  latlng: [number, number];
  population: number;
}
```

#### Caching Strategy

```
Cache Key:  restcountries:{cca2}
TTL:        2,592,000 seconds (30 days)
```

---

### 5B. GeoDB Cities (Free Service)

| Field | Value |
|---|---|
| **Purpose** | City-level coordinate resolution and population data for enrichment workers |
| **Authentication** | None (free tier; RapidAPI key only for premium) |
| **Base URL** | `https://geodb-free-service.wirefreethought.com/v1` |
| **Client** | `GeoDBClient` |
| **Docs** | https://wirefreethought.github.io/geodb-cities-api-docs/ |

> [!WARNING]
> Use `https://` — the HTTP endpoint returns a `308 Permanent Redirect` that `undici` does not follow automatically, causing all requests to silently fail.

#### Endpoint Used

```
GET /v1/geo/cities?namePrefix={city}&countryIds={ISO2}&types=CITY&limit=1
```

#### Response Shape

```ts
GeoCityResult {
  name: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  population: number;
  timezone: string;
}
```

#### Caching Strategy

```
Cache Key:  geodb:{cityName}:{countryCode}
TTL:        7,776,000 seconds (90 days)
Note:       Used by enrichment workers only — not on the live request path
```

---

## 6. Maps & Geospatial Visualisation

### 6A. Mapbox

| Field | Value |
|---|---|
| **Purpose** | Interactive Budget Map, static OG images, geocoding |
| **Authentication** | Public token (`pk.`) client-side; Secret token (`sk.`) server-side |
| **Env Vars** | `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_SECRET_TOKEN`, `NEXT_PUBLIC_MAPBOX_STYLE_URL` |
| **Docs** | https://docs.mapbox.com |

#### Rate Limits

| API | Free Tier | Beyond Free |
|---|---|---|
| Map Loads (GL JS) | 50,000/month | $5 per 1,000 |
| Static Images | 50,000/month | $1 per 1,000 |
| Geocoding | 100,000/month | $0.75 per 1,000 |

> [!CAUTION]
> `NEXT_PUBLIC_MAPBOX_TOKEN` must be URL-restricted in the Mapbox dashboard to `*.anywhere.travel` and `localhost`. Never expose `MAPBOX_SECRET_TOKEN` to the client.

---

## 7. Currency Conversion

### 7A. Open Exchange Rates (er-api.com)

| Field | Value |
|---|---|
| **Purpose** | USD → target currency FX rates used by `WhereNextClient.compileResponse()` |
| **Authentication** | None (free endpoint) |
| **Base URL** | `https://open.er-api.com/v6/latest/USD` |
| **Client** | Inline within `WhereNextClient.getCachedFxRate()` |

#### Caching Strategy

```
Cache Key:  fx:rates
TTL:        86,400 seconds (24 hours)
Note:       Rates fetched lazily on first non-USD budget request; Redis-cached for 24h
```

---

## 8. Payments

### 8A. Stripe

| Field | Value |
|---|---|
| **Purpose** | Pro subscription billing |
| **Authentication** | `Authorization: Bearer sk_live_...` (server-only) |
| **Env Vars** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Docs** | https://stripe.com/docs/api |

#### Webhooks Used

| Event | Action |
|---|---|
| `checkout.session.completed` | Upgrade user to Pro |
| `customer.subscription.deleted` | Downgrade to Free |
| `invoice.payment_failed` | Queue retention email |

> No caching of Stripe responses. User tier is cached in Redis (5 min TTL) derived from PostgreSQL, not queried from Stripe per request.

---

## 9. Notifications

### 9A. Resend

| Field | Value |
|---|---|
| **Purpose** | Transactional email (welcome, subscription confirmation, trip reminders) |
| **Authentication** | `Authorization: Bearer re_...` |
| **Env Var** | `RESEND_API_KEY` |
| **Docs** | https://resend.com/docs |

All sends go through the BullMQ `notifications` queue — **never call Resend synchronously in a request handler**.

| Tier | Emails/Month |
|---|---|
| Free | 3,000 |
| Pro ($20) | 50,000 |

---

## Rate Limit Summary & Risk Matrix

| API | Daily/Monthly Budget | Risk | Primary Mitigation |
|---|---|---|---|
| **TravelPayouts** | Generous free | 🟡 Medium | Redis dest-level cache (20 min TTL) |
| **Duffel** | Pay-per-booking | 🟢 Low | Only called on explicit booking action |
| **Travel Risk API** | Pro tier | 🟢 Low | Redis 6h cache per ISO code |
| **WhereNext** | Unlimited free | 🟢 Low | In-memory prefetch on startup |
| **Open-Meteo** | 10K/day free | 🟢 Low | Quarterly BullMQ cron + 90-day cache |
| **REST Countries** | Unlimited free | 🟢 Low | 30-day Redis cache |
| **GeoDB Free** | ~1,000/day | 🔴 High | Workers only; 90-day Redis cache |
| **Mapbox** | 50K maps/month | 🟡 Medium | CDN tile caching; URL-restricted token |
| **er-api.com (FX)** | 1,500/month free | 🟢 Low | 24h Redis cache |
| **Stripe** | 100 req/s | 🟢 Low | Webhook-driven; no polling |
| **Resend** | 3K–100K/month | 🟢 Low | BullMQ async queue |

---

## Environment Variable Reference

```bash
# --- App ---
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:4000

# --- Supabase (PostgreSQL + Auth) ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# --- MongoDB Atlas ---
MONGODB_URI=

# --- Redis / Upstash ---
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
REDIS_URL=redis://localhost:6379

# --- Maps ---
NEXT_PUBLIC_MAPBOX_TOKEN=
MAPBOX_SECRET_TOKEN=
NEXT_PUBLIC_MAPBOX_STYLE_URL=

# --- Flight APIs ---
TRAVELPAYOUTS_TOKEN=           # Aviasales Data API token
DUFFEL_TEST_TOKEN=             # Duffel sandbox token
DUFFEL_LIVE_TOKEN=             # Duffel production token
RAPIDAPI_SKYSCANNER_KEY=       # Fallback / background worker only

# --- Safety & Risk ---
TRAVEL_RISK_API_KEY=           # travelriskapi.com — use demo-key-travel-risk-2026 for dev

# --- Payments ---
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# --- Notifications ---
RESEND_API_KEY=
EXPO_ACCESS_TOKEN=
```

> [!WARNING]
> Variables prefixed `NEXT_PUBLIC_` are bundled into client-side JavaScript. Never place secrets (`STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `MAPBOX_SECRET_TOKEN`, `TRAVEL_RISK_API_KEY`) in `NEXT_PUBLIC_` variables.
