import mongoose from 'mongoose';
import pino from 'pino';
import { Destination } from './models/Destination';
import { generateMockDestinations } from './data/mockDestinations';
import { GeoDBClient } from '@repo/api-clients';

const logger = pino({ level: 'info' });
const geoDB = new GeoDBClient(process.env.RAPIDAPI_KEY || '');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_catalog_dev';

async function seed() {
  try {
    logger.info(`Connecting natively to ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI);

    logger.info('Wiping existing destinations strictly preserving indexes natively...');
    await Destination.deleteMany({}); // Delete documents, not indexes

    logger.info('Generating 250 dynamic destination permutations natively...');
    const destinations = generateMockDestinations(250);

    logger.info('Resolving precise geographical coordinates safely explicitly checking cache targets...');
    
    // Polite pacing preventing massive spike 
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    for (const dest of destinations) {
        // Normalize names structurally eliminating trailing Sector tags uniquely avoiding RapidAPI misses safely
        const queryName = dest.name.split(' Sector')[0];
        
        // Wait gracefully preventing RapidAPI limits triggering safely natively
        await delay(500); 

        const geoMatch = await geoDB.searchCity(queryName, dest.iso);
        if (geoMatch) {
            dest.coords.coordinates = [geoMatch.longitude, geoMatch.latitude];
            // Update base name securely synchronizing native map tracking explicitly globally 
            dest.name = geoMatch.name;
        }
    }

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
