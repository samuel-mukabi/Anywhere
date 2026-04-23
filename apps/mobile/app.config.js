import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: 'Anywhere',
  slug: 'anywhere-travel',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  platforms: ['ios', 'android'],
  owner: 'samuel-mukabi',
  scheme: 'anywhere',

  icon: './assets/icon.png',

  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#EEEBD9',
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.anywhere.travel.local', // changed to avoid personal team conflict
    // associatedDomains: ['applinks:anywhere.app'],
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: 'com.anywhere.travel.local', // Keep identical with iOS
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#EEEBD9',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: 'anywhere.app', pathPrefix: '/' },
          { scheme: 'anywhere', host: '*', pathPrefix: '/' }
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    permissions: [
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'RECEIVE_BOOT_COMPLETED',
      'ACCESS_NETWORK_STATE',
      'INTERNET',
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
    // 'expo-apple-authentication', // Commented out to avoid Apple Developer account requirement on personal teams
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Allow Anywhere to use your location to find nearby destinations and synchronize Mapbox placement.',
      },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsImpl: 'mapbox',
      },
    ],
  ],

  updates: {
    url: "https://u.expo.dev/36ff202d-ed90-4207-b32e-e309bd32a040"
  },
  runtimeVersion: "1.0.0",

  extra: {
    // Runtime env vars — read from process.env, injected by EAS or .env.local
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:8000',
    mapboxToken: process.env.MAPBOX_PUBLIC_TOKEN ?? '',
    mapboxStyleUrl: process.env.MAPBOX_STYLE_URL ?? 'mapbox://styles/samuelmukabi/cmo27z8la011n01sb26nthri5',
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    // Google OAuth Web Client ID — create at console.cloud.google.com
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID ?? '',

    // EAS project linkage
    eas: {
      projectId: '36ff202d-ed90-4207-b32e-e309bd32a040',
    },
  },
});
