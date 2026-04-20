/**
 * Typed SecureStore wrapper — src/lib/secureStorage.ts
 *
 * Centralises all SecureStore access behind typed helpers so that
 * callers never deal with raw string keys or null handling.
 */

import * as SecureStore from 'expo-secure-store';

// ─── Key registry ─────────────────────────────────────────────────────────────
const KEYS = {
  JWT:           'anywhere_jwt',
  REFRESH_TOKEN: 'anywhere_refresh_token',
  USER_ID:       'anywhere_user_id',
  USER_TIER:     'anywhere_user_tier',
} as const;

type StorageKey = keyof typeof KEYS;

// ─── Generic primitives ───────────────────────────────────────────────────────

async function get(key: StorageKey): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS[key]);
}

async function set(key: StorageKey, value: string): Promise<void> {
  return SecureStore.setItemAsync(KEYS[key], value);
}

async function remove(key: StorageKey): Promise<void> {
  return SecureStore.deleteItemAsync(KEYS[key]);
}

// ─── Typed helpers ────────────────────────────────────────────────────────────

export const secureStorage = {
  /** Returns the stored JWT or null if none. */
  getJwt:          () => get('JWT'),
  /** Stores the JWT. */
  setJwt:          (token: string) => set('JWT', token),
  /** Removes the JWT — call on logout. */
  deleteJwt:       () => remove('JWT'),

  /** Returns the refresh token or null. */
  getRefreshToken: () => get('REFRESH_TOKEN'),
  /** Stores the refresh token. */
  setRefreshToken: (token: string) => set('REFRESH_TOKEN', token),
  /** Removes the refresh token. */
  deleteRefreshToken: () => remove('REFRESH_TOKEN'),

  /** Returns the persisted user id or null. */
  getUserId:       () => get('USER_ID'),
  setUserId:       (id: string) => set('USER_ID', id),

  /** Returns the persisted subscription tier or null. */
  getUserTier:     () => get('USER_TIER'),
  setUserTier:     (tier: string) => set('USER_TIER', tier),

  /** Wipes all auth-related keys — call on full logout. */
  async clearAll(): Promise<void> {
    await Promise.all([
      remove('JWT'),
      remove('REFRESH_TOKEN'),
      remove('USER_ID'),
      remove('USER_TIER'),
    ]);
  },
};
