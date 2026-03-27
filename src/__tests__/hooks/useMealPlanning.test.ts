import { renderHook, waitFor } from "@testing-library/react-native";

const mockLoadNutritionStoreData = jest.fn();

jest.mock("../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

jest.mock("../../stores", () => ({
  useNutritionStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      weeklyMealPlan: { meals: [{ id: "meal-1" }] },
      isGeneratingPlan: false,
      mealProgress: {},
      dailyMeals: [],
      saveWeeklyMealPlan: jest.fn(),
      setWeeklyMealPlan: jest.fn(),
      setGeneratingPlan: jest.fn(),
      getMealProgress: jest.fn(),
      loadData: mockLoadNutritionStoreData,
    };
    return selector ? selector(state) : state;
  }),
  useAppStateStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      selectedDay: "monday",
    };
    return selector ? selector(state) : state;
  }),
  useAchievementStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      currentStreak: 0,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../stores/profileStore", () => ({
  useProfileStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      bodyAnalysis: null,
      personalInfo: null,
      workoutPreferences: null,
      dietPreferences: null,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../stores/userStore", () => ({
  useUserStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      profile: null,
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../hooks/useCalculatedMetrics", () => ({
  useCalculatedMetrics: () => ({
    getCalorieTarget: jest.fn(() => 2000),
  }),
}));

jest.mock("../../hooks/useNutritionData", () => ({
  useNutritionData: () => ({
    dietPreferences: null,
    loadDailyNutrition: jest.fn(),
  }),
}));

jest.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
  }),
}));

jest.mock("../../stores/subscriptionStore", () => ({
  useSubscriptionStore: jest.fn((selector?: (state: any) => unknown) => {
    const state = {
      canUseFeature: jest.fn(() => true),
      incrementUsage: jest.fn(),
      triggerPaywall: jest.fn(),
    };
    return selector ? selector(state) : state;
  }),
}));

jest.mock("../../services/completionTracking", () => ({
  completionTrackingService: {
    subscribe: jest.fn(() => jest.fn()),
  },
}));

jest.mock("../../ai", () => ({
  aiService: {},
}));

jest.mock("../../services/crudOperations", () => ({
  crudOperations: {},
}));

import { useMealPlanning } from "../../hooks/useMealPlanning";

describe("useMealPlanning hydration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("skips redundant initial hydration when meal data is already warm", async () => {
    renderHook(() => useMealPlanning({}));

    await waitFor(() => {
      expect(mockLoadNutritionStoreData).not.toHaveBeenCalled();
    });
  });
});
