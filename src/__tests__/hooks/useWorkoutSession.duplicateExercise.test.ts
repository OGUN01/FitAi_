/**
 * Regression test for a claim from a live-session Playwright testing pass:
 * a day with the SAME exercise added twice ("Overhead Press" at two
 * different positions in workout.exercises) allegedly showed "Set 4 of 3"
 * for BOTH instances independently after all 3 planned sets were logged,
 * requiring a phantom extra save before the app would move on.
 *
 * This test drives useWorkoutSession's real derived progress state (via the
 * REAL fitnessStore.updateSetData action, seeded with the exact per-instance
 * exerciseIndex a genuine caller would pass) with a two-instance-same-
 * exerciseId fixture, sidestepping flaky UI automation entirely.
 */
jest.mock("../../services/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: (r: any) => r({ data: [], error: null }),
    })),
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({ data: { user: { id: "test-user" } }, error: null }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
    channel: jest.fn().mockReturnValue({ on: jest.fn().mockReturnThis(), subscribe: jest.fn() }),
  },
}));
jest.mock("../../services/crudOperations", () => ({
  crudOperations: {
    createWorkoutSession: jest.fn().mockResolvedValue(undefined),
    updateWorkoutSession: jest.fn(),
  },
}));
jest.mock("../../services/DataBridge", () => ({ dataBridge: {} }));
jest.mock("../../services/offline", () => ({
  offlineService: { queueAction: jest.fn(), clearFailedActionsForTable: jest.fn() },
}));
jest.mock("../../services/authUtils", () => ({
  getCurrentUserId: jest.fn(() => "test-user"),
  getUserIdOrGuest: jest.fn(() => "test-user"),
}));
jest.mock("../../stores/profileStore", () => {
  const state = { bodyAnalysis: { current_weight_kg: 70 } };
  const fn = jest.fn(() => state);
  (fn as any).getState = jest.fn(() => state);
  return { useProfileStore: fn };
});
jest.mock("../../services/currentWeight", () => ({
  resolveCurrentWeightFromStores: jest.fn(() => ({ value: 70 })),
}));
jest.mock("../../services/calorieCalculator", () => ({
  calculateWorkoutCalories: jest.fn(() => ({ totalCalories: 200 })),
  ExerciseCalorieInput: {},
}));
jest.mock("../../utils/workoutIdentity", () => ({
  findPlanWorkoutBySessionIdentity: jest.fn(),
  getWorkoutSlotKey: jest.fn(),
}));
jest.mock("../../services/completionTracking", () => ({
  __esModule: true,
  default: { updateWorkoutProgress: jest.fn().mockResolvedValue(undefined) },
}));

import { renderHook, act } from "@testing-library/react-native";
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import { useFitnessStore } from "../../stores/fitnessStore";
import type { DayWorkout } from "../../types/ai";

const DUPLICATE_ID = "overhead_press";

function makeWorkout(): DayWorkout {
  return {
    id: "workout-1",
    exercises: [
      { exerciseId: DUPLICATE_ID, sets: 3, reps: 8, weight: 20, restTime: 60 },
      { exerciseId: DUPLICATE_ID, sets: 3, reps: 8, weight: 20, restTime: 60 },
    ],
  } as unknown as DayWorkout;
}

function seedSession() {
  useFitnessStore.setState({
    currentWorkoutSession: {
      workoutId: "workout-1",
      sessionId: "session-1",
      startedAt: new Date().toISOString(),
      exercises: [
        {
          exerciseId: DUPLICATE_ID,
          completed: false,
          sets: [
            { reps: 0, weight: 0, completed: false },
            { reps: 0, weight: 0, completed: false },
            { reps: 0, weight: 0, completed: false },
          ],
        },
        {
          exerciseId: DUPLICATE_ID,
          completed: false,
          sets: [
            { reps: 0, weight: 0, completed: false },
            { reps: 0, weight: 0, completed: false },
            { reps: 0, weight: 0, completed: false },
          ],
        },
      ],
    } as any,
  });
}

function logSet(exerciseIndex: number, setIndex: number) {
  act(() => {
    useFitnessStore
      .getState()
      .updateSetData(
        DUPLICATE_ID,
        setIndex,
        { weightKg: 20, reps: 8, setType: "normal", completed: true },
        exerciseIndex,
      );
  });
}

describe("useWorkoutSession — duplicate exercise in one day (Set 4 of 3 claim)", () => {
  beforeEach(() => {
    seedSession();
  });

  it("shows exactly 3/3 complete for instance 0 after logging its 3 sets — not 4", () => {
    const workout = makeWorkout();
    const { result } = renderHook(() => useWorkoutSession(workout, "session-1", 0));

    logSet(0, 0);
    logSet(0, 1);
    logSet(0, 2);

    const progress0 = result.current.exerciseProgress[0];
    expect(progress0.completedSets).toEqual([true, true, true]);
    expect(progress0.completedSets.length).toBe(3);
    expect(progress0.isCompleted).toBe(true);

    // Instance 1 must remain completely untouched.
    const progress1 = result.current.exerciseProgress[1];
    expect(progress1.completedSets).toEqual([false, false, false]);
    expect(progress1.isCompleted).toBe(false);
  });

  it("shows exactly 3/3 complete for instance 1 after logging its 3 sets — not 4, and instance 0 stays 3/3", () => {
    const workout = makeWorkout();
    const { result } = renderHook(() => useWorkoutSession(workout, "session-1", 0));

    // Complete instance 0 first (mirrors the real repro: user logs instance
    // 0 fully, then moves to instance 1).
    logSet(0, 0);
    logSet(0, 1);
    logSet(0, 2);

    logSet(1, 0);
    logSet(1, 1);
    logSet(1, 2);

    const progress1 = result.current.exerciseProgress[1];
    expect(progress1.completedSets).toEqual([true, true, true]);
    expect(progress1.completedSets.length).toBe(3);
    expect(progress1.isCompleted).toBe(true);

    const progress0 = result.current.exerciseProgress[0];
    expect(progress0.completedSets).toEqual([true, true, true]);
    expect(progress0.isCompleted).toBe(true);
  });

  it("currentExercise/currentProgress for instance 0 report totalSets=3 with no phantom 4th set", () => {
    const workout = makeWorkout();
    const { result } = renderHook(() => useWorkoutSession(workout, "session-1", 0));

    logSet(0, 0);
    logSet(0, 1);
    logSet(0, 2);

    // currentExerciseIndex defaults to 0 (initialExerciseIndex) — this is
    // exactly what WorkoutSessionScreen.tsx reads for `totalSets` (via
    // session.currentExercise.sets) and `completedSetsCount` (via
    // session.currentProgress.completedSets.filter(Boolean).length).
    expect(result.current.currentExercise.sets).toBe(3);
    expect(result.current.currentProgress.completedSets.filter(Boolean).length).toBe(3);
  });

  it("startExercise on instance 1 (fresh, 0 sets logged) starts at set index 0, not a stale index from instance 0", () => {
    const workout = makeWorkout();
    const { result } = renderHook(() => useWorkoutSession(workout, "session-1", 0));

    // Fully complete instance 0.
    logSet(0, 0);
    logSet(0, 1);
    logSet(0, 2);

    // Move to instance 1 (simulating goToNextExercise) and start it fresh.
    act(() => {
      result.current.goToNextExercise();
    });
    act(() => {
      result.current.startExercise();
    });

    expect(result.current.currentExerciseIndex).toBe(1);
    expect(result.current.currentSetIndex).toBe(0);
    expect(result.current.currentProgress.completedSets).toEqual([false, false, false]);
  });
});
