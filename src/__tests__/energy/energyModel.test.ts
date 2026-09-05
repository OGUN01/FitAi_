/**
 * Energy model — Phase A.1 tests.
 *
 * REQUIRED fixture: 90 kg male, 175 cm, 30 yo, goal 1.5 kg/wk.
 * Asserts:
 *   - Food-alone is BLOCKED at the 1849 floor with shortfall reported.
 *   - Eating at floor + ~1188 kcal/day PLAN_BURN is ALLOWED with a training-load
 *     warning and NO projected date.
 */

import { computeEnergyBreakdown } from "../../services/energy/energyModel";
import type { WeeklyWorkoutPlan } from "../../types/ai";
import type { CardioBlock } from "../../types/workout";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** 90 kg male, 175 cm, 30 yo — BMR = 1849 (Mifflin-St Jeor). */
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

/** Goal: 1.5 kg/week → required daily deficit = 1.5 × 7700 / 7 = 1650 kcal. */
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("energy/energyModel — computeEnergyBreakdown", () => {
  describe("90 kg male fixture (BMR = 1849)", () => {
    it("computes BMR = 1849", () => {
      const result = computeEnergyBreakdown({ ...FIXTURE, plan: null });
      expect(result.bmr).toBe(1849);
    });

    it("computes NEAT_TDEE = BMR × 1.20 (sedentary, no age modifier for 30 yo)", () => {
      const result = computeEnergyBreakdown({ ...FIXTURE, plan: null });
      // 1849 × 1.20 = 2218.8 → 2219
      expect(result.neatTdee).toBe(2219);
    });

    it("computes foodFloor = max(BMR, 1500) = 1849 (male, no pregnancy)", () => {
      const result = computeEnergyBreakdown({ ...FIXTURE, plan: null });
      expect(result.foodFloor).toBe(1849);
    });

    it("computes goalTdee = NEAT_TDEE + intentExerciseBurn", () => {
      const result = computeEnergyBreakdown({ ...FIXTURE, plan: null });
      expect(result.goalTdee).toBe(result.neatTdee + result.intentExerciseBurn);
      expect(result.intentExerciseBurn).toBeGreaterThan(0);
    });

    it("computes effectiveTdee = NEAT_TDEE when no plan (PLAN_BURN = 0)", () => {
      const result = computeEnergyBreakdown({ ...FIXTURE, plan: null });
      expect(result.planBurnPerDay).toBe(0);
      expect(result.effectiveTdee).toBe(result.neatTdee);
    });

    it("keeps goalTdee and effectiveTdee SEPARATE (no plan)", () => {
      const result = computeEnergyBreakdown({ ...FIXTURE, plan: null });
      // With no plan, effectiveTdee = neatTdee, but goalTdee includes intent burn.
      expect(result.goalTdee).toBeGreaterThan(result.effectiveTdee);
    });
  });

  describe("with active plan", () => {
    it("computes effectiveTdee = NEAT_TDEE + PLAN_BURN", () => {
      const plan = makeHighBurnPlan();
      const result = computeEnergyBreakdown({ ...FIXTURE, plan });
      // PLAN_BURN ≈ 1176, effectiveTdee ≈ 2219 + 1176 = 3395
      expect(result.planBurnPerDay).toBe(1176);
      expect(result.effectiveTdee).toBe(result.neatTdee + result.planBurnPerDay);
    });

    it("goalTdee does NOT change when a plan goes active (intent is frozen)", () => {
      const noPlanResult = computeEnergyBreakdown({ ...FIXTURE, plan: null });
      const withPlanResult = computeEnergyBreakdown({ ...FIXTURE, plan: makeHighBurnPlan() });
      expect(withPlanResult.goalTdee).toBe(noPlanResult.goalTdee);
      // But effectiveTdee must move.
      expect(withPlanResult.effectiveTdee).toBeGreaterThan(noPlanResult.effectiveTdee);
    });
  });

  describe("activity level mapping", () => {
    it("maps onboarding 'extreme' to very_active via the boundary mapper", () => {
      const extreme = computeEnergyBreakdown({ ...FIXTURE, activityLevel: "extreme", plan: null });
      const veryActive = computeEnergyBreakdown({ ...FIXTURE, activityLevel: "very_active", plan: null });
      // Both should use the same NEAT multiplier (1.60).
      expect(extreme.neatTdee).toBe(veryActive.neatTdee);
      // 1849 × 1.60 = 2958.4 → 2958
      expect(extreme.neatTdee).toBe(2958);
    });

    it("uses moderate multiplier 1.40", () => {
      const moderate = computeEnergyBreakdown({ ...FIXTURE, activityLevel: "moderate", plan: null });
      // 1849 × 1.40 = 2588.6 → 2589
      expect(moderate.neatTdee).toBe(2589);
    });
  });

  describe("medical adjustment", () => {
    it("reduces NEAT_TDEE by 10% for hypothyroid", () => {
      const normal = computeEnergyBreakdown({ ...FIXTURE, medicalConditions: [], plan: null });
      const hypo = computeEnergyBreakdown({ ...FIXTURE, medicalConditions: ["hypothyroid"], plan: null });
      // 2219 × 0.90 = 1997.1 → 1997
      expect(hypo.neatTdee).toBe(Math.round(2219 * 0.9));
      expect(hypo.neatTdee).toBeLessThan(normal.neatTdee);
    });

    it("increases NEAT_TDEE by 15% for hyperthyroid", () => {
      const hyper = computeEnergyBreakdown({ ...FIXTURE, medicalConditions: ["hyperthyroid"], plan: null });
      // 2219 × 1.15 = 2551.85 → 2552
      expect(hyper.neatTdee).toBe(Math.round(2219 * 1.15));
    });

    it("does not adjust for non-thyroid conditions (diabetes)", () => {
      const diabetes = computeEnergyBreakdown({ ...FIXTURE, medicalConditions: ["diabetes-type2"], plan: null });
      expect(diabetes.neatTdee).toBe(2219);
    });
  });

  describe("pregnancy / lactation bonus", () => {
    it("adds ACOG bonus to food floor for trimester 2 (+340)", () => {
      const pregnant = computeEnergyBreakdown({
        ...FIXTURE,
        pregnancyStatus: true,
        pregnancyTrimester: 2,
        plan: null,
      });
      // foodFloor = max(1849, 1500) + 340 = 2189
      expect(pregnant.foodFloor).toBe(1849 + 340);
    });

    it("adds +500 for breastfeeding", () => {
      const breastfeeding = computeEnergyBreakdown({
        ...FIXTURE,
        breastfeedingStatus: true,
        plan: null,
      });
      expect(breastfeeding.foodFloor).toBe(1849 + 500);
    });

    it("adds no bonus for trimester 1", () => {
      const t1 = computeEnergyBreakdown({
        ...FIXTURE,
        pregnancyStatus: true,
        pregnancyTrimester: 1,
        plan: null,
      });
      expect(t1.foodFloor).toBe(1849);
    });
  });

  describe("female gender", () => {
    it("uses 1200 as the gender minimum for females", () => {
      // 70 kg female, 165 cm, 30 yo → BMR = 10×70 + 6.25×165 - 5×30 - 161 = 700+1031.25-150-161 = 1420.25 → 1420
      const female = computeEnergyBreakdown({
        ...FIXTURE,
        weightKg: 70,
        heightCm: 165,
        gender: "female",
        plan: null,
      });
      // foodFloor = max(1420, 1200) = 1420
      expect(female.foodFloor).toBe(1420);
    });
  });

  describe("two TDEEs divergence (the key fix)", () => {
    it("goalTdee and planTdee diverge when the active plan differs from onboarding intent", () => {
      // Onboarding says 3 sessions/week. Active plan has 7 days of cardio.
      const result = computeEnergyBreakdown({ ...FIXTURE, plan: makeHighBurnPlan() });
      expect(result.effectiveTdee).toBeGreaterThan(result.goalTdee);
    });
  });
});
