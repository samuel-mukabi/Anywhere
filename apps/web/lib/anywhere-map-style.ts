/**
 * Anywhere App — Mapbox Style Configuration
 * ==========================================
 * Time-of-day adaptive map style using the Anywhere brand palette.
 *
 * Brand palette — values mirror packages/ui/tokens.css exactly:
 *   Parchment-300  #EEEBD9  (--aw-parchment-300)  — label text / pin stroke
 *   Nearblack-800  #282427  (--aw-nearblack-800)   — day-mode land base
 *   Terracotta-500 #C87840  (--aw-terracotta-500)  — destination pins (all modes)
 *   Sage-700       #3D6B5E  (--aw-sage-700)        — vegetation / park layers
 *   Midnight-800   #1C2B36  (--aw-midnight-800)    — dark-mode water / ocean base
 *
 * Usage:
 *   import { getMapStyle, initAnywhereMap } from './anywhere-map-style'
 *
 *   // Always call initAnywhereMap inside map.on('load') so layer APIs are ready:
 *   const map = new mapboxgl.Map({
 *     container: 'map',
 *     style: getMapStyle(),
 *   })
 *   map.on('load', () => {
 *     const cleanup = initAnywhereMap(map)
 *     // call cleanup() on component unmount
 *   })
 *
 *   // Or manually pick a mode for testing:
 *   const map = new mapboxgl.Map({ style: getMapStyle('dusk'), ... })
 */

import mapboxgl from 'mapbox-gl'

// ─────────────────────────────────────────────
// Brand palette constants — mirrors tokens.css
// ─────────────────────────────────────────────

/**
 * Hex values sourced directly from packages/ui/tokens.css.
 * Use these in any Mapbox paint / layout property that needs a brand colour,
 * so there is one traceable reference back to the design token source of truth.
 */
export const BRAND = {
  // Parchment
  parchment300:  '#EEEBD9',   // --aw-parchment-300: main bg / label text
  parchment200:  '#F5F2E6',   // --aw-parchment-200: card surfaces
  parchment100:  '#F9F7EE',   // --aw-parchment-100

  // Nearblack
  nearblack800:  '#282427',   // --aw-nearblack-800: primary text
  nearblack700:  '#3D3940',   // --aw-nearblack-700
  nearblack600:  '#5C5860',   // --aw-nearblack-600: secondary text

  // Terracotta (primary / brand action)
  terracotta900: '#6B340D',   // --aw-terracotta-900
  terracotta700: '#904814',   // --aw-terracotta-700: primary CTA (dark)
  terracotta600: '#AF602A',   // --aw-terracotta-600: hover
  terracotta500: '#C87840',   // --aw-terracotta-500: map pin accent
  terracotta400: '#E09A62',   // --aw-terracotta-400: light accent

  // Sage (secondary / nature)
  sage700:       '#3D6B5E',   // --aw-sage-700: secondary
  sage600:       '#4F8275',   // --aw-sage-600: hover
  sage400:       '#7DADA2',   // --aw-sage-400

  // Midnight (map / dark surfaces)
  midnight900:   '#0E1820',   // --aw-midnight-900
  midnight800:   '#1C2B36',   // --aw-midnight-800: globe bg / ocean
  midnight700:   '#243344',   // --aw-midnight-700
  midnight600:   '#2E4258',   // --aw-midnight-600
  midnight500:   '#3A526B',   // --aw-midnight-500

  // Gold (Pro tier)
  gold500:       '#D4A017',   // --aw-gold-500
  gold400:       '#E8B84B',   // --aw-gold-400

  // Semantic
  affordable:    '#22C55E',   // --aw-affordable: within budget
  overbudget:    '#EF4444',   // --aw-overbudget: over budget
} as const

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night'

interface PaletteStop {
  /** CSS/Mapbox colour string */
  color: string
  opacity?: number
}

interface MapPalette {
  /** Label shown in the UI toggle (optional) */
  label: string
  /** Hour range [start, end) — 24h clock */
  hours: [number, number]

  // ── Water / Ocean ──────────────────────────
  ocean: string         // deep water, sea
  inlandWater: string   // rivers, lakes

  // ── Land ───────────────────────────────────
  land: string          // default continent fill
  landSubtle: string    // used for national parks, urban areas
  sand: string          // beaches, deserts

  // ── Infrastructure (very muted) ────────────
  roadMinor: string
  roadMajor: string
  building: string

  // ── Labels ─────────────────────────────────
  labelCountry: string
  labelCountryOpacity: number
  labelOcean: string
  haloColor: string
  haloWidth: number

  // ── Admin borders ──────────────────────────
  borderColor: string
  borderOpacity: number

  // ── Sky / atmosphere ───────────────────────
  skyColor: string      // shown above the horizon in 3D mode
  fogColor: string      // Mapbox fog / atmosphere

  // ── Grid lines (lat/lon) ───────────────────
  gridColor: string
  gridOpacity: number
}

// ─────────────────────────────────────────────
// Palette definitions — one per time-of-day
// ─────────────────────────────────────────────

const PALETTES: Record<TimeOfDay, MapPalette> = {

  // ── DAWN ──────────────────────────────────────────────────────────────────
  // 05:00 – 08:00. The ocean warms toward a deep rose-indigo.
  // Land catches the first golden light. Labels are warm cream.
  // Brand terracotta (#C4713A) feels natural in this palette.
  dawn: {
    label: 'Dawn',
    hours: [5, 8],

    ocean:        '#1A2A3E',   // deep indigo-blue
    inlandWater:  '#152233',   // slightly darker than ocean

    land:         '#2C3A30',   // forest-dark with a warm green undertone
    landSubtle:   '#253328',   // parks, slightly deeper
    sand:         '#3D3220',   // warm dark sand

    roadMinor:    'rgba(238,235,217,0.03)',
    roadMajor:    'rgba(238,235,217,0.06)',
    building:     'rgba(238,235,217,0.04)',

    labelCountry: '#EEEBD9',   // brand parchment
    labelCountryOpacity: 0.55,
    labelOcean:   '#EEEBD9',
    haloColor:    'rgba(20,28,38,0.85)',
    haloWidth:    1.2,

    borderColor:  '#C4713A',   // terracotta borders at dawn — warm and subtle
    borderOpacity: 0.12,

    skyColor:     '#2D1F35',   // pre-sunrise purple sky
    fogColor:     '#3B2535',   // warm mauve fog on the horizon

    gridColor:    '#EEEBD9',
    gridOpacity:  0.025,
  },

  // ── DAY ───────────────────────────────────────────────────────────────────
  // 08:00 – 17:00. Not too bright — closer to an editorial atlas look.
  // Land is a warm dark slate. Ocean stays deep.
  // Brand near-black (#282427) anchors the land masses.
  day: {
    label: 'Day',
    hours: [8, 17],

    ocean:        '#1E3348',   // readable deep blue — lighter than night
    inlandWater:  '#182A3C',

    land:         '#2A3240',   // warm blue-grey slate — key day differentiator
    landSubtle:   '#233039',   // parks slightly distinct
    sand:         '#3A3228',   // warm dark sand

    roadMinor:    'rgba(238,235,217,0.04)',
    roadMajor:    'rgba(238,235,217,0.08)',
    building:     'rgba(238,235,217,0.05)',

    labelCountry: '#EEEBD9',   // brand parchment at full contrast for readability
    labelCountryOpacity: 0.70,
    labelOcean:   '#EEEBD9',
    haloColor:    'rgba(26,35,48,0.9)',
    haloWidth:    1.5,

    borderColor:  '#EEEBD9',   // parchment borders — clean and editorial
    borderOpacity: 0.10,

    skyColor:     '#1E3348',
    fogColor:     '#243C54',

    gridColor:    '#EEEBD9',
    gridOpacity:  0.04,
  },

  // ── DUSK ──────────────────────────────────────────────────────────────────
  // 17:00 – 20:00. The golden-hour mode. The full brand palette comes alive.
  // Terracotta (#C4713A) bleeds into land edges. Sage (#3D6B5E) in parks.
  // This is the "hero" mode that matches the app's marketing imagery.
  dusk: {
    label: 'Dusk',
    hours: [17, 20],

    ocean:        '#1C2B36',   // exact brand "Ocean" color
    inlandWater:  '#162330',

    land:         '#2B2E2C',   // near-neutral dark with warm undertone
    landSubtle:   '#293530',   // parks: sage-shifted
    sand:         '#3D2E1E',   // warm amber sand

    roadMinor:    'rgba(196,113,58,0.05)',   // terracotta roads at dusk
    roadMajor:    'rgba(196,113,58,0.10)',
    building:     'rgba(196,113,58,0.06)',

    labelCountry: '#EEEBD9',
    labelCountryOpacity: 0.65,
    labelOcean:   '#EEEBD9',
    haloColor:    'rgba(28,43,54,0.9)',
    haloWidth:    1.2,

    borderColor:  '#C4713A',   // terracotta borders — the signature dusk look
    borderOpacity: 0.20,

    skyColor:     '#2B1F18',   // burnt orange sky
    fogColor:     '#3A2518',   // deep amber fog

    gridColor:    '#C4713A',   // terracotta grid at dusk
    gridOpacity:  0.04,
  },

  // ── NIGHT ─────────────────────────────────────────────────────────────────
  // 20:00 – 05:00. Deepest and most minimal. Near-black land.
  // Ocean is barely distinguishable from land — unity in darkness.
  // Sage (#3D6B5E) provides the only colour accent outside of pins.
  night: {
    label: 'Night',
    hours: [20, 5],

    ocean:        '#0D1E27',   // deepest ocean
    inlandWater:  '#0A1820',

    land:         '#1A2228',   // very dark — close to near-black (#282427)
    landSubtle:   '#1E2B24',   // parks: barely-there sage undertone
    sand:         '#251E16',   // dark sand

    roadMinor:    'rgba(255,255,255,0.02)',
    roadMajor:    'rgba(255,255,255,0.04)',
    building:     'rgba(255,255,255,0.02)',

    labelCountry: '#EEEBD9',
    labelCountryOpacity: 0.30,   // most muted — night is not for reading
    labelOcean:   '#EEEBD9',
    haloColor:    'rgba(10,20,28,0.95)',
    haloWidth:    1.5,

    borderColor:  '#3D6B5E',   // sage borders — the only warmth in the night
    borderOpacity: 0.15,

    skyColor:     '#0A0F18',
    fogColor:     '#0D1520',

    gridColor:    '#EEEBD9',
    gridOpacity:  0.015,
  },
}

// ─────────────────────────────────────────────
// Time-of-day detection
// ─────────────────────────────────────────────

/**
 * Detects the current time-of-day bucket from the local clock.
 */
export function detectTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5  && hour < 8)  return 'dawn'
  if (hour >= 8  && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

/**
 * Returns the palette for a given (or auto-detected) time of day.
 */
export function getPalette(mode?: TimeOfDay): MapPalette {
  return PALETTES[mode ?? detectTimeOfDay()]
}

// ─────────────────────────────────────────────
// Paint-property override builder
// ─────────────────────────────────────────────
//
// These functions return the Mapbox paint/layout objects that you apply
// to each layer via map.setPaintProperty() or in the style JSON.

/**
 * Returns an object mapping { layerId → { property → value } }
 * ready to be applied with applyTimeOfDay().
 */
export function buildPaintOverrides(p: MapPalette) {
  return {

    // ── Background ────────────────────────────────────────────────────────
    background: {
      paint: { 'background-color': p.ocean },
    },

    // ── Water ─────────────────────────────────────────────────────────────
    water: {
      paint: { 'fill-color': p.inlandWater, 'fill-opacity': 1 },
    },
    'water-shadow': {
      paint: { 'fill-color': p.inlandWater, 'fill-opacity': 0.6 },
    },

    // ── Land ──────────────────────────────────────────────────────────────
    land: {
      paint: { 'fill-color': p.land, 'fill-opacity': 1 },
    },
    landmass: {
      paint: { 'fill-color': p.land, 'fill-opacity': 1 },
    },
    'land-structure-polygon': {
      paint: { 'fill-color': p.land },
    },

    // Parks & natural areas — sage-shifted
    'national-park': {
      paint: { 'fill-color': p.landSubtle, 'fill-opacity': 0.8 },
    },
    'landuse': {
      paint: { 'fill-color': p.landSubtle, 'fill-opacity': 0.6 },
    },
    'landcover': {
      paint: { 'fill-color': p.landSubtle, 'fill-opacity': 0.5 },
    },

    // Sand, beach, desert
    'landuse-residential': {
      paint: { 'fill-color': p.land, 'fill-opacity': 0.4 },
    },
    'pitch-outline': {
      paint: { 'line-color': p.landSubtle, 'line-opacity': 0.3 },
    },

    // ── Roads (near-invisible, zoom-gated) ────────────────────────────────
    'road-minor': {
      paint: {
        'line-color': p.roadMinor,
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          6, 0,
          9, 1,
        ],
      },
    },
    'road-secondary-tertiary': {
      paint: {
        'line-color': p.roadMajor,
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          5, 0,
          8, 1,
        ],
      },
    },
    'road-primary': {
      paint: {
        'line-color': p.roadMajor,
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          4, 0,
          7, 0.8,
        ],
      },
    },
    'road-motorway-trunk': {
      paint: {
        'line-color': p.roadMajor,
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          3, 0,
          6, 0.6,
        ],
      },
    },

    // ── Buildings ─────────────────────────────────────────────────────────
    'building': {
      paint: {
        'fill-color': p.building,
        'fill-opacity': [
          'interpolate', ['linear'], ['zoom'],
          14, 0,
          16, 0.8,
        ],
      },
    },
    'building-outline': {
      paint: {
        'line-color': p.building,
        'line-opacity': 0,  // keep off — too noisy
      },
    },

    // ── Admin boundaries ──────────────────────────────────────────────────
    // Level 0 = country borders only. State/province are hidden.
    'admin-0-boundary': {
      paint: {
        'line-color': p.borderColor,
        'line-opacity': p.borderOpacity,
        'line-width': 0.5,
        'line-dasharray': [3, 2],
      },
    },
    'admin-0-boundary-disputed': {
      paint: {
        'line-color': p.borderColor,
        'line-opacity': p.borderOpacity * 0.5,
        'line-width': 0.4,
        'line-dasharray': [2, 3],
      },
    },
    // Level 1 (state/province) — muted out entirely
    'admin-1-boundary': {
      paint: {
        'line-color': p.borderColor,
        'line-opacity': p.borderOpacity * 0.25,
        'line-width': 0.3,
      },
    },

    // ── Labels — country & ocean only ─────────────────────────────────────
    'country-label': {
      layout: {
        'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
        'text-size': [
          'interpolate', ['linear'], ['zoom'],
          1, 9,
          4, 11,
          6, 13,
        ],
      },
      paint: {
        'text-color': p.labelCountry,
        'text-opacity': p.labelCountryOpacity,
        'text-halo-color': p.haloColor,
        'text-halo-width': p.haloWidth,
        'text-halo-blur': 0.5,
      },
    },
    'ocean-label': {
      layout: {
        'text-font': ['DIN Pro Italic', 'Arial Unicode MS Regular'],
        'text-size': 11,
      },
      paint: {
        'text-color': p.labelOcean,
        'text-opacity': p.labelCountryOpacity * 0.7,
        'text-halo-color': p.haloColor,
        'text-halo-width': 1,
      },
    },

    // ── Atmosphere / Sky ──────────────────────────────────────────────────
    sky: {
      paint: {
        'sky-type': 'atmosphere',
        'sky-atmosphere-color': p.skyColor,
        'sky-atmosphere-sun-intensity': 5,
      },
    },
  } as const
}

/**
 * Layers that should always be hidden (visibility: none).
 * Keeping them hidden rather than deleted preserves the style for editing.
 */
export const HIDDEN_LAYERS = [
  'poi-label',
  'poi-label-simple',
  'airport-label',
  'transit-stop-label',
  'road-label',
  'road-number-shield',
  'road-exit-shield',
  'natural-line-label',
  'natural-point-label',
  'waterway-label',
  'place-label',            // city/town labels — replaced by our pin system
  'settlement-label',
  'settlement-minor-label',
  'settlement-subdivision-label',
  'state-label',
  'continent-label',        // keep only country-label above; continent too large
]

// ─────────────────────────────────────────────
// Custom destination pin layer spec
// ─────────────────────────────────────────────
//
// Add this AFTER map.addSource('destinations', ...) is called.
// The source is a GeoJSON FeatureCollection populated by the search API.

export const DESTINATION_LAYERS = {

  /** Pulsing outer ring — animated via Mapbox animation API */
  ring: {
    id: 'destination-pins-ring',
    type: 'circle' as const,
    source: 'destinations',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        2, 10,
        5, 14,
        8, 20,
      ],
      'circle-color': BRAND.terracotta500,   // --aw-terracotta-500
      'circle-opacity': 0.2,
      'circle-stroke-width': 0,
    },
  },

  /** Solid core dot */
  dot: {
    id: 'destination-pins-dot',
    type: 'circle' as const,
    source: 'destinations',
    paint: {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        2, 5,
        5, 7,
        8, 10,
      ],
      'circle-color': BRAND.terracotta500,   // --aw-terracotta-500
      'circle-opacity': 1,
      'circle-stroke-width': 2,
      'circle-stroke-color': BRAND.parchment300,  // --aw-parchment-300
    },
  },

  /** Price label that appears on hover / click */
  label: {
    id: 'destination-pins-label',
    type: 'symbol' as const,
    source: 'destinations',
    layout: {
      'text-field': ['concat', ['get', 'name'], '\n', ['get', 'priceLabel']],
      'text-font': ['DIN Pro Regular', 'Arial Unicode MS Regular'],
      'text-size': 11,
      'text-anchor': 'left',
      'text-offset': [1.2, 0],
      'text-max-width': 10,
    },
    paint: {
      'text-color': BRAND.parchment300,   // --aw-parchment-300
      'text-halo-color': 'rgba(13,30,39,0.9)',
      'text-halo-width': 1.5,
      'text-opacity': [
        'interpolate', ['linear'], ['zoom'],
        2, 0,
        4, 1,
      ],
    },
  },
}

// ─────────────────────────────────────────────
// Lat/lon grid overlay (optional, Pro feature)
// ─────────────────────────────────────────────
//
// A subtle coordinate grid drawn as a custom canvas layer.
// Attach with: map.addLayer(buildGridLayer(getPalette()))

export function buildGridCanvasLayer(palette: MapPalette) {
  return {
    id: 'anywhere-grid',
    type: 'custom' as const,
    onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext) {
      // Implemented via Mapbox custom layer — canvas overlay approach
      // See: applyGridOverlay() below for the simpler Canvas 2D version
    },
    render() {},
  }
}

// ─────────────────────────────────────────────
// Main apply function
// ─────────────────────────────────────────────

/**
 * Applies paint/layout overrides and hides noisy label layers.
 * Call this inside map.on('load', ...).
 *
 * @param map      — the loaded Mapbox GL map instance
 * @param mode     — optional override; auto-detects from clock if omitted
 */
export function applyTimeOfDay(map: mapboxgl.Map, mode?: TimeOfDay): void {
  const palette   = getPalette(mode)
  const overrides = buildPaintOverrides(palette)

  // Apply paint/layout overrides — skip silently if layer doesn't exist
  for (const [layerId, config] of Object.entries(overrides)) {
    if (!map.getLayer(layerId)) continue

    const { paint = {}, layout = {} } = config as {
      paint?: Record<string, unknown>
      layout?: Record<string, unknown>
    }

    type PaintPropertyName = Parameters<mapboxgl.Map['setPaintProperty']>[1];
    type LayoutPropertyName = Parameters<mapboxgl.Map['setLayoutProperty']>[1];
    type PaintVal = Parameters<mapboxgl.Map['setPaintProperty']>[2];
    type LayoutVal = Parameters<mapboxgl.Map['setLayoutProperty']>[2];

    for (const [prop, value] of Object.entries(paint)) {
      map.setPaintProperty(layerId, prop as PaintPropertyName, value as PaintVal);
    }
    for (const [prop, value] of Object.entries(layout)) {
      map.setLayoutProperty(layerId, prop as LayoutPropertyName, value as LayoutVal);
    }
  }

  // Hide noisy layers
  for (const layerId of HIDDEN_LAYERS) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', 'none')
    }
  }

  // Apply fog / atmosphere
  map.setFog({
    color:            palette.fogColor,
    'high-color':     palette.skyColor,
    'horizon-blend':  0.04,
    'space-color':    '#000000',
    'star-intensity': mode === 'night' ? 0.6 : 0.15,
  })

  console.log(`[Anywhere Map] Palette applied: ${palette.label}`)
}

// ─────────────────────────────────────────────
// Full initialisation helper
// ─────────────────────────────────────────────

/**
 * One-shot setup: call this inside map.on('load') to:
 *   1. Apply the correct time-of-day palette
 *   2. Add the destination pin source + layers
 *   3. Schedule auto-refresh every 5 minutes
 *
 * @example
 * map.on('load', () => {
 *   initAnywhereMap(map)
 * })
 */
export function initAnywhereMap(map: mapboxgl.Map): () => void {
  // 1. Apply initial palette
  applyTimeOfDay(map)

  // 2. Add destination GeoJSON source (starts empty; populated by search)
  if (!map.getSource('destinations')) {
    map.addSource('destinations', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })
    type LayerArg = Parameters<mapboxgl.Map['addLayer']>[0];
    map.addLayer(DESTINATION_LAYERS.ring as LayerArg);
    map.addLayer(DESTINATION_LAYERS.dot as LayerArg);
    map.addLayer(DESTINATION_LAYERS.label as LayerArg);
  }

  // 3. Animate the ring layer (pulsing effect)
  let ringRadius = 10
  let growing    = true
  const animateRings = () => {
    if (!map.getLayer('destination-pins-ring')) return
    ringRadius = growing ? ringRadius + 0.3 : ringRadius - 0.3
    if (ringRadius >= 18) growing = false
    if (ringRadius <= 10) growing = true
    map.setPaintProperty(
      'destination-pins-ring',
      'circle-radius',
      ringRadius,
    )
    map.setPaintProperty(
      'destination-pins-ring',
      'circle-opacity',
      0.35 - ((ringRadius - 10) / 8) * 0.25,
    )
    requestAnimationFrame(animateRings)
  }
  animateRings()

  // 4. Auto-refresh palette when the time-of-day window changes
  const refreshInterval = setInterval(() => applyTimeOfDay(map), 5 * 60_000)

  // Return a cleanup function (call on component unmount)
  return () => clearInterval(refreshInterval)
}

/**
 * Updates the destination pin source with new search results.
 *
 * @param map          — the Mapbox GL map instance
 * @param destinations — array of destination results from the search API
 *
 * @example
 * const results = await searchApi.query({ budget: 800, vibes: ['beach'] })
 * updateDestinationPins(map, results)
 */
export function updateDestinationPins(
  map: mapboxgl.Map,
  destinations: Array<{
    id: string
    name: string
    coords: [number, number]   // [lng, lat]
    totalCost: number
    currency?: string
  }>,
): void {
  const source = map.getSource('destinations') as mapboxgl.GeoJSONSource
  if (!source) return

  const currency = destinations[0]?.currency ?? 'USD'
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })

  source.setData({
    type: 'FeatureCollection',
    features: destinations.map(d => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: d.coords },
      properties: {
        id:         d.id,
        name:       d.name,
        totalCost:  d.totalCost,
        priceLabel: fmt.format(d.totalCost),
      },
    })),
  })
}

// ─────────────────────────────────────────────
// Exported style URL builder
// ─────────────────────────────────────────────

/**
 * Returns the Mapbox style URL to pass to new mapboxgl.Map({ style }).
 * Set NEXT_PUBLIC_MAPBOX_STYLE_URL in your .env to your Studio style URL.
 * Falls back to the standard Mapbox dark style for development.
 */
export function getMapStyle(): string {
  return (
    process.env.NEXT_PUBLIC_MAPBOX_STYLE_URL ??
    'mapbox://styles/mapbox/dark-v11'
  )
}
