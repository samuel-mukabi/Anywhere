/**
 * useAuth — src/hooks/useAuth.ts
 *
 * Primary auth hook consumed throughout the app.
 * Exposes: user, tier, isAuthenticated, logout()
 */

import { useCallback } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '@/features/auth/auth-store';
import { secureStorage } from '@/core/secure-storage';

export function useAuth() {
  const user       = useAuthStore((s) => s.user);
  const tier       = useAuthStore((s) => s.tier);
  const clearAuth  = useAuthStore((s) => s.clearAuth);

  const isAuthenticated = !!user;

  const logout = useCallback(async () => {
    await secureStorage.clearAll();
    clearAuth();
    router.replace('/(auth)/login');
  }, [clearAuth]);

  return { user, tier, isAuthenticated, logout };
}
