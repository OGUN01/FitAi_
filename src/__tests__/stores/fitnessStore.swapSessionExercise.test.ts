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
    createWorkoutSession: jest.fn().mockResolvedValue(undefined),
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

describe("fitnessStore.swapSessionExercise (Workout Engine v2 Phase 6C-iii)", () => {
  beforeEach(() => {
    useFitnessStore.setState({
      currentWorkoutSession: {
        workoutId: "workout-1",
        sessionId: "session-1",
        startedAt: "2026-03-26T10:00:00.000Z",
        exercises: [
          {
            exerciseId: "barbell_bench_press",
            completed: false,
            sets: [
              { reps: 0, weight: 0, completed: false },
              { reps: 0, weight: 0, completed: false },
              { reps: 0, weight: 0, completed: false },
            ],
          },
          {
            exerciseId: "barbell_squat",
            completed: false,
            sets: [
              { reps: 8, weight: 100, completed: true },
              { reps: 0, weight: 0, completed: false },
            ],
          },
        ],
      } as any,
    });
  });

  it("swaps exerciseId and reseeds fresh, unlogged sets for the new set count", () => {
    const applied = useFitnessStore
      .getState()
      .swapSessionExercise(0, "dumbbell_bench_press", 4);

    expect(applied).toBe(true);
    const exercises = useFitnessStore.getState().currentWorkoutSession?.exercises;
    expect(exercises?.[0]).toMatchObject({
      exerciseId: "dumbbell_bench_press",
      completed: false,
    });
    expect(exercises?.[0].sets).toHaveLength(4);
    expect(exercises?.[0].sets.every((s) => !s.completed && s.reps === 0 && s.weight === 0)).toBe(
      true,
    );
    // The other exercise instance is untouched.
    expect(exercises?.[1].exerciseId).toBe("barbell_squat");
  });

  it("refuses (no-op) once any set on that instance is already logged", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    const applied = useFitnessStore
      .getState()
      .swapSessionExercise(1, "leg_press", 3);

    expect(applied).toBe(false);
    const exercises = useFitnessStore.getState().currentWorkoutSession?.exercises;
    // Untouched — still the original exercise with its logged set intact.
    expect(exercises?.[1].exerciseId).toBe("barbell_squat");
    expect(exercises?.[1].sets[0]).toMatchObject({ reps: 8, weight: 100, completed: true });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("is a no-op when there is no currentWorkoutSession", () => {
    useFitnessStore.setState({ currentWorkoutSession: undefined as any });

    expect(() =>
      useFitnessStore.getState().swapSessionExercise(0, "new_id", 3),
    ).not.toThrow();
    expect(useFitnessStore.getState().swapSessionExercise(0, "new_id", 3)).toBe(false);
  });

  it("is a no-op when the exerciseIndex is out of range", () => {
    const applied = useFitnessStore.getState().swapSessionExercise(99, "new_id", 3);
    expect(applied).toBe(false);
  });

  it("clamps newSetCount to at least 1", () => {
    useFitnessStore.getState().swapSessionExercise(0, "new_id", 0);
    const exercises = useFitnessStore.getState().currentWorkoutSession?.exercises;
    expect(exercises?.[0].sets).toHaveLength(1);
  });
});
