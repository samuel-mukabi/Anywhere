/**
 * Anywhere Platform — Shared Climate Types
 * Consumed by: apps/workers, apps/search-service
 * Source of truth for vibe filters and monthly climate data shapes.
 */

// ---------------------------------------------------------------------------
// Vibe Filters
// ---------------------------------------------------------------------------

export type VibeFilter =
  | 'Tropical'
  | 'Beach'
  | 'Snowy'
  | 'Mountains'
  | 'City'
  | 'Desert';

// All supported vibe filters as a runtime array (useful for validation)
export const VIBE_FILTERS: VibeFilter[] = [
  'Tropical',
  'Beach',
  'Snowy',
  'Mountains',
  'City',
  'Desert',
];

// ---------------------------------------------------------------------------
// Monthly Climate Data
// ---------------------------------------------------------------------------

/**
 * Computed climate data for a single calendar month at a destination.
 * Stored in MongoDB as `destinations.climate.monthly[]` (12 entries).
 */
export interface MonthlyClimateData {
  /** 1 = January … 12 = December */
  month: number;
  /** Mean temperature at 2 m above surface, °C */
  avgTempC: number;
  /** Total precipitation, mm */
  avgPrecipMm: number;
  /** Mean daily sunshine duration, hours */
  avgSunshineHours: number;
  /** ISO timestamp of when this record was fetched from Open-Meteo */
  computedAt: Date;
  /**
   * ClimateScorer output — 0–100 per vibe filter.
   * Populated by the workers quarterly cron job.
   */
  scores: Partial<Record<VibeFilter, number>>;
}

// ---------------------------------------------------------------------------
// Destination Climate Profile
// ---------------------------------------------------------------------------

/**
 * Top-level climate sub-document stored on a Destination.
 * `monthly` always has exactly 12 entries (one per calendar month) once computed.
 */
export interface ClimateProfile {
  /** 12 monthly records. Empty array means "not yet computed". */
  monthly: MonthlyClimateData[];
  /**
   * Summary best-months list (0-indexed: 0 = Jan) kept for backward-compat
   * with the existing `climate.bestMonths` field.
   */
  bestMonths: number[];
  /** 0–100 average across all months, all vibes */
  annualClimateScore: number;
  /** UTC timestamp of last full quarterly recompute */
  lastRecomputedAt?: Date;
}

// ---------------------------------------------------------------------------
// Open-Meteo raw response shape (partial — only fields we use)
// ---------------------------------------------------------------------------

export interface OpenMeteoMonthlyResponse {
  latitude: number;
  longitude: number;
  monthly: {
    time: string[];                    // ["2015-01", "2015-02", …]
    temperature_2m_mean: number[];
    precipitation_sum: number[];
    sunshine_duration: number[];       // seconds — we convert to hours
  };
}
