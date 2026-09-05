/**
 * Plan burn — Phase A.1 tests.
 */

import { computePlanBurnPerDay } from "../../services/energy/planBurn";
import { EXERCISE_TYPE_MET_OVERRIDES } from "../../services/energy/planBurn";
import type { WeeklyWorkoutPlan } from "../../types/ai";
import type { CardioBlock } from "../../types/workout";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCardioBlock(
  name: string,
  durationMinutes: number,
  intensity: "low" | "moderate" | "high" = "moderate",
): CardioBlock {
  return {
    id: `cardio-${name}-${durationMinutes}`,
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
    title: `${dayOfWeek}`,
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

function makeWeeklyPlan(days: any[]): WeeklyWorkoutPlan {
  return {
    id: "test-plan",
    weekNumber: 1,
    workouts: days,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("energy/planBurn", () => {
  describe("computePlanBurnPerDay — null/empty plan", () => {
    it("returns zeros for null plan", () => {
      const result = computePlanBurnPerDay(null, 90);
      expect(result.perDayKcal).toBe(0);
      expect(result.weeklyKcal).toBe(0);
      expect(result.perDayOfWeek).toEqual([0, 0, 0, 0, 0, 0, 0]);
      expect(result.unresolvedExerciseIds).toEqual([]);
    });

    it("returns zeros for undefined weight", () => {
      const plan = makeWeeklyPlan([makeDayWorkout("monday", [makeCardioBlock("running", 30)])]);
      const result = computePlanBurnPerDay(plan, undefined);
      expect(result.perDayKcal).toBe(0);
    });
  });

  describe("computePlanBurnPerDay — cardio blocks", () => {
    it("computes running burn: MET 9.8 × weight × hours × intensity", () => {
      // 90 kg, 30 min running, moderate intensity (×1.0)
      // 9.8 × 90 × 0.5 × 1.0 = 441
      const plan = makeWeeklyPlan([
        makeDayWorkout("monday", [makeCardioBlock("running", 30, "moderate")]),
      ]);
      const result = computePlanBurnPerDay(plan, 90);
      // Only 1 day → weekly = 441, daily avg = 441/7 ≈ 63
      expect(result.weeklyKcal).toBe(441);
      expect(result.perDayKcal).toBe(Math.round(441 / 7));
      expect(result.perDayOfWeek[0]).toBe(441); // Monday
    });

    it("applies intensity modifier (high = 1.2)", () => {
      // 9.8 × 1.2 × 90 × 0.5 = 529.2 → 529
      const plan = makeWeeklyPlan([
        makeDayWorkout("monday", [makeCardioBlock("running", 30, "high")]),
      ]);
      const result = computePlanBurnPerDay(plan, 90);
      expect(result.perDayOfWeek[0]).toBe(Math.round(9.8 * 1.2 * 90 * 0.5));
    });

    it("resolves different cardio types via EXERCISE_TYPE_MET_OVERRIDES", () => {
      const types: Array<[string, number]> = [
        ["running", 9.8],
        ["cycling", 7.5],
        ["rowing", 7.0],
        ["jump rope", 12.3],
        ["walking", 3.5],
      ];
      for (const [name, met] of types) {
        const plan = makeWeeklyPlan([
          makeDayWorkout("monday", [makeCardioBlock(name, 60, "moderate")]),
        ]);
        const result = computePlanBurnPerDay(plan, 80);
        expect(result.perDayOfWeek[0]).toBe(Math.round(met * 80 * 1.0));
      }
    });

    it("uses default MET 6.0 for unknown cardio names", () => {
      const plan = makeWeeklyPlan([
        makeDayWorkout("monday", [makeCardioBlock("elliptical", 30, "moderate")]),
      ]);
      const result = computePlanBurnPerDay(plan, 90);
      // 6.0 × 1.0 × 90 × 0.5 = 270
      expect(result.perDayOfWeek[0]).toBe(270);
    });

    it("sums multiple cardio blocks per day", () => {
      // 2 × 40-min running at moderate: 2 × (9.8 × 90 × 40/60) = 2 × 588 = 1176
      const plan = makeWeeklyPlan([
        makeDayWorkout("monday", [
          makeCardioBlock("running", 40, "moderate"),
          makeCardioBlock("running", 40, "moderate"),
        ]),
      ]);
      const result = computePlanBurnPerDay(plan, 90);
      expect(result.perDayOfWeek[0]).toBe(1176);
    });

    it("handles 7 days of cardio (the 90 kg / 1.5 kg-wk fixture)", () => {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
      const plan = makeWeeklyPlan(
        days.map((d) =>
          makeDayWorkout(d, [
            makeCardioBlock("running", 40, "moderate"),
            makeCardioBlock("running", 40, "moderate"),
          ]),
        ),
      );
      const result = computePlanBurnPerDay(plan, 90);
      // Per day: 1176, weekly: 8232, daily avg: 1176
      expect(result.perDayKcal).toBe(1176);
      expect(result.weeklyKcal).toBe(8232);
      expect(result.perDayOfWeek.every((v) => v === 1176)).toBe(true);
    });
  });

  describe("computePlanBurnPerDay — rest days", () => {
    it("skips rest days (isRestDay = true)", () => {
      const plan = makeWeeklyPlan([
        makeDayWorkout("monday", [makeCardioBlock("running", 30)]),
        makeDayWorkout("tuesday", [], true), // rest day
      ]);
      const result = computePlanBurnPerDay(plan, 90);
      expect(result.perDayOfWeek[0]).toBe(441);
      expect(result.perDayOfWeek[1]).toBe(0);
    });
  });

  describe("computePlanBurnPerDay — unresolved exercise IDs", () => {
    it("flags exercise IDs that can't be priced", () => {
      const plan = makeWeeklyPlan([
        {
          ...makeDayWorkout("monday"),
          plannedExercises: [
            {
              exerciseId: "unknown_exercise_xyz",
              name: "Mystery Exercise",
              sets: [{ setNumber: 1, reps: 10, setType: "normal" }],
              restSeconds: 60,
            },
          ],
          cardioBlocks: [],
        },
      ]);
      const result = computePlanBurnPerDay(plan, 90);
      expect(result.unresolvedExerciseIds).toContain("unknown_exercise_xyz");
    });

    it("does not flag known cardio exercises (resolved via MET override)", () => {
      const plan = makeWeeklyPlan([
        makeDayWorkout("monday", [makeCardioBlock("running", 30)]),
      ]);
      const result = computePlanBurnPerDay(plan, 90);
      expect(result.unresolvedExerciseIds).toEqual([]);
    });
  });

  describe("EXERCISE_TYPE_MET_OVERRIDES re-export", () => {
    it("contains the expected cardio METs", () => {
      expect(EXERCISE_TYPE_MET_OVERRIDES.running).toBe(9.8);
      expect(EXERCISE_TYPE_MET_OVERRIDES.cycling).toBe(7.5);
      expect(EXERCISE_TYPE_MET_OVERRIDES.rowing).toBe(7.0);
      expect(EXERCISE_TYPE_MET_OVERRIDES["jump rope"]).toBe(12.3);
      expect(EXERCISE_TYPE_MET_OVERRIDES.walking).toBe(3.5);
    });
  });
});
