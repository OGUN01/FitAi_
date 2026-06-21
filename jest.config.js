// Uses the jest-expo preset (SDK 53, v53.0.14+) as the base — it builds on
// react-native/jest-preset, providing the haste resolver + Platform mock + the
// `./Libraries/Utilities/Platform` resolution + `.fx.ts`/`.ios.ts`/`.android.ts`
// platform-variant handling that a hand-rolled config lacked (which made ~26
// suites fail with "Cannot use import statement outside a module" /
// "Cannot find module ./Libraries/Utilities/Platform"). The import-syntax bug
// was fixed in jest-expo 53.0.7 (expo/expo#37261).
//
// We extend only what the preset doesn't cover: our absolute-path aliases, a
// moduleNameMapper fallback for expo-modules-core (expo/expo#44647), an
// EXTENDED transformIgnorePatterns (the preset's allowlist omits
// expo-modules-core + the @supabase ESM deps + async-storage + secure-store
// which all ship ESM .mjs/.ts that the node test env can't consume un-
// transpiled), and the custom setup file.
module.exports = {
  preset: 'jest-expo',

  testEnvironment: 'node',

  // Use single worker on Windows to prevent process crashes
  maxWorkers: 1,

  // Module name mapping for absolute imports + crypto mock + an
  // expo-modules-core resolver fallback (expo/expo#44647 — the module can be
  // nested under expo in some installs; this guarantees resolution).
  moduleNameMapper: {
    '^expo-modules-core(|/.*)$': '<rootDir>/node_modules/expo-modules-core$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@navigation/(.*)$': '<rootDir>/src/navigation/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^expo-crypto$': '<rootDir>/src/__mocks__/expo-crypto.js',
  },

  // Test match patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.(ts|tsx|js|jsx)',
    '<rootDir>/src/**/*.(test|spec).(ts|tsx|js|jsx)',
  ],

  // Setup files (runs after the preset's setupFiles)
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.*',
    '!src/**/*.spec.*',
    '!src/**/index.ts',
    '!src/**/index.tsx',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.expo/',
    '<rootDir>/ios/',
    '<rootDir>/android/',
    // Test helpers (non-test utilities) live under __tests__/ — exclude them
    // so Jest doesn't try to run them as suites ("must contain at least one test").
    '<rootDir>/src/__tests__/helpers/',
    '<rootDir>/src/__tests__/mocks/',
  ],

  // Transform ignore patterns — EXTENDS the jest-expo preset's allowlist.
  // The preset whitelists react-native/@react-native/expo/@expo/react-navigation/
  // @sentry/svg/native-base. We additionally whitelist deps that ship ESM that
  // the node test env can't consume un-transpiled:
  //   - expo-modules-core: ships ESM `.ts` source (`src/sweet/setUpErrorManager.fx.ts`
  //     etc.) — the preset's own setup.js requires it, so it MUST be transformed.
  //   - @supabase/* (gotrue/postgrest/realtime/storage/functions-js): ship .mjs.
  //   - @react-native-async-storage, expo-secure-store, zustand,
  //     @react-native-google-signin, nativewind, react-native-reanimated.
  // Trailing slashes per expo PR #39605 for correct pnpm/isolated-modules matching.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|expo-modules-core|expo-haptics|expo-auth-session|expo-crypto|expo-linear-gradient|expo-secure-store|expo-av|expo-image-picker|expo-camera|expo-notifications|expo-background-fetch|expo-task-manager|expo-font|expo-constants|expo-status-bar|expo-linking|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@supabase|@react-native-async-storage|zustand|@react-native-google-signin|nativewind|react-native-reanimated)/)',
  ],
};
