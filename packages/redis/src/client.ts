import Redis from 'ioredis';
import pino from 'pino';

export const cacheLogger = pino({ name: 'redis-telemetry', level: 'info' });

// Assumes UPSTASH_REDIS_URL or standard REDIS_URL from Doppler
const REDIS_URL = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || 'redis://localhost:6379';

function buildInMemoryRedis(): Redis {
  const store = new Map<string, string>();
  return {
    on: () => undefined,
    get: async (key: string) => store.get(key) ?? null,
    setex: async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK';
    },
    del: async (key: string) => (store.delete(key) ? 1 : 0),
  } as unknown as Redis;
}

// During tests, avoid real network connections to local Redis.
export const redisClient: Redis = process.env.NODE_ENV === 'test'
  ? buildInMemoryRedis()
  : new Redis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

// Passive telemetry binds allowing global analytical monitoring dynamically 
redisClient.on('error', (err: unknown) => {
  cacheLogger.error({ err }, 'Redis core infrastructure connection issue.');
});
