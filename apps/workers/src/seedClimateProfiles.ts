import { Worker, Job } from 'bullmq';
import { redisClient } from '@repo/redis/src/client';
import { quarterlyClimateQueue } from '@repo/redis/src/queues';
import mongoose from 'mongoose';
import pino from 'pino';
import { openMeteoClient, climateScorer } from '@anywhere/api-clients';
import type { MonthlyClimate, Vibe } from '@anywhere/api-clients';
import { Destination } from './models/Destination';

const logger = pino({ level: 'info' });
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_catalog_dev';

const VIBES: Vibe[] = ['Tropical', 'Snowy', 'Beach', 'Desert', 'Mild City', 'Mountains'];

async function ensureDbConnect() {
   if (mongoose.connection.readyState !== 1) {
       await mongoose.connect(MONGO_URI);
   }
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processQuarterlyClimateJob(job: Job): Promise<void> {
  logger.info({ jobId: job.id }, 'Initiating Quarterly Climate Seed Sequence');

  await ensureDbConnect();

  const records = await Destination.find({});

  let totalUpdated = 0;
  let totalFailed = 0;

  const currentYear = new Date().getFullYear();

  for (const dest of records) {
    try {
      await delay(300); // polite rate limiting

      let lng = 0;
      let lat = 0;
      if (dest.coords?.coordinates) {
        lng = dest.coords.coordinates[0];
        lat = dest.coords.coordinates[1];
      } else {
        throw new Error('No coordinates for destination');
      }

      const currentYearData = await openMeteoClient.getMonthlyClimate(lat, lng, currentYear);

      await delay(300);
      const prevYearData = await openMeteoClient.getMonthlyClimate(lat, lng, currentYear - 1);

      const avgMonthlyData: MonthlyClimate[] = [];
      for (let month = 1; month <= 12; month++) {
        const currentMonth = currentYearData.find((d) => d.month === month);
        const prevMonth = prevYearData.find((d) => d.month === month);

        if (currentMonth && prevMonth) {
          avgMonthlyData.push({
            month: month as MonthlyClimate['month'],
            avgTempC: parseFloat(((currentMonth.avgTempC + prevMonth.avgTempC) / 2).toFixed(1)),
            avgPrecipMm: parseFloat(((currentMonth.avgPrecipMm + prevMonth.avgPrecipMm) / 2).toFixed(1)),
            avgSunshineHours: parseFloat(((currentMonth.avgSunshineHours + prevMonth.avgSunshineHours) / 2).toFixed(1)),
          });
        } else if (currentMonth) {
          avgMonthlyData.push(currentMonth);
        } else if (prevMonth) {
          avgMonthlyData.push(prevMonth);
        }
      }

      const climateMatrix: Record<string, Record<string, number>> = {};
      const bestVibeMonths: Set<number> = new Set();

      for (const data of avgMonthlyData) {
        const monthStr = data.month.toString();
        climateMatrix[monthStr] = {};

        for (const vibe of VIBES) {
          const score = climateScorer.scoreMonth(data, [vibe]);
          climateMatrix[monthStr][vibe] = score;

          if (score > 80) {
            bestVibeMonths.add(data.month);
          }
        }
      }

      const bestMonths = Array.from(bestVibeMonths).sort((a, b) => a - b);

      const queryParam = dest.slug ? { slug: dest.slug } : { _id: dest._id };

      await Destination.updateOne(queryParam, {
        $set: {
          climateMatrix,
          bestMonths,
          lastClimateUpdate: new Date(),
        },
      });

      totalUpdated++;
      logger.info({ dest: dest.name }, 'Successfully updated climate profiles');
    } catch (e: unknown) {
      totalFailed++;
      const msg = e instanceof Error ? e.message : String(e);
      logger.error({ dest: dest.name, err: msg }, 'Failed to compute climate profile for destination');
    }
  }

  logger.info({ totalUpdated, totalFailed }, 'Quarterly Climate Data Seed Execution Finalized');
}

export const seedClimateProfilesWorker = new Worker(
  'quarterly-climate',
  processQuarterlyClimateJob,
  { connection: redisClient },
);

seedClimateProfilesWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err }, 'Worker execution physically crashed');
  logger.fatal({ alert: 'climate_quarterly_crash' }, 'Quarterly Climate Profile Worker Failed!');
});

/**
 * Initializes the automated schedule bounding the job securely into BullMQ.
 * 0 4 1 * /3 * -> quarterly, 4am UTC on the 1st
 */
export async function bootstrapClimateCron() {
    logger.info('Injecting CRON repeatable logic securely into BullMQ for Climate...');
    await quarterlyClimateQueue.add('seed-climate', {}, {
        repeat: {
            pattern: '0 4 1 */3 *' 
        }
    });
}

// ---------------------------------------------------------------------------
// CLI entry-point (for manual pre-population)
// ---------------------------------------------------------------------------

if (require.main === module) {
  (async () => {
    logger.info('Climate Profiles CLI › MongoDB connected. Triggering one-shot execution.');
    const mockJob = { id: 'manual-trigger' } as Job;
    await processQuarterlyClimateJob(mockJob);
    logger.info('Manual run complete');
    await mongoose.disconnect();
    process.exit(0);
  })().catch((err) => {
    logger.error({ err }, 'Climate Profiles CLI › fatal error');
    process.exit(1);
  });
}
