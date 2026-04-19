'use client';

/**
 * GlobePanel — Right-side map/globe panel
 * ========================================
 * The right half of the 50/50 split-screen layout used by the (app) route
 * group (explore, dashboard, etc.).
 *
 * Design:
 *  - Uses the Anywhere brand palette via anywhere-map-style.ts
 *  - initAnywhereMap() MUST be called inside map.on('load') — Mapbox layer
 *    APIs (getLayer, setPaintProperty, setFog, etc.) are not available until
 *    the style is fully loaded.
 *  - Returns a cleanup function that cancels the palette-refresh interval.
 *
 * Import pattern (lazy-loaded from app layout to avoid SSR):
 *  const GlobePanel = dynamic(() => import('@/components/panels/GlobePanel')
 *    .then(m => m.GlobePanel), { ssr: false })
 */
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { cn } from '@/lib/utils';
import { getMapStyle, initAnywhereMap } from '@/lib/anywhere-map-style';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

export function GlobePanel({ className }: { className?: string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<mapboxgl.Map | null>(null);

  // ── Map bootstrap ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style:     getMapStyle(),   // NEXT_PUBLIC_MAPBOX_STYLE_URL or mapbox dark-v11
      center:    [0, 20],         // Atlantic/Africa — shows a globe overview
      zoom:      1.5,
      projection: { name: 'globe' },
      // Disable default attribution (we render our own below)
      attributionControl: false,
    });

    mapRef.current = map;

    // ── Apply the Anywhere palette AFTER the style is loaded ─────────────
    // initAnywhereMap calls setPaintProperty / getLayer / setFog which all
    // require the style to be fully loaded first.
    let cleanupAnywhereMap: (() => void) | undefined;

    map.on('load', () => {
      cleanupAnywhereMap = initAnywhereMap(map);
    });

    // Navigation controls (zoom only — no compass needed on globe view)
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      'bottom-right',
    );

    return () => {
      cleanupAnywhereMap?.();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── No-token guard — show branded placeholder instead of crashing WebGL ──
  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={cn(
          'relative w-full h-full overflow-hidden',
          'bg-midnight-800 flex-center flex-col gap-3',
          className,
        )}
        aria-hidden
      >
        <span className="text-parchment-400/50 text-[0.65rem] font-cera uppercase tracking-widest">
          Map unavailable
        </span>
        <span className="text-parchment-400/30 text-[0.6rem] font-cera">
          Set NEXT_PUBLIC_MAPBOX_TOKEN to enable
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative w-full h-full overflow-hidden bg-midnight-800',
        className,
      )}
      aria-hidden // decorative — screen readers use the left panel
    >
      {/* Mapbox GL container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Custom attribution — bottom-left, brand-styled */}
      <div className="absolute bottom-4 left-4 text-[10px] font-cera text-parchment-400/50 pointer-events-none z-10 select-none">
        Map © Mapbox · Anywhere
      </div>

      {/* Budget prompt overlay — replaced later by live BudgetMap controls */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10">
        <div className="bg-midnight-700/80 backdrop-blur-sm border border-midnight-500 rounded-card px-5 py-3 text-center shadow-map-popup">
          <p className="text-[0.7rem] font-cera font-medium uppercase tracking-widest text-parchment-400 mb-0.5">
            Your budget
          </p>
          <p className="text-2xl font-cera font-bold text-parchment-100 tabular-nums">
            $500
          </p>
        </div>
        <p className="text-[0.65rem] font-cera text-parchment-400/70">
          ↑ Set a budget to light up destinations
        </p>
      </div>
    </div>
  );
}
