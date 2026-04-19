import { climateScorer, ClimateScorer } from './ClimateScorer';
import type { MonthlyClimate } from './openmeteo/OpenMeteoClient';

const mk = (avgTempC: number, avgPrecipMm: number, avgSunshineHours: number, month: 1|2|3|4|5|6|7|8|9|10|11|12 = 1): MonthlyClimate =>
  ({ month, avgTempC, avgPrecipMm, avgSunshineHours });

describe('ClimateScorer', () => {
  // ── User-facing vibes ────────────────────────────────────────────────────
  describe('scoreMonth — required passing scenarios', () => {
    it('Bali July + Tropical → >85', () =>
      expect(climateScorer.scoreMonth(mk(28, 50, 8, 7), ['Tropical'])).toBeGreaterThan(85));

    it('Reykjavik January + Snowy → >80', () =>
      expect(climateScorer.scoreMonth(mk(-2, 80, 2, 1), ['Snowy'])).toBeGreaterThan(80));

    it('Barcelona June + Beach → >75', () =>
      expect(climateScorer.scoreMonth(mk(24, 20, 10, 6), ['Beach'])).toBeGreaterThan(75));
  });

  describe('scoreMonth — all other vibes', () => {
    it('Sahara July + Desert → high score', () => {
      expect(climateScorer.scoreMonth(mk(38, 5, 12, 7), ['Desert'])).toBeGreaterThan(70);
    });

    it('London April + Mild City → reasonable score', () => {
      expect(climateScorer.scoreMonth(mk(14, 50, 5, 4), ['Mild City'])).toBeGreaterThan(50);
    });

    it('Swiss Alps March + Mountains → high score', () => {
      expect(climateScorer.scoreMonth(mk(5, 30, 7, 3), ['Mountains'])).toBeGreaterThan(60);
    });

    it('hot beach + Snowy → low score (wrong conditions)', () => {
      expect(climateScorer.scoreMonth(mk(30, 10, 12), ['Snowy'])).toBeLessThan(10);
    });
  });

  describe('scoreMonth — multi-vibe averaging', () => {
    it('Tropical + Beach averaged for Bali July', () => {
      const score = climateScorer.scoreMonth(mk(28, 50, 9, 7), ['Tropical', 'Beach']);
      expect(score).toBeGreaterThan(70);
    });

    it('unknown vibe ignored, known vibes still scored', () => {
      const withKnown = climateScorer.scoreMonth(mk(28, 50, 9), ['Tropical']);
      const withUnknown = climateScorer.scoreMonth(mk(28, 50, 9), ['Tropical', 'NonExistentVibe']);
      expect(withKnown).toBe(withUnknown); // unknown vibe filtered out
    });

    it('all unknown vibes → 0', () => {
      expect(climateScorer.scoreMonth(mk(25, 50, 8), ['Surfing', 'Clubbing'])).toBe(0);
    });
  });

  // ── bestMonth ────────────────────────────────────────────────────────────
  describe('bestMonth', () => {
    const annual: MonthlyClimate[] = [
      mk(28, 200, 4, 1),   // hot but very rainy    → moderate Tropical
      mk(28, 40, 10, 2),   // hot + sunny + low rain → best Beach/Tropical
      mk(10, 80, 3, 3),    // cool, overcast
    ];

    it('returns the month with the highest score for given vibes', () => {
      const best = climateScorer.bestMonth(annual, ['Tropical']);
      expect(best).toBe(2); // month 2 has low precip + high temp
    });

    it('returns month 1 for an empty array', () => {
      expect(climateScorer.bestMonth([], ['Beach'])).toBe(1);
    });
  });

  // ── climateTag ───────────────────────────────────────────────────────────
  describe('climateTag', () => {
    it('>80 → Perfect match', () =>
      expect(climateScorer.climateTag(85)).toBe('Perfect match'));

    it('50–80 → Good conditions', () =>
      expect(climateScorer.climateTag(65)).toBe('Good conditions'));

    it('30–49 → Acceptable', () =>
      expect(climateScorer.climateTag(40)).toBe('Acceptable'));

    it('<30 → Off-season', () =>
      expect(climateScorer.climateTag(20)).toBe('Off-season'));
  });
});
