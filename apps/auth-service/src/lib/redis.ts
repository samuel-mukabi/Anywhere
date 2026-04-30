import Redis from 'ioredis';
import crypto from 'crypto';

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const REFRESH_TOKEN_TTL = 2592000; // 30 days in seconds

/**
 * Stores a refresh token hash and registers it in the user's token set for bulk revocation.
 */
export async function storeRefreshToken(userId: string, plainToken: string, expiresInSeconds: number): Promise<void> {
  const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
  const pipeline = redis.pipeline();
  pipeline.setex(`refresh_token:${hash}`, expiresInSeconds, userId);
  // Track hash in per-user set so we can revoke all tokens for a user
  pipeline.sadd(`user_tokens:${userId}`, hash);
  pipeline.expire(`user_tokens:${userId}`, REFRESH_TOKEN_TTL);
  await pipeline.exec();
}

/**
 * Validates and rotates a refresh token (one-time use).
 */
export async function rotateRefreshToken(plainToken: string): Promise<string | null> {
  const hash = crypto.createHash('sha256').update(plainToken).digest('hex');
  const key = `refresh_token:${hash}`;

  const userId = await redis.get(key);
  if (!userId) return null;

  const pipeline = redis.pipeline();
  pipeline.del(key);
  pipeline.srem(`user_tokens:${userId}`, hash);
  await pipeline.exec();

  return userId;
}

/**
 * Revokes all refresh tokens for a user (e.g. on password change or suspicious activity).
 */
export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  const hashes = await redis.smembers(`user_tokens:${userId}`);
  if (hashes.length === 0) return;

  const pipeline = redis.pipeline();
  for (const hash of hashes) {
    pipeline.del(`refresh_token:${hash}`);
  }
  pipeline.del(`user_tokens:${userId}`);
  await pipeline.exec();
}

/**
 * Blacklists an access token JTI until it naturally expires.
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
