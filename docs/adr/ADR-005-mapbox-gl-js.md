# ADR-005: Mapbox GL JS for Custom Interactive Budget Map

| Field       | Value                              |
| ----------- | ---------------------------------- |
| **Status**  | Accepted                           |
| **Date**    | 2026-04-17                         |
| **Deciders**| Engineering Team                   |
| **Tags**    | frontend, maps, mapbox, geo        |

---

## Context

The **Budget Map** is Anywhere's primary differentiator. It is the interactive surface where users set a budget and visually see which destinations the world offers them — clusters of affordable cities light up; expensive ones fade. This is not a simple "drop a pin on a map" use case.

Requirements:
1. **Custom data layer** — destinations must be rendered as dynamic GL markers with real-time price overlays driven by Redis-cached data.
2. **Clustering** — at global zoom, hundreds of destination markers must cluster to avoid visual clutter.
3. **Animated transitions** — when a user moves the budget slider, markers should smoothly fade in/out (WebGL opacity transitions).
4. **Custom cartography** — the base map style must be stripped-back, dark-mode compatible, and unbranded (no Google logo, no Google watermarks on a competitor's product).
5. **Performance** — rendering must stay above 60 fps with 500+ active destination markers.
6. **SEO** — static map thumbnail images for destination guide OG images (Mapbox Static Images API).

---

## Decision

We adopt **Mapbox GL JS** (v3+) as the exclusive map library. **No Google Maps dependency** is introduced into the codebase.

### Why Mapbox over Google Maps

| Criterion | Mapbox GL JS | Google Maps JS API |
|-----------|-------------|-------------------|
| Custom style (dark map) | ✅ Mapbox Studio, full control | ⚠️ Limited; Google watermarks mandatory |
| WebGL rendering (60fps) | ✅ Native WebGL | ❌ Canvas/DOM-based, slower for custom layers |
| Custom data layers | ✅ GeoJSON sources + expressions | ⚠️ Possible but verbose |
| Marker animation (budget slider) | ✅ `setPaintProperty` hot-reloading | ❌ Requires DOM manipulation per-marker |
| Clustering | ✅ Built-in `cluster` source option | ⚠️ Requires third-party library |
| Static image API for OG | ✅ Mapbox Static Images API | ✅ Google Static Maps API |
| Pricing model | Per map load (free 50K/month) | Per map load ($7/1K after 28K) |
| SSR compatibility | ✅ `mapbox-gl` can be lazy-loaded | ✅ |
| Open-source | ✅ BSD (v1) / proprietary (v2+) but usable | ❌ Proprietary |

### Core Integration Pattern

The map is a Client Component (WebGL cannot run server-side). It is lazy-loaded below a Suspense boundary established in ADR-001.

```tsx
// apps/web/src/components/BudgetMap/BudgetMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { DestinationFeature } from '@anywhere/types';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

interface BudgetMapProps {
  destinations: DestinationFeature[];
  budget: number;
}

export function BudgetMap({ destinations, budget }: BudgetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/anywhere/dark-travel-v1',  // Custom Studio style
      center: [20, 10],
      zoom: 2,
      projection: 'globe',  // 3D globe projection — visual differentiator
    });

    const map = mapRef.current;
    map.on('load', () => {
      // GeoJSON source driven by destination data
      map.addSource('destinations', {
        type: 'geojson',
        data: buildGeoJSON(destinations),
        cluster: true,
        clusterMaxZoom: 5,
        clusterRadius: 50,
      });

      // Cluster circles
      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'destinations',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': ['step', ['get', 'point_count'], '#6366f1', 10, '#8b5cf6', 30, '#a855f7'],
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
          'circle-opacity': 0.85,
        },
      });

      // Individual destination markers — colour driven by affordability
      map.addLayer({
        id: 'destination-points',
        type: 'circle',
        source: 'destinations',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8,
          // Green if affordable (cost ≤ budget), red if not
          'circle-color': [
            'case',
            ['<=', ['get', 'totalCostUsd'], budget], '#22c55e',
            '#ef4444',
          ],
          'circle-opacity': [
            'case',
            ['<=', ['get', 'totalCostUsd'], budget], 1,
            0.25,  // Fade out unaffordable destinations
          ],
        },
      });
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Hot-update paint properties when budget slider changes (no re-render)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    map.setPaintProperty('destination-points', 'circle-color', [
      'case', ['<=', ['get', 'totalCostUsd'], budget], '#22c55e', '#ef4444',
    ]);
    map.setPaintProperty('destination-points', 'circle-opacity', [
      'case', ['<=', ['get', 'totalCostUsd'], budget], 1, 0.25,
    ]);
  }, [budget]);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

> **Critical pattern**: When the budget slider changes, we call `map.setPaintProperty()` directly — this is a WebGL paint property hot-reload that does **not** trigger a React re-render or map re-initialization. This keeps the slider at 60fps even with 500+ markers.

### Custom Map Style

A custom Mapbox Studio style (`mapbox://styles/anywhere/dark-travel-v1`) is maintained that:
- Uses a near-black (`#0a0a0a`) background
- Removes business POI layers (no restaurants, shops, etc.)
- Retains country borders, coastlines, and major city labels only
- Matches Anywhere's brand palette

### Static Image API for OG Tags

```ts
// apps/web/src/lib/mapbox.ts
export function getDestinationOgImageUrl(lat: number, lng: number): string {
  const token = process.env.MAPBOX_SECRET_TOKEN; // server-side only
  return `https://api.mapbox.com/styles/v1/anywhere/dark-travel-v1/static/` +
    `pin-l+6366f1(${lng},${lat})/${lng},${lat},8,0/1200x630?access_token=${token}`;
}
```

Used in destination guide page metadata:
```ts
// app/(destinations)/[slug]/page.tsx
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const dest = await getDestination(params.slug);
  return {
    openGraph: {
      images: [{ url: getDestinationOgImageUrl(dest.lat, dest.lng) }],
    },
  };
}
```

### Environment Variables Required

```bash
# .env.example additions
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...   # Public token — safe to expose (URL-restricted in Mapbox dashboard)
MAPBOX_SECRET_TOKEN=sk.eyJ1...        # Secret token — server-side Static Images API only
```

---

## Alternatives Considered

### Option A: Google Maps JavaScript API
- **Rejected**: Mandatory Google branding conflicts with Anywhere's premium custom design. Dynamic data layers (500+ animated markers) require DOM manipulation per marker — cannot match Mapbox GL's WebGL performance. Pricing becomes expensive at scale ($7/1K loads after 28K free).

### Option B: Leaflet.js + OpenStreetMap
- **Rejected**: Leaflet uses DOM-based rendering (SVG/Canvas), not WebGL. Cannot achieve 60fps animated transitions with 500+ markers. Custom cartography is limited without significant tile server infrastructure.

### Option C: Deck.gl (Uber) over Mapbox
- **Considered**: Deck.gl provides more powerful data visualization layers (hexbins, arcs). Retained as a future option for the Analytics Dashboard (Pro feature) but overkill for the initial budget map. Deck.gl integrates with Mapbox GL JS — not mutually exclusive.

### Option D: react-map-gl (Visgl)
- **Considered**: `react-map-gl` is a React wrapper over Mapbox GL JS. Rejected for the primary map component because React's reconciliation cycle adds latency to paint property updates (budget slider → marker color). We use Mapbox GL JS directly with `useRef` for the performance-critical map. `react-map-gl` may be used for simpler embedded maps (e.g., destination cards).

---

## Consequences

### Positive
- WebGL rendering sustains 60fps with 500+ animated markers — the budget slider animation is silky.
- `setPaintProperty()` pattern completely decouples React state from WebGL rendering — no performance cliff as destination count grows.
- Mapbox Studio custom style gives Anywhere a visually distinctive map no other travel app will look like.
- Static Images API enables proper OG images for every destination guide page with zero additional infrastructure.

### Negative
- Mapbox GL JS is `~260KB` gzipped — significant bundle contribution. Mitigated by dynamic import (`next/dynamic`) so it only loads when the map page is visited.
- Mapbox v2+ is proprietary (no longer open-source). If Mapbox changes pricing significantly, migration to MapLibre GL JS (community fork) is straightforward since the API is compatible.
- `NEXT_PUBLIC_MAPBOX_TOKEN` is exposed in the browser. Mitigate by adding URL restrictions in the Mapbox dashboard (only allow requests from `*.anywhere.travel`).
- Team needs familiarity with GeoJSON, Mapbox expressions, and the GL JS paint property system.

---

## References
- [Mapbox GL JS Documentation](https://docs.mapbox.com/mapbox-gl-js/api/)
- [Mapbox Studio Custom Styles](https://docs.mapbox.com/studio-manual/)
- [Mapbox Static Images API](https://docs.mapbox.com/api/maps/static-images/)
- [MapLibre GL JS (OSS fork)](https://maplibre.org/)
- [react-map-gl](https://visgl.github.io/react-map-gl/)
- [PROJECT.md — Client Layer](../../PROJECT.md)
