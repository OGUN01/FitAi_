import { act, renderHook } from "@testing-library/react-native";
import { userProfileService } from "../../services/userProfile";
import { crudOperations } from "../../services/crudOperations";
import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";

const mockShare = jest.fn().mockResolvedValue({ action: "sharedAction" });
const mockWriteAsStringAsync = jest.fn().mockResolvedValue(undefined);
const mockDeleteAsync = jest.fn().mockResolvedValue(undefined);
const mockRequestDirectoryPermissionsAsync = jest.fn();
const mockCreateFileAsync = jest.fn();

// Jest's hoist plugin permits referencing out-of-scope identifiers whose
// name starts with "mock" from inside a jest.mock() factory, so the
// module-level mock*/jest.fn() consts above can be used directly here.
jest.mock("react-native", () => ({
  Linking: { openURL: jest.fn().mockResolvedValue(true) },
  Share: { share: (...args: unknown[]) => mockShare(...args) },
  Platform: { OS: "ios" },
}));

jest.mock("expo-file-system", () => ({
  cacheDirectory: "file:///cache/",
  EncodingType: { UTF8: "utf8" },
  writeAsStringAsync: (...args: unknown[]) => mockWriteAsStringAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: (...args: unknown[]) =>
      mockRequestDirectoryPermissionsAsync(...args),
    createFileAsync: (...args: unknown[]) => mockCreateFileAsync(...args),
  },
}));

const mockProfileStoreState = {
  bodyAnalysis: { height_cm: 180, current_weight_kg: 78 },
  personalInfo: { first_name: "Alex", last_name: "Stone", age: 28 },
  workoutPreferences: { primary_goals: ["strength"] },
  updatePersonalInfo: jest.fn(),
};
const mockSetProfile = jest.fn();
const mockCrossPlatformAlert = jest.fn();

jest.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", createdAt: "2026-03-01T00:00:00.000Z" },
    isAuthenticated: true,
    isGuestMode: false,
    logout: jest.fn().mockResolvedValue(undefined),
    guestId: null,
  }),
}));

// useUser was renamed to useAuth; profile/clearProfile now come from useUserStore
// (mocked below). The old useUser mock referenced a deleted file and crashed the
// suite import — removed.

jest.mock("../../stores/profileStore", () => {
  const fn = jest.fn(() => mockProfileStoreState);
  (fn as any).getState = jest.fn(() => mockProfileStoreState);
  return {
    useProfileStore: fn,
  };
});

jest.mock("../../hooks/useUnifiedStats", () => ({
  useUnifiedStats: () => ({
    currentStreak: 3,
    totalWorkouts: 12,
    totalCaloriesBurned: 1600,
    longestStreak: 5,
    achievements: 4,
  }),
}));

jest.mock("../../utils/clearUserData", () => ({
  clearAllUserData: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../../stores/subscriptionStore", () => ({
  useSubscriptionStore: () => ({
    currentPlan: { tier: "pro" },
    subscriptionStatus: "active",
  }),
}));

// useProfileLogic calls useUserStore as a Zustand hook in selector form:
//   useUserStore((s) => s.profile)  and  useUserStore((s) => s.clearProfile)
// The mock must therefore be a callable accepting a selector and returning
// selector(mockState), mirroring the real store. `.getState()` is provided so
// any non-selector access (getState()-based reads) also resolves.
const mockUserStoreState = {
  profile: {
    personalInfo: { name: "Alex", age: 28, units: "metric" },
    preferences: {
      units: "metric",
      notifications: true,
      darkMode: false,
    },
  },
  setProfile: mockSetProfile,
  clearProfile: jest.fn(),
};
jest.mock("../../stores/userStore", () => {
  const fn = jest.fn((selector?: (s: typeof mockUserStoreState) => unknown) =>
    selector ? selector(mockUserStoreState) : mockUserStoreState,
  );
  (fn as any).getState = jest.fn(() => mockUserStoreState);
  (fn as any).setState = jest.fn();
  return {
    useUserStore: fn,
  };
});

jest.mock("../../stores/healthDataStore", () => ({
  useHealthDataStore: {
    getState: jest.fn(() => ({
      isHealthConnectAuthorized: false,
      isHealthKitAuthorized: false,
      syncFromHealthConnect: jest.fn(),
      syncHealthData: jest.fn(),
    })),
  },
}));

jest.mock("../../services/crudOperations", () => ({
  crudOperations: {
    exportAllData: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock("../../services/userProfile", () => ({
  userProfileService: {
    updateProfile: jest.fn().mockResolvedValue({ success: true }),
  },
}));

jest.mock("../../utils/crossPlatformAlert", () => ({
  __esModule: true,
  crossPlatformAlert: (...args: unknown[]) => mockCrossPlatformAlert(...args),
}));

import { useProfileLogic } from "../../hooks/useProfileLogic";

describe("useProfileLogic", () => {
  beforeEach(() => {
    mockProfileStoreState.updatePersonalInfo.mockClear();
    mockSetProfile.mockClear();
    (userProfileService.updateProfile as jest.Mock).mockClear();
    mockCrossPlatformAlert.mockClear();
    (crudOperations.exportAllData as jest.Mock).mockReset();
    mockShare.mockClear();
    mockWriteAsStringAsync.mockClear();
    mockDeleteAsync.mockClear();
    mockRequestDirectoryPermissionsAsync.mockReset();
    mockCreateFileAsync.mockReset();
    (Platform as any).OS = "ios";
  });

  async function triggerExport() {
    const { result } = renderHook(() => useProfileLogic());
    await act(async () => {
      await result.current.handleSettingItemPress({ id: "export" } as any);
    });
    const confirmCall = mockCrossPlatformAlert.mock.calls.find(
      (call) => call[0] === "Export Your Data",
    );
    const buttons = confirmCall?.[2] as Array<{
      text: string;
      onPress?: () => Promise<void>;
    }>;
    const exportButton = buttons.find((b) => b.text === "Export");
    await act(async () => {
      await exportButton?.onPress?.();
    });
  }

  describe("export data", () => {
    it("shares small exports inline as a JSON message without touching the filesystem", async () => {
      const smallData = { profile: { name: "Alex" } };
      (crudOperations.exportAllData as jest.Mock).mockResolvedValue(
        smallData,
      );

      await triggerExport();

      expect(mockShare).toHaveBeenCalledWith({
        message: JSON.stringify(smallData, null, 2),
        title: "FitAI Data Export",
      });
      expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
    });

    it("routes large exports through a temp file on iOS and deletes it after sharing", async () => {
      (Platform as any).OS = "ios";
      const largeData = { blob: "a".repeat(600 * 1024) };
      (crudOperations.exportAllData as jest.Mock).mockResolvedValue(
        largeData,
      );

      await triggerExport();

      expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining("file:///cache/fitai-export-"),
        JSON.stringify(largeData, null, 2),
        { encoding: "utf8" },
      );
      expect(mockShare).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("file:///cache/fitai-export-"),
          title: "FitAI Data Export",
        }),
      );
      // The cache copy is a hand-off for the share sheet, not a delivery
      // location — it must be cleaned up afterward.
      expect(mockDeleteAsync).toHaveBeenCalledWith(
        expect.stringContaining("file:///cache/fitai-export-"),
        { idempotent: true },
      );
    });

    it("saves large exports on Android via the Storage Access Framework picker", async () => {
      (Platform as any).OS = "android";
      const largeData = { blob: "a".repeat(600 * 1024) };
      (crudOperations.exportAllData as jest.Mock).mockResolvedValue(
        largeData,
      );
      mockRequestDirectoryPermissionsAsync.mockResolvedValue({
        granted: true,
        directoryUri: "content://tree/primary:Download",
      });
      mockCreateFileAsync.mockResolvedValue(
        "content://tree/primary:Download/fitai-export-123.json",
      );

      await triggerExport();

      expect(mockRequestDirectoryPermissionsAsync).toHaveBeenCalled();
      expect(mockCreateFileAsync).toHaveBeenCalledWith(
        "content://tree/primary:Download",
        expect.stringContaining("fitai-export-"),
        "application/json",
      );
      expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
        "content://tree/primary:Download/fitai-export-123.json",
        JSON.stringify(largeData, null, 2),
        { encoding: "utf8" },
      );
      // Never falls back to the app-private cache dir on Android.
      expect(mockShare).not.toHaveBeenCalled();
      expect(mockCrossPlatformAlert).toHaveBeenCalledWith(
        "Export Saved",
        expect.stringContaining("saved to the folder you selected"),
      );
    });

    it("does not save anywhere on Android when the user cancels the folder picker", async () => {
      (Platform as any).OS = "android";
      const largeData = { blob: "a".repeat(600 * 1024) };
      (crudOperations.exportAllData as jest.Mock).mockResolvedValue(
        largeData,
      );
      mockRequestDirectoryPermissionsAsync.mockResolvedValue({
        granted: false,
      });

      await triggerExport();

      expect(mockCreateFileAsync).not.toHaveBeenCalled();
      expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
      expect(mockCrossPlatformAlert).toHaveBeenCalledWith(
        "Export Cancelled",
        expect.stringContaining("was not saved"),
      );
    });
  });

  it("opens the subscription management surface for the subscription item", async () => {
    const { result } = renderHook(() => useProfileLogic());

    await act(async () => {
      await result.current.handleSettingItemPress({ id: "subscription" } as any);
    });

    expect(result.current.currentSettingsScreen).toBe("subscription");
  });

  it("does not render unconfigurable Theme/Language rows in Preferences", () => {
    const { result } = renderHook(() => useProfileLogic());

    const ids = result.current.preferencesItems.map((item) => item.id);
    expect(ids).not.toContain("theme");
    expect(ids).not.toContain("language");
  });

  it("wires Rest Timer to a live toggle instead of a disabled tap target", () => {
    const { result } = renderHook(() => useProfileLogic());

    const restTimer = result.current.preferencesItems.find(
      (item) => item.id === "rest-timer",
    );
    expect(restTimer).toEqual(
      expect.objectContaining({
        showChevron: false,
        toggle: expect.objectContaining({
          value: expect.any(Boolean),
          onValueChange: expect.any(Function),
        }),
      }),
    );
  });

  it("writes units to profileStore SSOT + Supabase without dual-store spread", async () => {
    const { result } = renderHook(() => useProfileLogic());

    await act(async () => {
      await result.current.handleUnitsSelect("imperial");
    });

    // P1-14: profileStore (SSOT) updated via updatePersonalInfo, Supabase
    // updated via userProfileService.updateProfile. The userStore.setProfile
    // spread (dual-store duplication) is removed — it must NOT be called.
    expect(mockProfileStoreState.updatePersonalInfo).toHaveBeenCalledWith({
      units: "imperial",
    });
    expect(userProfileService.updateProfile).toHaveBeenCalledWith("user-1", {
      units: "imperial",
    });
    expect(mockSetProfile).not.toHaveBeenCalled();
  });
});
