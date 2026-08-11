import { renderHook, waitFor } from "@testing-library/react-native";

const mockLoadNutritionStoreData = jest.fn();

jest.mock("../../utils/crossPlatformAlert", () => ({
  crossPlatformAlert: jest.fn(),
}));

const mockSaveWeeklyMealPlan = jest.fn();
const mockSetWeeklyMealPlan = jest.fn();
const mockSetNutritionStoreState = jest.fn();
let mockNutritionStoreState = {
  weeklyMealPlan: { meals: [{ id: "meal-1" }] },
  isGeneratingPlan: false,
  mealProgress: {} as Record<string, { logId?: string; progress?: number }>,
  dailyMeals: [],
  saveWeeklyMealPlan: mockSaveWeeklyMealPlan,
  setWeeklyMealPlan: mockSetWeeklyMealPlan,
  setGeneratingPlan: jest.fn(),
  getMealProgress: jest.fn(),
  loadData: mockLoadNutritionStoreData,
};

jest.mock("../../stores", () => {
  const useNutritionStoreMock: any = jest.fn((selector?: (state: any) => unknown) =>
    selector ? selector(mockNutritionStoreState) : mockNutritionStoreState,
  );
  useNutritionStoreMock.getState = jest.fn(() => mockNutritionStoreState);
  useNutritionStoreMock.setState = jest.fn((partial: any) => {
    mockNutritionStoreState = { ...mockNutritionStoreState, ...partial };
    mockSetNutritionStoreState(partial);
  });
  return {
    useNutritionStore: useNutritionStoreMock,
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
  };
});

jest.mock("../../stores/profileStore", () => {
  const state = {
    bodyAnalysis: null,
    personalInfo: null,
    workoutPreferences: null,
    dietPreferences: null,
  };
  const fn = jest.fn((selector?: (state: any) => unknown) =>
    selector ? selector(state) : state,
  );
  (fn as any).getState = jest.fn(() => state);
  return { useProfileStore: fn };
});

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

const mockAiSwapMealInPlan = jest.fn();
jest.mock("../../ai", () => ({
  aiService: {
    swapMealInPlan: (...args: unknown[]) => mockAiSwapMealInPlan(...args),
  },
}));

const mockDeleteMealLog = jest.fn();
jest.mock("../../services/crudOperations", () => ({
  crudOperations: {
    deleteMealLog: (...args: unknown[]) => mockDeleteMealLog(...args),
  },
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

describe("useMealPlanning swapMealInPlan meal-progress cleanup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNutritionStoreState = {
      ...mockNutritionStoreState,
      weeklyMealPlan: { meals: [{ id: "meal-1", dayOfWeek: "monday" }] },
      mealProgress: { "meal-1": { logId: "log-1", progress: 100 } },
    };
    mockSaveWeeklyMealPlan.mockResolvedValue(undefined);
  });

  const originalMeal: any = {
    id: "meal-1",
    dayOfWeek: "monday",
    type: "lunch",
    name: "Original Meal",
    totalCalories: 500,
    totalMacros: { protein: 30, carbohydrates: 50, fat: 15, fiber: 5 },
  };

  const swappedMeal: any = {
    id: "swap_meal-1",
    dayOfWeek: "monday",
    type: "lunch",
    name: "New Meal",
    totalCalories: 450,
    totalMacros: { protein: 25, carbohydrates: 40, fat: 10, fiber: 4 },
  };

  it("deletes the underlying meal_logs row (not just the local cache entry) after a successful swap", async () => {
    mockAiSwapMealInPlan.mockResolvedValue({ success: true, data: swappedMeal });

    const { result } = renderHook(() => useMealPlanning({}));
    await result.current.swapMealInPlan(originalMeal);

    // Bug this pins: previously only the Zustand cache entry was cleared,
    // never the Supabase meal_logs row — so the stale 'completed' log would
    // silently reattach to the swapped-in meal on next hydration (same id).
    expect(mockDeleteMealLog).toHaveBeenCalledWith("log-1");
    expect(mockSetNutritionStoreState).toHaveBeenCalledWith({
      mealProgress: {},
    });
    // The DB delete must happen before the local cache is cleared, so a
    // crash/kill between the two steps can't leave a stale DB row believed
    // to be already cleared.
    const deleteOrder = mockDeleteMealLog.mock.invocationCallOrder[0];
    const setStateOrder = mockSetNutritionStoreState.mock.invocationCallOrder[0];
    expect(deleteOrder).toBeLessThan(setStateOrder);
  });

  it("does not attempt a meal_logs delete when there is no prior progress entry", async () => {
    mockNutritionStoreState = { ...mockNutritionStoreState, mealProgress: {} };
    mockAiSwapMealInPlan.mockResolvedValue({ success: true, data: swappedMeal });

    const { result } = renderHook(() => useMealPlanning({}));
    await result.current.swapMealInPlan(originalMeal);

    expect(mockDeleteMealLog).not.toHaveBeenCalled();
  });
});
