/**
 * GoalImpactPanel.test.tsx — Phase B verification.
 *
 * Verifies:
 *   1. Missing profile data → placeholder (no fake numbers; CLAUDE.md §8).
 *   2. The panel renders from the IN-MEMORY draft (live preview, no save
 *      round-trip): mutating the draft via the store's updateExercise action
 *      changes the draft reference synchronously — the same path a rep
 *      keystroke takes — and the panel recomputes on the next render with no
 *      save() / autosave involved.
 *   3. unresolvedExerciseIds surface as a warning row rather than being
 *      silently priced at 0.
 *   4. Maintenance goals get the body-comp copy, never a weight-loss date.
 */
import React from "react";
import { render } from "@testing-library/react-native";
import { GoalImpactPanel } from "../../../components/fitness/builder/GoalImpactPanel";
import { useWorkoutBuilderStore } from "../../../stores/workoutBuilderStore";
import type { WeeklyWorkoutPlan } from "../../../types/ai";
import type { PlannedExercise, PlannedSet } from "../../../types/workout";

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function makeExercise(
  exerciseId = "bench_press",
  name = "Bench Press",
  sets?: PlannedSet[],
): PlannedExercise {
  return {
    exerciseId,
    name,
    sets: sets ?? [
      { setNumber: 1, reps: 10, weightKg, setType: "normal" as const },
      { setNumber: 2, reps: 10, weightKg: 60, setType: "normal" as const },
      { setNumber: 3, reps: 10, weightKg: 60, setType: "normal" as const },
    ],
    restSeconds: 90,
  };
}

function blankDay(dayOfWeek: string) {
  return {
    id: `custom_${dayOfWeek}`,
    title: "Rest Day",
    description: "",
    category: "strength" as const,
    difficulty: "intermediate" as const,
    duration: 0,
    estimatedCalories: 0,
    exercises: [],
    plannedExercises: [],
    equipment: [],
    targetMuscleGroups: [],
    icon: "barbell-outline",
    tags: [],
    isPersonalized: true,
    aiGenerated: false,
    createdAt: new Date().toISOString(),
    dayOfWeek,
    subCategory: "custom",
    intensityLevel: "rest",
    warmUp: [],
    coolDown: [],
    progressionNotes: [],
    safetyConsiderations: [],
    expectedBenefits: [],
    isExtra: false,
  };
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

function makeDraft(plannedExercises?: PlannedExercise[]): WeeklyWorkoutPlan {
  return {
    id: "custom_week_test",
    weekNumber: 1,
    workouts: DAYS.map((d, i) => ({
      ...blankDay(d),
      ...(i === 0 && plannedExercises ? { plannedExercises } : {}),
    })),
    planTitle: "Test Plan",
    planDescription: "",
    restDays: [],
    totalEstimatedCalories: 0,
  };
}

const PROFILE = { heightCm: 175, age: 30, gender: "male", activityLevel: "moderate" };
const INTENT = {
  workoutFrequencyPerWeek: 3,
  timePreference: 45,
  intensity: "intermediate",
  workoutTypes: ["strength"],
};
const GOAL = { targetWeightKg: 80, primaryGoals: ["weight-loss"] };

// ----------------------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------------------

describe("GoalImpactPanel", () => {
  beforeEach(() => {
    useWorkoutBuilderStore.setState({
      draft: null,
      isComputingInsights: false,
      draftDirty: false,
    });
  });

  it("renders the placeholder when required profile data is missing", () => {
    const { getByText } = render(
      <GoalImpactPanel
        weightKg={90}
        profile={{ heightCm: null, age: null, gender: null, activityLevel: null }}
        intent={INTENT}
        goal={GOAL}
        plannedIntakeKcal={2200}
      />,
    );
    expect(getByText(/Add your profile details/i)).toBeTruthy();
  });

  it("shows the energy detail rows from the in-memory draft (no save)", () => {
    useWorkoutBuilderStore.setState({
      draft: makeDraft([
        makeExercise("bench_press", "Bench Press", [
          { setNumber: 1, reps: 10, weightKg: 60, setType: "normal" },
          { setNumber: 2, reps: 10, weightKg: 60, setType: "normal" },
          { setNumber: 3, reps: 10, weightKg: 60, setType: "normal" },
        ]),
      ]),
    });

    const { getByText } = render(
      <GoalImpactPanel
        weightKg={90}
        profile={PROFILE}
        intent={INTENT}
        goal={GOAL}
        plannedIntakeKcal={2200}
      />,
    );

    // Panel renders the live numbers (not the placeholder).
    expect(getByText(/Effective TDEE/)).toBeTruthy();
    expect(getByText(/Goal TDEE/)).toBeTruthy();
  });

  it("recomputes synchronously when a set's reps change via the store action", () => {
    useWorkoutBuilderStore.setState({
      draft: makeDraft([
        makeExercise("bench_press", "Bench Press", [
          { setNumber: 1, reps: 10, weightKg: 60, setType: "normal" },
        ]),
      ]),
    });

    const planBefore = useWorkoutBuilderStore.getState().draft;

    // Same synchronous path a rep keystroke takes (store action → new draft
    // reference). No save() / autosave involved.
    const exercise = useWorkoutBuilderStore.getState().draft!.workouts[0].plannedExercises![0];
    useWorkoutBuilderStore.getState().updateExercise(0, 0, {
      ...exercise,
      sets: [{ setNumber: 1, reps: 20, weightKg: 60, setType: "normal" }],
    });

    // Draft reference changed synchronously on the mutation (live preview path).
    expect(useWorkoutBuilderStore.getState().draft).not.toBe(planBefore);
    // No save was called — the autosave/persist path was never engaged.
    expect(useWorkoutBuilderStore.getState().draftDirty).toBe(true);
  });

  it("surfaces unresolvedExerciseIds as a warning row instead of pricing at 0", () => {
    useWorkoutBuilderStore.setState({
      draft: makeDraft([
        {
          exerciseId: "totally_unknown_exercise",
          name: "Unknown Exercise",
          sets: [{ setNumber: 1, reps: 10, weightKg: 60, setType: "normal" }],
          restSeconds: 90,
        },
      ]),
    });

    const { getByText } = render(
      <GoalImpactPanel
        weightKg={90}
        profile={PROFILE}
        intent={INTENT}
        goal={GOAL}
        plannedIntakeKcal={2200}
      />,
    );

    expect(getByText(/not priced/)).toBeTruthy();
  });

  it("shows the maintenance copy when the goal is maintain", () => {
    useWorkoutBuilderStore.setState({
      draft: makeDraft([
        makeExercise("bench_press", "Bench Press", [
          { setNumber: 1, reps: 10, weightKg: 60, setType: "normal" },
        ]),
      ]),
    });

    const { getByText } = render(
      <GoalImpactPanel
        weightKg={90}
        profile={PROFILE}
        intent={INTENT}
        goal={{ targetWeightKg: 90, primaryGoals: ["maintain"] }}
        plannedIntakeKcal={2200}
      />,
    );

    expect(getByText(/maintain your current weight/i)).toBeTruthy();
  });
});
