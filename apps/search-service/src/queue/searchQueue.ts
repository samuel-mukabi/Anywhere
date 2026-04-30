import { Queue, Worker } from 'bullmq';
import { cacheRedis, setCachedSearch } from '../lib/cache';
import { SearchQuery } from '../schema/search';
import { DestinationRanker, type FlightOffer } from '../DestinationRanker';
import { emitSearchCompleted } from '../lib/kafka';
import { TravelPayoutsClient } from '@anywhere/api-clients';
import { iataToIso } from '../lib/iata-to-iso';

export interface SearchJobPayload {
  hash: string;
  query: SearchQuery;
  userTier: 'free' | 'pro';
}

const FALLBACK_OFFERS: FlightOffer[] = [
  { destinationIso: 'IS', totalAmount: 450, currency: 'USD' },
  { destinationIso: 'JP', totalAmount: 1200, currency: 'USD' },
  { destinationIso: 'PT', totalAmount: 650, currency: 'USD' },
  { destinationIso: 'FR', totalAmount: 700, currency: 'USD' },
  { destinationIso: 'US', totalAmount: 300, currency: 'USD' },
  { destinationIso: 'IE', totalAmount: 550, currency: 'USD' },
  { destinationIso: 'NZ', totalAmount: 1800, currency: 'USD' },
  { destinationIso: 'SG', totalAmount: 1100, currency: 'USD' },
  { destinationIso: 'CH', totalAmount: 850, currency: 'USD' },
  { destinationIso: 'CA', totalAmount: 400, currency: 'USD' },
  { destinationIso: 'DE', totalAmount: 600, currency: 'USD' },
  { destinationIso: 'TH', totalAmount: 950, currency: 'USD' },
  { destinationIso: 'GR', totalAmount: 750, currency: 'USD' },
  { destinationIso: 'MX', totalAmount: 350, currency: 'USD' },
];

export const searchQueue = new Queue<SearchJobPayload, unknown, 'evaluate-destination'>('tequila-search', {
  connection: cacheRedis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 100,
    removeOnFail: 100,
  }
});

if (process.env.NODE_ENV !== 'test') {

  const ranker = new DestinationRanker();
  const tpClient = new TravelPayoutsClient(process.env.TRAVELPAYOUTS_TOKEN || '');

  const worker = new Worker<SearchJobPayload>('tequila-search', async (job) => {
    console.log(`[Worker] Started Engine Algorithm for Job ${job.id}`);

    const origin = job.data.query.departureRegion; // Already resolved to IATA by route

    const travelMonth =
      job.data.query.travelMonth ??
      (job.data.query.dateFrom
        ? new Date(job.data.query.dateFrom).getMonth() + 1
        : new Date().getMonth() + 1);

    // Fetch real flight prices; fall back to static offers if token is missing or API fails
    let flightOffers: FlightOffer[] = FALLBACK_OFFERS;

    if (process.env.TRAVELPAYOUTS_TOKEN) {
      try {
        const tpOffers = await tpClient.searchAnywhere(origin, { searchId: job.id ?? 'search' });

        if (tpOffers.length > 0) {
          const mapped: FlightOffer[] = [];
          for (const offer of tpOffers) {
            const iso = iataToIso(offer.destinationIATA);
            if (iso) {
              mapped.push({
                destinationIso: iso,
                totalAmount: offer.price,
                currency: offer.currency,
              });
            }
          }
          if (mapped.length > 0) {
            flightOffers = mapped;
            console.log(`[Worker] TravelPayouts returned ${mapped.length} priced routes from ${origin}`);
          } else {
            console.warn('[Worker] TravelPayouts returned offers but none mapped to known ISOs — using fallback');
          }
        }
      } catch (err) {
        console.error('[Worker] TravelPayouts fetch failed, using fallback data:', err);
      }
    } else {
      console.warn('[Worker] TRAVELPAYOUTS_TOKEN not set — using fallback static flight data');
    }

    const rankParams = {
      flightOffers,
      budget: job.data.query.budget,
      vibes: job.data.query.vibes,
      travelMonth,
      nights: job.data.query.duration,
      userTier: job.data.userTier,
    };

    const results = await ranker.rank(rankParams);

    await setCachedSearch(job.data.hash, results);

    await emitSearchCompleted({
      totalResults: results.length,
      topDestination: results.length > 0 ? results[0].city : 'None',
      queryBudget: job.data.query.budget
    });

    console.log(`[Worker] Processed Job ${job.id} - Yielded ${results.length} ranks`);

    return results;

  }, {
    connection: cacheRedis,
    concurrency: 1,
    limiter: {
      max: 1,
      duration: 400
    }
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
  });
}
