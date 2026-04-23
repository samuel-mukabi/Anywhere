// Global Jest test setup for @repo/mobile
// @testing-library/react-native v12+ ships jest matchers built-in — no separate import needed
import { server } from './mocks/server';

// Start MSW mock server before all tests, reset between tests, clean up after
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Silence non-critical RN native module warnings in test output
jest.mock('expo-font', () => ({ loadAsync: jest.fn(), isLoaded: () => true }));
jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(), preventAutoHideAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));
jest.mock('@rnmapbox/maps', () => ({}));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock]' }),
  setNotificationCategoryAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
}));
jest.mock('expo-linking', () => ({
  useURL: jest.fn().mockReturnValue(null),
  parse: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useUnstableGlobalHref: jest.fn(),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

jest.mock('react-native-worklets-core', () => {
  return {
    Worklets: {
      createRunInJsFn: jest.fn(),
      createRunInCppFn: jest.fn(),
    },
    useWorklet: jest.fn(),
    createSerializable: jest.fn((fn) => fn),
    runOnUI: jest.fn(() => jest.fn()),
    serializableMappingCache: {
      set: jest.fn(),
      get: jest.fn(),
      has: jest.fn(),
    },
  };
}, { virtual: true });


