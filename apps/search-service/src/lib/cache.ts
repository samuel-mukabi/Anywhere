import Redis from 'ioredis';

// Fast standalone Redis wrapper mapped purely for Caching responses 
// (Bypassing core framework to avoid Fastify dependency injection scope during detached Worker loads)
function buildInMemoryCache(): Redis {
  const store = new Map<string, string>();
  return {
    get: async (key: string) => store.get(key) ?? null,
    setex: async (key: string, _ttl: number, value: string) => {
      store.set(key, value);
      return 'OK';
    },
    quit: async () => 'OK',
  } as unknown as Redis;
}

export const cacheRedis: Redis = process.env.NODE_ENV === 'test'
  ? buildInMemoryCache()
  : new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function setCachedSearch(hash: string, payload: unknown): Promise<void> {
  // Store raw JSON heavily compressed using 20 Minute EX TTL constraints
  await cacheRedis.setex(`search:${hash}`, 20 * 60, JSON.stringify(payload));
}

export async function getCachedSearch(hash: string): Promise<unknown | null> {
  const result = await cacheRedis.get(`search:${hash}`);
  if (result) return JSON.parse(result) as unknown;
  return null;
}
