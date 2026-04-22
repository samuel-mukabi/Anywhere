/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },

  // Tell Jest to transform MSW and its ESM dependencies
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@mswjs|rettime|until-async|@open-draft|@bundled-es-modules|headers-polyfill)/)'
  ],

  transform: {
    '^.+\\.(t|j)sx?$': ['ts-jest', {
      tsconfig: './tsconfig.jest.json',
    }],
    '^.+\\.m?js$': 'babel-jest',
  },

  setupFilesAfterEnv: ['./jest.setup.ts'],
};
