/**
 * useAppleAuth — src/hooks/useAppleAuth.ts
 *
 * Apple Sign-In using expo-apple-authentication.
 * Only available on iOS 13+; check isAvailableAsync() before rendering.
 * Exchanges the Apple identity token with POST /auth/apple/mobile.
 */

import { useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { authApi, AuthResponse } from '@/services/api-client';
import { secureStorage } from '@/core/secure-storage';
import { useAuthStore } from '@/features/auth/auth-store';

export function useAppleAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const signIn = useCallback(async () => {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token');
    }

    const fullName = credential.fullName?.givenName
      ? `${credential.fullName.givenName} ${credential.fullName.familyName ?? ''}`.trim()
      : null;

    const { data } = await authApi.appleMobile(credential.identityToken, fullName);
    await persistAuth(data);
    setAuth(
      { 
        id: data.user.id, 
        name: data.user.name, 
        email: data.user.email,
        tier: data.user.tier as any
      },
      data.token,
    );
  }, [setAuth]);

  return { signIn };
}

async function persistAuth(data: AuthResponse) {
  await Promise.all([
    secureStorage.setJwt(data.token),
    secureStorage.setRefreshToken(data.refreshToken),
    secureStorage.setUserId(data.user.id),
    secureStorage.setUserTier(data.user.tier),
    secureStorage.setUserEmail(data.user.email),
    secureStorage.setUserName(data.user.name ?? ''),
  ]);
}
