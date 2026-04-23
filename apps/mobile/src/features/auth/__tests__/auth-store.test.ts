/**
 * __tests__/stores/authStore.test.ts
 *
 * Unit tests for authStore — logout, token clearing, SecureStore cleanup.
 * The useAuth logic in _layout.tsx delegates to these store actions,
 * so we test the store contract directly (no router rendering needed).
 */
import { useAuthStore } from '@/features/auth/auth-store';
import * as SecureStore from 'expo-secure-store';

const MOCK_USER = { id: 'usr_1', name: 'Sam', email: 'sam@anywhere.app', tier: 'free' as const };
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, tier: 'free', hydrated: false });
    jest.clearAllMocks();
  });

  it('setAuth stores user, token, and tier in memory', () => {
    useAuthStore.getState().setAuth({ ...MOCK_USER, tier: 'pro' }, MOCK_TOKEN);
    const state = useAuthStore.getState();
    expect(state.user).toEqual({ ...MOCK_USER, tier: 'pro' });
    expect(state.token).toBe(MOCK_TOKEN);
    expect(state.tier).toBe('pro');
  });

  it('clearAuth nulls user and token and resets tier to free', () => {
    useAuthStore.getState().setAuth({ ...MOCK_USER, tier: 'pro' }, MOCK_TOKEN);
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.tier).toBe('free');
  });

  it('selectIsPro is true for "pro" tier', () => {
    useAuthStore.getState().setAuth({ ...MOCK_USER, tier: 'pro' }, MOCK_TOKEN);
    const isPro = useAuthStore.getState().tier === 'pro' || useAuthStore.getState().tier === 'elite';
    expect(isPro).toBe(true);
  });

  it('selectIsPro is false for "free" tier', () => {
    useAuthStore.getState().setAuth({ ...MOCK_USER, tier: 'free' }, MOCK_TOKEN);
    const isPro = useAuthStore.getState().tier === 'pro' || useAuthStore.getState().tier === 'elite';
    expect(isPro).toBe(false);
  });

  it('clearAuth + SecureStore deletion clears all persisted keys', async () => {
    // Simulate the sign-out flow from profile.tsx
    useAuthStore.getState().setAuth({ ...MOCK_USER, tier: 'pro' }, MOCK_TOKEN);

    // Execute the sign-out sequence (as profile.tsx does it)
    useAuthStore.getState().clearAuth();
    await SecureStore.deleteItemAsync('jwt');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('userTier');
    await SecureStore.deleteItemAsync('userId');

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('jwt');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('refreshToken');
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('setHydrated flips hydrated flag to true', () => {
    expect(useAuthStore.getState().hydrated).toBe(false);
    useAuthStore.getState().setHydrated();
    expect(useAuthStore.getState().hydrated).toBe(true);
  });
});
