import { act, renderHook } from "@testing-library/react-native";

const mockProfileStoreState = {
  bodyAnalysis: { height_cm: 180, current_weight_kg: 78 },
  personalInfo: { first_name: "Alex", last_name: "Stone", age: 28 },
  workoutPreferences: { primary_goals: ["strength"] },
  updatePersonalInfo: jest.fn(),
};
const mockSetProfile = jest.fn();
const mockUpdateProfile = jest.fn().mockResolvedValue({ success: true });
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

jest.mock("../../hooks/useUser", () => ({
  useUser: () => ({
    profile: {
      personalInfo: { name: "Alex", age: 28 },
      fitnessGoals: { primary_goals: ["strength"] },
    },
    clearProfile: jest.fn(),
  }),
}));

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

jest.mock("../../stores/userStore", () => ({
  useUserStore: {
    getState: jest.fn(() => ({
      profile: {
        personalInfo: { name: "Alex", age: 28, units: "metric" },
        preferences: {
          units: "metric",
          notifications: true,
          darkMode: false,
        },
      },
      setProfile: mockSetProfile,
    })),
  },
}));

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
    updateProfile: mockUpdateProfile,
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
    mockUpdateProfile.mockClear();
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

    expect(result.current.showThemeModal).toBe(false);
    expect(mockCrossPlatformAlert).toHaveBeenCalledWith(
      "Theme",
      "FitAI currently uses a fixed dark theme. Additional theme options are coming soon.",
    );
  });

  it("syncs units changes into the shared profile state", async () => {
    const { result } = renderHook(() => useProfileLogic());

    await act(async () => {
      await result.current.handleUnitsSelect("imperial");
    });

    expect(mockProfileStoreState.updatePersonalInfo).toHaveBeenCalledWith({
      units: "imperial",
    });
    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        personalInfo: expect.objectContaining({ units: "imperial" }),
        preferences: expect.objectContaining({ units: "imperial" }),
      }),
    );
  });
});
