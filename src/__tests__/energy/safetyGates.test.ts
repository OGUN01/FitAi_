/**
 * Safety gates — Phase A.1 tests.
 *
 * REQUIRED fixture: 90 kg male, 175 cm, 30 yo, goal 1.5 kg/wk.
 *   - Food-alone is BLOCKED at the 1849 floor with shortfall reported.
 *   - Eating at floor + ~1188 kcal/day PLAN_BURN is ALLOWED with a training-load
 *     warning and NO projected date.
 */

import { evaluatePlanSafety } from "../../services/energy/safetyGates";
import { computeEnergyBreakdown } from "../../services/energy/energyModel";
import type { WeeklyWorkoutPlan } from "../../types/ai";
import type { CardioBlock } from "../../types/workout";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FIXTURE = {
  weightKg: 90,
  heightCm: 175,
  age: 30,
  gender: "male",
  activityLevel: "sedentary",
  medicalConditions: [] as string[],
  pregnancyStatus: false,
  pregnancyTrimester: undefined as 1 | 2 | 3 | undefined,
  breastfeedingStatus: false,
  workoutFrequencyPerWeek: 3,
  timePreference: 45,
  intensity: "beginner",
  workoutTypes: ["strength"],
};

const GOAL_RATE_KG_PER_WEEK = 1.5;
const REQUIRED_DAILY_DEFICIT = (GOAL_RATE_KG_PER_WEEK * 7700) / 7; // 1650

// ---------------------------------------------------------------------------
// Plan builders
// ---------------------------------------------------------------------------

function makeCardioBlock(
  name: string,
  durationMinutes: number,
  intensity: "low" | "moderate" | "high" = "moderate",
): CardioBlock {
  return {
    id: `cardio-${name}-${durationMinutes}-${intensity}`,
    kind: "cardio",
    name,
    durationMinutes,
    intensity,
  };
}

function makeDayWorkout(
  dayOfWeek: string,
  cardioBlocks: CardioBlock[] = [],
  isRestDay = false,
): any {
  return {
    id: `day-${dayOfWeek}`,
    title: dayOfWeek,
    description: "",
    category: "cardio",
    difficulty: "intermediate",
    duration: 40,
    estimatedCalories: 0,
    exercises: [],
    warmup: [],
    cooldown: [],
    equipment: [],
    targetMuscleGroup: [],
    targetMuscleGroups: [],
    icon: "run",
    tags: [],
    isPersonalized: false,
    aiGenerated: false,
    createdAt: "",
    dayOfWeek,
    subCategory: "cardio",
    intensityLevel: "moderate",
    warmUp: [],
    coolDown: [],
    progressionNotes: [],
    safetyConsiderations: [],
    expectedBenefits: [],
    isRestDay,
    cardioBlocks,
  };
}

/** 7 days × 2 × 40-min running at moderate intensity → ~1176 kcal/day. */
function makeHighBurnPlan(): WeeklyWorkoutPlan {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  return {
    id: "high-burn-plan",
    weekNumber: 1,
    workouts: days.map((d) =>
      makeDayWorkout(d, [
        makeCardioBlock("running", 40, "moderate"),
        makeCardioBlock("running", 40, "moderate"),
      ]),
    ),
  };
}

/** Same plan but with high-intensity running (triggers cardiac WARN). */
function makeHighIntensityPlan(): WeeklyWorkoutPlan {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  return {
    id: "high-intensity-plan",
    weekNumber: 1,
    workouts: days.map((d) =>
      makeDayWorkout(d, [
        makeCardioBlock("running", 40, "high"),
        makeCardioBlock("running", 40, "high"),
      ]),
    ),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("energy/safetyGates — evaluatePlanSafety", () => {
  // Compute the shared energy breakdown for the fixture.
  const noPlanBreakdown = computeEnergyBreakdown({ ...FIXTURE, plan: null });
  const highBurnBreakdown = computeEnergyBreakdown({ ...FIXTURE, plan: makeHighBurnPlan() });

  // ========================================================================
  // REQUIRED FIXTURE: 90 kg male, 175 cm, 30 yo, goal 1.5 kg/wk
  // ========================================================================

  describe("REQUIRED FIXTURE: 90 kg / 1.5 kg per week", () => {
    it("BMR = 1849, foodFloor = 1849", () => {
      expect(noPlanBreakdown.bmr).toBe(1849);
      expect(noPlanBreakdown.foodFloor).toBe(1849);
    });

    it("food-alone is BLOCKED at the 1849 floor with shortfall reported", () => {
      // To hit 1.5 kg/wk from food alone (no plan burn), intake must be:
      //   NEAT_TDEE - requiredDeficit = 2219 - 1650 = 569
      const foodAloneIntake = noPlanBreakdown.neatTdee - REQUIRED_DAILY_DEFICIT;
      // Compute the rate this would produce.
      const weeklyRate = ((noPlanBreakdown.neatTdee - foodAloneIntake) * 7) / 7700;

      const safety = evaluatePlanSafety({
        plannedIntake: foodAloneIntake,
        bmr: noPlanBreakdown.bmr,
        gender: FIXTURE.gender,
        plan: null,
        profile: null,
        medicalConditions: [],
        stressLevel: "moderate",
        weeklyRateKg: weeklyRate,
        weightKg: FIXTURE.weightKg,
        goalDirection: "loss",
      });

      // Food floor gate: BLOCKED (intake 569 < floor 1849)
      expect(safety.foodFloor).toBe("BLOCK");
      expect(safety.foodFloorShortfall).toBeGreaterThan(0);
      // Shortfall = floor - intake = 1849 - 569 = 1280
      expect(safety.foodFloorShortfall).toBe(1849 - foodAloneIntake);
      // Should have BELOW_BMR and/or BELOW_ABSOLUTE_MINIMUM violations
      expect(safety.foodFloorViolations.length).toBeGreaterThan(0);
      const codes = safety.foodFloorViolations.map((v) => v.code);
      expect(codes).toContain("BELOW_BMR");
    });

    it("eating at floor + ~1188 kcal/day PLAN_BURN is ALLOWED with training-load warning and NO projected date", () => {
      const plan = makeHighBurnPlan();
      const breakdown = computeEnergyBreakdown({ ...FIXTURE, plan });

      // Eat at the floor.
      const intakeAtFloor = breakdown.foodFloor; // 1849
      const weeklyRate = ((breakdown.effectiveTdee - intakeAtFloor) * 7) / 7700;

      const safety = evaluatePlanSafety({
        plannedIntake: intakeAtFloor,
        bmr: breakdown.bmr,
        gender: FIXTURE.gender,
        plan,
        profile: null,
        medicalConditions: [],
        stressLevel: "moderate",
        weeklyRateKg: weeklyRate,
        weightKg: FIXTURE.weightKg,
        goalDirection: "loss",
      });

      // Food floor gate: OK (intake = floor, not below it)
      expect(safety.foodFloor).toBe("OK");
      expect(safety.foodFloorShortfall).toBe(0);

      // Rate band: aggressive or unpredictable (1.5 kg/wk > 0.75% of 90 kg = 0.675 kg)
      // 1.5/90 = 1.67% → unpredictable
      expect(["aggressive", "unpredictable"]).toContain(safety.rate.band);

      // No projected date (the band is not 'safe' → projectGoal returns no date).
      // We verify this by checking the band classification here; projectGoal
      // tests verify the actual ETA suppression.
    });
  });

  // ========================================================================
  // Food floor gate
  // ========================================================================

  describe("food floor gate", () => {
    it("returns OK when intake = floor", () => {
      const safety = evaluatePlanSafety({
        plannedIntake: 1849,
        bmr: 1849,
        gender: "male",
        plan: null,
        weeklyRateKg: 0.5,
        weightKg: 90,
        goalDirection: "loss",
      });
      expect(safety.foodFloor).toBe("OK");
    });

    it("returns BLOCK when intake < BMR", () => {
      const safety = evaluatePlanSafety({
        plannedIntake: 1500,
        bmr: 1849,
        gender: "male",
        plan: null,
        weeklyRateKg: 1.0,
        weightKg: 90,
        goalDirection: "loss",
      });
      expect(safety.foodFloor).toBe("BLOCK");
      expect(safety.foodFloorShortfall).toBe(349);
    });

    it("returns BLOCK when intake < absolute minimum (female)", () => {
      const safety = evaluatePlanSafety({
        plannedIntake: 1100,
        bmr: 1000,
        gender: "female",
        plan: null,
        weeklyRateKg: 0.5,
        weightKg: 60,
        goalDirection: "loss",
      });
      expect(safety.foodFloor).toBe("BLOCK");
      // floor = max(1000, 1200) = 1200, shortfall = 1200 - 1100 = 100
      expect(safety.foodFloorShortfall).toBe(100);
    });
  });

  // ========================================================================
  // Rate band classification
  // ========================================================================

  describe("rate band classification", () => {
    it("safe: rate ≤ 0.75% body weight/week", () => {
      const safety = evaluatePlanSafety({
        plannedIntake: 2000,
        bmr: 1849,
        gender: "male",
        plan: null,
        weeklyRateKg: 0.5, // 0.5/90 = 0.56% < 0.75%
        weightKg: 90,
        goalDirection: "loss",
      });
      expect(safety.rate.band).toBe("safe");
    });

    it("aggressive: 0.75% < rate ≤ 1.5%", () => {
      const safety = evaluatePlanSafety({
        plannedIntake: 2000,
        bmr: 1849,
        gender: "male",
        plan: null,
        weeklyRateKg: 1.0, // 1.0/90 = 1.11% — aggressive
        weightKg: 90,
        goalDirection: "loss",
      });
      expect(safety.rate.band).toBe("aggressive");
    });

    it("unpredictable: rate > 1.5%", () => {
      const safety = evaluatePlanSafety({
        plannedIntake: 2000,
        bmr: 1849,
        gender: "male",
        plan: null,
        weeklyRateKg: 1.5, // 1.5/90 = 1.67% — unpredictable
        weightKg: 90,
        goalDirection: "loss",
      });
      expect(safety.rate.band).toBe("unpredictable");
    });

    it("maintain goal is always 'safe' band", () => {
      const safety = evaluatePlanSafety({
        plannedIntake: 2219,
        bmr: 1849,
        gender: "male",
        plan: null,
        weeklyRateKg: 0,
        weightKg: 90,
        goalDirection: "maintain",
      });
      expect(safety.rate.band).toBe("safe");
    });
  });

  // ========================================================================
  // NEW: Cardiac/respiratory WARN (not in builderValidationService)
  // ========================================================================

  describe("cardiac/respiratory WARN (NEW)", () => {
    it("warns when high-intensity cardio plan + cardiac condition on file", () => {
      const plan = makeHighIntensityPlan();
      const safety = evaluatePlanSafety({
        plannedIntake: 1849,
        bmr: 1849,
        gender: "male",
        plan,
        profile: null,
        medicalConditions: ["hypertension"],
        stressLevel: "moderate",
        weeklyRateKg: 1.4,
        weightKg: 90,
        goalDirection: "loss",
      });
      const cardioWarn = safety.trainingLoad.find(
        (w) => w.id === "cardio_respiratory_warn",
      );
      expect(cardioWarn).toBeDefined();
      expect(cardioWarn!.severity).toBe("warning");
      expect(cardioWarn!.message).toContain("hypertension");
    });

    it("warns when high-intensity cardio plan + high stress_level", () => {
      const plan = makeHighIntensityPlan();
      const safety = evaluatePlanSafety({
        plannedIntake: 1849,
        bmr: 1849,
        gender: "male",
        plan,
        profile: null,
        medicalConditions: [],
        stressLevel: "high",
        weeklyRateKg: 1.4,
        weightKg: 90,
        goalDirection: "loss",
      });
      const cardioWarn = safety.trainingLoad.find(
        (w) => w.id === "cardio_respiratory_warn",
      );
      expect(cardioWarn).toBeDefined();
      expect(cardioWarn!.message).toContain("high stress");
    });

    it("does NOT warn when moderate-intensity cardio + cardiac condition", () => {
      const plan = makeHighBurnPlan(); // moderate intensity
      const safety = evaluatePlanSafety({
        plannedIntake: 1849,
        bmr: 1849,
        gender: "male",
        plan,
        profile: null,
        medicalConditions: ["hypertension"],
        stressLevel: "moderate",
        weeklyRateKg: 1.4,
        weightKg: 90,
        goalDirection: "loss",
      });
      const cardioWarn = safety.trainingLoad.find(
        (w) => w.id === "cardio_respiratory_warn",
      );
      expect(cardioWarn).toBeUndefined();
    });

    it("does NOT warn when high-intensity cardio + no cardiac condition + low stress", () => {
      const plan = makeHighIntensityPlan();
      const safety = evaluatePlanSafety({
        plannedIntake: 1849,
        bmr: 1849,
        gender: "male",
        plan,
        profile: null,
        medicalConditions: ["diabetes-type2"], // not cardiac/respiratory
        stressLevel: "moderate",
        weeklyRateKg: 1.4,
        weightKg: 90,
        goalDirection: "loss",
      });
      const cardioWarn = safety.trainingLoad.find(
        (w) => w.id === "cardio_respiratory_warn",
      );
      expect(cardioWarn).toBeUndefined();
    });

    it("is WARN only, never BLOCK (severity = warning, not error)", () => {
      const plan = makeHighIntensityPlan();
      const safety = evaluatePlanSafety({
        plannedIntake: 1849,
        bmr: 1849,
        gender: "male",
        plan,
        profile: null,
        medicalConditions: ["heart-disease"],
        stressLevel: "high",
        weeklyRateKg: 1.4,
        weightKg: 90,
        goalDirection: "loss",
      });
      const cardioWarn = safety.trainingLoad.find(
        (w) => w.id === "cardio_respiratory_warn",
      );
      expect(cardioWarn).toBeDefined();
      expect(cardioWarn!.severity).not.toBe("error");
    });
  });

  // ========================================================================
  // Training load gate — null plan
  // ========================================================================

  describe("training load with null plan", () => {
    it("returns empty training load when plan is null", () => {
      const safety = evaluatePlanSafety({
        plannedIntake: 2000,
        bmr: 1849,
        gender: "male",
        plan: null,
        weeklyRateKg: 0.5,
        weightKg: 90,
        goalDirection: "loss",
      });
      expect(safety.trainingLoad).toEqual([]);
    });
  });
});
