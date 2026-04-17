# ADR-001: Next.js App Router — Rendering Strategy

| Field       | Value                          |
| ----------- | ------------------------------ |
| **Status**  | Accepted                       |
| **Date**    | 2026-04-17                     |
| **Deciders**| Engineering Team               |
| **Tags**    | frontend, rendering, nextjs    |

---

## Context

Anywhere's web frontend must serve three distinct content types, each with fundamentally different freshness and SEO requirements:

1. **The Budget Map** — the interactive core feature; requires live flight price data to be meaningful. Must be SEO-indexable so that `/explore?budget=500&from=NBO` is crawlable.
2. **Destination Guides** — rich editorial content (e.g., `/destinations/lisbon`) that changes infrequently. These are the primary organic SEO surface.
3. **The Blog / Travel Stories** — contributor-authored posts updated several times per week. Balances freshness with build performance.

Next.js 13+ App Router (`app/` directory) provides per-route control over rendering strategy at the React Server Component level, which is a significant advantage over the older Pages Router where strategy is coarser (per-page, not per-segment).

We are already committed to React/Next.js per the project charter. The decision here is specifically which rendering mode to apply to each route group.

---

## Decision

We adopt **Next.js 14+ App Router** with the following per-route rendering strategy:

### Route Group Mapping

| Route Group                | Strategy | Rationale |
| -------------------------- | -------- | --------- |
| `app/(map)/explore`        | **SSR** (dynamic, `force-dynamic`) | Price data changes every 15–30 min; must be fresh on each request. Server renders with auth-aware data from the Pricing Engine. |
| `app/(destinations)/[slug]`| **SSG** (`generateStaticParams`) | Destination content is stable; generate all ~500 guide pages at build time. Full CDN cacheability, sub-50ms TTFB. |
| `app/(blog)/blog/[slug]`   | **ISR** (`revalidate: 3600`) | Blog posts updated frequently but not live. Revalidate on a 1-hour window; stale-while-revalidating keeps TTFB fast. |
| `app/(auth)/...`           | **CSR** (Client Component) | Auth flows are not crawled; no SSR overhead needed. |
| `app/(dashboard)/...`      | **SSR** (session-gated) | Pro user dashboards require auth context from cookies; never cached. |

### Key Configuration

```ts
// app/(map)/explore/page.tsx
export const dynamic = 'force-dynamic';
export const fetchCache = 'no-store';

// app/(destinations)/[slug]/page.tsx
export async function generateStaticParams() {
  const destinations = await getDestinations(); // CMS/DB fetch at build time
  return destinations.map((d) => ({ slug: d.slug }));
}
export const revalidate = false; // fully static until next build

// app/(blog)/blog/[slug]/page.tsx
export const revalidate = 3600; // ISR: re-generate at most once per hour
```

### Streaming & Suspense

The map page uses React Suspense boundaries to stream the shell (header, budget slider UI) immediately while awaiting the flight price fetch. This yields a good LCP even for SSR pages with slow upstream APIs.

```tsx
// app/(map)/explore/page.tsx
import { Suspense } from 'react';
import { MapShell } from '@/components/MapShell';
import { PriceLayer } from '@/components/PriceLayer';

export default function ExplorePage() {
  return (
    <MapShell>
      <Suspense fallback={<PriceLayerSkeleton />}>
        <PriceLayer /> {/* async Server Component — fetches from Pricing Engine */}
      </Suspense>
    </MapShell>
  );
}
```

---

## Alternatives Considered

### Option A: Pages Router with `getServerSideProps` / `getStaticProps`
- **Rejected**: Per-page granularity is insufficient. A blog post list page and individual post must share the same strategy in Pages Router, whereas App Router supports per-segment override.

### Option B: Full CSR (Vite + React SPA)
- **Rejected**: Flight search pages need to be crawlable for organic SEO (e.g., "cheap flights from Nairobi under $500"). CSR pages are not reliably indexed.

### Option C: Gatsby (SSG-only with incremental builds)
- **Rejected**: No native SSR capability, making real-time price pages impossible without a separate service.

### Option D: Remix
- **Rejected**: Strong SSR model but no native ISR primitive; blog revalidation would require custom logic. Next.js ecosystem is a better fit for the existing team.

---

## Consequences

### Positive
- Single framework handles all three rendering modes, reducing operational complexity.
- ISR for blog means content editors see changes within 1 hour without a full redeploy.
- SSG destination pages score near-perfect Lighthouse scores (no server round-trip).
- Streaming SSR minimizes perceived latency on the price-sensitive map page.

### Negative
- App Router's caching model (fetch cache, Data Cache, Full Route Cache) is complex and has several known footguns (e.g., cookies cannot be read in cached Server Components). Team must invest in understanding the caching hierarchy.
- `force-dynamic` map pages cannot be served from CDN edge cache; origin must handle burst traffic. Mitigated by Cloudflare WAF rate limiting and Redis upstream caching.
- `generateStaticParams` with 500+ destinations increases build time. Mitigated with Turborepo remote caching and incremental static regeneration for new destinations.

### Risk: External API Latency on SSR Pages
The map page's SSR render time is bounded by the Pricing Engine's response time. If the Pricing Engine is slow (cache miss → Amadeus round-trip), TTFB degrades. Mitigation: streaming + skeleton UI so the page shell loads immediately.

---

## References
- [Next.js App Router Docs — Rendering](https://nextjs.org/docs/app/building-your-application/rendering)
- [Next.js Caching Deep-Dive](https://nextjs.org/docs/app/building-your-application/caching)
- [PROJECT.md — Architecture Layer: Client Layer](../../PROJECT.md)
