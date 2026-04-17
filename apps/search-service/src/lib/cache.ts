import Redis from 'ioredis';

// Fast standalone Redis wrapper mapped purely for Caching responses 
// (Bypassing core framework to avoid Fastify dependency injection scope during detached Worker loads)
export const cacheRedis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export async function setCachedSearch(hash: string, payload: any): Promise<void> {
  // Store raw JSON heavily compressed using 20 Minute EX TTL constraints
  await cacheRedis.setex(`search:${hash}`, 20 * 60, JSON.stringify(payload));
}

export async function getCachedSearch(hash: string): Promise<any | null> {
  const result = await cacheRedis.get(`search:${hash}`);
  if (result) return JSON.parse(result);
  return null;
}
