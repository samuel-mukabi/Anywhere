import type { MonthlyClimate } from './openmeteo/OpenMeteoClient';

// ---------------------------------------------------------------------------
// Vibe definitions
// ---------------------------------------------------------------------------

/**
 * Supported travel-vibe identifiers.
 * The literal union is intentionally narrow so callers get autocomplete and
 * the scorer can exhaustively check all registered vibes.
 */
export type Vibe =
  | 'Tropical'
  | 'Snowy'
  | 'Beach'
  | 'Desert'
  | 'Mild City'
  | 'Mountains';

// ---------------------------------------------------------------------------
// Threshold helpers
// Every checker returns a 0–1 "partial match" value rather than a boolean so
// we can derive smooth, weighted scores instead of all-or-nothing results.
// ---------------------------------------------------------------------------

/**
 * Clamps a ratio to [0, 1].
 * Shorthand: how far `value` is from `threshold` as a fraction of `range`.
 */
function ramp(value: number, ideal: number, range: number): number {
  return Math.max(0, Math.min(1, 1 - Math.abs(value - ideal) / range));
}

/**
 * Returns 1 when `value >= threshold`, linearly falling to 0 over `range` below it.
 */
function atLeast(value: number, threshold: number, range = threshold * 0.3): number {
  if (value >= threshold) return 1;
  return Math.max(0, (value - (threshold - range)) / range);
}

/**
 * Returns 1 when `value <= threshold`, linearly falling to 0 over `range` above it.
 */
function atMost(value: number, threshold: number, range = threshold * 0.3): number {
  if (value <= threshold) return 1;
  return Math.max(0, ((threshold + range) - value) / range);
}

// ---------------------------------------------------------------------------
// Per-vibe partial scorers  (each returns 0–1)
// ---------------------------------------------------------------------------

const VIBE_SCORERS: Record<Vibe, (c: MonthlyClimate) => number> = {
  /**
   * Tropical: warm (>26 °C) AND low-ish precip (<150 mm/day avg).
   * Some rain is fine in the tropics; we penalise above 150 mm.
   */
  Tropical: (c) => {
    const tempScore  = atLeast(c.avgTempC,       26,  6);   // ideal ≥ 26, ramp over 6 °C
    const precipScore= atMost(c.avgPrecipMm,     150, 60);  // ideal ≤ 150, ramp over 60 mm
    return tempScore * precipScore;
  },

  /**
   * Snowy: cold (<2 °C) AND enough precipitation for snow (>30 mm).
   */
  Snowy: (c) => {
    const tempScore  = atMost(c.avgTempC,          2,  4);
    const precipScore= atLeast(c.avgPrecipMm,     30, 15);
    return tempScore * precipScore;
  },

  /**
   * Beach: warm (>22 °C) AND sunny (>6 h/day).
   */
  Beach: (c) => {
    const tempScore    = atLeast(c.avgTempC,       22,  6);
    const sunshineScore= atLeast(c.avgSunshineHours, 6, 3);
    return tempScore * sunshineScore;
  },

  /**
   * Desert: very dry (<20 mm) AND warm (>20 °C).
   */
  Desert: (c) => {
    const precipScore= atMost(c.avgPrecipMm,  20, 15);
    const tempScore  = atLeast(c.avgTempC,    20,  6);
    return precipScore * tempScore;
  },

  /**
   * Mild City: comfortable temperature band (12–22 °C), any precipitation.
   * Score peaks at 17 °C and falls off symmetrically toward the edges.
   */
  'Mild City': (c) => {
    return ramp(c.avgTempC, 17, 10); // ±10 °C band centred on 17
  },

  /**
   * Mountains: cool (<10 °C) AND bright (>4 h sunshine/day).
   */
  Mountains: (c) => {
    const tempScore    = atMost(c.avgTempC,          10, 6);
    const sunshineScore= atLeast(c.avgSunshineHours,  4, 3);
    return tempScore * sunshineScore;
  },
};

// ---------------------------------------------------------------------------
// ClimateScorer
// ---------------------------------------------------------------------------

export class ClimateScorer {
  /**
   * Score a single month against one or more vibes.
   *
   * Algorithm:
   *  1. For each requested vibe, compute a partial score 0–1.
   *  2. Average the partial scores (equal weighting).
   *  3. Scale to 0–100 and round to one decimal place.
   *
   * @param climate  A single `MonthlyClimate` data point.
   * @param vibes    One or more vibe names. Unknown vibes are ignored.
   * @returns        A score in [0, 100]; 100 = perfect match for every vibe.
   */
  public scoreMonth(climate: MonthlyClimate, vibes: string[]): number {
    const recognised = vibes.filter((v): v is Vibe => v in VIBE_SCORERS);
    if (recognised.length === 0) return 0;

    const total = recognised.reduce(
      (sum, vibe) => sum + VIBE_SCORERS[vibe](climate),
      0
    );
    const raw = (total / recognised.length) * 100;
    return parseFloat(raw.toFixed(1));
  }

  /**
   * Return the calendar month (1–12) whose climate best matches the vibes.
   *
   * @param annualClimate  Full 12-month array (from `OpenMeteoClient.getMonthlyClimate`).
   * @param vibes          Requested vibes.
   * @returns              Month number 1–12 with the highest score.
   */
  public bestMonth(annualClimate: MonthlyClimate[], vibes: string[]): number {
    if (annualClimate.length === 0) return 1;

    let best = annualClimate[0];
    let bestScore = this.scoreMonth(best, vibes);

    for (const m of annualClimate.slice(1)) {
      const s = this.scoreMonth(m, vibes);
      if (s > bestScore) {
        bestScore = s;
        best = m;
      }
    }

    return best.month;
  }

  /**
   * Convert a numeric score to a human-readable travel label.
   *
   * | Score      | Label           |
   * |------------|-----------------|
   * | > 80       | Perfect match   |
   * | 50 – 80    | Good conditions |
   * | 30 – 49    | Acceptable      |
   * | < 30       | Off-season      |
   */
  public climateTag(score: number): string {
    if (score > 80) return 'Perfect match';
    if (score >= 50) return 'Good conditions';
    if (score >= 30) return 'Acceptable';
    return 'Off-season';
  }
}

/** Pre-instantiated singleton. */
export const climateScorer = new ClimateScorer();
