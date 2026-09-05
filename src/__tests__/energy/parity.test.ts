/**
 * Parity regression test — Phase A.3
 *
 * Verifies that core.ts (ValidationEngine), master-engine.ts
 * (HealthCalculationEngine), and customDietProjection.ts
 * (projectCustomDietPlan) all agree on TDEE when there is no active
 * workout plan and no workout intent (workoutFrequencyPerWeek = 0).
 *
 * In this configuration:
 *   - core.ts        → goalTdee      = neatTdee + 0 = neatTdee
 *   - master-engine  → goalTdee      = neatTdee + 0 = neatTdee
 *   - customDiet     → effectiveTdee = neatTdee + 0 = neatTdee
 *
 * Also confirms the 90 kg / 1.5 kg-per-week path is NOT blocked by
 * TIMELINE (removed in Phase A.3) — the food floor is the only hard wall.
 */

import { ValidationEngine } from "../../services/validation/core";
import { HealthCalculationEngine } from "../../utils/healthCalculations/master-engine";
import { projectCustomDietPlan } from "../../services/validation/customDietProjection";
import type {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
} from "../../types/onboarding";

// ---------------------------------------------------------------------------
// Fixtures (same pattern as reviewFeasibility.test.ts)
// ---------------------------------------------------------------------------

const basePersonal = (over: Record<string, unknown> = {}) =>
  ({
    full_name: "Test User",
    age: 30,
    gender: "male",
    country: "India",
    state: "MH",
    wake_time: "07:00",
    sleep_time: "23:00",
    ...over,
  }) as unknown as PersonalInfoData;

const baseDiet = (over: Record<string, unknown> = {}) =>
  ({
    diet_type: "balanced",
    breakfast_enabled: true,
    lunch_enabled: true,
    dinner_enabled: true,
    snacks_enabled: true,
    drinks_alcohol: false,
    smokes_tobacco: false,
    allergies: [],
    ...over,
  }) as unknown as DietPreferencesData;

const baseBody = (over: Record<string, unknown> = {}) =>
  ({
    current_weight_kg: 80,
    target_weight_kg: 70,
    height_cm: 175,
    target_timeline_weeks: 14,
    medical_conditions: [],
    medications: [],
    physical_limitations: [],
    pregnancy_status: false,
    breastfeeding_status: false,
    ...over,
  }) as unknown as BodyAnalysisData;

const baseWorkout = (over: Record<string, unknown> = {}) =>
  ({
    workout_frequency_per_week: 0, // zero intent → goalTdee == neatTdee == effectiveTdee
    time_preference: 0,
    intensity: "beginner",
    activity_level: "moderate",
    workout_types: [],
    primary_goals: ["weight-loss"],
    location: "gym",
    equipment: [],
    workout_experience_years: 1,
    can_do_pushups: 10,
    can_run_minutes: 10,
    ...over,
  }) as unknown as WorkoutPreferencesData;

// ---------------------------------------------------------------------------
// Parity: all three engines agree on TDEE (no active plan, no intent)
// ---------------------------------------------------------------------------

describe("Phase A.3: TDEE parity across core.ts, master-engine.ts, and customDietProjection.ts", () => {
  it("all three produce the same TDEE when workoutFrequencyPerWeek = 0 (no plan, no intent)", () => {
    const personal = basePersonal();
    const diet = baseDiet();
    const body = baseBody();
    const workout = baseWorkout();

    // core.ts → ValidationEngine.validateUserPlan
    const coreResult = ValidationEngine.validateUserPlan(personal, diet, body, workout);
    const coreTdee = coreResult.calculatedMetrics.tdee;

    // master-engine.ts → HealthCalculationEngine.calculateAllMetrics
    const engineResult = HealthCalculationEngine.calculateAllMetrics(personal, diet, body, workout);
    const engineTdee = engineResult.calculated_tdee;

    // customDietProjection.ts → projectCustomDietPlan
    const dietResult = projectCustomDietPlan({
      currentWeightKg: body.current_weight_kg,
      heightCm: body.height_cm,
      age: personal.age,
      gender: personal.gender,
      activityLevel: workout.activity_level,
      targetWeightKg: body.target_weight_kg,
      primaryGoals: workout.primary_goals,
      customDailyCalories: 2000, // arbitrary — doesn't affect TDEE
      customDailyMacros: { protein: 150, carbs: 200, fat: 60, fiber: 30 },
    });
    const dietTdee = dietResult.tdee;

    // All three must agree (within rounding: core and engine round, diet does not)
    expect(coreTdee).toBeCloseTo(engineTdee, 0);
    expect(coreTdee).toBeCloseTo(dietTdee, 0);
    expect(engineTdee).toBeCloseTo(dietTdee, 0);
  });

  it("core.ts and master-engine.ts agree on goalTdee even with non-zero workout intent", () => {
    // When workoutFrequencyPerWeek > 0, goalTdee includes intentExerciseBurn
    // while customDietProjection's effectiveTdee does not (it passes 0). So
    // only core.ts and master-engine.ts should agree here — customDiet's
    // TDEE should be LOWER (neatTdee only, no intent burn).
    const personal = basePersonal();
    const diet = baseDiet();
    const body = baseBody();
    const workout = baseWorkout({
      workout_frequency_per_week: 4,
      time_preference: 45,
      workout_types: ["strength", "cardio"],
    });

    const coreResult = ValidationEngine.validateUserPlan(personal, diet, body, workout);
    const coreTdee = coreResult.calculatedMetrics.tdee;

    const engineResult = HealthCalculationEngine.calculateAllMetrics(personal, diet, body, workout);
    const engineTdee = engineResult.calculated_tdee;

    // core.ts and master-engine.ts must agree (both use computeEnergyBreakdown.goalTdee)
    expect(coreTdee).toBeCloseTo(engineTdee, 0);

    // customDietProjection's TDEE should be lower (no intent burn)
    const dietResult = projectCustomDietPlan({
      currentWeightKg: body.current_weight_kg,
      heightCm: body.height_cm,
      age: personal.age,
      gender: personal.gender,
      activityLevel: workout.activity_level,
      targetWeightKg: body.target_weight_kg,
      primaryGoals: workout.primary_goals,
      customDailyCalories: 2000,
      customDailyMacros: { protein: 150, carbs: 200, fat: 60, fiber: 30 },
    });
    expect(dietResult.tdee).toBeLessThan(coreTdee);
  });
});

// ---------------------------------------------------------------------------
// 90 kg / 1.5 kg-per-week: not blocked by TIMELINE (Phase A.3)
// ---------------------------------------------------------------------------

describe("Phase A.3: 90 kg / 1.5 kg-per-week path is not artificially blocked", () => {
  it("a 90 kg user requesting 1.5 kg/wk loss is NOT blocked by TIMELINE", () => {
    // Previously, validateTimeline would block aggressive rates. Phase A.3
    // removed TIMELINE from the blocking set — rate is now an output (band
    // via projectGoal), not a blocker. The food floor (BMR + absolute min)
    // is the only hard wall.
    const personal = basePersonal();
    const diet = baseDiet();
    const body = baseBody({
      current_weight_kg: 90,
      target_weight_kg: 75,
      target_timeline_weeks: 10, // 15 kg in 10 weeks = 1.5 kg/wk
    });
    const workout = baseWorkout({
      weekly_weight_loss_goal: 1.5,
      workout_frequency_per_week: 3,
      time_preference: 45,
      workout_types: ["strength", "cardio"],
    });

    const result = ValidationEngine.validateUserPlan(personal, diet, body, workout);

    // No TIMELINE error in the blocking set
    const timelineError = result.errors.find((e) => e.code === "TIMELINE");
    expect(timelineError).toBeUndefined();

    // The plan should not be blocked solely by rate/timeline.
    // (Other blocks like INSUFFICIENT_EXERCISE may fire, but TIMELINE must not.)
    // Verify canProceed is true or, if blocked, TIMELINE is not among the blockers.
    if (result.hasErrors) {
      const errorCodes = result.errors.map((e) => e.code);
      expect(errorCodes).not.toContain("TIMELINE");
    }
  });
});
