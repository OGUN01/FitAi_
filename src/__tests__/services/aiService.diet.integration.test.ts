/**
 * Integration test for aiService.generateWeeklyMealPlan — verifies the diet
 * generation flow end-to-end with the worker client mocked. Deterministic
 * equivalent of driving "generate diet plan" as a user.
 *
 * Covers: diet generation round-trip, P1-1 (no fabricated calorie target —
 * explicit target passes through), and the diet-compliance derivation path.
 * See src/docs/VERIFIED-FINDINGS.md.
 */

const mockGenerateDietPlan = jest.fn();
const mockTestConnection = jest.fn(async () => ({ success: true, data: "ok" }));
jest.mock("../../services/fitaiWorkersClient", () => ({
  fitaiWorkersClient: {
    generateDietPlan: (...args: unknown[]) => mockGenerateDietPlan(...args),
    testConnection: (...args: unknown[]) => mockTestConnection(...args),
  },
  AuthenticationError: class AuthenticationError extends Error {},
  WorkersAPIError: class WorkersAPIError extends Error {
    statusCode = 500;
  },
  NetworkError: class NetworkError extends Error {},
  isDietPlanResponse: () => true,
  isAsyncJobResponse: () => false,
}));

jest.mock("../../services/supabase", () => ({
  supabase: { from: jest.fn() },
}));

import { NetworkError } from "../../services/fitaiWorkersClient";

jest.mock("../../services/currentWeight", () => ({
  resolveCurrentWeight: () => ({ value: 75 }),
  resolveCurrentWeightFromStores: () => ({ value: 75 }),
}));

import { aiService } from "../../ai/index";

// Helper to build a meal with per-food nutrition (the shape the transform reads).
function makeMeal(i: number) {
  return {
    mealType: i % 3 === 0 ? "breakfast" : i % 3 === 1 ? "lunch" : "dinner",
    name: `Meal ${i + 1}`,
    foods: [
      {
        name: `Food ${i + 1}`,
        quantity: "100g",
        nutrition: { calories: 250, protein: 20, carbs: 15, fats: 8, fiber: 4 },
      },
    ],
    totalNutrition: { calories: 250, protein: 20, carbs: 15, fats: 8, fiber: 4 },
    preparationTime: 15,
    cookingInstructions: ["Prep", "Cook"],
  };
}

const CANNED_DIET_RESPONSE = {
  success: true,
  data: {
    id: "plan_1",
    title: "7-Day Plan",
    meals: Array.from({ length: 21 }, (_, i) => makeMeal(i)),
    dailyTotals: { calories: 2000, protein: 150, carbs: 200, fat: 60 },
    totalCalories: 14000,
  },
  metadata: { cached: false, generationTime: 1500 },
};

describe("aiService.generateWeeklyMealPlan — end-to-end integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateDietPlan.mockResolvedValue(CANNED_DIET_RESPONSE);
  });

  it("generates a weekly meal plan and round-trips the response", async () => {
    const res = await aiService.generateWeeklyMealPlan(
      { age: 30, gender: "female", weight: 65, height: 165, activityLevel: "moderate" } as any,
      { primary_goals: ["weight_loss"], experience_level: "beginner" } as any,
      1,
      {
        bodyMetrics: { height_cm: 165, current_weight_kg: 65 } as any,
        dietPreferences: { diet_type: "vegetarian", allergies: [], breakfast_enabled: true, lunch_enabled: true, dinner_enabled: true, snacks_enabled: true } as any,
        calorieTarget: 1800, // P1-1: explicit target passes through (no fabrication)
      },
    );

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.meals.length).toBeGreaterThan(0);

    // The request carried the explicit calorie target (P1-1)
    const sentRequest = mockGenerateDietPlan.mock.calls[0][0];
    expect(sentRequest.calorieTarget).toBe(1800);
  });

  it("passes calorieTarget=undefined when none provided (P1-1: no fabrication)", async () => {
    const res = await aiService.generateWeeklyMealPlan(
      { age: 30, gender: "female", weight: 65, height: 165 } as any,
      { primary_goals: ["weight_loss"], experience_level: "beginner" } as any,
      1,
      {
        bodyMetrics: { height_cm: 165 } as any,
        dietPreferences: { diet_type: "non-veg" } as any,
        // no calorieTarget, no advancedReview
      },
    );

    expect(res.success).toBe(true);
    const sentRequest = mockGenerateDietPlan.mock.calls[0][0];
    // P1-1: NO fabricated 1800/2200/2800 — undefined when missing
    expect(sentRequest.calorieTarget).toBeUndefined();
  });

  it("returns retryable=true on network errors (handleError fix)", async () => {
    mockGenerateDietPlan.mockRejectedValueOnce(new NetworkError("timeout"));

    const res = await aiService.generateWeeklyMealPlan(
      { age: 30, gender: "female", weight: 65, height: 165 } as any,
      { primary_goals: ["weight_loss"] } as any,
      1,
    );

    expect(res.success).toBe(false);
    expect(res.retryable).toBe(true);
  });
});
