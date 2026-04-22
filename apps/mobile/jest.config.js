const path = require('path');
process.env.RNTL_SKIP_DEPS_CHECK = 'true';
module.exports = {
  preset: 'jest-expo',
  // 'setupFilesAfterEnv' runs after the test framework is installed
  // (correct key — 'setupFilesAfterFramework' is a common typo)
  setupFilesAfterEnv: ['./src/__tests__/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@gorhom|react-native-reanimated|@stripe|socket\\.io-client)',
  ],
  moduleDirectories: ['node_modules', '../../node_modules'],
  modulePaths: ['<rootDir>/../../node_modules'],
  moduleNameMapper: {
    '^react-native$': require.resolve('react-native'),
    '^react-native/(.*)$': path.dirname(require.resolve('react-native/package.json')) + '/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-worklets$': 'react-native-worklets-core',
  },
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
