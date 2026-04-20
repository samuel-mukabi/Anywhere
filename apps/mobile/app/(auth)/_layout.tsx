/**
 * Auth group layout — app/(auth)/_layout.tsx
 * Shared stack for login, register, and onboarding screens.
 */

import { Stack } from 'expo-router';
import { Colors } from '@/theme/colors';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: Colors.parchment },
        animation:    'ios_from_right',
      }}
    >
      <Stack.Screen name="login"            />
      <Stack.Screen name="register"         />
      <Stack.Screen name="onboarding"       options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="forgot-password"  />
    </Stack>
  );
}
