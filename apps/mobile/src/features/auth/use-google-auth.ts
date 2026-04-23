/**
 * useGoogleAuth — src/hooks/useGoogleAuth.ts
 *
 * Google OAuth PKCE flow using expo-auth-session.
 * Exchanges the authorization code with POST /auth/google/mobile
 * to receive an Anywhere JWT.
 *
 * Setup:
 *  1. Create a Web Client ID at console.cloud.google.com
 *  2. Add https://auth.expo.io/@<username>/anywhere-travel as Authorised Redirect URI
 *  3. Set GOOGLE_WEB_CLIENT_ID in .env.local
 */

import { useCallback } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { authApi, AuthResponse } from '@/services/api-client';
import { secureStorage } from '@/core/secure-storage';
import { useAuthStore } from '@/features/auth/auth-store';

import * as AuthSession from 'expo-auth-session';

// Required for expo-auth-session to complete the redirect
WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID =
  (Constants.expoConfig?.extra?.googleWebClientId as string | undefined) ?? '';

export function useGoogleAuth() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const redirectUri = AuthSession.makeRedirectUri();
  console.log('[useGoogleAuth] Generated redirectUri:', redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId:     GOOGLE_CLIENT_ID,
    iosClientId:     GOOGLE_CLIENT_ID || 'placeholder-ios-id',
    androidClientId: GOOGLE_CLIENT_ID || 'placeholder-android-id',
    redirectUri,
  });

  const signIn = useCallback(async () => {
    const result = await promptAsync();
    if (result?.type !== 'success' || !result.authentication?.accessToken) {
      return;
    }

    try {
      // Exchange Google access token with our backend
      const { data } = await authApi.googleMobile(result.authentication.accessToken);
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
    } catch (err) {
      console.error('[useGoogleAuth] Exchange failed:', err);
      throw err;
    }
  }, [promptAsync, setAuth]);

  return { request, signIn };
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
