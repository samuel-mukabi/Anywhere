# External API Dependencies & Rate Limit Constraints

> **Last Updated**: 2026-04-17  
> **Owner**: Engineering Team  
> **Related ADRs**: [ADR-001](./adr/ADR-001-nextjs-app-router.md), [ADR-004](./adr/ADR-004-redis-upstash-bullmq.md), [ADR-005](./adr/ADR-005-mapbox-gl-js.md)

This document enumerates every external API that Anywhere depends on, with their rate limits, cost model, caching strategy, and failure behavior.

> [!IMPORTANT]
> The entire Redis caching layer (ADR-004) exists specifically to protect against rate limit exhaustion on these APIs. Never call these APIs on the request hot-path without first checking the cache.

---

## 1. Flight & Price Data

### 1A. Kiwi Tequila API

| Field | Value |
|-------|-------|
| **Purpose** | Flight price search (core feature); drive Budget Map affordability data |
| **Authentication** | `apikey` header |
| **Base URL** | `https://api.tequila.kiwi.com/v2/` |
| **Env Vars** | `KIWI_TEQUILA_API_KEY` |
| **Docs** | https://tequila.kiwi.com/ |

#### Key Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `GET /search` | Search flights by origin, destination, date |

#### Rate Limits

| Tier | Requests / Month | Cost |
|------|-----------------|------|
| **Free Partner** | Generous allocation | $0 |

#### Caching Strategy

```
Cache Key:  fs:{originRegion}:{destination}:{ISO-week}:{tier}
TTL:        900 seconds (15 minutes)
Strategy:   Cache-Aside — check Redis first, call Kiwi on miss, populate cache.
```

---

### 1B. Skyscanner / RapidAPI Travel APIs

| Field | Value |
|-------|-------|
| **Purpose** | Price verification, additional route coverage |
| **Authentication** | `X-RapidAPI-Key` header |
| **Base URL** | `https://skyscanner50.p.rapidapi.com/` (via RapidAPI) |
| **Env Vars** | `RAPIDAPI_SKYSCANNER_KEY` |
| **Docs** | https://rapidapi.com/skyscanner/api/skyscanner50 |

---

### 1C. Duffel

| Field | Value |
|-------|-------|
| **Purpose** | Standardizes full booking checkout flow securely bypassing B2B headaches |
| **Authentication** | `Authorization: Bearer` Token |
| **Base URL** | `https://api.duffel.com/` |
| **Env Vars** | `DUFFEL_ACCESS_TOKEN` |
| **Docs** | https://duffel.com/docs |

#### Rate Limits
Pay-per-booking. No explicit limits per searches.


## 2. Cost-of-Living & Quality Scores

### 2A. WhereNext API

| Field | Value |
|-------|-------|
| **Purpose** | Local cost indices (meals, coffee, transit) replacing expensive Numbeo licenses |
| **Authentication** | API Key header |
| **Base URL** | `https://wherenext.com/api` (Placeholder) |
| **Env Vars** | `WHERENEXT_API_KEY` |

#### Caching Strategy

```
Cron Job:   Daily at 02:00 UTC via BullMQ
Operation:  Pre-fetch ALL active destination CoL data
Cache Key:  col:{destinationSlug}
TTL:        86,400 seconds (24 hours)
```

---

### 2B. Teleport API

| Field | Value |
|-------|-------|
| **Purpose** | City Quality Scores (Safety, walkability, digital nomad score) |
| **Authentication** | None natively. |
| **Base URL** | `https://api.teleport.org/api/` |
| **Docs** | https://developers.teleport.org/api/ |

---

## 3. Weather & Climate

### 3A. Open-Meteo API

| Field | Value |
|-------|-------|
| **Purpose** | Historical archiving calculating optimal regional 2-year climates (temperature, precip, sun) natively |
| **Authentication** | None (Free tier) |
| **Base URL** | `https://archive-api.open-meteo.com/v1/archive` |
| **Docs** | https://open-meteo.com/en/docs/historical-weather-api |

#### Key Endpoints Used

| Endpoint | Description |
|----------|-------------|
| `GET /archive` | Fetch daily archives dynamically aggregating monthly boundaries locally |

#### Rate Limits

| Tier | Limit | Cost | Mitigation |
|------|-------|------|------------|
| **Free API** | 10,000 calls / day | $0 | Offline caching explicitly avoiding redundant network bounds over the baseline |

#### Caching Strategy

```
Cron Job:   Quarterly via BullMQ ("quarterly-climate") directly handled by `seedClimateProfiles.ts`
Cache Key:  climate:{lat}:{lng}:{year}
TTL:        90 Days (7,776,000 seconds) explicitly protecting limits structurally
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

### 4B. GeoDB Cities (RapidAPI)

| Field | Value |
|-------|-------|
| **Purpose** | Base Coordinate resolution dynamically standardizing core geo targets natively internally |
| **Authentication** | `X-RapidAPI-Key` |
| **Base URL** | `https://wft-geo-db.p.rapidapi.com/v1/geo/cities` |
| **Docs** | https://rapidapi.com/wirefreethought/api/geodb-cities |

**Constraints:** 1,000 requests/day strictly bound resolving uniquely via the offline node initialization process within `enrichDestinations.ts`. Rate pacing actively isolates intervals avoiding thresholds. Cached natively into Redis (`geodb:{name}:{countryCode}`) using exact 90-day intervals properly buffering upstream connections reliably.

---

### 4C. REST Countries API

| Field | Value |
|-------|-------|
| **Purpose** | Aggregation explicitly delivering precise regions, flags, languages, dynamic populations formally |
| **Authentication** | None |
| **Base URL** | `https://restcountries.com/v3.1/alpha` |
| **Docs** | https://restcountries.com |

**Strategy:** Resolves rapidly natively leveraging single parameter searches safely. Outputs are deeply parsed leveraging strictly bounded Zod Schemas dynamically verifying inputs locally bounding memory safely structurally enforcing 30-Day TTL boundaries locally securely over the core configurations securely.

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

## 7. Object Storage

### 7A. Cloudflare R2

| Field | Value |
|-------|-------|
| **Purpose** | Blobs (Destination hero images, user uploads, PDF trip exports, map tile caches) |
| **Authentication** | `Access Key ID` & `Secret Access Key` (S3 Compatible API) |
| **Base URL** | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| **Env Vars** | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID` |
| **Docs** | https://developers.cloudflare.com/r2/ |

#### Rate Limits & Pricing

| Action | Free Tier | Cost per million |
|--------|-----------|------------------|
| **Class A Operations (Mutations)** | 1 million / month | $4.50 |
| **Class B Operations (Reads)** | 10 million / month | $0.36 |
| **Egress (Bandwidth)** | Unlimited | $0.00 |

> **Strategy**: R2 is purposely used *alongside* PostgreSQL/MongoDB. The databases will hold the reference strings/URLs, and R2 natively caches out the egress directly to Cloudflare's Edge.

---

## 8. Authentication

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
| **Kiwi Tequila** | Generous Free | 🟡 MEDIUM | Redis cache (15 min TTL); regionalized cache key |
| **WhereNext** | Free Tier | 🟢 LOW | Nightly pre-fetch only; never live on search path |
| **Teleport** | Unlimited | 🟢 LOW | Background enrichment; not on request path |
| **Open-Meteo** | 10K/day free | 🟢 LOW | Quarterly BullMQ CRON + 90 Day offline Cache |
| **GeoDB (RapidAPI)** | 1,000/day free | 🔴 HIGH | Strictly mapped to offline pre-seed integration |
| **REST Countries** | Unlimited | 🟢 LOW | 30-Day TTL caching locally |
| **GPI (CSV DB)**  | Offline | 🟢 LOW | Flat-file CSV tracking updated yearly |
| **Mapbox** | 50K maps/month free | 🟡 MEDIUM | CDN caching of tiles; URL-restricted tokens |
| **Stripe** | 100 req/s | 🟢 LOW | Webhook-driven; no polling |
| **Resend** | 3K–100K/month | 🟢 LOW | BullMQ async queue |

---

## Environment Variable Reference

The following additions to `.env.example` are required to support all integrations:

```bash
# === App ===
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:4000

# === Supabase (PostgreSQL + Auth) ===
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=

# === MongoDB Atlas (Trip Documents) ===
MONGODB_URI=

# === Redis / Upstash (Cache + BullMQ) ===
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# === Maps ===
NEXT_PUBLIC_MAPBOX_TOKEN=
MAPBOX_SECRET_TOKEN=

# === Flight APIs ===
KIWI_TEQUILA_API_KEY=
DUFFEL_ACCESS_TOKEN=
RAPIDAPI_SKYSCANNER_KEY=

# === Cost of Living & Quality ===
WHERENEXT_API_KEY=

# === Payments (Stripe) ===
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# === Notifications ===
RESEND_API_KEY=
EXPO_ACCESS_TOKEN=
```

> [!WARNING]
> Variables prefixed `NEXT_PUBLIC_` are **bundled into the client-side JavaScript** and visible to anyone who inspects the bundle. Never put secrets (Stripe secret key, Supabase service role key, Mapbox secret token) in `NEXT_PUBLIC_` variables.
