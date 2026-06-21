import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

const mockReset = jest.fn();
const mockClearNutritionCache = jest.fn();
const mockInvalidateMetricsCache = jest.fn();
const mockClearUserMetricsCache = jest.fn();
const mockClearOfflineData = jest.fn(() => Promise.resolve());
const mockResetForLogout = jest.fn(() => Promise.resolve());

jest.mock("../../stores/fitnessStore", () => ({
  __esModule: true,
  useFitnessStore: {
    getState: () => ({ reset: mockReset }),
  },
}));

jest.mock("../../stores/nutritionStore", () => ({
  __esModule: true,
  useNutritionStore: {
    getState: () => ({ reset: mockReset }),
  },
  // P0-2: clearConsumedNutritionCaches now lives on the store module itself,
  // replacing the deleted nutrition/selectors.ts#clearNutritionCache.
  clearConsumedNutritionCaches: mockClearNutritionCache,
}));

jest.mock("../../stores/userStore", () => ({
  __esModule: true,
  useUserStore: {
    getState: () => ({ reset: mockReset }),
  },
}));

jest.mock("../../stores/hydrationStore", () => ({
  __esModule: true,
  useHydrationStore: {
    getState: () => ({ reset: mockReset }),
  },
}));

jest.mock("../../stores/analyticsStore", () => ({
  __esModule: true,
  useAnalyticsStore: {
    getState: () => ({ reset: mockReset }),
  },
}));

jest.mock("../../stores/achievementStore", () => ({
  __esModule: true,
  useAchievementStore: {
    getState: () => ({ reset: mockReset }),
  },
}));

jest.mock("../../stores/healthDataStore", () => ({
  __esModule: true,
  useHealthDataStore: {
    getState: () => ({ reset: mockReset }),
  },
}));

jest.mock("../../stores/appStateStore", () => ({
  __esModule: true,
  useAppStateStore: {
    getState: () => ({ reset: mockReset }),
  },
}));

jest.mock("../../stores/subscriptionStore", () => ({
  __esModule: true,
  useSubscriptionStore: {
    getState: () => ({ clearSubscription: mockReset }),
  },
}));

jest.mock("../../stores/profileStore", () => {
  const state = { reset: mockReset };
  const fn = jest.fn(() => state);
  (fn as any).getState = jest.fn(() => state);
  return { __esModule: true, useProfileStore: fn };
});

jest.mock("../../hooks/useCalculatedMetrics", () => ({
  __esModule: true,
  invalidateMetricsCache: mockInvalidateMetricsCache,
}));

jest.mock("../../services/userMetricsService", () => ({
  __esModule: true,
  userMetricsService: {
    clearCache: mockClearUserMetricsCache,
  },
}));

jest.mock("../../services/offline", () => ({
  __esModule: true,
  offlineService: {
    clearOfflineData: mockClearOfflineData,
  },
}));

jest.mock("../../services/SyncEngine", () => ({
  __esModule: true,
  syncEngine: {
    resetForLogout: mockResetForLogout,
  },
}));

describe("clearAllUserData", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    const asyncStorage = AsyncStorage as any;
    asyncStorage.getAllKeys = jest.fn(() =>
      Promise.resolve([
        "onboarding_partial_profile",
        "onboarding_partial_goals",
        "regular-key",
      ]),
    );
  });

  afterEach(async () => {
    await AsyncStorage.clear();
  });

  it("cleans shared-device onboarding, offline, and sync state", async () => {
    const { clearAllUserData } = require("../../utils/clearUserData");
    await clearAllUserData();

    expect(mockClearOfflineData).toHaveBeenCalledTimes(1);
    expect(mockResetForLogout).toHaveBeenCalledTimes(1);
    expect(mockClearNutritionCache).toHaveBeenCalled();
    expect(mockInvalidateMetricsCache).toHaveBeenCalled();
    expect(mockClearUserMetricsCache).toHaveBeenCalled();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("onboarding_data");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("auth_session");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("offline_sync_queue");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("offline_data");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@fitai_sync_queue");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@fitai_last_sync");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("profileEditIntent");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "onboarding_partial_profile",
    );
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "onboarding_partial_goals",
    );
  });
});
