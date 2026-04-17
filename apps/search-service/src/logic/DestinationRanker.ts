import { SearchQuery, SearchResultTarget } from '../schema/search';
import { AmadeusAdapter } from '../adapters/AmadeusAdapter';
import { NumbeoAdapter } from '../adapters/NumbeoAdapter';
import { WeatherAdapter } from '../adapters/WeatherAdapter';

/**
 * Destination Ranker evaluates the raw input criteria across our Data providers.
 * Outputs precisely top 20 ranked places evaluating climate fit, vibe match, and budget overlap.
 */
export class DestinationRanker {
  
  private amadeus = new AmadeusAdapter();
  private numbeo = new NumbeoAdapter();
  private weather = new WeatherAdapter();

  // A fixed global dictionary of supported Destinations for the baseline.
  // The system iterates over these to check which matches the user criteria.
  private GLOBAL_LOCATIONS = [
    { city: 'Bali', code: 'DPS', country: 'Indonesia', tags: ['Beach', 'Warm', 'Digital Nomad'] },
    { city: 'Bangkok', code: 'BKK', country: 'Thailand', tags: ['City', 'Warm', 'Food'] },
    { city: 'Lisbon', code: 'LIS', country: 'Portugal', tags: ['City', 'Historical', 'Beach'] },
    { city: 'Tbilisi', code: 'TBS', country: 'Georgia', tags: ['Historical', 'Mountains', 'Food'] },
    { city: 'Paris', code: 'PAR', country: 'France', tags: ['City', 'Historical', 'Museums'] },
    { city: 'Medellin', code: 'MDE', country: 'Colombia', tags: ['Mountains', 'Warm', 'Digital Nomad'] }
  ];

  /**
   * Primary Algorithm Entrypoint.
   */
  public async computeTopDestinations(query: SearchQuery): Promise<SearchResultTarget[]> {
    
    // We execute lookups against the baseline globally in parallel 
    // to prevent cascading latencies stalling the search string.
    const evaluations = await Promise.all(
        this.GLOBAL_LOCATIONS.map(async (location) => {
            
            // 1. Fetch live metrics concurrently
            const [flightCost, colIndex, climateScore] = await Promise.all([
               this.amadeus.getEstimatedFlightCost(query.departureRegion, location.code, query.dateFrom),
               this.numbeo.getLivingCostIndex(location.code),
               this.weather.getClimateScore(location.code, query.dateFrom),
            ]);

            // If flights fail completely, disregard this city from the results seamlessly
            if (flightCost === null) return null;

            // 2. Budget Logic
            // Extrapolate daily baseline costs mapping NYC Index (100) ~= $150/day as the scaling pivot.
            const dailyLivingCost = (colIndex / 100) * 150;
            const projectedTotalSpend = flightCost + (dailyLivingCost * query.duration);

            const budgetFitScore = projectedTotalSpend <= query.budget ? 100 : Math.max(0, 100 - ((projectedTotalSpend - query.budget) / query.budget * 100));

            // 3. Vibe Matching Algorithm (Intersection over union against target tags)
            const matchedVibes = location.tags.filter(tag => query.vibes.includes(tag)).length;
            const vibeScore = query.vibes.length > 0 ? (matchedVibes / query.vibes.length) * 100 : 50;

            // 4. Final Aggregator
            // Gives extremely high weight to Budget (50%), then Climate (30%), then Vibe (20%).
            const totalMatchScore = (budgetFitScore * 0.5) + (climateScore * 0.3) + (vibeScore * 0.2);

            return {
                city: location.city,
                country: location.country,
                estimatedFlightCost: flightCost,
                livingCostIndices: colIndex,
                climateScore,
                totalMatchScore,
                tags: location.tags,
            } as SearchResultTarget;
        })
    );

    // 5. Cleanup nulls and sort descending by total match algorithms. Returns Top 20.
    const results = evaluations.filter(Boolean) as SearchResultTarget[];
    results.sort((a, b) => b.totalMatchScore - a.totalMatchScore);

    return results.slice(0, 20);
  }
}
