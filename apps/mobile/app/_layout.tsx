/**
 * Root layout — app/_layout.tsx
 *
 * Responsibilities:
 *  1. Wrap the whole app in GestureHandlerRootView + SafeAreaProvider
 *  2. Provide TanStack QueryClient (staleTime: 5 min)
 *  3. Load custom fonts via useFontLoader
 *  4. Hydrate authStore from SecureStore — show LoadingOverlay until done
 *  5. Route to (auth)/login or (tabs)/explore based on stored JWT
 *  6. Mount Toast provider above all other UI
 */

import 'react-native-gesture-handler';

import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Stack, router, useRootNavigationState, Href } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import { useFontLoader }   from '@/hooks/useFontLoader';
import { toastConfig }     from '@/components/ui';
import { LoadingOverlay }  from '@/components/LoadingOverlay';
import { secureStorage }   from '@/lib/secureStorage';
import {
  useAuthStore,
  selectHydrated,
  SubscriptionTier,
}                          from '@/stores/authStore';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';

// ─── Push Notification Handlers ───────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── TanStack Query client (singleton) ────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          5 * 60 * 1000,   // 5 minutes
      retry:              2,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── Inner navigator (needs access to hooks) ─────────────────────────────────
function RootNavigator() {
  const { fontsLoaded, fontError } = useFontLoader();
  const hydrated   = useAuthStore(selectHydrated);
  const setAuth    = useAuthStore((s) => s.setAuth);
  const setHydrated = useAuthStore((s) => s.setHydrated);
  const rootNavigationState = useRootNavigationState();

  // ─── Universal Warm-Start URL Interceptor ────────────────────────────────────
  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      console.log('[Universal Links] Intercepted Warm-Start URL:', url);
      try {
        const { hostname, path } = Linking.parse(url);
        // Map natively into router bindings: anywhere://destination/xyz mapped
        if (hostname === 'destination' && path) {
           router.push(`/destination/${path}` as Href);
        } else if (hostname === 'group' && path) {
           router.push(`/group/${path}` as Href);
        } else if (path) {
           router.push(`/${path}` as Href);
        }
      } catch (err) {
        console.warn('Failed resolving warm link routing:', err);
      }
    }
  }, [url]);

  // ─── Push Notification Hooks ─────────────────────────────────────────────────
  useEffect(() => {
    // Define interactive categories
    Notifications.setNotificationCategoryAsync('price_alert', [
      { identifier: 'VIEW_DEST', buttonTitle: 'View destination', options: { opensAppToForeground: true } }
    ]);
    Notifications.setNotificationCategoryAsync('booking_confirmed', [
      { identifier: 'VIEW_BOOKING', buttonTitle: 'View booking', options: { opensAppToForeground: true } }
    ]);

    // Handle background / deep link routing
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data?.url as string;
      if (url) {
        // e.g. anywhere://destination/xyz
        try {
           const path = new URL(url).pathname as Href;
           router.push(path);
        } catch {
           router.push(url as Href); // fallback if it's already a relative path payload
        }
      }
    });

    return () => {
      if (responseListener) {
        responseListener.remove();
      }
    };
  }, []);

  // ─── Diagnostic Logging ──────────────────────────────────────────────────────
  useEffect(() => {
    console.log('[RootLayout] State update:', { fontsLoaded, fontError, hydrated });
  }, [fontsLoaded, fontError, hydrated]);

  // ─── Hydration Fail-safe (5s timeout) ────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hydrated) {
        console.warn('[RootLayout] Hydration timeout! Forcing visibility...');
        setHydrated();
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [hydrated, setHydrated]);

  // Hydrate auth state from SecureStore + check onboarding status
  useEffect(() => {
    const isNavigationReady = !!rootNavigationState?.key;

    if (isNavigationReady && (fontsLoaded || fontError)) {
      // Hide native splash immediately so the branded React splash takes over
      SplashScreen.hideAsync().catch(() => {});

      async function hydrate() {
        console.log('[RootLayout] Starting hydration check...');
        try {
          const token = await secureStorage.getJwt();
          const tier  = await secureStorage.getUserTier();
          const id    = await secureStorage.getUserId();
          const email = await secureStorage.getUserEmail();
          const name  = await secureStorage.getUserName();
          const onboarded = await AsyncStorage.getItem('onboardingComplete');

          console.log('[RootLayout] Storage check result:', { hasToken: !!token, hasId: !!id, email, name, tier, onboarded });

          if (token && id) {
            setAuth(
              { id, email: email ?? '', name: name ?? undefined, tier: (tier as SubscriptionTier) ?? 'free' },
              token,
            );
            console.log('[RootLayout] Redirecting to explore...');
            router.replace('/(tabs)/explore');
          } else if (!onboarded) {
            console.log('[RootLayout] First launch — redirecting to onboarding...');
            router.replace('/(auth)/onboarding');
          } else {
            console.log('[RootLayout] No auth found, redirecting to login...');
            router.replace('/(auth)/login');
          }
        } catch (err) {
          console.error('[RootLayout] Hydration error:', err);
          router.replace('/(auth)/login');
        } finally {
          setHydrated();
        }
      }

      hydrate();
    } else {
      console.log('[RootLayout] Waiting for fonts...');
      // Even if fonts fail, hide splash after 4s
      const timer = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, fontError, setAuth, setHydrated]);

  const isLoading = !fontsLoaded && !fontError;
  const showOverlay = isLoading || !hydrated;

  console.log('[RootLayout] Rendering overlay visible?', showOverlay, 'QueryClient:', !!QueryClient);

  if (!QueryClient) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Module Resolution Error: QueryClient is missing.</Text>
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index"   options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)"  options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)"  options={{ animation: 'none' }} />

        {/* Destination detail — full-screen modal pushed from map/cards */}
        <Stack.Screen
          name="destination/[id]"
          options={{
            presentation: 'modal',
            animation:    'slide_from_bottom',
            headerShown:  false,
          }}
        />

        {/* Group room — standard stack push */}
        <Stack.Screen
          name="group/[roomId]"
          options={{
            presentation: 'card',
            animation:    'slide_from_right',
            headerShown:  false,
          }}
        />
      </Stack>

      {/* Auth / font loading overlay (auto-hides once hydrated) */}
      <LoadingOverlay visible={showOverlay} />

      {/* Toast must sit above all UI to receive taps */}
      <Toast config={toastConfig} />
    </>
  );
}

import { StripeProvider } from '@stripe/stripe-react-native';

// ─── Root default export ──────────────────────────────────────────────────────
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx'}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <RootNavigator />
          </QueryClientProvider>
        </SafeAreaProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
