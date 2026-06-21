// Manual mock for `expo-auth-session`.
//
// Why this exists: expo-auth-session ships ESM (.mjs/.ts source) that the Jest
// node test environment cannot consume un-transpiled, which crashes every test
// suite that transitively imports it (via src/services/googleAuth.ts and
// src/services/google-auth/web-auth.ts). The real module is a native runtime
// helper with no unit-testable logic, so we stub it.
//
// Jest auto-resolves manual mocks for node_modules packages from the root
// `<rootDir>/__mocks__/` directory — no jest.mock() call or config change
// required. This file shadows the real module across the entire test run.
//
// Surface mocked (verified against real usage via grep):
//   - makeRedirectUri — used directly in src/services/google-auth/web-auth.ts
//   - makeRedirectUri — used as AuthSession.makeRedirectUri in src/services/googleAuth.ts
// Common additional exports are stubbed as jest.fn() so any future consumer
// fails loudly with a clear "not implemented" rather than an undefined crash.
const makeRedirectUri = jest.fn(() => "https://auth.expo.io/@mock/expo-auth-session/callback");

module.exports = {
  makeRedirectUri,
  // Namespace-style consumers (`import * as AuthSession`) get these too.
  useAuthRequest: jest.fn(() => [
    null, // authRequest
    null, // response
    jest.fn(), // promptAsync
  ]),
  usePKCE: jest.fn(() => ({
    codeChallenge: "mock-code-challenge",
    codeVerifier: "mock-code-verifier",
  })),
  AuthSession: {
    makeRedirectUri,
    useAuthRequest: jest.fn(),
  },
  // Re-export the same fn for both direct + namespace access.
  default: { makeRedirectUri },
};
