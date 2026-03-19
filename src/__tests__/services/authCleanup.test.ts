import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { dataBridge } from "../../services/DataBridge";
import { supabase } from "../../services/supabase";

const mockGoogleConfigure = jest.fn(() => Promise.resolve());
const mockStartProfileMigration = jest.fn(() => Promise.resolve({ success: false }));
const setUserIdSpy = jest.spyOn(dataBridge, "setUserId");
let authServiceInstance: any;

jest.mock("../../services/googleAuth", () => ({
  __esModule: true,
  googleAuthService: {
    configure: mockGoogleConfigure,
    signInWithGoogle: jest.fn(),
    handleGoogleCallback: jest.fn(),
    linkGoogleAccount: jest.fn(),
    unlinkGoogleAccount: jest.fn(),
    isGoogleLinked: jest.fn(),
    getGoogleUserInfo: jest.fn(),
  },
}));

jest.mock("../../services/migrationManager", () => ({
  __esModule: true,
  migrationManager: {
    startProfileMigration: mockStartProfileMigration,
  },
}));

describe("authService cleanup behavior", () => {
  beforeEach(async () => {
    jest.spyOn(supabase.auth, "signOut").mockResolvedValue({ error: null } as any);
    authServiceInstance = require("../../services/auth").authService;
    await authServiceInstance.logout();
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it("clears stale cached sessions instead of trusting them", async () => {
    const storedSession = {
      user: {
        id: "user-123",
        email: "user@example.com",
        isEmailVerified: true,
        lastLoginAt: "2026-03-19T00:00:00.000Z",
      },
      accessToken: "cached-access",
      refreshToken: "stored-refresh",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    await AsyncStorage.setItem("auth_session", JSON.stringify(storedSession));

    jest.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: {
        session: {
          user: {
            id: "other-user",
            email: "other@example.com",
            email_confirmed_at: null,
          },
          access_token: "cached-access",
          refresh_token: "cached-refresh",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
    } as any);

    jest.spyOn(supabase.auth, "refreshSession").mockResolvedValue({
      data: { session: null },
      error: { message: "invalid refresh" },
    } as any);

    const result = await authServiceInstance.restoreSession();

    expect(result.success).toBe(false);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("auth_session");
    expect(setUserIdSpy).toHaveBeenLastCalledWith(null);
  });

  it("clears local auth state even when remote sign-out fails", async () => {
    const storedSession = {
      user: {
        id: "user-123",
        email: "user@example.com",
        isEmailVerified: true,
        lastLoginAt: "2026-03-19T00:00:00.000Z",
      },
      accessToken: "active-access",
      refreshToken: "active-refresh",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    await AsyncStorage.setItem("auth_session", JSON.stringify(storedSession));

    jest.spyOn(supabase.auth, "signOut").mockResolvedValue({
      error: { message: "network failure" },
    } as any);

    const result = await authServiceInstance.logout();

    expect(result.success).toBe(true);
    expect(authServiceInstance.getCurrentSession()).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("auth_session");
    expect(setUserIdSpy).toHaveBeenLastCalledWith(null);
  });
});
