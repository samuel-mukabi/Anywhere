import mongoose from 'mongoose';
import { Destination } from './apps/workers/src/models/Destination';
import pino from 'pino';

const logger = pino({ level: 'info' });
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_catalog_dev';

async function verify() {
  await mongoose.connect(MONGO_URI);
  const count = await Destination.countDocuments({});
  logger.info({ count }, 'Total destinations');

  const randomDest = await Destination.findOne({ 
      'climate.monthly': { $exists: true, $not: { $size: 0 } },
      'avgCosts.mealCheap': { $exists: true },
      'safetyScore': { $exists: true }
  });

  if (randomDest) {
    logger.info({ 
        name: randomDest.name,
        safety: randomDest.safetyScore,
        costs: randomDest.avgCosts,
        climateMonths: randomDest.climate?.monthly?.length
    }, 'Verification Sample');
  } else {
    logger.warn('Could not find a fully enriched destination record');
  }

  await mongoose.disconnect();
}

verify().catch(console.error);
