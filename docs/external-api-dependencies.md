# External API Dependencies & Rate Limit Constraints

> **Last Updated**: 2026-04-17  
> **Owner**: Engineering Team  
> **Related ADRs**: [ADR-001](./adr/ADR-001-nextjs-app-router.md), [ADR-004](./adr/ADR-004-redis-upstash-bullmq.md), [ADR-005](./adr/ADR-005-mapbox-gl-js.md)

This document enumerates every external API that Anywhere depends on, with their rate limits, cost model, caching strategy, and failure behavior.

> [!IMPORTANT]
> The entire Redis caching layer (ADR-004) exists specifically to protect against rate limit exhaustion on these APIs. Never call these APIs on the request hot-path without first checking the cache.

---

## 1. Flight & Price Data

### 1A. Amadeus for Developers

| Field | Value |
|-------|-------|
| **Purpose** | Flight price search (core feature); drive Budget Map affordability data |
| **Authentication** | OAuth 2.0 Client Credentials (token valid for 30 min) |
| **Base URL** | `https://api.amadeus.com/v2/` |
| **Env Vars** | `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` |
| **Docs** | https://developers.amadeus.com/self-service |

#### Key Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `GET /shopping/flight-offers` | Search flights by origin, destination, date |
| `GET /shopping/flight-destinations` | Budget-to-destination discovery (**core endpoint** for reverse search) |
| `GET /shopping/flight-inspiration` | "Where can I go for $X?" — powers the budget map |

#### Rate Limits

| Tier | Requests / Month | Requests / Second | Cost per Call (overage) |
|------|-----------------|-------------------|------------------------|
| **Test (Free)** | 2,000 | 1 req/s | N/A |
| **Production (Self-Service)** | Unlimited* | ~10 req/s (burst) | Tiered pricing; contact sales |

> ⚠️ **Production limits are undisclosed as exact numbers.** Amadeus requires a production access request. Assume aggressive rate limiting at high volume and plan Redis caching accordingly.

#### Caching Strategy

```
Cache Key:  fs:{originRegion}:{destination}:{ISO-week}:{tier}
TTL:        900 seconds (15 minutes)
Strategy:   Cache-Aside — check Redis first, call Amadeus on miss, populate cache.
```

#### Failure Behavior

- On Amadeus `429` or `5xx`: return cached data if available (stale-on-error), else return a `503` with `Retry-After` header.
- Circuit breaker (using `opossum` library): open after 5 failures in 10s; half-open after 30s.

---

### 1B. Skyscanner / RapidAPI Travel APIs

| Field | Value |
|-------|-------|
| **Purpose** | Price verification, additional route coverage where Amadeus data is sparse |
| **Authentication** | `X-RapidAPI-Key` header |
| **Base URL** | `https://skyscanner50.p.rapidapi.com/` (via RapidAPI) |
| **Env Vars** | `RAPIDAPI_SKYSCANNER_KEY` |
| **Docs** | https://rapidapi.com/skyscanner/api/skyscanner50 |

#### Rate Limits

| Tier | Requests / Month | Requests / Second |
|------|-----------------|-------------------|
| **Basic (Free)** | 500 | 1 |
| **Pro ($29/month)** | 10,000 | 5 |
| **Ultra ($99/month)** | 50,000 | 10 |

#### Usage Notes

- Used as a **fallback** when Amadeus returns no results for a given route.
- Not used for real-time user searches — only for the background pre-fetch worker that seeds price ranges into Redis.

---

## 2. Cost-of-Living Data

### 2A. Numbeo API

| Field | Value |
|-------|-------|
| **Purpose** | Local cost indices (meals, coffee, beer, transit) — key Pro tier differentiator |
| **Authentication** | `api_key` query parameter |
| **Base URL** | `https://www.numbeo.com/api/` |
| **Env Vars** | `NUMBEO_API_KEY` |
| **Docs** | https://www.numbeo.com/api/ |

#### Key Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `GET /city_prices?api_key={key}&query={city}` | Cost-of-living prices for a specific city |
| `GET /rankings?api_key={key}` | Global city cost rankings |

#### Rate Limits

> [!CAUTION]
> Numbeo enforces very strict rate limits and does **not** publish exact numbers. Historical reports from developers indicate:

| Constraint | Observed Limit |
|------------|---------------|
| Daily calls (Basic plan) | ~100 per day |
| Daily calls (Commercial) | ~1,000–5,000 per day (negotiated) |
| Concurrent requests | 1 (sequential calls required) |

#### Caching Strategy

This is the most rate-limit-constrained API. The **only acceptable strategy** is:

```
Cron Job:   Daily at 02:00 UTC via BullMQ
Operation:  Pre-fetch ALL active destination CoL data
Cache Key:  col:{destinationSlug}
TTL:        86,400 seconds (24 hours)
Fallback:   If nightly job fails, serve 48-hour-old data before returning error
```

> **Never call Numbeo on a live user request.** All user-facing CoL data must come from Redis cache.

---

## 3. Weather & Climate

### 3A. OpenWeatherMap API

| Field | Value |
|-------|-------|
| **Purpose** | Current and 5-day climate data for destination discovery filters |
| **Authentication** | `appid` query parameter |
| **Base URL** | `https://api.openweathermap.org/data/2.5/` |
| **Env Vars** | `OPENWEATHERMAP_API_KEY` |
| **Docs** | https://openweathermap.org/api |

#### Key Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `GET /weather?q={city}&appid={key}` | Current weather by city name |
| `GET /forecast?q={city}&appid={key}` | 5-day / 3-hour forecast |
| `GET /climate/month` | Historical climate averages (One Call API 3.0) |

#### Rate Limits

| Tier | Calls / Minute | Calls / Month | Cost |
|------|---------------|---------------|------|
| **Free** | 60 | 1,000,000 | $0 |
| **Startup** | 600 | 10,000,000 | $40/month |
| **Developer** | 3,000 | 200,000,000 | $180/month |

#### Caching Strategy

```
Cron Job:   Every hour via BullMQ ("openweather-snapshot")
Cache Key:  climate:{destinationSlug}:{month}
TTL:        86,400 seconds (24 hours) for historical averages
            3,600 seconds (1 hour) for current/forecast data
```

---

## 4. Maps & Geospatial

### 4A. Mapbox (Multiple APIs)

| Field | Value |
|-------|-------|
| **Purpose** | Interactive budget map, static OG images, geocoding |
| **Authentication** | Public token (`pk.`) for client-side; Secret token (`sk.`) for server-side |
| **Base URL** | `https://api.mapbox.com/` |
| **Env Vars** | `NEXT_PUBLIC_MAPBOX_TOKEN`, `MAPBOX_SECRET_TOKEN` |
| **Docs** | https://docs.mapbox.com/ |

#### APIs Used

| API | Endpoint | Purpose |
|-----|----------|---------|
| Maps GL JS | CDN script | Interactive budget map (client-side) |
| Static Images | `/styles/v1/{user}/{style}/static/...` | OG images for destination guides |
| Geocoding | `/geocoding/v5/mapbox.places/{query}.json` | City name → lat/lng |
| Tilesets | `/tiles/v3/...` | Custom map tiles |

#### Rate Limits & Pricing

| API | Free Tier | Beyond Free |
|-----|-----------|------------|
| **Map Loads (GL JS)** | 50,000 / month | $5 per 1,000 |
| **Static Images** | 50,000 / month | $1 per 1,000 |
| **Geocoding** | 100,000 / month | $0.75 per 1,000 |
| **Tilesets** | 750,000 tile requests / month | $0.25 per 1,000 |

#### Security Notes

- `NEXT_PUBLIC_MAPBOX_TOKEN` (public) must be **URL-restricted** in the Mapbox dashboard to `*.anywhere.travel` and `localhost` to prevent token theft.
- `MAPBOX_SECRET_TOKEN` (server-only) must never appear in client-side code or Next.js public runtime config.

#### Caching Strategy

- Map tiles are cached at Cloudflare CDN edge (cache TTL: 24h).
- Static OG images are generated once per destination and cached in Cloudflare R2 / Next.js Image Optimization cache. Not re-generated on every request.
- Geocoding results cached in Redis: `geo:{query}` with 30-day TTL (city coordinates don't change).

---

## 5. Payments & Subscriptions

### 5A. Stripe

| Field | Value |
|-------|-------|
| **Purpose** | Pro subscription billing, payment processing |
| **Authentication** | `Authorization: Bearer sk_live_...` (server-side only) |
| **Base URL** | `https://api.stripe.com/v1/` |
| **Env Vars** | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` |
| **Docs** | https://stripe.com/docs/api |

#### Webhooks Used

| Event | Handler |
|-------|---------|
| `customer.subscription.created` | Upgrade user to Pro in PostgreSQL |
| `customer.subscription.deleted` | Downgrade user to Free |
| `invoice.payment_failed` | Send retention email via notification queue |
| `checkout.session.completed` | Provision subscription immediately |

#### Rate Limits

| Mode | Limit |
|------|-------|
| **Live** | 100 read requests/s, 100 write requests/s per account |
| **Test** | Same limits |

> No caching of Stripe responses — all Stripe calls must use live data. User tier in Redis cache (5 min TTL) is derived from PostgreSQL, not called from Stripe directly on each request.

---

## 6. Notifications

### 6A. Resend (Transactional Email)

| Field | Value |
|-------|-------|
| **Purpose** | Welcome emails, subscription confirmations, trip reminders |
| **Authentication** | `Authorization: Bearer re_...` |
| **Base URL** | `https://api.resend.com/` |
| **Env Vars** | `RESEND_API_KEY` |
| **Docs** | https://resend.com/docs |

#### Rate Limits

| Tier | Emails / Month | Emails / Second |
|------|---------------|----------------|
| **Free** | 3,000 | 1 |
| **Pro ($20/month)** | 50,000 | 10 |
| **Scale ($90/month)** | 100,000 | 10 |

#### Strategy

All email sends go through the BullMQ `notifications` queue. Never call Resend synchronously in a request handler — use `await notificationQueue.add(...)` and handle in the worker.

---

### 6B. Expo Push Notifications

| Field | Value |
|-------|-------|
| **Purpose** | Mobile push notifications (React Native / Expo app) |
| **Authentication** | Expo access token |
| **Base URL** | `https://exp.host/--/api/v2/` |
| **Env Vars** | `EXPO_ACCESS_TOKEN` |
| **Docs** | https://docs.expo.dev/push-notifications/ |

#### Rate Limits

| Limit Type | Value |
|------------|-------|
| Notifications per request (batch) | Up to 100 |
| Requests per project per second | ~1,000 |

---

## 7. Authentication

### 7A. Supabase Auth (internal — managed via Supabase instance)

Used as the identity provider for Anywhere. Supabase Auth is part of the self-hosted/managed Supabase instance (ADR-003) — not a separate billable external API.

| Feature Used | Notes |
|-------------|-------|
| Email/Password sign-up | Built-in |
| Google OAuth | `SUPABASE_AUTH_GOOGLE_CLIENT_ID`, `SUPABASE_AUTH_GOOGLE_SECRET` |
| Apple Sign-In | `SUPABASE_AUTH_APPLE_CLIENT_ID`, `SUPABASE_AUTH_APPLE_SECRET` |
| JWT issuance | Supabase JWT; validated at the API Gateway |

---

## Rate Limit Summary & Risk Matrix

| API | Daily Budget | Risk Level | Primary Mitigation |
|-----|-------------|------------|-------------------|
| **Amadeus** | ~2K/month free | 🔴 HIGH | Redis cache (15 min TTL); regionalized cache key |
| **Numbeo** | ~100/day | 🔴 CRITICAL | Nightly pre-fetch only; never live |
| **Skyscanner/RapidAPI** | 500–50K/month (paid) | 🟡 MEDIUM | Background workers only; not on request path |
| **OpenWeatherMap** | 1M/month free | 🟢 LOW | Hourly cron + 24h cache |
| **Mapbox** | 50K maps/month free | 🟡 MEDIUM | CDN caching of tiles; URL-restricted tokens |
| **Stripe** | 100 req/s | 🟢 LOW | Webhook-driven; no polling |
| **Resend** | 3K–100K/month | 🟢 LOW | BullMQ async queue |

---

## Environment Variable Reference

The following additions to `.env.example` are required to support all integrations:

```bash
# === Flight APIs ===
AMADEUS_CLIENT_ID=
AMADEUS_CLIENT_SECRET=
RAPIDAPI_SKYSCANNER_KEY=

# === Cost of Living ===
NUMBEO_API_KEY=

# === Climate ===
OPENWEATHERMAP_API_KEY=

# === Maps ===
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...   # URL-restricted public token
MAPBOX_SECRET_TOKEN=sk.eyJ1...        # Server-only: Static Images API

# === Database ===
DATABASE_URL=postgresql://...          # Supabase connection string
MONGODB_URI=mongodb+srv://...          # MongoDB Atlas connection string

# === Cache & Queues ===
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=

# === Payments ===
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# === Notifications ===
RESEND_API_KEY=re_...
EXPO_ACCESS_TOKEN=

# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # Server-only: bypasses RLS
SUPABASE_AUTH_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_GOOGLE_SECRET=

# === App ===
NEXT_PUBLIC_API_URL=https://api.anywhere.travel
NEXTAUTH_SECRET=                       # If using NextAuth alongside Supabase
NODE_ENV=development
```

> [!WARNING]
> Variables prefixed `NEXT_PUBLIC_` are **bundled into the client-side JavaScript** and visible to anyone who inspects the bundle. Never put secrets (Stripe secret key, Supabase service role key, Mapbox secret token) in `NEXT_PUBLIC_` variables.
