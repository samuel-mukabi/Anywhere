/**
 * withRateLimit — Token Bucket Rate Limiter
 * ─────────────────────────────────────────
 * Enforces a maximum request rate using an in-process token bucket.
 * Designed for external API calls that have strict daily/per-minute quotas.
 *
 * Usage:
 *   const limiter = createRateLimiter({ requestsPerInterval: 100, intervalMs: 60_000 });
 *   await limiter.throttle(); // waits if rate limit would be exceeded
 */

export interface RateLimiterOptions {
  /** Maximum number of requests allowed within `intervalMs` */
  requestsPerInterval: number;
  /** The time window in milliseconds */
  intervalMs: number;
}

export interface RateLimiter {
  /**
   * Waits until a request token is available, then resolves.
   * Throws if called after `destroy()`.
   */
  throttle(): Promise<void>;
  /** Returns true if currently rate-limited (no tokens available) */
  isThrottled(): boolean;
}

export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { requestsPerInterval, intervalMs } = options;

  let tokens = requestsPerInterval;
  let lastRefill = Date.now();

  function refill() {
    const now = Date.now();
    const elapsed = now - lastRefill;
    if (elapsed >= intervalMs) {
      tokens = requestsPerInterval;
      lastRefill = now;
    }
  }

  function isThrottled(): boolean {
    refill();
    return tokens <= 0;
  }

  async function throttle(): Promise<void> {
    // Busy-wait with back-off until a token is available
    while (true) {
      refill();
      if (tokens > 0) {
        tokens--;
        return;
      }
      // Sleep until the next refill would happen
      const msUntilRefill = intervalMs - (Date.now() - lastRefill);
      await new Promise<void>((resolve) => setTimeout(resolve, Math.max(50, msUntilRefill)));
    }
  }

  return { throttle, isThrottled };
}
