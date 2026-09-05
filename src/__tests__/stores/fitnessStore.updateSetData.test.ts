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
        .mockResolvedValue({
          data: { user: { id: "test-user" } },
          error: null,
        }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
    },
    channel: jest
      .fn()
      .mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      }),
  },
}));
jest.mock("../../services/crudOperations", () => ({
  crudOperations: {
    createWorkoutSession: jest.fn(),
    updateWorkoutSession: jest.fn(),
  },
}));
jest.mock("../../services/DataBridge", () => ({ dataBridge: {} }));
jest.mock("../../services/offline", () => ({
  offlineService: {
    queueAction: jest.fn(),
    clearFailedActionsForTable: jest.fn(),
  },
}));
jest.mock("../../services/authUtils", () => ({
  getCurrentUserId: jest.fn(() => "test-user"),
  getUserIdOrGuest: jest.fn(() => "test-user"),
}));
jest.mock("../../stores/profileStore", () => {
  const state = { bodyAnalysis: {} };
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

import { useFitnessStore } from "../../stores/fitnessStore";

describe("fitnessStore.updateSetData", () => {
  beforeEach(() => {
    useFitnessStore.setState({
      currentWorkoutSession: {
        workoutId: "workout-1",
        sessionId: "session-1",
        startedAt: "2026-03-26T10:00:00.000Z",
        exercises: [
          {
            exerciseId: "bench_press",
            completed: false,
            sets: [
              { reps: 0, weight: 0, completed: false },
              { reps: 0, weight: 0, completed: false },
              { reps: 0, weight: 0, completed: false },
            ],
          },
          {
            exerciseId: "squat",
            completed: false,
            sets: [{ reps: 0, weight: 0, completed: false }],
          },
        ],
      },
    });
  });

  afterEach(() => {
    useFitnessStore.getState().reset();
  });

  it("updates set data for a specific exercise and set index", () => {
    useFitnessStore.getState().updateSetData("bench_press", 0, {
      weightKg: 60,
      reps: 10,
      setType: "normal",
      completed: true,
    });

    const session = useFitnessStore.getState().currentWorkoutSession!;
    const benchSets = session.exercises.find(
      (e) => e.exerciseId === "bench_press",
    )!.sets;

    expect(benchSets[0]).toEqual(
      expect.objectContaining({ weight: 60, reps: 10, completed: true }),
    );
    expect((benchSets[0] as any).setType).toBe("normal");
  });

  it("preserves other sets when updating one", () => {
    useFitnessStore.getState().updateSetData("bench_press", 1, {
      weightKg: 55,
      reps: 8,
      setType: "failure",
      completed: true,
    });

    const session = useFitnessStore.getState().currentWorkoutSession!;
    const benchSets = session.exercises.find(
      (e) => e.exerciseId === "bench_press",
    )!.sets;

    expect(benchSets[0].completed).toBe(false);
    expect(benchSets[1].weight).toBe(55);
    expect(benchSets[2].completed).toBe(false);
  });

  it("persists across multiple calls", () => {
    const store = useFitnessStore.getState();

    store.updateSetData("bench_press", 0, {
      weightKg: 60,
      reps: 10,
      setType: "normal",
      completed: true,
    });
    store.updateSetData("bench_press", 1, {
      weightKg: 60,
      reps: 8,
      setType: "normal",
      completed: true,
    });
    store.updateSetData("squat", 0, {
      weightKg: 100,
      reps: 5,
      setType: "warmup",
      completed: true,
    });

    const session = useFitnessStore.getState().currentWorkoutSession!;
    const benchSets = session.exercises.find(
      (e) => e.exerciseId === "bench_press",
    )!.sets;
    const squatSets = session.exercises.find(
      (e) => e.exerciseId === "squat",
    )!.sets;

    expect(benchSets[0].reps).toBe(10);
    expect(benchSets[1].reps).toBe(8);
    expect(squatSets[0].weight).toBe(100);
  });

  it("does nothing when no active session", () => {
    useFitnessStore.setState({ currentWorkoutSession: null });

    useFitnessStore.getState().updateSetData("bench_press", 0, {
      weightKg: 60,
      reps: 10,
      setType: "normal",
      completed: true,
    });

    expect(useFitnessStore.getState().currentWorkoutSession).toBeNull();
  });

  it("marks exercise completed when all sets completed", () => {
    const store = useFitnessStore.getState();

    store.updateSetData("squat", 0, {
      weightKg: 100,
      reps: 5,
      setType: "normal",
      completed: true,
    });

    const session = useFitnessStore.getState().currentWorkoutSession!;
    const squat = session.exercises.find((e) => e.exerciseId === "squat")!;

    expect(squat.completed).toBe(true);
  });

  describe("duplicate exerciseId in one day (e.g. a circuit round)", () => {
    beforeEach(() => {
      // Same exerciseId appears twice — this is the exact scenario that
      // previously collided: updateSetData matched by exerciseId via .map(),
      // so writing to ONE occurrence silently overwrote BOTH.
      useFitnessStore.setState({
        currentWorkoutSession: {
          workoutId: "workout-1",
          sessionId: "session-1",
          startedAt: "2026-03-26T10:00:00.000Z",
          exercises: [
            {
              exerciseId: "push_up",
              completed: false,
              sets: [{ reps: 0, weight: 0, completed: false }],
            },
            {
              exerciseId: "squat",
              completed: false,
              sets: [{ reps: 0, weight: 0, completed: false }],
            },
            {
              exerciseId: "push_up", // duplicate — second circuit round
              completed: false,
              sets: [{ reps: 0, weight: 0, completed: false }],
            },
          ],
        },
      });
    });

    it("BUG (pre-fix behavior, no exerciseIndex given): writing to one duplicate updates ALL matches", () => {
      // Documents the old collision so the fix below is provably an
      // improvement, not just untested — omitting exerciseIndex falls back
      // to the original exerciseId-match behavior on purpose.
      useFitnessStore.getState().updateSetData("push_up", 0, {
        weightKg: 20,
        reps: 15,
        setType: "normal",
        completed: true,
      });

      const session = useFitnessStore.getState().currentWorkoutSession!;
      const pushUpEntries = session.exercises.filter((e) => e.exerciseId === "push_up");
      expect(pushUpEntries).toHaveLength(2);
      // Both occurrences got the same write — the bug.
      expect(pushUpEntries[0].sets[0].weight).toBe(20);
      expect(pushUpEntries[1].sets[0].weight).toBe(20);
    });

    it("FIX: passing exerciseIndex targets only that occurrence, leaving the other duplicate untouched", () => {
      useFitnessStore.getState().updateSetData(
        "push_up",
        0,
        { weightKg: 20, reps: 15, setType: "normal", completed: true },
        0, // first push_up occurrence (array index 0)
      );
      useFitnessStore.getState().updateSetData(
        "push_up",
        0,
        { weightKg: 25, reps: 12, setType: "normal", completed: true },
        2, // second push_up occurrence (array index 2)
      );

      const session = useFitnessStore.getState().currentWorkoutSession!;
      expect(session.exercises[0].exerciseId).toBe("push_up");
      expect(session.exercises[0].sets[0]).toEqual(
        expect.objectContaining({ weight: 20, reps: 15 }),
      );
      expect(session.exercises[2].exerciseId).toBe("push_up");
      expect(session.exercises[2].sets[0]).toEqual(
        expect.objectContaining({ weight: 25, reps: 12 }),
      );
      // The non-duplicate exercise in between is unaffected.
      expect(session.exercises[1].sets[0].completed).toBe(false);
    });

    it("FIX: an out-of-range exerciseIndex falls back to exerciseId-match rather than silently no-op'ing", () => {
      useFitnessStore.getState().updateSetData(
        "squat",
        0,
        { weightKg: 100, reps: 5, setType: "normal", completed: true },
        99, // invalid index
      );
      const session = useFitnessStore.getState().currentWorkoutSession!;
      const squat = session.exercises.find((e) => e.exerciseId === "squat")!;
      expect(squat.sets[0].weight).toBe(100);
    });
  });

  it("clears on session end", async () => {
    useFitnessStore.getState().updateSetData("bench_press", 0, {
      weightKg: 60,
      reps: 10,
      setType: "normal",
      completed: true,
    });

    expect(useFitnessStore.getState().currentWorkoutSession).not.toBeNull();

    try {
      await useFitnessStore.getState().endWorkoutSession("session-1");
    } catch {
      // Expected: mocked crudOperations may throw
    }

    expect(useFitnessStore.getState().currentWorkoutSession).toBeNull();
  });
});
