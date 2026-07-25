/**
 * builderValidationService.test.ts — Phase 11 QA (Part C, deliverable 10).
 *
 * Unit tests for `validatePlan` in
 * `src/services/builderValidationService.ts`.
 *
 * Coverage:
 *   - Empty/null plan → no warnings
 *   - Plan with >6 sets/exercise → excessive_volume warning
 *   - Plan with 4+ compounds → too_many_compounds warning
 *   - Plan missing legs → missing_legs warning (delegated from insights)
 *   - Pregnancy constraint + contraindicated exercise → safety_constraint
 *     warning with a replace_exercise fixAction
 *   - Deduplication by id (balance + volume overlap)
 *
 * Pure function — reads CURATED_EXERCISES (real data). No mocks.
 */
import {
  validatePlan,
  type ValidationProfile,
} from "../../services/builderValidationService";
import type { WeeklyWorkoutPlan, DayWorkout } from "../../types/ai";
import type { PlannedExercise, PlannedSet } from "../../types/workout";

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function makeSet(overrides: Partial<PlannedSet> = {}): PlannedSet {
  return {
    setNumber: overrides.setNumber ?? 1,
    reps: overrides.reps ?? 10,
    weightKg: overrides.weightKg ?? 60,
    setType: overrides.setType ?? "normal",
    dropWeightKg: overrides.dropWeightKg,
    dropReps: overrides.dropReps,
    durationSeconds: overrides.durationSeconds,
  };
}

function makeExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    exerciseId: overrides.exerciseId ?? "barbell_bench_press",
    name: overrides.name ?? "Barbell Bench Press",
    sets: overrides.sets ?? [makeSet({ setNumber: 1 }), makeSet({ setNumber: 2 }), makeSet({ setNumber: 3 })],
    restSeconds: overrides.restSeconds ?? 90,
    notes: overrides.notes,
    tempo: overrides.tempo,
    targetRpe: overrides.targetRpe,
    supersetId: overrides.supersetId,
    circuitId: overrides.circuitId,
    blockIndex: overrides.blockIndex,
    alternativeExerciseId: overrides.alternativeExerciseId,
  };
}

function makeDay(overrides: Partial<DayWorkout> = {}): DayWorkout {
  return {
    id: overrides.id ?? `custom_${overrides.dayOfWeek ?? "monday"}_blank`,
    title: overrides.title ?? "Rest Day",
    description: overrides.description ?? "",
    category: overrides.category ?? "strength",
    difficulty: overrides.difficulty ?? "intermediate",
    duration: overrides.duration ?? 0,
    estimatedCalories: overrides.estimatedCalories ?? 0,
    exercises: overrides.exercises ?? [],
    plannedExercises: overrides.plannedExercises ?? [],
    equipment: overrides.equipment ?? [],
    targetMuscleGroups: overrides.targetMuscleGroups ?? [],
    icon: overrides.icon ?? "barbell-outline",
    tags: overrides.tags ?? [],
    isPersonalized: overrides.isPersonalized ?? true,
    aiGenerated: overrides.aiGenerated ?? false,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    dayOfWeek: overrides.dayOfWeek ?? "monday",
    subCategory: overrides.subCategory ?? "custom",
    intensityLevel: overrides.intensityLevel ?? "rest",
    warmUp: overrides.warmUp ?? [],
    coolDown: overrides.coolDown ?? [],
    progressionNotes: overrides.progressionNotes ?? [],
    safetyConsiderations: overrides.safetyConsiderations ?? [],
    expectedBenefits: overrides.expectedBenefits ?? [],
    isExtra: overrides.isExtra ?? false,
  };
}

function blankWeek(): WeeklyWorkoutPlan {
  return {
    id: "test_week",
    weekNumber: 1,
    workouts: DAYS_OF_WEEK.map((d) => makeDay({ dayOfWeek: d, id: `custom_${d}_blank` })),
    planTitle: "Test Plan",
    planDescription: "",
    restDays: DAYS_OF_WEEK.map((_, i) => i),
    totalEstimatedCalories: 0,
  };
}

function withDay(plan: WeeklyWorkoutPlan, dayIndex: number, exercises: PlannedExercise[]): WeeklyWorkoutPlan {
  const workouts = [...plan.workouts];
  workouts[dayIndex] = makeDay({
    ...workouts[dayIndex],
    dayOfWeek: DAYS_OF_WEEK[dayIndex],
    id: `custom_${DAYS_OF_WEEK[dayIndex]}_test`,
    title: exercises.length > 0 ? "Workout" : "Rest Day",
    plannedExercises: exercises,
    intensityLevel: exercises.length > 0 ? "moderate" : "rest",
  });
  return { ...plan, workouts };
}

// ----------------------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------------------

describe("validatePlan", () => {
  // ── Null / empty ─────────────────────────────────────────────────────────
  describe("null and empty plans", () => {
    it("returns no warnings for a null plan", () => {
      expect(validatePlan(null)).toEqual([]);
    });

    it("returns only balance warnings for a blank (all-rest) week", () => {
      // A blank week has no exercises, so no volume/compound warnings.
      // Missing-legs + insufficient-pull fire from the insights delegation,
      // but those are balance warnings, not overload/compound.
      const warnings = validatePlan(blankWeek());
      const types = warnings.map((w) => w.type);
      expect(types).not.toContain("excessive_volume");
      expect(types).not.toContain("too_many_compounds");
      expect(types).not.toContain("safety_constraint");
      expect(types).not.toContain("recovery_conflict");
    });
  });

  // ── Volume overload ─────────────────────────────────────────────────────────
  describe("excessive volume", () => {
    it("warns when a single exercise has >6 sets in one day", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({
          exerciseId: "barbell_bench_press",
          sets: Array.from({ length: 8 }, (_, i) => makeSet({ setNumber: i + 1 })),
        }),
        // Add a pull exercise so insufficient_pull doesn't fire and clutter the test.
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
        // Add a leg exercise so missing_legs doesn't fire.
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const warnings = validatePlan(plan);
      const overload = warnings.find((w) => w.type === "excessive_volume");
      expect(overload).toBeDefined();
      expect(overload?.exerciseId).toBe("barbell_bench_press");
      expect(overload?.fixAction?.type).toBe("adjust_volume");
    });

    it("does NOT warn when every exercise has ≤6 sets", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const warnings = validatePlan(plan);
      expect(warnings.find((w) => w.type === "excessive_volume")).toBeUndefined();
    });
  });

  // ── Compound clustering ─────────────────────────────────────────────────────
  describe("compound clustering", () => {
    it("warns when a day has 4+ compound lifts", () => {
      // 4 compound exercises: bench, deadlift, overhead_press, barbell_row.
      // (squat would be a 5th, but 4 is the threshold.)
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", name: "Barbell Bench Press" }),
        makeExercise({ exerciseId: "deadlift", name: "Deadlift" }),
        makeExercise({ exerciseId: "overhead_press", name: "Overhead Press" }),
        makeExercise({ exerciseId: "barbell_row", name: "Barbell Row" }),
        // Add a pull exercise (already have row, but add pull_up to ensure pull present)
        makeExercise({ exerciseId: "pull_up", name: "Pull-Up" }),
      ]);
      const warnings = validatePlan(plan);
      const compound = warnings.find((w) => w.type === "too_many_compounds");
      expect(compound).toBeDefined();
      expect(compound?.dayIndex).toBe(0);
    });

    it("does NOT warn when a day has <4 compound lifts", () => {
      // Use isolation-style exercises that don't match compound keywords.
      // push_up is NOT a compound (curated name "Push-Up" — no keyword match).
      // plank is NOT a compound. lat_pulldown is NOT a compound.
      // Only bench + deadlift match keywords → 2 compounds (< 4 threshold).
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", name: "Barbell Bench Press" }),
        makeExercise({ exerciseId: "deadlift", name: "Deadlift" }),
        makeExercise({ exerciseId: "push_up", name: "Push-Up" }),
        makeExercise({ exerciseId: "plank", name: "Plank" }),
      ]);
      const warnings = validatePlan(plan);
      // 2 compounds (bench, deadlift) — under the 4-compound threshold.
      expect(warnings.find((w) => w.type === "too_many_compounds")).toBeUndefined();
    });
  });

  // ── Delegated balance warnings ───────────────────────────────────────────────
  describe("delegated balance warnings", () => {
    it("includes missing_legs when no leg exercises are planned", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const warnings = validatePlan(plan);
      expect(warnings.find((w) => w.type === "missing_legs")).toBeDefined();
    });

    it("includes insufficient_pull when the plan is push-only", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "overhead_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const warnings = validatePlan(plan);
      expect(warnings.find((w) => w.type === "insufficient_pull")).toBeDefined();
    });
  });

  // ── Safety constraints ──────────────────────────────────────────────────────
  describe("safety constraints", () => {
    it("flags a contraindicated exercise when pregnancy is active", () => {
      // burpee is high-impact → flagged during pregnancy.
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "burpee", name: "Burpee", sets: [makeSet(), makeSet(), makeSet()] }),
        // Add pull + leg so only the safety warning is the relevant one.
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const profile: ValidationProfile = {
        pregnancyStatus: true,
        pregnancyTrimester: 1,
      };
      const warnings = validatePlan(plan, { profile });
      const safety = warnings.find((w) => w.type === "safety_constraint");
      expect(safety).toBeDefined();
      expect(safety?.severity).toBe("error");
      expect(safety?.exerciseId).toBe("burpee");
      // The fixAction should be a replace_exercise (a safe alternative exists).
      expect(safety?.fixAction?.type).toBe("replace_exercise");
      expect(safety?.fixAction?.payload).toHaveProperty("suggestedReplacementId");
    });

    it("does NOT flag safe exercises when pregnancy is active", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const profile: ValidationProfile = {
        pregnancyStatus: true,
        pregnancyTrimester: 1,
      };
      const warnings = validatePlan(plan, { profile });
      expect(warnings.find((w) => w.type === "safety_constraint")).toBeUndefined();
    });

    it("skips safety validation entirely when profile is omitted", () => {
      // Same plan with a burpee, but NO profile → no safety warnings.
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "burpee", name: "Burpee", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const warnings = validatePlan(plan);
      expect(warnings.find((w) => w.type === "safety_constraint")).toBeUndefined();
    });

    it("omits profile (null) skips safety validation", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "burpee", name: "Burpee", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const warnings = validatePlan(plan, { profile: null });
      expect(warnings.find((w) => w.type === "safety_constraint")).toBeUndefined();
    });
  });

  // ── Deduplication ─────────────────────────────────────────────────────────
  describe("deduplication", () => {
    it("de-duplicates warnings by id (keeps first occurrence)", () => {
      // Trigger both a balance warning and a volume warning for the same muscle.
      // bench with 8 sets on Monday + bench with 8 sets on Tuesday.
      // The volume overload warning ids include the exerciseId + dayIndex, so
      // they won't collide with balance warnings. Instead, verify that two
      // identical per-muscle overload warnings on different days don't dedupe
      // each other (they have different muscle keys) — and that a balance
      // warning + overload warning with overlapping muscle don't both appear.
      const heavyBench = makeExercise({
        exerciseId: "barbell_bench_press",
        sets: Array.from({ length: 25 }, (_, i) => makeSet({ setNumber: i + 1 })),
      });
      const plan = withDay(withDay(blankWeek(), 0, [
        heavyBench,
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
      ]), 1, [
        heavyBench,
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const warnings = validatePlan(plan);
      // The per-exercise-per-day overload warnings have unique ids (day index
      // differs). The per-muscle weekly overload warning (`excessive_volume_muscle_chest`)
      // appears once even though both days contribute. Verify the muscle-level
      // warning appears exactly once.
      const muscleOverload = warnings.filter(
        (w) => w.id === "excessive_volume_muscle_chest",
      );
      expect(muscleOverload).toHaveLength(1);
    });
  });
});
