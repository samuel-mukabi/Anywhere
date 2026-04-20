import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import mongoose from 'mongoose';
import pino from 'pino';
import { Destination } from './models/Destination';
import { restCountriesClient } from '@anywhere/api-clients';

const logger = pino({ level: 'info' });
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_catalog_dev';

async function run() {
  await mongoose.connect(MONGO_URI);
  logger.info('Connected natively strictly mapping GPI ingestion script locally');

  const csvPath = path.resolve(__dirname, '../../../data/gpi-2025.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // Parse CSV directly 
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
  });

  let matchedMatches = 0;
  let unrankedMatches = 0;

  // Track regional safety score distributions
  const regionSafetyScores: Record<string, number[]> = {};
  const gpiMap = new Map<string, { safetyScore: number, gpiRank: number }>();

  // Extract from CSV and normalize directly safely mapping bounded mathematical vectors locally
  for (const record of records as Array<Record<string, string>>) {
      const gpiScore = parseFloat(record.gpiScore);
      const gpiRank = parseInt(record.rank, 10);
      
      // Calculate securely matching algorithm strictly restricting globally safe scale
      let safetyScore = Math.round(((3.5 - gpiScore) / 2.5) * 100);
      safetyScore = Math.max(0, Math.min(100, safetyScore)); 

      gpiMap.set(record.iso3, { safetyScore, gpiRank });
  }

  const allDestinations = await Destination.find({});
  
  // First pass: Update strictly known boundaries and map tracking for region averages natively
  for (const dest of allDestinations) {
      const geoMapping = await restCountriesClient.getByAlpha2(dest.iso);
      const region = geoMapping?.region || 'Global'; // default grouping grouping unassigned natively

      if (gpiMap.has(dest.iso)) {
          const { safetyScore, gpiRank } = gpiMap.get(dest.iso)!;
          
          await Destination.updateOne({ iso: dest.iso }, {
              $set: { safetyScore, gpiRank, gpiYear: 2025 }
          });
          matchedMatches++;

          if (!regionSafetyScores[region]) regionSafetyScores[region] = [];
          regionSafetyScores[region].push(safetyScore);
      }
  }

  // Second pass: Calculate median for missing locations appropriately natively defaulting to standard thresholds
  const regionMedians: Record<string, number> = {};
  for (const [region, scores] of Object.entries(regionSafetyScores)) {
      scores.sort((a,b) => a - b);
      const mid = Math.floor(scores.length / 2);
      const median = scores.length % 2 !== 0 ? scores[mid] : (scores[mid - 1] + scores[mid]) / 2;
      regionMedians[region] = Math.round(median);
  }

  // Apply medians structurally
  for (const dest of allDestinations) {
      if (!gpiMap.has(dest.iso)) {
         const geoMapping = await restCountriesClient.getByAlpha2(dest.iso);
         const region = geoMapping?.region || 'Global';
         
         // Use region median or standard average default globally mapped safely if isolated entirely without prior context
         const safetyScore = regionMedians[region] || 50; 

         await Destination.updateOne({ iso: dest.iso }, {
              $set: { safetyScore, gpiYear: 2025 }
         });
         unrankedMatches++;
      }
  }

  logger.info({
    matched: matchedMatches,
    unmapped: unrankedMatches
  }, 'GPI Pipeline safely completely resolved syncing boundaries correctly.');

  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch(err => {
    logger.error({ err }, 'Exception gracefully executing locally internally');
    process.exit(1);
  });
}
