import { act, renderHook } from "@testing-library/react-native";
import { userProfileService } from "../../services/userProfile";

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
  });

  it("opens the subscription management surface for the subscription item", async () => {
    const { result } = renderHook(() => useProfileLogic());

    await act(async () => {
      await result.current.handleSettingItemPress({ id: "subscription" } as any);
    });

    expect(result.current.currentSettingsScreen).toBe("subscription");
  });

  it("treats theme as an informational action instead of a fake setting", async () => {
    const { result } = renderHook(() => useProfileLogic());

    await act(async () => {
      await result.current.handleSettingItemPress({ id: "theme" } as any);
    });

    expect(mockCrossPlatformAlert).toHaveBeenCalledWith(
      "Theme",
      "FitAI uses a fixed dark theme right now. Theme switching is not available yet.",
    );
  });

  it("marks non-configurable preference rows as non-actionable metadata", () => {
    const { result } = renderHook(() => useProfileLogic());

    expect(result.current.preferencesItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "theme",
          disabled: true,
          showChevron: false,
        }),
        expect.objectContaining({
          id: "language",
          disabled: true,
          showChevron: false,
          subtitle: "English only for now",
        }),
      ]),
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
