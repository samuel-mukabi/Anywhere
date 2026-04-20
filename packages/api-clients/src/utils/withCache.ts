import { CacheService } from '@repo/redis';

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
  staleSeconds?: number,
): Promise<T> {
  const cached = await CacheService.get<{ data: T; expiresAt: number }>(key);
  const now = Date.now();

  if (cached !== null) {
    if (staleSeconds && now > cached.expiresAt) {
      // Data is stale, trigger background refresh
      fn().then(fresh => {
        CacheService.set(key, { data: fresh, expiresAt: now + (staleSeconds * 1000) }, ttlSeconds);
      }).catch(err => console.error('SWR refresh failed', err));
    }
    return cached.data;
  }

  const fresh = await fn();
  const expiresAt = now + (staleSeconds ? staleSeconds * 1000 : ttlSeconds * 1000);
  await CacheService.set(key, { data: fresh, expiresAt }, ttlSeconds);
  return fresh;
}
