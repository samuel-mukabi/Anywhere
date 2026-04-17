import Redis from 'ioredis';
import pino from 'pino';

export const cacheLogger = pino({ name: 'redis-telemetry', level: 'info' });

// Assumes UPSTASH_REDIS_URL or standard REDIS_URL from Doppler
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379';

// Explicitly define a robust connection configuration supporting Upstash Serverless limits efficiently.
export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    // Exponential backoff to avoid hammering serverless databases recursively
    const delay = Math.min(times * 100, 3000);
    return delay;
  }
});

// Passive telemetry binds allowing global analytical monitoring dynamically 
redisClient.on('error', (err) => {
  cacheLogger.error({ err }, 'Redis core infrastructure connection issue.');
});
