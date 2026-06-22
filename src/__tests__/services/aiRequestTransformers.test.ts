import {
  transformDietResponseToWeeklyPlan,
  transformForDietRequest,
  transformForWorkoutRequest,
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
    // breakfast + lunch + dinner + snacks (snacks_count defaults to 1) = 4.
    // getRequestedMealsPerDay() counts each enabled slot and adds snacks_count
    // (default 1) when snacks_enabled is truthy.
    expect(request.mealsPerDay).toBe(4);
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

  // Regression for P0-1: workout generation must NOT map onboarding 'extreme' →
  // 'very_active'. The worker Zod enum (validation.ts) only accepts 'extreme',
  // and the split scorer (workoutSplits.ts) keys on 'extreme'. Mapping caused
  // 400s for the highest activity tier. See src/docs/VERIFIED-FINDINGS.md.
  it("passes activity_level 'extreme' through unchanged for workout requests (no very_active mapping)", () => {
    const workoutPrefsExtreme = {
      workout_frequency_per_week: 4,
      activity_level: "extreme",
      intensity: "advanced",
    } as any;

    const request = transformForWorkoutRequest(
      personalInfo,
      fitnessGoals,
      { height_cm: 178 } as any,
      workoutPrefsExtreme,
      { requestWeeklyPlan: true },
    );

    expect(request.weeklyPlan.activityLevel).toBe("extreme");
    expect(request.weeklyPlan.activityLevel).not.toBe("very_active");
  });

  it("leaves activityLevel undefined when workout preferences omit it", () => {
    const request = transformForWorkoutRequest(
      personalInfo,
      fitnessGoals,
      { height_cm: 178 } as any,
      { workout_frequency_per_week: 3 } as any,
      { requestWeeklyPlan: true },
    );

    expect(request.weeklyPlan.activityLevel).toBeUndefined();
  });

  // Regression for P0-3: progressive overload — weekNumber must thread through to
  // the request so the worker's MESOCYCLE_WEEK_MULTIPLIERS can scale sets/reps.
  // See src/docs/VERIFIED-FINDINGS.md "P0-3".
  it("threads weekNumber into the workout request for mesocycle progression", () => {
    const request = transformForWorkoutRequest(
      personalInfo,
      fitnessGoals,
      { height_cm: 178 } as any,
      { workout_frequency_per_week: 4, activity_level: "active" } as any,
      { requestWeeklyPlan: true, weekNumber: 3 },
    );
    expect(request.weekNumber).toBe(3);
  });

  // Regression for P1-1: calorieTarget must NOT fabricate 1800/2200/2800 when
  // missing. It should be undefined so the worker can surface a missing-target
  // state. See src/docs/VERIFIED-FINDINGS.md "P1-1".
  it("does NOT fabricate a calorie target when none is provided (no 1800/2200/2800 fallback)", () => {
    const request = transformForDietRequest(
      personalInfo,
      fitnessGoals,
      { height_cm: 178 } as any,
      { diet_type: "non-veg" } as any,
      undefined, // no explicit calorieTarget
      // no advancedReview → no daily_calories fallback either
    );
    expect(request.calorieTarget).toBeUndefined();
    expect(request.calorieTarget).not.toBe(1800);
    expect(request.calorieTarget).not.toBe(2200);
    expect(request.calorieTarget).not.toBe(2800);
  });

  // Regression for P1-4: priorPerformance is an accepted field on the request
  // (closed-loop progressive overload). The fetch happens in ai/index.ts, but
  // the request type/schema must accept it. See src/docs/VERIFIED-FINDINGS.md "P1-4".
  it("accepts priorPerformance on the workout request (closed-loop overload)", () => {
    const request = transformForWorkoutRequest(
      personalInfo,
      fitnessGoals,
      { height_cm: 178 } as any,
      { workout_frequency_per_week: 3 } as any,
      { requestWeeklyPlan: true },
    );
    // The field exists and is optional (undefined by default — fetcher fills it)
    expect("priorPerformance" in request || request.priorPerformance === undefined).toBe(true);
    // Attach sample history — must be accepted without throwing
    request.priorPerformance = [
      {
        exerciseId: "bench_press",
        lastSession: {
          completedAt: "2026-06-15T10:00:00Z",
          sets: [{ setNumber: 1, weightKg: 60, reps: 8, rpe: 2 }],
        },
      },
    ];
    expect(request.priorPerformance).toHaveLength(1);
    expect(request.priorPerformance[0].lastSession?.sets[0].weightKg).toBe(60);
  });
});
