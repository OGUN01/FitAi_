const mockRunAfterInteractions = jest.fn();
const mockGetWeightHistory = jest.fn();
const mockRefreshAnalytics = jest.fn();
const mockInitializeAnalytics = jest.fn();
const mockSetHistoryData = jest.fn();

jest.mock("react-native", () => ({
  Platform: { OS: "android" },
  Animated: {
    Value: jest.fn(() => ({ value: 0 })),
    timing: jest.fn(() => ({ start: jest.fn() })),
  },
  InteractionManager: {
    runAfterInteractions: (...args: unknown[]) =>
      mockRunAfterInteractions(...args),
  },
}));

const mockUseAuth = jest.fn(() => ({
  user: null,
  isGuestMode: false,
}));

const mockFitnessStoreState = {
  loadData: jest.fn(),
  weeklyWorkoutPlan: null,
  completedSessions: [],
  workoutProgress: {},
  checkAndResetProgressIfNewDay: jest.fn(),
};

const mockNutritionStoreState = {
  loadData: jest.fn(),
  weeklyMealPlan: null,
  mealProgress: {},
  getTodaysConsumedNutrition: () => ({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  }),
};

const mockAchievementStoreState = {
  currentStreak: 0,
  initialize: jest.fn(),
  isInitialized: true,
  reconcileWithCurrentData: jest.fn(),
};

jest.mock("../../utils/haptics", () => ({
  haptics: {
    light: jest.fn(),
    medium: jest.fn(),
  },
}));

jest.mock("../../utils/integration", () => ({
  useDashboardIntegration: () => ({
    profile: null,
  }),
}));

jest.mock("../../hooks/useAuth", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
}));

jest.mock("../../hooks/useCalculatedMetrics", () => ({
  useCalculatedMetrics: () => ({
    metrics: null,
  }),
}));

jest.mock("../../stores", () => ({
  useFitnessStore: Object.assign(
    jest.fn((selector?: (state: any) => unknown) =>
      selector ? selector(mockFitnessStoreState) : mockFitnessStoreState,
    ),
    {
      getState: () => mockFitnessStoreState,
    },
  ),
  useNutritionStore: Object.assign(
    jest.fn((selector?: (state: any) => unknown) =>
      selector ? selector(mockNutritionStoreState) : mockNutritionStoreState,
    ),
    {
      getState: () => mockNutritionStoreState,
      setState: jest.fn(),
    },
  ),
  useAchievementStore: Object.assign(
    jest.fn((selector?: (state: any) => unknown) =>
      selector
        ? selector(mockAchievementStoreState)
        : mockAchievementStoreState,
    ),
    {
      getState: () => mockAchievementStoreState,
    },
  ),
  useHealthDataStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      metrics: null,
      isHealthKitAuthorized: false,
      isHealthConnectAuthorized: false,
      initializeHealthKit: jest.fn(),
      syncHealthData: jest.fn(),
      initializeHealthConnect: jest.fn(),
      syncFromHealthConnect: jest.fn(),
      settings: {
        healthKitEnabled: false,
        healthConnectEnabled: false,
      },
    };
    return selector ? selector(state) : state;
  }),
  useAnalyticsStore: Object.assign(
    jest.fn((selector?: (state: any) => unknown) => {
      const state = {
        isInitialized: true,
        initialize: mockInitializeAnalytics,
        refreshAnalytics: mockRefreshAnalytics,
        setHistoryData: mockSetHistoryData,
        weightHistory: [],
        calorieHistory: [],
      };
      return selector ? selector(state) : state;
    }),
    {
      getState: () => ({
        calorieHistory: [],
      }),
    },
  ),
  useHydrationStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      waterIntakeML: 0,
      dailyGoalML: 0,
      addWater: jest.fn(),
      setDailyGoal: jest.fn(),
      checkAndResetIfNewDay: jest.fn(),
      syncWithSupabase: jest.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../stores/profileStore", () => ({
  useProfileStore: (selector?: (state: any) => unknown) => {
    const state = {
      bodyAnalysis: null,
      personalInfo: null,
    };
    return selector ? selector(state) : state;
  },
}));

jest.mock("../../hooks/progress-screen/data", () => ({
  buildTodaysData: () => null,
}));

jest.mock("../../services/completionTracking", () => ({
  completionTrackingService: {
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock("../../services/analyticsData", () => ({
  analyticsDataService: {
    getWeightHistory: (...args: unknown[]) => mockGetWeightHistory(...args),
  },
}));

jest.mock("../../utils/workoutIdentity", () => ({
  findCompletedSessionForWorkout: jest.fn(() => null),
  getCompletedSessionsForDate: jest.fn(() => []),
  hasCompletedSessionForDay: jest.fn(() => false),
}));

import { isHealthSnapshotFromToday } from "../../hooks/useHomeLogic";
import { useHomeLogic } from "../../hooks/useHomeLogic";
import { renderHook } from "@testing-library/react-native";

describe("isHealthSnapshotFromToday", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-22T13:00:00"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns true for a snapshot updated today", () => {
    expect(isHealthSnapshotFromToday("2026-03-22T08:15:00")).toBe(true);
  });

  it("returns false for a snapshot updated on a previous day", () => {
    expect(isHealthSnapshotFromToday("2026-03-21T23:59:00")).toBe(false);
  });

  it("returns false when no snapshot timestamp exists", () => {
    expect(isHealthSnapshotFromToday(undefined)).toBe(false);
    expect(isHealthSnapshotFromToday(null)).toBe(false);
  });
});

describe("useHomeLogic startup scheduling", () => {
  beforeEach(() => {
    mockGetWeightHistory.mockResolvedValue([]);
    mockRefreshAnalytics.mockReset();
    mockInitializeAnalytics.mockReset();
    mockSetHistoryData.mockReset();
    mockRunAfterInteractions.mockImplementation((callback?: () => void) => {
      return { cancel: jest.fn(), callback };
    });
  });

  it("schedules analytics and weight-history follow-up work after interactions", async () => {
    const scheduledCallbacks: Array<() => void> = [];
    mockRunAfterInteractions.mockImplementation((callback?: () => void) => {
      if (callback) scheduledCallbacks.push(callback);
      return { cancel: jest.fn() };
    });

    const stores = require("../../stores");
    stores.useAnalyticsStore.mockImplementation(
      (selector?: (state: any) => unknown) => {
        const state = {
          isInitialized: true,
          initialize: mockInitializeAnalytics,
          refreshAnalytics: mockRefreshAnalytics,
          setHistoryData: mockSetHistoryData,
          weightHistory: [],
          calorieHistory: [],
        };
        return selector ? selector(state) : state;
      },
    );

    mockUseAuth.mockReturnValue({
      user: { id: "user-1" },
      isGuestMode: false,
    });

    renderHook(() => useHomeLogic());

    expect(mockGetWeightHistory).not.toHaveBeenCalled();
    expect(mockRefreshAnalytics).not.toHaveBeenCalled();
    expect(scheduledCallbacks).toHaveLength(2);

    scheduledCallbacks.forEach((callback) => callback());
    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetWeightHistory).toHaveBeenCalledWith("user-1", 90);
    expect(mockRefreshAnalytics).toHaveBeenCalled();
    expect(mockSetHistoryData).toHaveBeenCalledWith([], []);
  });
});
