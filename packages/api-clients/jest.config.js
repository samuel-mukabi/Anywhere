/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/*.spec.ts'],          // ← only .spec.ts, not .test.ts
  coverageThreshold: {
    global: { lines: 80 },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/__mocks__/**',
    '!src/__tests__/**',   // exclude stale .test.ts files living under src/__tests__
    '!src/**/*.spec.ts',   // exclude spec files themselves from line counting
    '!src/**/*.test.ts',
  ],
};
