import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useAuthStore, selectHydrated } from '@/stores/authStore';
import { ONBOARDING_KEY } from '@/constants/keys';

/**
 * Root index — app/index.tsx
 *
 * Routing bridge: waits for both auth hydration and async onboarding check,
 * then sends users to the correct first screen.
 *
 *   Logged in          → /(tabs)/explore
 *   Not logged in + first launch → /(auth)/onboarding
 *   Not logged in + returning   → /(auth)/login
 *
 * Note: The primary routing is handled by _layout.tsx. This component
 * serves as a secondary safety net for Expo Router's initial frame.
 */
export default function Index() {
  const hydrated = useAuthStore(selectHydrated);
  const user     = useAuthStore((s) => s.user);
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboarded(val === 'true');
    });
  }, []);

  // Wait for both checks to complete
  if (!hydrated || onboarded === null) return null;

  if (user) return <Redirect href="/(tabs)/explore" />;
  if (!onboarded) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(auth)/login" />;
}
