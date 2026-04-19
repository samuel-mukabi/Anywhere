import { TripCostCalculator, type TripFlightPricing } from './TripCostCalculator';

describe('TripCostCalculator', () => {
  const mockFlight: TripFlightPricing = { totalAmount: 400, currency: 'USD' };

  const mockDailyEstimate = {
    currency: 'USD',
    mealCheap: 10,
    mealMid: 25,
    localTransport: 5,
    coffee: 3,
    dailyTotal: 50,
    tier: 'mid' as const,
    colIndex: 100,
  };

  describe('Pro tier', () => {
    it('returns full breakdown with all cost components', () => {
      const calc = new TripCostCalculator(mockFlight, mockDailyEstimate, 7, 'pro', 2000);
      const res = calc.calculate();

      expect(res.totalCost).toBeDefined();
      expect(res.totalCost).not.toBeNull();
      expect(res.totalCost).toBeGreaterThan(400);

      expect(res.breakdown).not.toBeNull();
      expect(res.breakdown!.flightCost).toBe(400);
      expect(res.breakdown!.accommodationTotal).toBeGreaterThan(0);
      expect(res.breakdown!.foodTotal).toBeGreaterThan(0);
      expect(res.breakdown!.transportTotal).toBeGreaterThan(0);
      expect(res.breakdown!.currency).toBe('USD');

      expect(res.upgradePrompt).toBeUndefined();
    });

    it('budgetFitScore is between 0 and 1', () => {
      const calc = new TripCostCalculator(mockFlight, mockDailyEstimate, 7, 'pro', 3000);
      const res = calc.calculate();

      expect(res.budgetFitScore).not.toBeNull();
      expect(res.budgetFitScore!).toBeGreaterThanOrEqual(0);
      expect(res.budgetFitScore!).toBeLessThanOrEqual(1);
    });

    it('budgetFitScore is 0 when totalCost exceeds budget', () => {
      const calc = new TripCostCalculator(mockFlight, mockDailyEstimate, 7, 'pro', 100);
      const res = calc.calculate();
      expect(res.budgetFitScore).toBe(0);
    });

    it('budgetFitScore is 1 when budget is unconstrained (0)', () => {
      const calc = new TripCostCalculator(mockFlight, mockDailyEstimate, 7, 'pro', 0);
      const res = calc.calculate();
      expect(res.budgetFitScore).toBe(1);
    });

    it('accommodation multiplier is higher for premium tier than budget tier', () => {
      const premiumDaily = { ...mockDailyEstimate, tier: 'premium' as const };
      const budgetDaily  = { ...mockDailyEstimate, tier: 'budget' as const };

      const premiumRes = new TripCostCalculator(mockFlight, premiumDaily, 7, 'pro').calculate();
      const budgetRes  = new TripCostCalculator(mockFlight, budgetDaily,  7, 'pro').calculate();

      // premium multiplier (2.2) vs budget (1.4)
      expect(premiumRes.breakdown!.accommodationTotal).toBeGreaterThan(
        budgetRes.breakdown!.accommodationTotal
      );
    });
  });

  describe('Free tier', () => {
    it('returns flight cost only — totalCost is null', () => {
      const calc = new TripCostCalculator(mockFlight, mockDailyEstimate, 7, 'free', 1000);
      const res = calc.calculate();

      expect(res.totalCost).toBeNull();
      expect(res.breakdown).toBeNull();
      expect(res.budgetFitScore).toBeNull();
      expect(res.flightCost).toBe(400);
      expect(res.upgradePrompt).toBe(true);
    });
  });

  describe('currency drift warning', () => {
    it('logs a warning when flight currency differs from daily budget currency', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const gbpFlight: TripFlightPricing = { totalAmount: 320, currency: 'GBP' };
      new TripCostCalculator(gbpFlight, mockDailyEstimate, 5, 'pro', 2000);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Currency drift detected')
      );
      warnSpy.mockRestore();
    });

    it('does NOT warn when flight and daily budget share the same currency', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      new TripCostCalculator(mockFlight, mockDailyEstimate, 5, 'pro', 2000);

      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
