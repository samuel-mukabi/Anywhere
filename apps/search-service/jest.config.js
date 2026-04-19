/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  coverageThreshold: {
    global: {
      lines: 80,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/server.ts',
    '!src/routes/*.ts' // If we only need service and adapter files internally
  ]
};
