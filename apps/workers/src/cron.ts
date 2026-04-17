import cron from 'node-cron';
import mongoose from 'mongoose';
import pino from 'pino';
import { Destination } from './models/Destination';

const logger = pino({ level: 'info' });
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/anywhere_catalog_dev';

/**
 * Worker Logic querying an external Cost of Living / Climate analytical pipeline
 * updating the DB directly without interrupting live HTTP reads.
 */
async function syncExternalData() {
  logger.info('Starting nightly destination metrics normalization...');
  
  if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(MONGO_URI);
  }

  // Simulated massive streaming operation hitting Numbeo APIs
  try {
      const records = await Destination.find({});
      logger.info(`Validating ${records.length} stored locations...`);

      for (const dest of records) {
          // Mock data mutation simulating Numbeo pulling
          dest.avgCosts.dailyLiving += Math.floor(Math.random() * 5) - 2; // Fluctuates +-2 dollars
          
          // Hidden gem score fluctuates slowly
          const vibeShift = Math.floor(Math.random() * 3) - 1; 
          dest.hiddenGemScore = Math.max(0, Math.min(100, dest.hiddenGemScore + vibeShift));

          dest.updatedAt = new Date();
          await dest.save();
      }

      logger.info('Successfully rotated global pricing indices and Gem metrics.');
  } catch (err) {
      logger.error({ err }, 'Worker sequence failed');
  }
}

// Ensure execution strictly at 00:00 every day natively
cron.schedule('0 0 * * *', () => {
    logger.info('Cron Scheduler triggered -> syncExternalData');
    syncExternalData();
}, {
    timezone: 'UTC'
});

logger.info('Cron Engine initialized and idling. Waiting for schedule limits.');

// Connect proactively so mongoose is warmed up
mongoose.connect(MONGO_URI)
  .then(() => logger.info('Mongoose natively connected locally'))
  .catch(err => logger.error({ err }, 'Failed mongoose start'));

// Safe shutdown
process.on('SIGINT', async () => {
   await mongoose.disconnect();
   process.exit(0);
});
