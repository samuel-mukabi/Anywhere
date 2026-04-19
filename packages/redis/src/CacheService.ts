import { redisClient, cacheLogger } from './client';

export class CacheService {
  
  /**
   * Retrieves a parsed object strictly logging hit/miss ratios analytically.
   */
  static async get<T>(key: string): Promise<T | null> {
    const raw = await redisClient.get(key);
    
    if (raw) {
        cacheLogger.info({ key, status: 'HIT' }, 'Cache Hit');
        return JSON.parse(raw) as T;
    }
    
    cacheLogger.info({ key, status: 'MISS' }, 'Cache Miss');
    return null;
  }

  /**
   * Pushes a serialized JSON blob clamping natively to a specified Expiry (in seconds).
   */
  static async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
     await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  }

  /**
   * Drops a cache key securely natively returning boolean deletion flags
   */
  static async del(key: string): Promise<boolean> {
     const count = await redisClient.del(key);
     return count > 0;
  }

  /**
   * Implements a Stale-While-Revalidate fetching loop locally.
   * 
   * If Cache exists: it responds IMMEDIATELY with the stale data, whilst firing `fetcher()`
   * completely un-awaited into the NodeJS background Event Loop locally.
   * If Cache is missing: it strictly awaits the `fetcher()` blocking the user safely.
   */
  static async getOrFetch<T>(key: string, ttlSeconds: number, fetcher: () => Promise<T>): Promise<T> {
     
     const cachedData = await this.get<T>(key);

     if (cachedData !== null) {
        
        // Asynchronously Revalidate in Background safely capturing errors avoiding unhandled promises
        Promise.resolve().then(async () => {
            try {
                const freshData = await fetcher();
                await this.set(key, freshData, ttlSeconds);
                cacheLogger.info({ key }, 'SWR: Background Revalidation Success');
            } catch (err) {
                cacheLogger.error({ key, err }, 'SWR: Background Revalidation Failed heavily');
            }
        });

        // Return the immediately parsed Cache unconditionally
        return cachedData;
     }

     // Complete Miss - Fallback to active waiting seamlessly
     const freshData = await fetcher();
     await this.set(key, freshData, ttlSeconds);
     
     return freshData;
  }
}
