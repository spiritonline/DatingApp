module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)'
  ],
  setupFilesAfterEnv: [
    '@testing-library/jest-native/extend-expect',
    '<rootDir>/src/setupTests.ts',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js',
    '!**/metro.config.js',
    '!**/setupTests.ts',
    '!**/__mocks__/**',
  ],
  testMatch: ['**/__tests__/**/*.test.(js|jsx|ts|tsx)'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@firebase/auth$': '<rootDir>/src/__mocks__/@firebase/auth.ts',
    '^@firebase/auth/(.*)$': '<rootDir>/src/__mocks__/@firebase/auth.ts',
    '^@/services/chatService$': '<rootDir>/src/__mocks__/services/chatService.ts',
    '^@/services/firebase$': '<rootDir>/src/__mocks__/services/firebase.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
