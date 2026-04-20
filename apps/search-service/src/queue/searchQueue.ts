import { Queue, Worker } from 'bullmq';
import { cacheRedis, setCachedSearch } from '../lib/cache';
import { SearchQuery } from '../schema/search';
import { DestinationRanker, type FlightOffer } from '../DestinationRanker';
import { emitSearchCompleted } from '../lib/kafka';

// Define the shape of our background job
export interface SearchJobPayload {
  hash: string;
  query: SearchQuery;
}

// 1. Setup the Producer (To allow routes to add jobs)
export const searchQueue = new Queue<SearchJobPayload, unknown, 'evaluate-destination'>('tequila-search', {
  connection: cacheRedis,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: 100,
    removeOnFail: 100, // Do not bloat redis violently
  }
});

// 2. Setup the Background Consumer (Evaluates the heaviest tasks detached from the route handler)
// Important wrapper check prevents Worker starting during purely test scopes if implemented.
if (process.env.NODE_ENV !== 'test') {
  
  const ranker = new DestinationRanker();

  const worker = new Worker<SearchJobPayload>('tequila-search', async (job) => {
    
    // Perform complex parallel outbound fetching algorithms safely
    console.log(`[Worker] Started Engine Algorithm for Job ${job.id}`);
    
    // Mock flight fetching layer resolving explicitly upstream later naturally 
    const mockFlightOffers: FlightOffer[] = [];
    const travelMonth = new Date(job.data.query.dateFrom).getMonth() + 1;

    const rankParams = {
        flightOffers: mockFlightOffers,
        budget: job.data.query.budget,
        vibes: job.data.query.vibes,
        travelMonth,
        nights: job.data.query.duration,
        userTier: 'free' as const
    };

    const results = await ranker.rank(rankParams);

    // Save final raw output natively into Fast-Retrieval Redis Memory layer for the polling client
    await setCachedSearch(job.data.hash, results);
    
    // Broadcast Analytics asynchronously into Kafka
    await emitSearchCompleted({
      totalResults: results.length,
      topDestination: results.length > 0 ? results[0].destination?.name || 'None' : 'None',
      queryBudget: job.data.query.budget
    });

    console.log(`[Worker] Processed Job ${job.id} - Yielded ${results.length} ranks`);

    // The output return value natively feeds into BullMQ job.returnvalue 
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
