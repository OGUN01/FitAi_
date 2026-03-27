const TEST_DATE = "2026-03-25";
const mockGetUser = jest.fn();
const mockGetCurrentUserId = jest.fn();
const mockReadMealLogs = jest.fn();
const tableResponseQueues: Record<string, Array<any>> = {
  weekly_meal_plans: [],
  meal_logs: [],
};

function queueTableResponse(table: keyof typeof tableResponseQueues, result: any) {
  tableResponseQueues[table].push(result);
}

function mockCreateSupabaseQuery(table: string) {
  const result = tableResponseQueues[table]?.shift() ?? {
    data: [],
    error: null,
  };

  const query: any = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    in: jest.fn(() => query),
    order: jest.fn(() => query),
    gte: jest.fn(() => query),
    lte: jest.fn(() => query),
    limit: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    single: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: any) => any, reject?: (reason: any) => any) =>
      Promise.resolve(result).then(resolve, reject),
    catch: (reject: (reason: any) => any) => Promise.resolve(result).catch(reject),
  };

  return query;
}

jest.mock("../../services/crudOperations", () => ({
  __esModule: true,
  default: {
    readMealLogs: (...args: unknown[]) => mockReadMealLogs(...args),
    createMealLog: jest.fn(),
    readMealLog: jest.fn(),
    updateMealLog: jest.fn(),
  },
}));

jest.mock("../../services/offline", () => ({
  offlineService: {
    queueAction: jest.fn(),
    clearFailedActionsForTable: jest.fn(),
  },
}));

jest.mock("../../services/authUtils", () => ({
  getCurrentUserId: (...args: unknown[]) => mockGetCurrentUserId(...args),
  getUserIdOrGuest: jest.fn(() => "user-or-guest"),
}));

jest.mock("../../services/supabase", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    from: jest.fn((table: string) => mockCreateSupabaseQuery(table)),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
    })),
  },
}));

jest.mock("../../utils/uuid", () => ({
  generateUUID: jest.fn(() => "generated-uuid"),
  isValidUUID: jest.fn(() => true),
}));

jest.mock("../../utils/weekUtils", () => ({
  getLocalDateString: jest.fn((value?: string | Date) => {
    if (!value) return TEST_DATE;
    return new Date(value).toISOString().slice(0, 10);
  }),
  getLocalDayBounds: jest.fn(() => ({
    startIso: `${TEST_DATE}T00:00:00.000Z`,
    endIso: `${TEST_DATE}T23:59:59.999Z`,
  })),
}));

jest.mock("../../stores/nutrition/legacyScanShadowCleanup", () => ({
  filterLegacyScanShadowMeals: (meals: any[] = []) => meals,
  pruneLegacyScanShadowState: jest.fn(() => null),
  sanitizeLegacyScanShadowPersistedState: (state: any) => state ?? {},
}));

import { useNutritionStore } from "../../stores/nutritionStore";

describe("nutritionStore SSOT hydration", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    tableResponseQueues.weekly_meal_plans = [];
    tableResponseQueues.meal_logs = [];
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockGetCurrentUserId.mockReturnValue(null);
    mockReadMealLogs.mockResolvedValue([]);
    useNutritionStore.getState().clearData();
    await useNutritionStore.persist.clearStorage();
    useNutritionStore.setState({
      isGeneratingPlan: false,
      isGeneratingMeal: false,
      planError: null,
      mealError: null,
    });
  });

  it("counts only logged meals in today's consumed nutrition", () => {
    useNutritionStore.setState({
      weeklyMealPlan: {
        id: "plan-1",
        weekNumber: 1,
        meals: [
          {
            id: "planned-meal-1",
            type: "lunch",
            name: "Plan Meal",
            description: "Planned",
            items: [],
            totalCalories: 500,
            totalMacros: {
              protein: 20,
              carbohydrates: 60,
              fat: 15,
              fiber: 18,
            },
            preparationTime: 0,
            difficulty: "easy",
            tags: [],
            dayOfWeek: "wednesday",
            isPersonalized: false,
            aiGenerated: true,
            createdAt: `${TEST_DATE}T06:00:00.000Z`,
          } as any,
        ],
      } as any,
      mealProgress: {
        "planned-meal-1": {
          mealId: "planned-meal-1",
          progress: 100,
          completedAt: `${TEST_DATE}T06:30:00.000Z`,
        },
      },
      dailyMeals: [
        {
          id: "suggestion-1",
          type: "snack",
          name: "Planned Suggestion",
          items: [],
          totalCalories: 220,
          totalMacros: {
            protein: 6,
            carbohydrates: 20,
            fat: 8,
            fiber: 12,
          },
          tags: ["suggestion", "planned"],
          isPersonalized: false,
          aiGenerated: false,
          createdAt: `${TEST_DATE}T08:00:00.000Z`,
          updatedAt: `${TEST_DATE}T08:00:00.000Z`,
        } as any,
        {
          id: "meal-log-1",
          type: "lunch",
          name: "Logged Sabudana",
          items: [],
          totalCalories: 380,
          totalMacros: {
            protein: 10,
            carbohydrates: 65,
            fat: 20,
            fiber: 4,
          },
          tags: [],
          isPersonalized: false,
          aiGenerated: false,
          createdAt: `${TEST_DATE}T09:00:00.000Z`,
          updatedAt: `${TEST_DATE}T09:00:00.000Z`,
          loggedAt: `${TEST_DATE}T09:00:00.000Z`,
        } as any,
      ],
    });

    expect(useNutritionStore.getState().getTodaysConsumedNutrition()).toEqual({
      calories: 380,
      protein: 10,
      carbs: 65,
      fat: 20,
      fiber: 4,
    });
  });

  it("hydrates today's consumed meals from meal_logs and ignores weekly-plan totals", async () => {
    mockGetCurrentUserId.mockReturnValue("user-1");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    queueTableResponse("weekly_meal_plans", {
      data: [
        {
          id: "plan-row-1",
          plan_data: {
            id: "plan-1",
            weekNumber: 1,
            meals: [
              {
                id: "planned-meal-1",
                type: "lunch",
                name: "Plan Lunch",
                description: "Planned",
                items: [],
                totalCalories: 500,
                totalMacros: {
                  protein: 22,
                  carbohydrates: 55,
                  fat: 18,
                  fiber: 20,
                },
                preparationTime: 0,
                difficulty: "easy",
                tags: [],
                dayOfWeek: "wednesday",
                isPersonalized: false,
                aiGenerated: true,
                createdAt: `${TEST_DATE}T06:00:00.000Z`,
              },
            ],
          },
        },
      ],
      error: null,
    });

    queueTableResponse("meal_logs", {
      data: [
        {
          id: "planned-log-1",
          plan_meal_id: "planned-meal-1",
          logged_at: `${TEST_DATE}T08:00:00.000Z`,
        },
      ],
      error: null,
    });

    queueTableResponse("meal_logs", {
      data: [
        {
          id: "planned-log-1",
          meal_type: "lunch",
          meal_name: "Plan Lunch",
          total_calories: 400,
          total_protein: 18,
          total_carbohydrates: 44,
          total_fat: 12,
          food_items: [{ name: "Plan Lunch", fiber: 4 }],
          logged_at: `${TEST_DATE}T08:00:00.000Z`,
          logging_mode: "manual",
          truth_level: "curated",
          confidence: null,
          country_context: "IN",
          requires_review: false,
          source_metadata: {},
        },
        {
          id: "manual-log-1",
          meal_type: "snack",
          meal_name: "Fruit Bowl",
          total_calories: 160,
          total_protein: 2,
          total_carbohydrates: 28,
          total_fat: 1,
          food_items: [{ name: "Fruit Bowl", fiber: 3.5 }],
          logged_at: `${TEST_DATE}T10:15:00.000Z`,
          logging_mode: "meal_photo",
          truth_level: "estimated",
          confidence: 88,
          country_context: "IN",
          requires_review: true,
          source_metadata: {},
        },
      ],
      error: null,
    });

    await useNutritionStore.getState().loadData();

    const state = useNutritionStore.getState();

    expect(state.dailyMeals.map((meal) => meal.id)).toEqual([
      "planned-log-1",
      "manual-log-1",
    ]);
    expect(state.getTodaysConsumedNutrition()).toEqual({
      calories: 560,
      protein: 20,
      carbs: 72,
      fat: 13,
      fiber: 7.5,
    });
    expect(state.mealProgress["planned-meal-1"]).toMatchObject({
      progress: 100,
      logId: "planned-log-1",
    });
  });

  it("clears stale persisted nutrition state when a different authenticated user hydrates", async () => {
    useNutritionStore.setState({
      hydrationOwnerUserId: "user-old",
      weeklyMealPlan: {
        id: "stale-plan",
        weekNumber: 1,
        meals: [],
      } as any,
      mealProgress: {
        stale: {
          mealId: "stale",
          progress: 100,
          completedAt: `${TEST_DATE}T07:00:00.000Z`,
        },
      },
      dailyMeals: [
        {
          id: "stale-log",
          type: "lunch",
          name: "Stale Meal",
          items: [],
          totalCalories: 300,
          totalMacros: {
            protein: 10,
            carbohydrates: 30,
            fat: 10,
            fiber: 5,
          },
          tags: [],
          isPersonalized: false,
          aiGenerated: false,
          createdAt: `${TEST_DATE}T07:00:00.000Z`,
          updatedAt: `${TEST_DATE}T07:00:00.000Z`,
          loggedAt: `${TEST_DATE}T07:00:00.000Z`,
        } as any,
      ],
    });

    mockGetCurrentUserId.mockReturnValue("user-new");
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-new" } },
      error: null,
    });

    queueTableResponse("weekly_meal_plans", {
      data: [],
      error: null,
    });

    queueTableResponse("meal_logs", {
      data: [],
      error: null,
    });

    await useNutritionStore.getState().loadData();

    const state = useNutritionStore.getState();
    expect(state.hydrationOwnerUserId).toBe("user-new");
    expect(state.weeklyMealPlan).toBeNull();
    expect(state.dailyMeals).toEqual([]);
    expect(state.mealProgress).toEqual({});
  });
});
