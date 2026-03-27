import {
  transformDietResponseToWeeklyPlan,
  transformForDietRequest,
} from "../../services/aiRequestTransformers";

const personalInfo = {
  age: 28,
  gender: "male",
  weight: 82,
  height: 178,
  activityLevel: "moderate",
  country: "IN",
} as any;

const fitnessGoals = {
  primary_goals: ["weight-loss"],
  experience_level: "intermediate",
} as any;

function createWorkerMeal(index: number, overrides: Record<string, any> = {}) {
  return {
    mealType: index % 3 === 0 ? "breakfast" : index % 3 === 1 ? "lunch" : "dinner",
    name: `Meal ${index + 1}`,
    foods: [
      {
        name: `Food ${index + 1}`,
        quantity: "100g",
        nutrition: {
          calories: 200,
          protein: 20,
          carbs: 15,
          fats: 8,
          fiber: 4,
        },
      },
    ],
    totalNutrition: {
      calories: 200,
      protein: 20,
      carbs: 15,
      fats: 8,
      fiber: 4,
    },
    preparationTime: 15,
    cookingInstructions: ["Prep", "Cook", "Serve"],
    ...overrides,
  };
}

describe("aiRequestTransformers", () => {
  it("builds weekly diet requests with weekly days, valid restriction keys, and excludes", () => {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      {
        height_cm: 178,
        current_weight_kg: 82,
        medical_conditions: ["pcos"],
        medications: ["metformin"],
        pregnancy_status: false,
        breastfeeding_status: false,
      } as any,
      {
        diet_type: "non-veg",
        allergies: ["peanut"],
        restrictions: ["low-carb", "low-sodium", "heart-healthy"],
        dislikes: ["okra", "tofu"],
        breakfast_enabled: true,
        lunch_enabled: true,
        dinner_enabled: true,
        snacks_enabled: true,
      } as any,
      2100,
      {
        daysCount: 7,
        advancedReview: {
          daily_calories: 2100,
          daily_protein_g: 150,
          daily_carbs_g: 180,
          daily_fat_g: 70,
          daily_water_ml: 3200,
          daily_fiber_g: 32,
          calculated_bmi: 24.8,
          bmi_category: "healthy",
        } as any,
      },
    );

    expect(request.daysCount).toBe(7);
    expect(request.mealsPerDay).toBe(5);
    expect(request.calorieTarget).toBe(2100);
    expect(request.dietaryRestrictions).toEqual(["low_carb"]);
    expect(request.excludeIngredients).toEqual(["okra", "tofu"]);
    expect(request.profile.country).toBe("IN");
    expect(request.dietPreferences?.breakfast_enabled).toBe(true);
    expect(request.bodyMetrics?.medications).toEqual(["metformin"]);
    expect(request.advancedReview?.daily_fiber_g).toBe(32);
  });

  it("preserves explicit weekday assignments from worker responses", () => {
    const weeklyPlan = transformDietResponseToWeeklyPlan(
      {
        success: true,
        data: {
          id: "plan_1",
          title: "Weekly Plan",
          meals: [
            createWorkerMeal(0, { dayOfWeek: "monday", mealType: "breakfast" }),
            createWorkerMeal(1, { dayOfWeek: "tuesday", mealType: "dinner" }),
          ],
          dailyTotals: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
        },
      } as any,
      1,
      { requestedDaysCount: 7 },
    );

    expect(weeklyPlan?.meals[0].dayOfWeek).toBe("monday");
    expect(weeklyPlan?.meals[1].dayOfWeek).toBe("tuesday");
  });

  it("falls back to sequential weekday assignment for weekly responses without dayOfWeek", () => {
    const weeklyPlan = transformDietResponseToWeeklyPlan(
      {
        success: true,
        data: {
          id: "plan_2",
          title: "7-Day Plan",
          meals: Array.from({ length: 21 }, (_, index) =>
            createWorkerMeal(index),
          ),
          dailyTotals: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
          },
        },
      } as any,
      1,
      { requestedDaysCount: 7 },
    );

    expect(weeklyPlan?.meals[0].dayOfWeek).toBe("monday");
    expect(weeklyPlan?.meals[2].dayOfWeek).toBe("monday");
    expect(weeklyPlan?.meals[3].dayOfWeek).toBe("tuesday");
    expect(weeklyPlan?.meals[20].dayOfWeek).toBe("sunday");
  });
});
