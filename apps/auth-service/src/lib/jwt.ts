import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-default-string-development';

export interface CustomJwtPayload {
  sub: string;           // userId
  email: string;
  tier: 'free' | 'pro';
  role: 'authenticated'; // Safely consumed implicitly strictly by Supabase RLS policies directly without dependencies!
  jti: string;           // Unique JWT ID for blacklisting
}

interface SignedTokens {
  accessToken: string;
  refreshToken: string; // Opaque string for database/redis only
  accessExp: number;
}

/**
 * Mints an Access Token (15 mins) and an opaque Refresh Token (30 days)
 */
export function issueTokens(payload: Omit<CustomJwtPayload, 'jti' | 'role'>): SignedTokens {
  const jti = crypto.randomUUID();
  
  // 15 minutes Access Token
  const accessToken = jwt.sign(
    { ...payload, role: 'authenticated', jti },
    JWT_SECRET,
    { expiresIn: '15m' }
  );

  // Decode to figure out exact expiry timestamp for cookies/responses
  const decoded = jwt.decode(accessToken) as jwt.JwtPayload;
  
  // 30 days Refresh Token — just a cryptographically secure random string.
  // This is stored as a hash directly in Redis.
  const refreshToken = crypto.randomBytes(40).toString('hex');

  return {
    accessToken,
    refreshToken,
    accessExp: decoded.exp as number,
  };
}

/**
 * Verifies the JWT and throws if it's invalid or expired.
 */
export function verifyAccessToken(token: string): CustomJwtPayload & jwt.JwtPayload {
  return jwt.verify(token, JWT_SECRET) as CustomJwtPayload & jwt.JwtPayload;
}
