/**
 * Regression test for a real "Set 4 of 3" bug found via live testing: an
 * exercise needed one extra phantom set logged before the app would
 * recognize it as complete and move on.
 *
 * Root cause: in the real app, `SetLogModal.handleSave` calls
 * `useFitnessStore.getState().updateSetData(...)` (a synchronous, imperative
 * store write) and then, in the SAME synchronous tick (no intervening React
 * render), calls `onSave` -> `WorkoutSessionScreen.handleSaveSetData` ->
 * `session.handleSetComplete(...)`. `handleSetComplete` used to read its
 * completion signal from the hook's own `exerciseProgress` closure — a
 * React-subscribed `useMemo` that can only reflect a store write AFTER
 * React re-renders. Called synchronously right after the write, it was
 * always one set stale: checking whether the set JUST written was already
 * complete BEFORE this call, which is never true for a fresh completion.
 *
 * This test reproduces that exact same-tick sequence (no `act()` boundary
 * between the store write and the `handleSetComplete` call — mirroring the
 * real app's single synchronous call stack) and asserts the fix: reading
 * fresh store state directly instead of the closure means the exercise
 * correctly completes on its OWN last set, not one set later.
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

const EXERCISE_ID = "bench_press";

function makeWorkout(): DayWorkout {
  return {
    id: "workout-1",
    exercises: [{ exerciseId: EXERCISE_ID, sets: 3, reps: 8, weight: 20, restTime: 60 }],
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
          exerciseId: EXERCISE_ID,
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

describe("useWorkoutSession.handleSetComplete — same-tick race with updateSetData (Set 4 of 3)", () => {
  beforeEach(() => {
    seedSession();
  });

  it("fires onAllSetsCompleted on the 3rd (LAST) set, not a phantom 4th, when the store write and the completion check happen in the SAME synchronous tick", async () => {
    const workout = makeWorkout();
    const { result } = renderHook(() => useWorkoutSession(workout, "session-1", 0));

    const onAllSetsCompletedForSet = jest.fn();

    // Mirrors the real app EXACTLY: SetLogModal.handleSave calls
    // updateSetData() synchronously, then (still in the same tick, no
    // intervening act()/render) calls handleSetComplete. We replicate that
    // by NOT wrapping the store write in its own act() — both calls happen
    // inside ONE act(), which is what actually matters: no React flush
    // between them, same as the real single event-handler call stack.
    for (let setIndex = 0; setIndex < 3; setIndex++) {
      const completedFlag = { value: false };
      await act(async () => {
        // Synchronous store write — same as SetLogModal.handleSave line 517.
        useFitnessStore
          .getState()
          .updateSetData(
            EXERCISE_ID,
            setIndex,
            { weightKg: 20, reps: 8, setType: "normal", completed: true },
            0,
          );
        // Synchronously afterward, same tick — same as onSave ->
        // handleSaveSetData -> session.handleSetComplete in the real app.
        await result.current.handleSetComplete(setIndex, undefined, async () => {
          completedFlag.value = true;
          onAllSetsCompletedForSet(setIndex);
        });
      });
      if (setIndex < 2) {
        expect(completedFlag.value).toBe(false);
      } else {
        // This is set index 2 — the 3rd and LAST of 3 sets. The bug: this
        // used to read stale progress (missing this exact write) and
        // require a phantom 4th set before firing. The fix must make THIS
        // exact call see the fresh, just-written data and complete here.
        expect(completedFlag.value).toBe(true);
      }
    }

    // onAllSetsCompleted must have fired EXACTLY once, and for set index 2
    // (the real last set) — not deferred to a non-existent set index 3.
    expect(onAllSetsCompletedForSet).toHaveBeenCalledTimes(1);
    expect(onAllSetsCompletedForSet).toHaveBeenCalledWith(2);
  });
});
