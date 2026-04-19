import { ClimateScorer, climateScorer } from '../ClimateScorer';
import type { MonthlyClimate } from '../openmeteo/OpenMeteoClient';

// ---------------------------------------------------------------------------
// Climate fixtures (real-world approximations)
// ---------------------------------------------------------------------------

/** Bali, Indonesia — July (dry-season peak) */
const BALI_JULY: MonthlyClimate = {
  month: 7,
  avgTempC: 27.5,      // hot tropical
  avgPrecipMm: 18,     // very dry — Bali's dry season
  avgSunshineHours: 8, // abundant sun
};

/** Reykjavik, Iceland — July (warmest month) */
const REYKJAVIK_JULY: MonthlyClimate = {
  month: 7,
  avgTempC: 11.5,      // cool sub-arctic summer
  avgPrecipMm: 52,     // moderate rain
  avgSunshineHours: 5, // cloudy streak typical
};

/** Barcelona, Spain — June */
const BARCELONA_JUNE: MonthlyClimate = {
  month: 6,
  avgTempC: 24,        // warm Mediterranean
  avgPrecipMm: 35,     // low summer rain
  avgSunshineHours: 9, // long sunny days
};

/** Sahara reference — Desert vibe */
const SAHARA_JULY: MonthlyClimate = {
  month: 7,
  avgTempC: 38,
  avgPrecipMm: 2,
  avgSunshineHours: 11,
};

/** Chamonix, France — January — Mountains vibe */
const CHAMONIX_JAN: MonthlyClimate = {
  month: 1,
  avgTempC: -4,
  avgPrecipMm: 85,     // snow
  avgSunshineHours: 5,
};

/** London, UK — April — Mild City (mean daily ~14 °C) */
const LONDON_APR: MonthlyClimate = {
  month: 4,
  avgTempC: 14,   // Actual London April mean: ~13–14 °C
  avgPrecipMm: 48,
  avgSunshineHours: 5,
};

/** Full synthetic year for bestMonth tests */
const SYNTHETIC_YEAR: MonthlyClimate[] = Array.from({ length: 12 }, (_, i) => ({
  month: (i + 1) as MonthlyClimate['month'],
  avgTempC: i < 6 ? 10 + i * 2 : 22 - (i - 6) * 2, // peaks in June/July
  avgPrecipMm: 40,
  avgSunshineHours: 4 + (i < 6 ? i : 12 - i),       // sunshine also peaks mid-year
}));

// ---------------------------------------------------------------------------
// scoreMonth — primary vibe assertions
// ---------------------------------------------------------------------------

describe('ClimateScorer.scoreMonth()', () => {
  const scorer = new ClimateScorer();

  // --- Spec-mandated assertions ---

  test('Bali July vs Tropical → score > 85', () => {
    expect(scorer.scoreMonth(BALI_JULY, ['Tropical'])).toBeGreaterThan(85);
  });

  test('Reykjavik July vs Snowy → score < 20', () => {
    // July in Reykjavik is too warm for snow (11.5 °C) — should score low
    expect(scorer.scoreMonth(REYKJAVIK_JULY, ['Snowy'])).toBeLessThan(20);
  });

  test('Barcelona June vs Beach → score > 80', () => {
    expect(scorer.scoreMonth(BARCELONA_JUNE, ['Beach'])).toBeGreaterThan(80);
  });

  // --- Additional vibe checks ---

  test('Sahara July vs Desert → score > 85', () => {
    expect(scorer.scoreMonth(SAHARA_JULY, ['Desert'])).toBeGreaterThan(85);
  });

  test('Chamonix January vs Mountains → score > 60', () => {
    expect(scorer.scoreMonth(CHAMONIX_JAN, ['Mountains'])).toBeGreaterThan(60);
  });

  test('London April vs Mild City → score > 60', () => {
    expect(scorer.scoreMonth(LONDON_APR, ['Mild City'])).toBeGreaterThan(60);
  });

  test('Bali July vs Snowy → score near 0', () => {
    expect(scorer.scoreMonth(BALI_JULY, ['Snowy'])).toBeLessThan(5);
  });

  // --- Multi-vibe averaging ---

  test('Multi-vibe: Beach + Tropical for Bali July → still high', () => {
    const score = scorer.scoreMonth(BALI_JULY, ['Beach', 'Tropical']);
    expect(score).toBeGreaterThan(70);
  });

  test('Conflicting vibes (Tropical + Snowy) → low average', () => {
    const score = scorer.scoreMonth(BALI_JULY, ['Tropical', 'Snowy']);
    expect(score).toBeLessThan(55); // Bali is great at Tropical but 0 on Snowy
  });

  // --- Edge cases ---

  test('Empty vibe list → returns 0', () => {
    expect(scorer.scoreMonth(BALI_JULY, [])).toBe(0);
  });

  test('Unknown vibe → returns 0', () => {
    expect(scorer.scoreMonth(BALI_JULY, ['Volcanic'])).toBe(0);
  });

  test('Score is always in [0, 100]', () => {
    const extremeHot: MonthlyClimate = { month: 7, avgTempC: 55, avgPrecipMm: 0, avgSunshineHours: 14 };
    const extremeCold: MonthlyClimate = { month: 1, avgTempC: -40, avgPrecipMm: 200, avgSunshineHours: 0 };
    for (const c of [extremeHot, extremeCold, BALI_JULY, BARCELONA_JUNE]) {
      for (const vibe of ['Tropical', 'Snowy', 'Beach', 'Desert', 'Mild City', 'Mountains'] as const) {
        const s = scorer.scoreMonth(c, [vibe]);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      }
    }
  });

  test('Uses the exported singleton correctly', () => {
    expect(climateScorer.scoreMonth(BALI_JULY, ['Tropical'])).toBeGreaterThan(85);
  });
});

// ---------------------------------------------------------------------------
// bestMonth
// ---------------------------------------------------------------------------

describe('ClimateScorer.bestMonth()', () => {
  const scorer = new ClimateScorer();

  test('Returns month 1 for empty array (safe default)', () => {
    expect(scorer.bestMonth([], ['Beach'])).toBe(1);
  });

  test('Single-entry array → returns that month', () => {
    expect(scorer.bestMonth([BALI_JULY], ['Tropical'])).toBe(7);
  });

  test('Synthetic Beach year → best month is in summer (5–8)', () => {
    const best = scorer.bestMonth(SYNTHETIC_YEAR, ['Beach']);
    expect(best).toBeGreaterThanOrEqual(5);
    expect(best).toBeLessThanOrEqual(8);
  });

  test('Synthetic Mild City year → picks shoulder month (not peak summer)', () => {
    // Mild City prefers cooler temps ~12–22 °C
    const best = scorer.bestMonth(SYNTHETIC_YEAR, ['Mild City']);
    // In our synthetic data, temps peak in June/July at 22 °C — shoulder months score higher
    expect([3, 4, 5, 7, 8, 9, 10]).toContain(best);
  });

  test('Consistent with scoreMonth — best month has highest individual score', () => {
    const vibes = ['Beach'];
    const best = scorer.bestMonth(SYNTHETIC_YEAR, vibes);
    const bestScore = scorer.scoreMonth(
      SYNTHETIC_YEAR.find(m => m.month === best)!,
      vibes
    );
    for (const m of SYNTHETIC_YEAR) {
      expect(scorer.scoreMonth(m, vibes)).toBeLessThanOrEqual(bestScore + 0.01);
    }
  });
});

// ---------------------------------------------------------------------------
// climateTag
// ---------------------------------------------------------------------------

describe('ClimateScorer.climateTag()', () => {
  const scorer = new ClimateScorer();

  test('score > 80 → "Perfect match"',    () => expect(scorer.climateTag(85)).toBe('Perfect match'));
  test('score = 81 → "Perfect match"',    () => expect(scorer.climateTag(81)).toBe('Perfect match'));
  test('score = 80 → "Good conditions"',  () => expect(scorer.climateTag(80)).toBe('Good conditions'));
  test('score = 50 → "Good conditions"',  () => expect(scorer.climateTag(50)).toBe('Good conditions'));
  test('score = 49 → "Acceptable"',       () => expect(scorer.climateTag(49)).toBe('Acceptable'));
  test('score = 30 → "Acceptable"',       () => expect(scorer.climateTag(30)).toBe('Acceptable'));
  test('score = 29 → "Off-season"',       () => expect(scorer.climateTag(29)).toBe('Off-season'));
  test('score = 0  → "Off-season"',       () => expect(scorer.climateTag(0)).toBe('Off-season'));

  test('climateTag(scoreMonth(Bali, Tropical)) → "Perfect match"', () => {
    const score = scorer.scoreMonth(BALI_JULY, ['Tropical']);
    expect(scorer.climateTag(score)).toBe('Perfect match');
  });

  test('climateTag(scoreMonth(Reykjavik, Snowy)) → "Off-season"', () => {
    const score = scorer.scoreMonth(REYKJAVIK_JULY, ['Snowy']);
    expect(scorer.climateTag(score)).toBe('Off-season');
  });

  test('climateTag(scoreMonth(Barcelona, Beach)) → "Perfect match"', () => {
    const score = scorer.scoreMonth(BARCELONA_JUNE, ['Beach']);
    expect(scorer.climateTag(score)).toBe('Perfect match');
  });
});
