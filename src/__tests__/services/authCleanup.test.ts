import { describe, expect, it, beforeEach, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Wave 7 contract: the AsyncStorage cache holds ONLY the display AuthUser under
// the `auth_user_cache` key — tokens live in Supabase's SecureStore adapter and
// are NEVER duplicated in AsyncStorage. Mock supabase + AsyncStorage at the
// module level (mirrors auth.sessionLifecycle.test.ts) so no real SecureStore /
// Platform / React Native runtime is touched, which previously caused teardown
// errors after the Jest environment was torn down.
jest.mock("../../services/supabase", () => ({
  supabase: {
    auth: {
      signOut: jest.fn(),
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      resend: jest.fn(),
      getUser: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock("../../services/googleAuth", () => ({
  googleAuthService: {
    configure: jest.fn().mockResolvedValue(undefined),
    signInWithGoogle: jest.fn(),
    handleGoogleCallback: jest.fn(),
    linkGoogleAccount: jest.fn(),
    unlinkGoogleAccount: jest.fn(),
    isGoogleLinked: jest.fn(),
    getGoogleUserInfo: jest.fn(),
  },
}));

jest.mock("../../services/migrationManager", () => ({
  migrationManager: {
    startProfileMigration: jest.fn(),
  },
}));

jest.mock("../../services/DataBridge", () => ({
  dataBridge: {
    setUserId: jest.fn(),
    hasGuestDataForMigration: jest.fn().mockResolvedValue(false),
  },
}));

import { authService } from "../../services/auth";
import { dataBridge } from "../../services/DataBridge";
import { supabase } from "../../services/supabase";

const mockedSupabase = supabase as unknown as {
  auth: {
    signOut: jest.Mock;
    getSession: jest.Mock;
    refreshSession: jest.Mock;
  };
};

const mockedAsyncStorage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
};

// Wave 7 cache shape — ONLY the AuthUser is persisted (display data). Tokens
// (access_token / refresh_token) live in Supabase SecureStore and must NOT
// appear in this payload.
const cachedUserPayload = (email: string) =>
  JSON.stringify({
    id: "user-123",
    email,
    isEmailVerified: false,
    lastLoginAt: "2026-03-19T00:00:00.000Z",
    createdAt: "2026-03-19T00:00:00.000Z",
  });

describe("authService cleanup behavior", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockedSupabase.auth.signOut.mockResolvedValue({ error: null });
    mockedSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockedSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockedAsyncStorage.getItem.mockResolvedValue(null);
    mockedAsyncStorage.setItem.mockResolvedValue(undefined);
    mockedAsyncStorage.removeItem.mockResolvedValue(undefined);

    await authService.logout();
    jest.clearAllMocks();
  });

  it("clears stale cached sessions instead of trusting them", async () => {
    // A cached user exists, but Supabase can no longer validate it (session
    // gone + refresh fails with an AUTH error, not a network blip). The
    // service must clear the cached AuthUser and report failure.
    mockedAsyncStorage.getItem.mockResolvedValue(
      cachedUserPayload("user@example.com"),
    );

    mockedSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    mockedSupabase.auth.refreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("invalid refresh"),
    });

    await authService.restoreSession();
    jest.clearAllMocks();
    // revalidateSession re-reads the cache; keep it returning the cached user.
    mockedAsyncStorage.getItem.mockResolvedValue(
      cachedUserPayload("user@example.com"),
    );
    mockedSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });
    mockedSupabase.auth.refreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("invalid refresh"),
    });

    const result = await authService.revalidateSession();

    expect(result.success).toBe(false);
    expect(result.error).toBe("Stored session is no longer valid");
    // Stale cache is cleared under the CURRENT key (auth_user_cache), not the
    // legacy auth_session key — tokens are never in AsyncStorage to begin with.
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith("auth_user_cache");
    expect(dataBridge.setUserId).toHaveBeenCalledWith(null);
    expect(authService.getCurrentSession()).toBeNull();
  });

  it("clears local auth state even when remote sign-out fails", async () => {
    mockedAsyncStorage.getItem.mockResolvedValue(
      cachedUserPayload("logout@example.com"),
    );

    mockedSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: {
            id: "user-123",
            email: "logout@example.com",
            email_confirmed_at: "2026-03-19T00:00:00.000Z",
          },
          access_token: "session-token",
          refresh_token: "session-refresh",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });

    await authService.restoreSession();
    jest.clearAllMocks();
    mockedAsyncStorage.getItem.mockResolvedValue(
      cachedUserPayload("logout@example.com"),
    );

    // Remote sign-out fails (network down) — local state must STILL be cleared.
    mockedSupabase.auth.signOut.mockResolvedValueOnce({
      error: new Error("network failure"),
    });

    const result = await authService.logout();

    expect(result.success).toBe(true);
    expect(mockedSupabase.auth.signOut).toHaveBeenCalled();
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith("auth_user_cache");
    expect(dataBridge.setUserId).toHaveBeenCalledWith(null);
    expect(authService.getCurrentSession()).toBeNull();
  });
});
