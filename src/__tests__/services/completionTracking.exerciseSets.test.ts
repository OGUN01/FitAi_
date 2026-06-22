import { createSupabaseMock, type SupabaseMock } from "../helpers/supabaseMock";

let mockSupabase: SupabaseMock;

jest.mock("../../services/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

jest.mock("../../stores/fitnessStore", () => ({
  useFitnessStore: { getState: jest.fn(() => ({})) },
}));
jest.mock("../../stores/nutritionStore", () => ({
  useNutritionStore: { getState: jest.fn(() => ({})) },
}));
jest.mock("../../stores/profileStore", () => {
  const state = {};
  const fn = jest.fn(() => state);
  (fn as any).getState = jest.fn(() => state);
  return { useProfileStore: fn };
});
jest.mock("../../stores/achievementStore", () => ({
  useAchievementStore: { getState: jest.fn(() => ({})) },
}));
jest.mock("../../services/crudOperations", () => ({ default: {} }));
jest.mock("../../services/nutritionRefreshService", () => ({
  nutritionRefreshService: {},
}));
jest.mock("../../services/fitnessRefreshService", () => ({
  fitnessRefreshService: {},
}));
jest.mock("../../services/calorieCalculator", () => ({
  calculateWorkoutCalories: jest.fn(),
}));
jest.mock("../../services/analyticsData", () => ({
  analyticsDataService: {},
}));
jest.mock("../../services/currentWeight", () => ({
  resolveCurrentWeightForUser: jest.fn(),
}));
jest.mock("../../services/WeightTrackingService", () => ({
  weightTrackingService: {},
}));

import { completionTrackingService } from "../../services/completionTracking";

const service = completionTrackingService as any;

describe("_writeExerciseSets", () => {
  beforeEach(() => {
    mockSupabase = createSupabaseMock();
    jest.clearAllMocks();
  });

  it("inserts one row per set when exercises have per-set arrays", async () => {
    const exercises = [
      {
        exerciseId: "push_up",
        sets: [
          { weight: 0, reps: 15, completed: true },
          { weight: 0, reps: 12, completed: true },
          { weight: 0, reps: 10, completed: false },
        ],
      },
    ];

    const esBuilder = mockSupabase._tables["exercise_sets"];
    if (!esBuilder) {
      mockSupabase.from("exercise_sets");
    }
    mockSupabase._tables["exercise_sets"]._resolve({
      data: null,
      error: null,
    });

    await service._writeExerciseSets("user-1", "session-1", exercises);

    const insertCall = mockSupabase._tables["exercise_sets"].insert;
    expect(insertCall).toHaveBeenCalledTimes(1);

    const rows = insertCall.mock.calls[0][0];
    expect(rows).toHaveLength(3);

    expect(rows[0]).toMatchObject({
      user_id: "user-1",
      session_id: "session-1",
      exercise_id: "push_up",
      set_number: 1,
      weight_kg: 0,
      reps: 15,
      set_type: "normal",
      is_completed: true,
    });

    expect(rows[2]).toMatchObject({
      set_number: 3,
      reps: 10,
      is_completed: false,
    });
  });

  it("does NOT fabricate rows when exercises only carry plan-level numeric sets/reps", async () => {
    // P3-18 fix: the flat-exercise fallback that fabricated `sets` rows from
    // plan-level `{ sets: 3, reps: "8-12" }` was intentionally removed — it
    // stored set data the user never actually logged (violating the
    // "no hardcoded fallbacks for user data" principle). Callers must pass an
    // actual per-set `sets[]` array (the store SSOT). With only plan-level
    // data, no rows are written.
    const exercises = [
      {
        exerciseId: "squat",
        sets: 3,
        reps: "8-12",
      },
    ];

    mockSupabase.from("exercise_sets");
    mockSupabase._tables["exercise_sets"]._resolve({
      data: null,
      error: null,
    });

    await service._writeExerciseSets("user-1", "session-1", exercises);

    expect(
      mockSupabase._tables["exercise_sets"].insert,
    ).not.toHaveBeenCalled();
  });

  it("falls back to exercise.id when exerciseId is missing", async () => {
    const exercises = [{ id: "bench_press", sets: [{ reps: 10 }] }];

    mockSupabase.from("exercise_sets");
    mockSupabase._tables["exercise_sets"]._resolve({
      data: null,
      error: null,
    });

    await service._writeExerciseSets("user-1", "session-1", exercises);

    const rows = mockSupabase._tables["exercise_sets"].insert.mock.calls[0][0];
    expect(rows[0].exercise_id).toBe("bench_press");
  });

  it("does not insert when completedExercises is empty", async () => {
    mockSupabase.from("exercise_sets");

    await service._writeExerciseSets("user-1", "session-1", []);

    expect(mockSupabase._tables["exercise_sets"].insert).not.toHaveBeenCalled();
  });

  it("does not throw when exercise_sets insert fails", async () => {
    const exercises = [
      { exerciseId: "plank", sets: [{ duration_seconds: 60 }] },
    ];

    mockSupabase.from("exercise_sets");
    mockSupabase._tables["exercise_sets"]._resolve({
      data: null,
      error: { message: "FK violation", code: "23503" },
    });

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    await expect(
      service._writeExerciseSets("user-1", "session-1", exercises),
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "⚠️ Failed to write exercise_sets — queueing for offline retry:",
      expect.objectContaining({ message: "FK violation" }),
    );

    consoleSpy.mockRestore();
  });

  it("handles weight_kg from set.weight_kg field", async () => {
    const exercises = [
      {
        exerciseId: "deadlift",
        sets: [{ weight_kg: 100, reps: 5, setType: "warmup" }],
      },
    ];

    mockSupabase.from("exercise_sets");
    mockSupabase._tables["exercise_sets"]._resolve({
      data: null,
      error: null,
    });

    await service._writeExerciseSets("user-1", "session-1", exercises);

    const rows = mockSupabase._tables["exercise_sets"].insert.mock.calls[0][0];
    expect(rows[0]).toMatchObject({
      weight_kg: 100,
      reps: 5,
      set_type: "warmup",
    });
  });

  it("handles null/undefined completedExercises gracefully", async () => {
    mockSupabase.from("exercise_sets");

    await service._writeExerciseSets("user-1", "session-1", null as any);

    expect(mockSupabase._tables["exercise_sets"].insert).not.toHaveBeenCalled();
  });

  it("uses completedSets when sets is not an array", async () => {
    const exercises = [
      {
        exerciseId: "curl",
        completedSets: [
          { weight: 15, reps: 12, completed: true },
          { weight: 15, reps: 10, completed: true },
        ],
      },
    ];

    mockSupabase.from("exercise_sets");
    mockSupabase._tables["exercise_sets"]._resolve({
      data: null,
      error: null,
    });

    await service._writeExerciseSets("user-1", "session-1", exercises);

    const rows = mockSupabase._tables["exercise_sets"].insert.mock.calls[0][0];
    expect(rows).toHaveLength(2);
    expect(rows[0].weight_kg).toBe(15);
    expect(rows[1].set_number).toBe(2);
  });
});
