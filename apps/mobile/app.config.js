import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: 'Anywhere',
  slug: 'anywhere-travel',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  owner: 'samuel-mukabi',
  scheme: 'anywhere',

  icon: './assets/icon.png',

  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#EEEBD9',
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.anywhere.travel',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: 'com.anywhere.travel',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#EEEBD9',
    },
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'RECEIVE_BOOT_COMPLETED',
    ],
    edgeToEdgeEnabled: true,
  },

  web: {
    favicon: './assets/favicon.png',
  },

  plugins: [
    'expo-font',
    'expo-router',
    'expo-secure-store',
    'expo-apple-authentication',
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsImpl: 'mapbox',
      },
    ],
  ],

  // Removed runtimeVersion and updates config because expo-updates is missing

  extra: {
    // Runtime env vars — read from process.env, injected by EAS or .env.local
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:3001',
    mapboxToken: process.env.MAPBOX_PUBLIC_TOKEN ?? '',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    // Google OAuth Web Client ID — create at console.cloud.google.com
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? '',

    // EAS project linkage
    eas: {
      projectId: '36ff202d-ed90-4207-b32e-e309bd32a040',
    },
  },
});
