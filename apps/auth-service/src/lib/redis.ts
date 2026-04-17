import Redis from 'ioredis';
import crypto from 'crypto';

// Creates a resilient connection to Redis for session state
export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

/**
 * Stores a refresh token family tied to a specific user.
 * We store a hashed version of the token to prevent database leaks from compromising active sessions.
 */
export async function storeRefreshToken(userId: string, plainToken: string, expiresInSeconds: number): Promise<void> {
  const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
  // Store the hash with a TTL matching its expiry logic (e.g. 30 days)
  await redis.setex(`refresh_token:${userId}:${hash}`, expiresInSeconds, 'active');
}

/**
 * Validates and rotated a refresh token.
 * Validating it deletes it immediately (one-time use) ensuring token rotation.
 */
export async function rotateRefreshToken(userId: string, plainToken: string): Promise<boolean> {
  const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
  const key = `refresh_token:${userId}:${hash}`;
  
  // Attempt to delete it. If it deletes, it existed and was valid. 
  // If it doesn't delete, it's either expired or invalid.
  // This natively prevents race conditions because Redis DEL is atomic!
  const deletedCount = await redis.del(key);
  return deletedCount === 1;
}

/**
 * Validates if the refresh token was stolen. (Bonus feature stub)
 */
export async function revokeAllUserRefreshTokens(userId: string) {
    const keys = await redis.keys(`refresh_token:${userId}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
}

/**
 * Access Token Logout Blacklisting.
 * Because Access Tokens are Stateless JWTs, we cannot easily revoke them.
 * For logout, we store their ID (or exact signature signature) in a redis blacklist until they expire natively.
 */
export async function blacklistAccessToken(jti: string, remainingSeconds: number): Promise<void> {
  if (remainingSeconds > 0) {
    await redis.setex(`blacklist:${jti}`, remainingSeconds, 'blacklisted');
  }
}

export async function isAccessTokenBlacklisted(jti: string): Promise<boolean> {
  const val = await redis.get(`blacklist:${jti}`);
  return val === 'blacklisted';
}
