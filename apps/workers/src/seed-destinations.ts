import mongoose from 'mongoose';
import pino from 'pino';
import { Destination } from './models/Destination';
import { generateMockDestinations } from './data/mockDestinations';

const logger = pino({ level: 'info' });

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_catalog_dev';

async function seed() {
  try {
    logger.info(`Connecting natively to ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);

    logger.info('Wiping existing destinations strictly preserving indexes natively...');
    await Destination.deleteMany({}); // Delete documents, not indexes

    logger.info('Generating 250 dynamic destination permutations natively...');
    const destinations = generateMockDestinations(250);

    logger.info('Bulk Upserting documents natively via Mongoose Model layer...');
    
    await Destination.insertMany(destinations);

    logger.info(`Done! Safely seeded exactly ${destinations.length} catalog items.`);

  } catch (err) {
    logger.error({ err }, 'Fatal Seeding Logic Failure');
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from mongoose.');
  }
}

seed();
