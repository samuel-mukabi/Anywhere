import { Worker, Job, Queue } from 'bullmq';
import { redisClient } from '@repo/redis/src/client';
import { nightlySeedQueue } from '@repo/redis/src/queues';
import mongoose from 'mongoose';
import pino from 'pino';
import { WhereNextClient } from '@repo/api-clients';
import { Destination } from './models/Destination';

const logger = pino({ level: 'info' });
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_catalog_dev';

const whereNext = new WhereNextClient();

/**
 * Ensures MongoDB is deeply connected locally prior to executing heavy extraction loops.
 */
async function ensureDbConnect() {
   if (mongoose.connection.readyState !== 1) {
       await mongoose.connect(MONGO_URI);
   }
}

/**
 * Small utility enabling explicit polling thresholds seamlessly natively across loops.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const seedDestinationCostsWorker = new Worker(
  'nightly-seed',
  async (job: Job) => {
    logger.info({ jobId: job.id }, 'Initiating WhereNext Seed Sequence natively');

    await ensureDbConnect();

    // 1. Load absolute parameters directly from the Database securely
    const records = await Destination.find({}).select('slug code name'); // Lean lookup
    
    let totalUpdated = 0;
    let totalFailed = 0;
    let totalFallbacks = 0;

    for (const dest of records) {
        try {
            await delay(200); // 200ms pacing strictly mapping the bounds natively to avoid external throttle hits

            const isKnown = whereNext.isKnownCity(dest.slug);
            if (!isKnown) {
               totalFallbacks++;
            }

            const budgetData = await whereNext.getDailyBudget(dest.slug, 'USD');

            // Map variables explicitly into the exact Native Mongo architecture directly
            dest.avgCosts = {
               ...dest.avgCosts,
               mealCheap: budgetData.mealCheap,
               mealMid: budgetData.mealMid,
               localTransport: budgetData.localTransport,
               coffee: budgetData.coffee,
               dailyLiving: budgetData.dailyTotal
            };
            
            dest.colTier = budgetData.tier;
            dest.updatedAt = new Date();

            // Mongoose explicit setter bypasses standard limits safely
            await Destination.updateOne({ slug: dest.slug }, {
               $set: {
                  avgCosts: dest.avgCosts,
                  colTier: dest.colTier,
                  lastCostUpdate: new Date()
               }
            });

            totalUpdated++;
        } catch (e: unknown) {
            totalFailed++;
            logger.warn({
              slug: dest.slug,
              err: e instanceof Error ? e.message : String(e),
            }, 'Seed Sequence collapsed mapping destination explicitly.');
        }
    }

    logger.info({ totalUpdated, totalFailed, totalFallbacks }, 'WhereNext Nightly Data Seed Execution Finalized');

    // Grafana Alerting Hook - Pino structured mapping safely triggered via standard threshold monitors structurally
    if (totalFailed > 0 || totalFallbacks > 20) {
        logger.error({ 
            alert: 'wherenext_degraded', 
            totalFailed, 
            totalFallbacks 
        }, 'CRITICAL: WhereNext Adapter returned severe degraded state thresholds. Immediate reconciliation check required!');
    }
  },
  { connection: redisClient }
);

seedDestinationCostsWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Worker execution physically crashed');
  
  // Hard crash mapping alerts exactly into Grafana Loki Native ingestion payload securely
  logger.fatal({ alert: 'wherenext_nightly_crash' }, 'Nightly Data Worker Completely Failed Execution locally!');
});

/**
 * Initializes the automated schedule bounding the job securely into BullMQ.
 * Usually placed inside an index.ts to bootstrap natively alongside node execution.
 */
export async function bootstrapSeedCron() {
    logger.info('Injecting CRON repeatable logic securely into BullMQ...');
    await nightlySeedQueue.add('seed-wherenext', {}, {
        repeat: {
            pattern: '0 3 * * *' // 3AM UTC Daily
        }
    });
}
