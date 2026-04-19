/**
 * ClimateScorer
 * ──────────────
 * Pure, stateless scorer.  Given a month's raw climate measurements,
 * returns a 0–100 score for every VibeFilter.
 *
 * Scoring model (per vibe):
 *   score = 0.4 × tempScore + 0.3 × precipScore + 0.3 × sunScore
 *
 * Each dimension is a linear ramp between a "worst" and "best" point,
 * clamped to [0, 100].  Full thresholds documented below.
 */

import { MonthlyClimateData, VibeFilter, VIBE_FILTERS } from '@repo/types/src/climate';

// ---------------------------------------------------------------------------
// Threshold definitions
// ---------------------------------------------------------------------------

/** Defines the scoring ramp for a single measurement dimension. */
interface DimThreshold {
  /** Below this → 0 pts (or above, depending on direction) */
  worst: number;
  /** At or beyond this → 100 pts */
  best: number;
  /**
   * 'higher' = higher value is better (temp for Tropical, sun for Beach, …)
   * 'lower'  = lower value is better (precip for Beach, temp for Snowy, …)
   */
  direction: 'higher' | 'lower';
}

interface VibeThresholds {
  temp:   DimThreshold;
  precip: DimThreshold;
  sun:    DimThreshold;
}

const THRESHOLDS: Record<VibeFilter, VibeThresholds> = {
  Tropical: {
    temp:   { worst: 18,  best: 28,  direction: 'higher' },
    precip: { worst: 300, best: 0,   direction: 'lower'  }, // too much rain bad
    sun:    { worst: 3,   best: 8,   direction: 'higher' },
  },
  Beach: {
    temp:   { worst: 16,  best: 28,  direction: 'higher' },
    precip: { worst: 150, best: 0,   direction: 'lower'  },
    sun:    { worst: 3,   best: 9,   direction: 'higher' },
  },
  Snowy: {
    // Lower temp = better; precipScore used as snow-proxy (more = better)
    temp:   { worst: 10,  best: -10, direction: 'lower'  },
    precip: { worst: 0,   best: 100, direction: 'higher' },
    sun:    { worst: 0,   best: 6,   direction: 'higher' }, // some sun is fine
  },
  Mountains: {
    temp:   { worst: 0,   best: 18,  direction: 'higher' },
    precip: { worst: 200, best: 0,   direction: 'lower'  },
    sun:    { worst: 2,   best: 7,   direction: 'higher' },
  },
  City: {
    temp:   { worst: 0,   best: 22,  direction: 'higher' },
    precip: { worst: 200, best: 0,   direction: 'lower'  },
    sun:    { worst: 2,   best: 7,   direction: 'higher' },
  },
  Desert: {
    temp:   { worst: 20,  best: 38,  direction: 'higher' },
    precip: { worst: 50,  best: 0,   direction: 'lower'  },
    sun:    { worst: 5,   best: 12,  direction: 'higher' },
  },
};

// Dimension weights must sum to 1.0
const WEIGHTS = { temp: 0.4, precip: 0.3, sun: 0.3 } as const;

// ---------------------------------------------------------------------------
// Scorer
// ---------------------------------------------------------------------------

export class ClimateScorer {
  /**
   * Score a single month against ALL vibe filters.
   * Returns a partial record (only vibes with defined thresholds = all 6).
   */
  public scoreMonth(
    data: Pick<MonthlyClimateData, 'avgTempC' | 'avgPrecipMm' | 'avgSunshineHours'>,
  ): Record<VibeFilter, number> {
    const result = {} as Record<VibeFilter, number>;

    for (const vibe of VIBE_FILTERS) {
      result[vibe] = this._scoreForVibe(data, THRESHOLDS[vibe]);
    }

    return result;
  }

  /**
   * Convenience: score a specific vibe filter only.
   */
  public scoreMonthForVibe(
    data: Pick<MonthlyClimateData, 'avgTempC' | 'avgPrecipMm' | 'avgSunshineHours'>,
    vibe: VibeFilter,
  ): number {
    return this._scoreForVibe(data, THRESHOLDS[vibe]);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private _scoreForVibe(
    data: Pick<MonthlyClimateData, 'avgTempC' | 'avgPrecipMm' | 'avgSunshineHours'>,
    t: VibeThresholds,
  ): number {
    const tempScore   = this._ramp(data.avgTempC,          t.temp);
    const precipScore = this._ramp(data.avgPrecipMm,       t.precip);
    const sunScore    = this._ramp(data.avgSunshineHours,  t.sun);

    const raw =
      tempScore   * WEIGHTS.temp   +
      precipScore * WEIGHTS.precip +
      sunScore    * WEIGHTS.sun;

    return Math.round(Math.max(0, Math.min(100, raw)));
  }

  /**
   * Linear ramp: maps `value` between `worst` and `best`,
   * returning a 0–100 score.
   */
  private _ramp(value: number, { worst, best, direction }: DimThreshold): number {
    if (direction === 'higher') {
      if (value <= worst) return 0;
      if (value >= best)  return 100;
      return ((value - worst) / (best - worst)) * 100;
    } else {
      // lower is better
      if (value >= worst) return 0;
      if (value <= best)  return 100;
      return ((worst - value) / (worst - best)) * 100;
    }
  }
}
