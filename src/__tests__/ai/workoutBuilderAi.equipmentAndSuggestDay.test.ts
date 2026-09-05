/**
 * Regression coverage for two real bugs found via Playwright testing of the
 * Workout Engine v2 builder (2026-09-04):
 *
 * 1. `buildWorkerProfile` sent raw onboarding equipment slugs ("dumbbells",
 *    "resistance-bands", ...) straight to the worker, which only accepts a
 *    different vocabulary ("dumbbell", "resistance band", ...) — every
 *    builder-AI call failed 400 validation for any user with equipment
 *    beyond "barbell". Fixed via `mapEquipment`.
 * 2. `suggestDay` reshaped `currentExercises` into an ad-hoc object with
 *    `sets` as a COUNT (number) instead of the PlannedSet[] array the
 *    worker's PlannedExerciseSchema requires — every suggest-day call also
 *    failed 400 validation independent of bug #1. Fixed by passing
 *    `params.currentExercises` straight through (it already matches
 *    PlannedExerciseSchema field-for-field).
 */

// Mock the worker client BEFORE importing workoutBuilderAi so the real HTTP
// path is never hit. Capture the request to assert its shape.
const mockSuggestDay = jest.fn(async () => ({
  success: true,
  data: { suggestedExercises: [], confidence: 0.8, reasoning: "test" },
}));
jest.mock("../../services/fitaiWorkersClient", () => ({
  fitaiWorkersClient: {
    suggestDay: (...args: unknown[]) => mockSuggestDay(...args),
  },
}));

jest.mock("../../stores/workoutBuilderStore", () => ({
  useWorkoutBuilderStore: {
    getState: jest.fn(() => ({ draft: null, setAiSuggestions: jest.fn() })),
  },
}));

const mockProfileState = {
  personalInfo: { age: 28, gender: "male" as const },
  workoutPreferences: {
    primary_goals: ["muscle_gain"],
    intensity: "intermediate",
    available_equipment: [
      "bodyweight",
      "dumbbells",
      "resistance-bands",
      "kettlebells",
      "pull-up-bar",
      "yoga-mat",
      "treadmill",
      "stationary-bike",
    ],
    time_preference: 45,
    workout_frequency_per_week: 4,
  },
  bodyAnalysis: { current_weight_kg: 80, height_cm: 178 },
};
jest.mock("../../stores/profileStore", () => ({
  useProfileStore: { getState: jest.fn(() => mockProfileState) },
}));

// buildCoachContext (called at the top of suggestDay) reads
// useFitnessStore.getState().getMesocycleWeek?.() for mesocycle context —
// mock it out so the real store (with its supabase/crudOperations/etc.
// dependencies) never loads under test. draft:null on workoutBuilderStore
// above already short-circuits the volumeLandmarkContext half.
jest.mock("../../stores/fitnessStore", () => ({
  useFitnessStore: { getState: jest.fn(() => ({ getMesocycleWeek: () => null })) },
}));

import { mapEquipment, workoutBuilderAi } from "../../ai/workoutBuilderAi";
import type { PlannedExercise } from "../../types/workout";

describe("mapEquipment (Workout Engine v2 equipment enum-boundary fix)", () => {
  it("maps every onboarding slug with a real worker equivalent", () => {
    expect(mapEquipment(["bodyweight"])).toEqual(["body weight"]);
    expect(mapEquipment(["dumbbells"])).toEqual(["dumbbell"]);
    expect(mapEquipment(["resistance-bands"])).toEqual(["resistance band"]);
    expect(mapEquipment(["kettlebells"])).toEqual(["kettlebell"]);
    expect(mapEquipment(["barbell"])).toEqual(["barbell"]);
    expect(mapEquipment(["stationary-bike"])).toEqual(["stationary bike"]);
  });

  it("drops slugs with no worker-schema equivalent rather than mis-mapping them", () => {
    expect(mapEquipment(["pull-up-bar"])).toEqual(["body weight"]);
    expect(mapEquipment(["yoga-mat"])).toEqual(["body weight"]);
    expect(mapEquipment(["treadmill"])).toEqual(["body weight"]);
  });

  it("maps a full realistic equipment set, dropping only the unmapped slugs", () => {
    expect(
      mapEquipment([
        "bodyweight",
        "dumbbells",
        "resistance-bands",
        "kettlebells",
        "pull-up-bar",
        "yoga-mat",
        "treadmill",
        "stationary-bike",
      ]),
    ).toEqual(["body weight", "dumbbell", "resistance band", "kettlebell", "stationary bike"]);
  });

  it("falls back to body weight (never an empty array) when nothing maps", () => {
    expect(mapEquipment(["pull-up-bar", "yoga-mat", "treadmill"])).toEqual(["body weight"]);
    expect(mapEquipment([])).toEqual(["body weight"]);
  });

  it("is case-insensitive on the raw slug", () => {
    expect(mapEquipment(["DUMBBELLS"])).toEqual(["dumbbell"]);
  });
});

describe("suggestDay request shape (Workout Engine v2 sets-as-array fix)", () => {
  beforeEach(() => {
    mockSuggestDay.mockClear();
  });

  it("sends availableEquipment mapped to worker-schema terms and currentExercises with sets as an array", async () => {
    const currentExercises: PlannedExercise[] = [
      {
        exerciseId: "barbell_bench_press",
        name: "Barbell Bench Press",
        sets: [
          { setNumber: 1, reps: 8, setType: "normal" },
          { setNumber: 2, reps: 8, setType: "normal" },
          { setNumber: 3, reps: 6, setType: "normal" },
        ],
        restSeconds: 90,
      },
    ];

    await workoutBuilderAi.suggestDay({
      dayIndex: 0,
      currentExercises,
    });

    expect(mockSuggestDay).toHaveBeenCalledTimes(1);
    const request = mockSuggestDay.mock.calls[0][0] as any;

    // The exact bug: sets used to be `e.sets.length` (a number). It must now
    // be the real PlannedSet[] array, passed straight through.
    expect(Array.isArray(request.currentExercises[0].sets)).toBe(true);
    expect(request.currentExercises[0].sets).toHaveLength(3);
    expect(request.currentExercises).toEqual(currentExercises);

    // The equipment bug: raw slugs must be mapped to worker-schema terms,
    // and unmapped slugs (pull-up-bar/yoga-mat/treadmill) dropped.
    expect(request.profile.availableEquipment).toEqual([
      "body weight",
      "dumbbell",
      "resistance band",
      "kettlebell",
      "stationary bike",
    ]);
  });
});
