/**
 * Auth store — src/stores/authStore.ts
 *
 * Persists logged-in user identity and subscription tier.
 * Token storage (JWT / refresh) lives in SecureStore via secureStorage.ts
 * so it never touches JavaScript memory at rest.
 */

import { create } from 'zustand';

export type SubscriptionTier = 'free' | 'pro' | 'elite';

export interface AuthUser {
  id:        string;
  name?:     string;
  email:     string;
  tier:      SubscriptionTier;
  avatarUrl?: string;
  metadata?:  Record<string, any>;
}

interface AuthState {
  /** Null while unauthenticated. */
  user:    AuthUser | null;
  /** In-memory copy of the JWT — do NOT log this. */
  token:   string | null;
  /** Subscription tier gate. */
  tier:    SubscriptionTier;
  /** True after the initial SecureStore check completes. */
  hydrated: boolean;

  setAuth:   (user: AuthUser, token: string) => void;
  clearAuth: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:     null,
  token:    null,
  tier:     'free',
  hydrated: false,

  setAuth: (user, token) =>
    set({ user, token, tier: user.tier }),

  clearAuth: () =>
    set({ user: null, token: null, tier: 'free' }),

  setHydrated: () =>
    set({ hydrated: true }),
}));

// ─── Convenience selectors ────────────────────────────────────────────────────
export const selectUser      = (s: AuthState) => s.user;
export const selectToken     = (s: AuthState) => s.token;
export const selectTier      = (s: AuthState) => s.tier;
export const selectIsPro     = (s: AuthState) => s.tier === 'pro' || s.tier === 'elite';
export const selectHydrated  = (s: AuthState) => s.hydrated;
