module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000,
  reporters: ['detox/runners/jest/streamlineReporter'],
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  testRunner: 'jest-circus/runner',
  verbose: true,
};
