import { DailyBudgetEstimate } from './wherenext/WhereNextClient';
import type { BookingOffer } from './duffel/DuffelClient';

/** Minimal flight price input (Duffel-shaped offers or Tequila estimates). */
export type TripFlightPricing = Pick<BookingOffer, 'totalAmount' | 'currency'>;

export interface TripCostBreakdown {
  flightCost: number;
  accommodationTotal: number;
  foodTotal: number;
  transportTotal: number;
  miscTotal: number;
  totalCost: number | null;
  currency: string;
}

export interface TripCostResult {
  flightCost: number;
  totalCost: number | null;
  breakdown: TripCostBreakdown | null;
  budgetFitScore: number | null;
  upgradePrompt?: boolean;
}

export class TripCostCalculator {
  private flightPrice: number;
  private flightCurrency: string;
  private daily: DailyBudgetEstimate;
  private nights: number;
  private userTier: 'free' | 'pro';
  private userBudget: number;

  constructor(
    flightOffer: TripFlightPricing,
    daily: DailyBudgetEstimate,
    nights: number,
    userTier: 'free' | 'pro',
    userBudget: number = 0 // Required explicitly to clamp bounds logically
  ) {
    this.flightPrice = flightOffer.totalAmount;
    this.flightCurrency = flightOffer.currency;
    this.daily = daily;
    this.nights = nights;
    this.userTier = userTier;
    this.userBudget = userBudget;

    // Fast check ensuring parameter alignment internally. Real systems will execute deep FX routing here if Currency matches fail.
    if (this.flightCurrency !== this.daily.currency) {
        console.warn('Currency drift detected inside TripCostCalculator; expecting normalized inputs natively!');
    }
  }

  /**
   * Retrieves Hotel tracking bounds based completely upon location affordability
   */
  private getAccommodationEstimate(): number {
     let multiplier = 1.8; // mid baseline
     if (this.daily.tier === 'budget') multiplier = 1.4;
     if (this.daily.tier === 'premium') multiplier = 2.2;

     return parseFloat((this.daily.mealMid * multiplier * this.nights).toFixed(2));
  }

  /**
   * Evaluates bounds against total returning 0-1 bounds (1 = high compatibility)
   */
  private generateBudgetFitScore(totalCost: number): number {
     if (this.userBudget <= 0) return 1; // Unconstrained natively

     const ratio = totalCost / this.userBudget;
     let score = 1 - ratio;
     
     // Clamp strictly between 0 and 1
     return Math.max(0, Math.min(1, score));
  }

  /**
   * Executes explicit tracking algorithms and enforces Pro bounds mappings logically.
   */
  public calculate(): TripCostResult {
     const accommodationTotal = this.getAccommodationEstimate();
     
     // Base categorizations modelled naturally across daily metrics
     const foodTotal = parseFloat(((this.daily.mealCheap + this.daily.mealMid) * this.nights).toFixed(2));
     const transportTotal = parseFloat((this.daily.localTransport * this.nights).toFixed(2));
     const miscTotal = parseFloat((this.daily.coffee * this.nights * 1.5).toFixed(2)); // Basic buffer mapping
     
     const totalCost = parseFloat((this.flightPrice + (this.daily.dailyTotal * this.nights) + accommodationTotal).toFixed(2));
     const budgetFitScore = this.generateBudgetFitScore(totalCost);

     // FREE Tier Execution (Obfuscate everything structurally returning explicit bounds exclusively)
     if (this.userTier === 'free') {
         return {
             flightCost: this.flightPrice,
             totalCost: null,
             breakdown: null,
             budgetFitScore: null,
             upgradePrompt: true
         };
     }

     // PRO Tier Execution (Unlock matrix mappings natively)
     return {
         flightCost: this.flightPrice,
         totalCost: totalCost,
         budgetFitScore: parseFloat(budgetFitScore.toFixed(2)),
         breakdown: {
             flightCost: this.flightPrice,
             accommodationTotal,
             foodTotal,
             transportTotal,
             miscTotal,
             totalCost,
             currency: this.daily.currency
         }
     };
  }
}
