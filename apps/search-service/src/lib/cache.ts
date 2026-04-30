import Redis from 'ioredis';
import pino from 'pino';

const logger = pino({ level: 'info' });

function buildInMemoryCache(): Redis {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    setex: async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK';
    },
    incr: async (key: string) => { const v = parseInt(store.get(key) ?? '0') + 1; store.set(key, String(v)); return v; },
    expire: async () => 1,
    ttl: async () => -1,
    quit: async () => 'OK',
  } as unknown as Redis;
}

function buildProductionRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('FATAL: REDIS_URL env var is not set. Refusing to start.');
  return new Redis(url, {
    maxRetriesPerRequest: null,
    connectTimeout: 5000,
    enableOfflineQueue: false,
    lazyConnect: false,
  });
}

export const cacheRedis: Redis = process.env.NODE_ENV === 'test'
  ? buildInMemoryCache()
  : buildProductionRedis();

if (process.env.NODE_ENV !== 'test') {
  cacheRedis.on('error', (err) => logger.error({ err }, 'Redis cache error'));
  cacheRedis.on('connect', () => logger.info('Redis cache connected'));
}

export async function setCachedSearch(hash: string, payload: unknown): Promise<void> {
  try {
    await cacheRedis.setex(`search:${hash}`, 20 * 60, JSON.stringify(payload));
  } catch (err) {
    logger.error({ err, hash }, 'Failed to write search result to cache');
  }
}

export async function getCachedSearch(hash: string): Promise<unknown | null> {
  try {
    const result = await cacheRedis.get(`search:${hash}`);
    if (result) return JSON.parse(result) as unknown;
    return null;
  } catch (err) {
    logger.error({ err, hash }, 'Failed to read search result from cache');
    return null;
  }
}
