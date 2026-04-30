import pino from 'pino';
import type { FlattenMaps } from 'mongoose';
import { Destination, IDestination } from '@anywhere/workers/src/models/Destination';
import {
  TripCostCalculator,
  type DailyBudgetEstimate,
  type TripFlightPricing,
} from '@anywhere/api-clients';
import { emitSearchRanked } from './lib/kafka';

const logger = pino({ level: 'info' });

export interface FlightOffer {
  destinationIso: string;
  totalAmount: number;
  currency: string;
}

export interface SearchParams {
  flightOffers: FlightOffer[];
  budget: number;
  vibes: string[];
  travelMonth: number; // 1-12
  nights: number;
  userTier: 'free' | 'pro';
  searchId?: string;
}

export interface RankedDestination {
  id: string;
  city: string;
  country: string;
  iataCode: string;
  imageUrl?: string;
  flightPrice: number;
  totalCost: number;
  climateScore: number;
  costScore: number;
  safetyScore: number;
  latitude: number;
  longitude: number;
  whyItFits: string[];
  rankScore: number;
}

export class DestinationRanker {
  private monthName(month: number): string {
    return new Date(Date.UTC(2026, month - 1, 1)).toLocaleString('en-US', { month: 'long' });
  }

  /**
   * Orchestrates unified destination ranking dynamically binding climate/budget/safety metrics internally.
   */
  public async rank(params: SearchParams): Promise<RankedDestination[]> {
    const { flightOffers, budget, vibes, travelMonth, nights, userTier } = params;
    const searchId = params.searchId ?? `search_${Date.now()}`;
    
    // Convert travel month to 0-indexed string offset structurally if climateMatrix uses "1".."12" string keys natively
    const monthStr = travelMonth.toString();

    let droppedCount = 0;
    const scoredResults: RankedDestination[] = [];

    // Pre-extract all ISOs logically generating a single bulk lookup mapped actively 
    const isocodes = flightOffers.map(f => f.destinationIso);
    const destinations = await Destination.find({ iso: { $in: isocodes } }).lean();
    
    // Quick hashmap reliably locking exact lookups naturally preventing heavy index scans internally
    const destMap = new Map<string, FlattenMaps<IDestination>>();
    destinations.forEach(d => destMap.set(d.iso, d));

    for (const offer of flightOffers) {
        const dest = destMap.get(offer.destinationIso);
        if (!dest) {
            droppedCount++;
            continue;
        }

        const whyItFits: string[] = [];

        // 1. Budget Fit dynamically evaluating Pro tracking externally 
        const dailyEstimate: DailyBudgetEstimate = {
            currency: 'USD',
            mealCheap: dest.avgCosts?.mealCheap || 10,
            mealMid: dest.avgCosts?.mealMid || 25,
            localTransport: dest.avgCosts?.localTransport || 5,
            coffee: dest.avgCosts?.coffee || 3,
            dailyTotal: dest.avgCosts?.dailyLiving || 50,
            tier: (dest.colTier || 'mid') as DailyBudgetEstimate['tier'],
            colIndex: dest.colTier === 'premium' ? 120 : (dest.colTier === 'budget' ? 60 : 100)
        };

        const flightPricing: TripFlightPricing = {
          totalAmount: offer.totalAmount,
          currency: offer.currency,
        };

        // Always compute with 'pro' internally — ranker needs totalCost for budget filtering.
        // Free-tier gating (hiding breakdown) happens at the response/presentation layer.
        const budgetCalc = new TripCostCalculator(
            flightPricing,
            dailyEstimate,
            nights,
            'pro',
            budget
        ).calculate();

        if (budgetCalc.totalCost === null || budgetCalc.totalCost > budget) {
            droppedCount++;
            continue;
        }

        const budgetFitScore = budgetCalc.budgetFitScore ?? 0;

        const savings = budget - budgetCalc.totalCost;
        if (savings > 0) {
            whyItFits.push(`Under budget by $${savings.toFixed(0)}`);
        }

        // 2. Climate Alignment
        let compositeClimateScore = 0;
        const monthClimate = dest.climateMatrix?.[monthStr];
        if (monthClimate) {
            const vibeScores = vibes.map(v => monthClimate[v] || 0);
            if (vibeScores.length > 0) {
                compositeClimateScore = vibeScores.reduce((a, b) => a + b, 0) / vibeScores.length;
            }
        }
        
        const monthName = this.monthName(travelMonth);
        if (compositeClimateScore > 75) {
            whyItFits.push(`Perfect climate for ${vibes.join('/')} in ${monthName}`);
        } else if (compositeClimateScore > 50) {
            whyItFits.push(`Good weather match in ${monthName}`);
        }

        // 3. Safety Bounds
        const safetyScore = dest.safetyScore || 50;
        if (safetyScore >= 80) whyItFits.push(`Safety score ${safetyScore}/100`);

        // Composite Mathematics
        const normalizedClimate = compositeClimateScore / 100;
        const normalizedSafety = safetyScore / 100;

        const rankScore = (budgetFitScore * 0.5) + (normalizedClimate * 0.3) + (normalizedSafety * 0.2);
        console.log(`[Ranker] Ranked ${dest.name} with score ${rankScore}`);

        scoredResults.push({
            id: dest._id.toString(),
            city: dest.name || 'Unknown City',
            country: dest.country || 'Unknown Country',
            iataCode: dest.iso || '???',
            imageUrl: dest.imageUrl,
            flightPrice: offer.totalAmount,
            totalCost: budgetCalc.totalCost,
            climateScore: compositeClimateScore,
            costScore: Math.round(budgetFitScore * 100),
            safetyScore: safetyScore,
            latitude: dest.coords?.coordinates[1] || 0,
            longitude: dest.coords?.coordinates[0] || 0,
            whyItFits,
            rankScore: rankScore
        });
    }

    // Sort heavily structurally sorting uniquely descending 
    scoredResults.sort((a, b) => b.rankScore - a.rankScore);
    const topResults = scoredResults.slice(0, 20);

    // Dynamic analytics reporting
    const avgRankScore = topResults.length > 0
      ? topResults.reduce((a, r) => a + r.rankScore, 0) / topResults.length
      : 0;

    const topDestName = topResults.length > 0 ? topResults[0].city : 'None';
    const analyticsPayload = {
      searchId,
      topDestination: topDestName,
      avgRankScore: parseFloat(avgRankScore.toFixed(3)),
      resultCount: topResults.length,
      droppedCount,
    };

    await emitSearchRanked(analyticsPayload);
    logger.info({ analytics: 'search.ranked', event: analyticsPayload }, 'Destination ranking completed');

    return topResults;
  }
}
