# Secrets Management — Operational Runbook

> **Decision**: [ADR-006 — Doppler as single source of truth](./adr/ADR-006-secrets-management.md)  
> **Last Updated**: 2026-04-17  
> **Owner**: Engineering Team

---

## Overview

All secrets for **Anywhere** are managed by [Doppler](https://doppler.com). No secret ever lives in:
- A `.env` file committed to git
- A Slack message or email thread
- A provider dashboard set manually without also being in Doppler

Doppler is the **canonical location**. All other locations (Vercel dashboard, Railway service variables) are treated as **derived caches** — they should never be edited directly.

```
Doppler (source of truth)
    ├─► Vercel env vars    (web app)
    ├─► Railway variables  (microservices)
    └─► Local dev          (doppler run -- npm run dev)
```

---

## Environment Structure

| Doppler Config | Maps To | Used By |
|---------------|---------|---------|
| `development` | Local development | Every engineer's machine |
| `staging` | Staging | Railway staging services + Vercel preview branch |
| `production` | Production | Railway prod services + Vercel production |

### Config Inheritance

```
root (shared non-sensitive config)
 ├── development    (overrides: dev API keys, dev DB URLs, mocked 3rd-party URLs)
 ├── staging        (overrides: staging API keys, staging DB, real but sandboxed 3rd-party)
 └── production     (overrides: live API keys, production DB, real 3rd-party integrations)
```

Values defined at the `root` level are available in all three configs unless explicitly overridden.

---

## First-Time Setup (New Developer)

### 1. Install the Doppler CLI

```bash
# macOS
brew install dopplerhq/cli/doppler

# Linux / CI
curl -Ls --tlsv1.2 --proto "=https" --retry 3 https://cli.doppler.com/install.sh | sh
```

### 2. Authenticate

```bash
doppler login
# Opens browser for SSO authentication
```

### 3. Link the project

```bash
# From the repo root — reads doppler.yaml and links to the 'dev' config
doppler setup
```

### 4. Run locally

```bash
# Injects all secrets as env vars into the dev process — no .env file needed
doppler run -- npm run dev

# Or for a specific service:
doppler run --config dev -- node apps/api/dist/services/auth/server.js
```

> After `doppler setup`, you can also use `npm run dev` directly if you add the Doppler prefix to the turbo.json task entry point. See [Turbo + Doppler](#turbo--doppler-integration) below.

---

## Turbo + Doppler Integration

Add a root-level dev script wrapper so `npm run dev` auto-injects secrets:

```json
// package.json (root)
{
  "scripts": {
    "dev": "doppler run -- turbo run dev",
    "dev:notunnel": "turbo run dev"  // escape hatch for CI without Doppler
  }
}
```

---

## Vercel Integration

### Recommended: Native Doppler × Vercel Integration

1. Go to **Doppler Dashboard → your project → Integrations → Vercel**
2. Authorize Doppler to access your Vercel account
3. Map configs to Vercel environments:

| Doppler Config | Vercel Environment |
|---------------|--------------------|
| `prd` | Production |
| `stg` | Preview |
| `dev` | Development |

4. Doppler automatically pushes secrets to Vercel on every secret change. Vercel redeployments pick up changes on the next build.

### Fallback: CLI Script

```bash
# Sync staging config to Vercel preview environment
./scripts/secrets/sync-vercel.sh stg preview

# Sync production config to Vercel production environment
./scripts/secrets/sync-vercel.sh prd production
```

> [!WARNING]
> Do **not** edit Vercel environment variables directly in the Vercel dashboard. They will be overwritten on the next Doppler sync. Always change secrets in Doppler.

### Variables That Must Be Set Manually in Vercel

Some Vercel-specific build-time variables cannot come from Doppler (they are consumed by Vercel's build infrastructure before Doppler runs):

| Variable | Where to set | Why |
|----------|-------------|-----|
| `VERCEL_URL` | Auto-set by Vercel | Deployment URL |
| `NEXT_PUBLIC_VERCEL_ENV` | Auto-set by Vercel | `production`/`preview`/`development` |

---

## Railway Integration

### Recommended: Doppler Service Token Injection

Each Railway service runs with a Doppler service token injected as an environment variable. The service token allows the container to pull its own secrets at startup.

**Step 1**: Create a Doppler service token per environment:
```bash
# Create a read-only service token for prd
doppler configs tokens create \
  --project anywhere \
  --config prd \
  --name railway-prd-token \
  --max-reads 0   # unlimited reads
```

**Step 2**: In Railway dashboard, add to **each service**:
```
DOPPLER_TOKEN = <token from step 1>
```

**Step 3**: Update the service start command:
```bash
# Railway service Start Command
doppler run -- node dist/server.js
```

This way Railway's own variable store holds only the Doppler token — all other secrets come from Doppler at runtime.

### Service Token Matrix

| Service | Doppler Config | Token Name Convention |
|---------|---------------|----------------------|
| `search-service` (prd) | `prd` | `railway-prd-search` |
| `pricing-engine` (prd) | `prd` | `railway-prd-pricing` |
| `auth-service` (prd) | `prd` | `railway-prd-auth` |
| `group-sync` (prd) | `prd` | `railway-prd-group-sync` |
| `notification-service` (prd) | `prd` | `railway-prd-notifications` |
| `affiliate-tracker` (prd) | `prd` | `railway-prd-affiliate` |
| `*` (stg) | `stg` | `railway-stg-<service>` |

> Each service token is **scoped to one config** — a staging token cannot read production secrets.

### Fallback: CLI Bulk Sync

```bash
# Bootstrap a new Railway service with all secrets
./scripts/secrets/sync-railway.sh prd production pricing-engine
```

---

## GitHub Actions CI Integration

CI jobs need secrets to run tests and deployments. Never hard-code secrets in workflow files.

```yaml
# .github/workflows/ci.yml (excerpt)
jobs:
  test:
    runs-on: ubuntu-latest
    env:
      DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN_STG }}  # Set in GitHub repo secrets
    steps:
      - uses: actions/checkout@v4

      - name: Install Doppler CLI
        uses: dopplerhq/cli-action@v3

      - name: Run tests with secrets injected
        run: doppler run --config stg -- npm run test
```

### GitHub Repository Secrets Required

| Secret Name | Value | Purpose |
|-------------|-------|---------|
| `DOPPLER_TOKEN_DEV` | Doppler service token for `dev` | PR preview tests |
| `DOPPLER_TOKEN_STG` | Doppler service token for `stg` | CI test suite |
| `DOPPLER_TOKEN_PRD` | Doppler service token for `prd` | Production deploy |
| `VERCEL_TOKEN` | Vercel personal access token | CLI deployments |
| `RAILWAY_TOKEN` | Railway project token | Railway deployments |

> These four secrets are the **only** secrets that live in GitHub. Everything else flows through Doppler.

---

## API Key Naming Convention

All secrets follow this naming pattern:

```
{PROVIDER}_{QUALIFIER}_{TYPE}
```

| Segment | Values | Examples |
|---------|--------|---------|
| `{PROVIDER}` | Short uppercase provider name | `AMADEUS`, `MAPBOX`, `STRIPE`, `SUPABASE`, `NUMBEO`, `RESEND` |
| `{QUALIFIER}` | Optional scope modifier | `SECRET`, `PUBLIC`, `WEBHOOK`, `SERVICE_ROLE`, `ANON` |
| `{TYPE}` | Key type | `KEY`, `TOKEN`, `SECRET`, `ID`, `URL`, `URI` |

### Full Key Registry

| Secret Name | Provider | Scope | Visibility |
|-------------|---------|-------|-----------|
| `AMADEUS_CLIENT_ID` | Amadeus | API credential | Server-only |
| `AMADEUS_CLIENT_SECRET` | Amadeus | API credential | Server-only |
| `RAPIDAPI_SKYSCANNER_KEY` | RapidAPI/Skyscanner | API key | Server-only |
| `NUMBEO_API_KEY` | Numbeo | API key | Server-only |
| `OPENWEATHERMAP_API_KEY` | OpenWeatherMap | API key | Server-only |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox | Public map token | **Client-exposed** (URL-restricted) |
| `MAPBOX_SECRET_TOKEN` | Mapbox | Static Images API | Server-only |
| `DATABASE_URL` | Supabase/PostgreSQL | Connection string | Server-only |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Project URL | **Client-exposed** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Anon/public key | **Client-exposed** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Admin access | Server-only |
| `SUPABASE_AUTH_GOOGLE_CLIENT_ID` | Google OAuth | OAuth credential | Server-only |
| `SUPABASE_AUTH_GOOGLE_SECRET` | Google OAuth | OAuth secret | Server-only |
| `MONGODB_URI` | MongoDB Atlas | Connection string | Server-only |
| `UPSTASH_REDIS_REST_URL` | Upstash | REST endpoint | Server-only |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | API token | Server-only |
| `STRIPE_SECRET_KEY` | Stripe | Payment API | Server-only |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook validation | Server-only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe | Client-side payments | **Client-exposed** |
| `RESEND_API_KEY` | Resend | Email API | Server-only |
| `EXPO_ACCESS_TOKEN` | Expo | Push notifications | Server-only |

> [!CAUTION]
> **Client-exposed** keys (prefixed `NEXT_PUBLIC_`) are bundled into the JavaScript sent to the browser. They must be restricted by referrer/origin in the provider's dashboard. They are **not secrets** in the traditional sense — they are designed to be public but scoped.

---

## Key Rotation Policy

### Rotation Schedule

| Secret Category | Rotation Interval | Method | Priority |
|----------------|------------------|--------|---------|
| Payment keys (`STRIPE_*`) | **30 days** or on any suspected breach | `rotate-key.sh` + Stripe dashboard | 🔴 Critical |
| Database passwords (`DATABASE_URL`, `MONGODB_URI`) | **90 days** | Supabase/Atlas rotation + `rotate-key.sh` | 🔴 Critical |
| Flight API credentials (`AMADEUS_*`) | **90 days** | Amadeus developer portal + `rotate-key.sh` | 🟡 High |
| OAuth secrets (`SUPABASE_AUTH_*`) | **180 days** | Google Cloud Console + `rotate-key.sh` | 🟡 High |
| Map tokens (`MAPBOX_*`) | **90 days** | Mapbox dashboard + `rotate-key.sh` | 🟡 High |
| Cache/queue tokens (`UPSTASH_*`) | **180 days** | Upstash dashboard + `rotate-key.sh` | 🟢 Medium |
| Notification keys (`RESEND_*`, `EXPO_*`) | **180 days** | Provider dashboard + `rotate-key.sh` | 🟢 Medium |
| CoL/Weather keys (`NUMBEO_*`, `OPENWEATHERMAP_*`) | **365 days** | Provider dashboard + `rotate-key.sh` | 🟢 Low |
| Doppler service tokens | **On team member departure** | Doppler dashboard | 🔴 Critical |

### Rotation Procedure

```bash
# 1. Generate new key in the provider's dashboard (keep old key active for now)
# 2. Update all Doppler environments
./scripts/secrets/rotate-key.sh AMADEUS_CLIENT_SECRET "new-value-here"

# 3. Verify staging deployment is healthy (Doppler sync → Railway restart → healthcheck)
curl https://staging.api.anywhere.travel/health

# 4. Verify production deployment is healthy
curl https://api.anywhere.travel/health

# 5. Revoke the OLD key in the provider's dashboard
# 6. Confirm the rotation log entry in docs/secret-rotation.log
```

### Breach Response (Immediate Rotation)

If a key is suspected compromised:

```bash
# 1. IMMEDIATELY revoke the key in the provider's dashboard
# 2. Generate a new key
# 3. Rotate across all environments simultaneously
./scripts/secrets/rotate-key.sh <SECRET_NAME> "<new-value>"
# 4. Check provider's audit log for unauthorized usage
# 5. File an incident report in the team Slack #incidents channel
```

---

## Rotation Log

All rotations are appended to [`docs/secret-rotation.log`](./secret-rotation.log) by `rotate-key.sh`.

Format: `{ISO-8601-UTC} | ROTATE | {SECRET_NAME} | {actor-email}`

Example:
```
2026-04-17T18:00:00Z | ROTATE | AMADEUS_CLIENT_SECRET | samuel@anywhere.travel
2026-04-17T18:05:00Z | ROTATE | STRIPE_SECRET_KEY     | samuel@anywhere.travel
```

This log is committed to the repo (values are never logged, only key names and actors).

---

## Team Offboarding

When a team member leaves:

1. Remove them from the Doppler project (Doppler dashboard → Members)
2. Rotate all Doppler service tokens they had access to
3. Any personal access tokens they created in Vercel/Railway must be revoked
4. Run `./scripts/secrets/rotate-key.sh` for any secret they had sole knowledge of

---

## Security Rules (Non-Negotiable)

> [!CAUTION]
> Violations of these rules must be treated as security incidents.

1. **Never** commit a `.env` file with real values to git — `.gitignore` enforces this.
2. **Never** paste a production secret into Slack, email, or a GitHub issue.
3. **Never** edit Vercel or Railway environment variables directly — Doppler is the source of truth.
4. **Never** use a production service token in a development machine.
5. **Always** use a separate key per environment (dev/stg/prd never share the same API key).
6. **Always** rotate a key if you suspect it appeared in a log, error message, or public channel.
