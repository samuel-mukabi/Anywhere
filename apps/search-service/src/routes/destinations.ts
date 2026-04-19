import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Destination } from '@repo/workers/src/models/Destination';
import {
  TequilaClient,
  climateScorer,
  TripCostCalculator,
  type DailyBudgetEstimate,
} from '@repo/api-clients';
import { cacheRedis } from '../lib/cache';

const DetailQuerySchema = z.object({
  budget: z.coerce.number().optional().default(5000),
  nights: z.coerce.number().optional().default(7),
  currency: z.string().length(3).default('USD'),
  travelMonth: z.coerce.number().min(1).max(12).optional()
});

const tequila = new TequilaClient();

export async function destinationRoutes(app: FastifyInstance) {

  app.get('/:id', async (
    req: FastifyRequest<{ Params: { id: string }; Querystring: Record<string, unknown> }>,
    reply: FastifyReply) => {
    try {
      const { id } = req.params;
      const parsed = DetailQuerySchema.safeParse(req.query);

      if (!parsed.success) {
         return reply.code(400).send({ error: 'Invalid parameters', details: parsed.error.issues });
      }

      const { budget, nights, currency, travelMonth } = parsed.data;
      const normalizedCurrency = currency.toUpperCase();

      // Extract native Tier seamlessly organically tracking PRO inputs locally if bound gracefully via Auth layer
      const userTier: 'free' | 'pro' = req.user?.tier === 'pro' ? 'pro' : 'free';

      // 1. Full response cache (20m TTL)
      const cacheKey = `dest:${id}:${budget}:${nights}:${travelMonth || 'any'}`;
      const cached = await cacheRedis.get(cacheKey);
      if (cached) {
         return reply.status(200).send(JSON.parse(cached));
      }

      // 2. Fetch Base Destination Data structurally dynamically gracefully resolving explicitly
      const dest = await Destination.findById(id).lean();
      if (!dest) {
          return reply.status(404).send({ error: 'Destination not found' });
      }

      const isocode = dest.iso;

      // 3. Coordinate Live Flight Tracking seamlessly ensuring 20-min caching natively locally smartly
      const flightCacheKey = `flight:${isocode}:${travelMonth || 'any'}`;
      let flightPriceStr = await cacheRedis.get(flightCacheKey);
      let flightDeepLink = `https://kiwi.com/search?destination=${isocode}`; // Base fallback
      let flightPrice: number | null = null;
      let flightDataFreshness: 'live' | 'cached' | 'estimated' = 'live';

      if (flightPriceStr) {
          const parsedCache = JSON.parse(flightPriceStr);
          flightPrice = parsedCache.price;
          flightDeepLink = parsedCache.deepLink;
          flightDataFreshness = 'cached';
      } else {
           const tequilaRes = await tequila.searchToDestination(isocode, 'NYC', travelMonth?.toString() || '');
           if (tequilaRes) {
               flightPrice = tequilaRes.price;
               flightDeepLink = tequilaRes.deepLink;
               // 20 Minute TTL natively protecting API targets smoothly securely reliably
               await cacheRedis.setex(flightCacheKey, 1200, JSON.stringify(tequilaRes));
           } else {
               // Fallback tightly mapping explicit logical constants smoothly gracefully inherently
               flightPrice = dest.avgCosts?.flightEst || 600;
               flightDataFreshness = 'estimated';
           }
      }

      // 4. Trip Economics structurally wrapping explicitly internally
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

      const calc = new TripCostCalculator(
          { totalAmount: flightPrice ?? 0, currency: 'USD' },
          dailyEstimate,
          nights,
          userTier,
          budget
      ).calculate();

      // 5. Climate Profiling logically directly inherently 
      let climateScore = 0;
      let climateTag = 'Off-season';

      if (travelMonth && dest.climateMatrix && dest.climateMatrix[travelMonth.toString()]) {
          const matrix = dest.climateMatrix[travelMonth.toString()];
          const scores = Object.values(matrix);
          if (scores.length > 0) {
             climateScore = scores.reduce((a, b) => a + b, 0) / scores.length;
             climateTag = climateScorer.climateTag(climateScore);
          }
      } else if (dest.climate) {
          climateScore = dest.climate.annualClimateScore;
          climateTag = climateScorer.climateTag(climateScore);
      }

      const safetyScore = dest.safetyScore || 50;
      
      const whyItFits: string[] = [];
      if (calc.totalCost !== null && budget >= calc.totalCost) {
          whyItFits.push(`Under budget by $${(budget - calc.totalCost).toFixed(0)}`);
      }
      if (climateScore >= 75) whyItFits.push(climateTag);
      if (safetyScore >= 80) whyItFits.push(`Excellent safety score (${safetyScore}/100)`);

      const totalCost = userTier === 'pro' ? calc.totalCost : calc.flightCost;
      const breakdown = userTier === 'pro' ? calc.breakdown : null;

      // 6. Response construction
      const responsePayload = {
          id: dest._id,
          name: dest.name,
          country: dest.country,
          flag: dest.flag,
          currency: normalizedCurrency,
          coords: dest.coords,
          totalCost,
          breakdown,
          climateTag,
          climateScore: Math.round(climateScore),
          safetyScore,
          whyItFits,
          bookingOptions: {
             flight: flightDeepLink,
             accommodation: `https://booking.com/searchresults.html?ss=${encodeURIComponent(dest.name)}`
          },
          dataFreshness: {
             flightPrice: flightDataFreshness,
             colData: dest.avgCosts?.dailyLiving ? 'live' : 'seeded',
             climate: 'seeded',
             safety: 'gpi2025'
          }
      };

      // 20 Minute TTL organically correctly caching explicit queries inherently resolving traffic securely explicitly reliably
      await cacheRedis.setex(cacheKey, 1200, JSON.stringify(responsePayload));

      return reply.status(200).send(responsePayload);

    } catch (err) {
      app.log.error({ err }, 'Destination Detailed Fetch naturally crashed logically bypassing gracefully inherently.');
      reply.status(500).send({ error: 'Internal server boundary collapsed fetching configurations.' });
    }
  });
}
