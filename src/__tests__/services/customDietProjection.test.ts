/**
 * customDietProjection — regression tests for the custom diet plan goal
 * projection engine (verified plan, Phase 3 / Blocker 3 + 4 fixes).
 *
 * Covers the cases the originally-drafted spec's formula got wrong:
 *   - double-counting exercise (fixed by using tdee - customDailyCalories,
 *     not tdee - workoutBurn on top of an activity-adjusted tdee)
 *   - Math.abs() hiding a wrong-direction plan (fixed by the goal-direction
 *     guard, which suppresses the date rather than showing a confident wrong one)
 *   - zero/near-zero net calories producing Infinity / Invalid Date
 *   - an absurdly long but technically-finite horizon
 */

import { projectCustomDietPlan, type CustomDietProjectionInput } from "../../services/validation/customDietProjection";
import { MetabolicCalculations } from "../../utils/healthCalculations/metabolic";
import { computeEnergyBreakdown } from "../../services/energy/energyModel";

/** Post-double-count-fix TDEE for the diet-only case (no plan, no intent):
 *  NEAT_MULTIPLIERS + age modifier, NOT the old ACTIVITY_MULTIPLIERS that
 *  baked in exercise.  Used by tests that round-trip a deficit through
 *  projectCustomDietPlan so the fed customDailyCalories matches the TDEE
 *  the engine actually computes internally. */
function dietOnlyTdee(opts: {
  weightKg: number; heightCm: number; age: number; gender: string;
  activityLevel: string;
}): number {
  const energy = computeEnergyBreakdown({
    ...opts,
    workoutFrequencyPerWeek: 0,
    timePreference: 0,
    intensity: "",
    workoutTypes: [],
    plan: null,
  });
  return energy.effectiveTdee; // = neatTdee (no plan, no intent)
}

const baseInput = (over: Partial<CustomDietProjectionInput> = {}): CustomDietProjectionInput => ({
  currentWeightKg: 80,
  heightCm: 175,
  age: 30,
  gender: "male",
  activityLevel: "moderate",
  targetWeightKg: 75,
  primaryGoals: ["weight-loss"],
  customDailyCalories: 2000,
  customDailyMacros: { protein: 150, carbs: 200, fat: 60, fiber: 30 },
  ...over,
});

describe("projectCustomDietPlan", () => {
  it("computes a deficit and a losing weekly rate for a calorie-deficit weight-loss plan", () => {
    // Post-double-count-fix: TDEE from computeEnergyBreakdown (NEAT multiplier
    // 1.40 for moderate + age modifier), not ACTIVITY_MULTIPLIERS (1.55).
    const tdee = dietOnlyTdee({ weightKg: 80, heightCm: 175, age: 30, gender: "male", activityLevel: "moderate" });

    const result = projectCustomDietPlan(baseInput({ customDailyCalories: tdee - 500 }));

    expect(result.dailyDeficit).toBeCloseTo(500, 0);
    expect(result.weeklyRateKg).toBeGreaterThan(0); // losing weight
    expect(result.goalDirection).toBe("loss");
    expect(result.projectedDate).not.toBeNull();
    expect(result.projectedDateLabel).toMatch(/^[A-Z][a-z]+ \d{4}$/);
    expect(result.status).not.toBe("BLOCKED");
  });

  it("does NOT double-count exercise — a moderate-activity user's deficit equals tdee - customCalories, not additionally reduced by workout burn", () => {
    // Post-double-count-fix: TDEE from computeEnergyBreakdown (NEAT multiplier
    // 1.40 for moderate + age modifier), not ACTIVITY_MULTIPLIERS (1.55) which
    // baked in planned exercise on top of the activity multiplier.
    const tdeeModerate = dietOnlyTdee({ weightKg: 80, heightCm: 175, age: 30, gender: "male", activityLevel: "moderate" });

    const result = projectCustomDietPlan(
      baseInput({ activityLevel: "moderate", customDailyCalories: tdeeModerate - 500 }),
    );

    // The old (rejected) spec formula was `customCalories - tdee - workoutBurn`,
    // which for an active user would report a deficit hundreds of kcal larger
    // than the true 500. Assert the deficit is exactly what was fed in.
    expect(result.dailyDeficit).toBeCloseTo(500, 0);
  });

  it("flags a goal-direction conflict and suppresses the date for a weight-loss goal with a surplus plan", () => {
    const bmr = MetabolicCalculations.calculateBMR(80, 175, 30, "male");
    const tdee = MetabolicCalculations.calculateTDEE(bmr, "moderate");

    const result = projectCustomDietPlan(
      baseInput({ primaryGoals: ["weight-loss"], customDailyCalories: tdee + 400 }),
    );

    expect(result.weeklyRateKg).toBeLessThan(0); // gaining, not losing
    expect(result.projectedDate).toBeNull();
    expect(result.projectedDateLabel).toBeNull();
    expect(result.weeksToGoal).toBeNull();
    expect(result.warnings.some((w) => w.code === "GOAL_DIRECTION_CONFLICT")).toBe(true);
  });

  it("flags a goal-direction conflict for a weight-gain goal with a deficit plan", () => {
    const bmr = MetabolicCalculations.calculateBMR(60, 165, 25, "female");
    const tdee = MetabolicCalculations.calculateTDEE(bmr, "light");

    const result = projectCustomDietPlan(
      baseInput({
        gender: "female",
        currentWeightKg: 60,
        heightCm: 165,
        age: 25,
        activityLevel: "light",
        targetWeightKg: 65,
        primaryGoals: ["weight-gain"],
        customDailyCalories: tdee - 300,
      }),
    );

    expect(result.weeklyRateKg).toBeGreaterThan(0); // losing, not gaining
    expect(result.projectedDate).toBeNull();
    expect(result.warnings.some((w) => w.code === "GOAL_DIRECTION_CONFLICT")).toBe(true);
  });

  it("suppresses the projection for a near-zero net-calorie plan instead of Infinity/Invalid Date", () => {
    const bmr = MetabolicCalculations.calculateBMR(80, 175, 30, "male");
    const tdee = MetabolicCalculations.calculateTDEE(bmr, "moderate");

    const result = projectCustomDietPlan(baseInput({ customDailyCalories: tdee }));

    expect(result.projectedDate).toBeNull();
    expect(result.projectedDateLabel).toBeNull();
    expect(result.weeksToGoal).toBeNull();
    expect(Number.isNaN(result.weeklyRateKg)).toBe(false);
  });

  it("suppresses the projection when the resulting horizon is absurdly long", () => {
    const bmr = MetabolicCalculations.calculateBMR(80, 175, 30, "male");
    const tdee = MetabolicCalculations.calculateTDEE(bmr, "moderate");

    // A 1kg deficit -> ~0.0009 kg/week -> tens of thousands of weeks to a
    // large weight delta. Must not surface a decades-out date.
    const result = projectCustomDietPlan(
      baseInput({ customDailyCalories: tdee - 1, targetWeightKg: 40, currentWeightKg: 80 }),
    );

    expect(result.projectedDate).toBeNull();
    expect(result.projectedDateLabel).toBeNull();
  });

  it("blocks when custom calories fall below the absolute clinical minimum", () => {
    const result = projectCustomDietPlan(
      baseInput({ gender: "female", customDailyCalories: 1000 }),
    );

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.some((b) => b.code === "BELOW_ABSOLUTE_MINIMUM")).toBe(true);
  });

  it("blocks when custom calories fall below BMR", () => {
    const bmr = MetabolicCalculations.calculateBMR(80, 175, 30, "male");
    const result = projectCustomDietPlan(baseInput({ customDailyCalories: Math.round(bmr - 100) }));

    expect(result.status).toBe("BLOCKED");
    expect(result.blockers.some((b) => b.code === "BELOW_BMR")).toBe(true);
  });

  it("warns when protein or fat fall below the macro floors", () => {
    const result = projectCustomDietPlan(
      baseInput({ customDailyMacros: { protein: 20, carbs: 300, fat: 10, fiber: 10 } }),
    );

    expect(result.warnings.some((w) => w.code === "MACRO_FLOOR")).toBe(true);
  });

  it("treats a maintain goal as OK without forcing a direction conflict or a date", () => {
    const bmr = MetabolicCalculations.calculateBMR(80, 175, 30, "male");
    const tdee = MetabolicCalculations.calculateTDEE(bmr, "moderate");

    const result = projectCustomDietPlan(
      baseInput({ primaryGoals: [], customDailyCalories: tdee - 500 }),
    );

    expect(result.goalDirection).toBe("maintain");
    expect(result.warnings.some((w) => w.code === "GOAL_DIRECTION_CONFLICT")).toBe(false);
    expect(result.projectedDate).toBeNull();
  });
});
