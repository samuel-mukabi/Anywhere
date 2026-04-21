/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Tell Jest to transform MSW and its ESM dependencies
  // instead of leaving them as-is (which causes the crash)
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@mswjs|rettime|@bundled-es-modules|@mswjs/interceptors|@open-draft/until|headers-polyfill)/)'
  ],

  // Handle .mjs files explicitly
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json'],

  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // Move ts-jest config here — fixes the deprecation warning
      tsconfig: './tsconfig.json',
    }],
    '^.+\\.m?js$': ['ts-jest', {
      tsconfig: './tsconfig.json',
    }],
  },

  setupFilesAfterEnv: ['./jest.setup.ts'],
};
