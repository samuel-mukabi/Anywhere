import Constants from 'expo-constants';

/**
 * Typed access to runtime environment variables injected via app.config.js extra field.
 * In development these come from .env.local → EAS reads them on device/simulator.
 * In production they come from EAS Secrets set via `eas secret:create`.
 *
 * Usage:
 *   import { env } from '@/core/env';
 *   const url = env.apiBaseUrl;
 */

interface AppEnv {
  apiBaseUrl: string;
  mapboxToken: string;
  stripePublishableKey: string;
}

const extra = Constants.expoConfig?.extra as Partial<AppEnv> | undefined;

if (!extra) {
  throw new Error(
    '[env] expo-constants: expoConfig.extra is undefined. ' +
      'Make sure app.config.js exports the extra field correctly.'
  );
}

export const env: AppEnv = {
  apiBaseUrl: extra.apiBaseUrl ?? 'http://localhost:3001',
  mapboxToken: extra.mapboxToken ?? '',
  stripePublishableKey: extra.stripePublishableKey ?? '',
};
