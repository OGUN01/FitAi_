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
jest.mock("../../stores/profileStore", () => ({
  useProfileStore: { getState: jest.fn(() => ({ bodyAnalysis: {} })) },
}));
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
