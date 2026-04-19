import mongoose from 'mongoose';
import pino from 'pino';
import { Destination } from './models/Destination';
import { GeoDBClient } from '@repo/api-clients/src/geodb/GeoDBClient';
import { restCountriesClient } from '@repo/api-clients/src/restcountries/RestCountriesClient';
import fs from 'fs';
import path from 'path';

const logger = pino({ level: 'info' });

// Preload static fallbacks dynamically reliably preventing offline missing logic gaps securely natively
const fallbackPath = path.join(__dirname, 'data', 'destination-coords-fallback.json');
const COORDS_FALLBACK = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_catalog_dev';
const geoDB = new GeoDBClient(process.env.RAPIDAPI_KEY || '');

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

async function run() {
  await mongoose.connect(MONGO_URI);
  logger.info('Connected natively firmly setting parameters structurally inside enrich worker');

  const allDestinations = await Destination.find({});
  let totalEnriched = 0;
  let totalFailed = 0;
  let missingGeoDB = 0;

  for (const dest of allDestinations) {
      try {
          // Normalize name strictly safely limiting RapidAPI misses internally 
          const cleanName = dest.name.split(' Sector')[0];
          
          await delay(300); // 300ms delay actively pacing strictly within RapidAPI tolerances globally

          // Resolves dynamically against RapidAPI targets tracking coordinates / timezone exactly 
          const geoMatch = await geoDB.searchCity(cleanName, dest.iso);

          if (!geoMatch) {
              missingGeoDB++;
              logger.warn({ name: dest.name, iso: dest.iso }, 'GeoDB matching entirely collapsed structurally skipping population / timezone externally.');
          }

          // Hydrates context fully structurally incorporating REST Countries globally mapped exactly 
          const meta = await restCountriesClient.getByAlpha2(dest.iso);

          // Update strictly without wiping overlapping boundaries like safetyScore natively calculated internally 
          const updates: Record<string, unknown> = {};
          
          if (geoMatch) {
              updates.coords = { type: 'Point', coordinates: [geoMatch.longitude, geoMatch.latitude] };
              updates.population = geoMatch.population;
              updates.timezone = geoMatch.timezone;
          } else if (COORDS_FALLBACK[dest.iso]) {
              // Gracefully execute offline JSON fallback logic securely dynamically correctly organically
              const fallback = COORDS_FALLBACK[dest.iso];
              updates.coords = { type: 'Point', coordinates: [fallback.lon, fallback.lat] };
              logger.info({ iso: dest.iso }, 'Sourced geographical bounds securely from offline fallback registry');
          }

          if (meta) {
              updates.flag = meta.flag;
              updates.currencies = meta.currencies;
              updates.languages = meta.languages;
              updates.region = meta.region;
              updates.subregion = meta.subregion;
          }

          if (Object.keys(updates).length > 0) {
              await Destination.updateOne({ _id: dest._id }, { $set: updates });
              totalEnriched++;
              logger.info({ name: dest.name }, 'Destination organically synced against external APIs completely.');
          } else {
             logger.warn({ name: dest.name }, 'Destination failed to extract any API parameters globally natively.');
             totalFailed++;
          }
      } catch (err) {
         logger.error({ err, target: dest.name }, 'Exception critically terminating processing block explicitly locally.');
         totalFailed++;
      }
  }

  logger.info({
    enriched: totalEnriched,
    failed: totalFailed,
    missingGeoDB: missingGeoDB
  }, 'Unified destination enrichment strictly successfully successfully verified cleanly globally mapping API configurations safely.');

  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch(err => {
    logger.error({ err }, 'Enrichments execution inherently explicitly stopped running internally');
    process.exit(1);
  });
}
