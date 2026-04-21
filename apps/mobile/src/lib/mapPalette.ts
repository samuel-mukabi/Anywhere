/**
 * Anywhere App — Mapbox Mobile Style Configuration
 * Time-of-day adaptive map style using the Anywhere brand palette.
 */

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export interface MapPalette {
  label: string;
  hours: [number, number];

  // ── Water / Ocean ──────────────────────────
  ocean: string;         // deep water, sea
  inlandWater: string;   // rivers, lakes

  // ── Land ───────────────────────────────────
  land: string;          // default continent fill
  landSubtle: string;    // used for national parks, urban areas
  sand: string;          // beaches, deserts

  // ── Sky / atmosphere ───────────────────────
  skyColor: string;      // shown above the horizon in 3D mode
  fogColor: string;      // Mapbox fog / atmosphere
}

// ─────────────────────────────────────────────
// Palette definitions — one per time-of-day
// ─────────────────────────────────────────────
export const PALETTES: Record<TimeOfDay, MapPalette> = {
  dawn: {
    label: 'Dawn',
    hours: [5, 8],
    ocean:        '#1A2A3E',
    inlandWater:  '#152233',
    land:         '#2C3A30',
    landSubtle:   '#253328',
    sand:         '#3D3220',
    skyColor:     '#2D1F35',
    fogColor:     '#3B2535',
  },
  day: {
    label: 'Day',
    hours: [8, 17],
    ocean:        '#1E3348',
    inlandWater:  '#182A3C',
    land:         '#2A3240',
    landSubtle:   '#233039',
    sand:         '#3A3228',
    skyColor:     '#1E3348',
    fogColor:     '#243C54',
  },
  dusk: {
    label: 'Dusk',
    hours: [17, 20],
    ocean:        '#1C2B36',
    inlandWater:  '#162330',
    land:         '#2B2E2C',
    landSubtle:   '#293530',
    sand:         '#3D2E1E',
    skyColor:     '#2B1F18',
    fogColor:     '#3A2518',
  },
  night: {
    label: 'Night',
    hours: [20, 5],
    ocean:        '#0D1E27',
    inlandWater:  '#0A1820',
    land:         '#1A2228',
    landSubtle:   '#1E2B24',
    sand:         '#251E16',
    skyColor:     '#0A0F18',
    fogColor:     '#0D1520',
  },
};

/**
 * Detects the current time-of-day bucket from the local clock.
 */
export function detectTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5  && hour < 8)  return 'dawn';
  if (hour >= 8  && hour < 17) return 'day';
  if (hour >= 17 && hour < 20) return 'dusk';
  return 'night';
}

/**
 * Returns the palette for a given (or auto-detected) time of day.
 */
export function getPalette(mode?: TimeOfDay): MapPalette {
  return PALETTES[mode ?? detectTimeOfDay()];
}
