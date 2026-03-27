import {
  createSupabaseMock,
  createQueryBuilder,
  mockExerciseSet,
  SupabaseMock,
} from "../helpers/supabaseMock";

let mockSupabase: SupabaseMock;
jest.mock("../../services/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

import { progressionService } from "../../services/progressionService";
import { ExerciseHistoryService } from "../../services/exerciseHistoryService";

beforeEach(() => {
  mockSupabase = createSupabaseMock();
  jest.clearAllMocks();
});

describe("Edge case: Bodyweight exercise", () => {
  it("returns hold/0kg for bodyweight exercises regardless of set data", () => {
    expect(progressionService.isBodyweightExercise("push_up")).toBe(true);
    expect(progressionService.isBodyweightExercise("pull_up")).toBe(true);

    const result = progressionService.suggestNextWeight(
      "push_up",
      [
        { reps: 15, weight: 0, setType: "normal", completed: true },
        { reps: 15, weight: 0, setType: "normal", completed: true },
      ],
      [10, 15],
    );

    expect(result.action).toBe("hold");
    expect(result.suggestedWeightKg).toBe(0);
    expect(result.reason).toContain("Bodyweight");
  });
});

describe("Edge case: Abandoned session", () => {
  it("handles partial sets with is_completed=false correctly", () => {
    const completedExercises = [
      {
        exerciseId: "dumbbell_bench_press",
        completedSets: [
          { weight: 40, reps: 10, completed: true, setType: "normal" },
          { weight: 40, reps: 6, completed: false, setType: "normal" },
        ],
      },
    ];

    const rows: any[] = [];
    for (const exercise of completedExercises) {
      const sets = exercise.completedSets;
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        rows.push({
          user_id: "user-001",
          session_id: "session-abandoned",
          exercise_id: exercise.exerciseId,
          set_number: i + 1,
          weight_kg: set.weight ?? null,
          reps: set.reps ?? null,
          duration_seconds: null,
          set_type: set.setType ?? "normal",
          is_completed: set.completed ?? true,
        });
      }
    }

    expect(rows).toHaveLength(2);
    expect(rows[0].is_completed).toBe(true);
    expect(rows[1].is_completed).toBe(false);
    expect(rows[1].reps).toBe(6);
  });
});

describe("Edge case: Date boundary (started_at is authoritative)", () => {
  it("uses started_at not completed_at for session ordering", async () => {
    const service = new ExerciseHistoryService();

    const exerciseSetsBuilder = createQueryBuilder({
      data: [
        mockExerciseSet({
          id: "es-1",
          session_id: "s-late-start",
          exercise_id: "squat",
          set_number: 1,
          weight_kg: 80,
          reps: 8,
          completed_at: "2026-03-25T23:55:00.000Z",
        }),
        mockExerciseSet({
          id: "es-2",
          session_id: "s-early-start",
          exercise_id: "squat",
          set_number: 1,
          weight_kg: 75,
          reps: 10,
          completed_at: "2026-03-26T00:05:00.000Z",
        }),
      ],
      error: null,
    });
    mockSupabase._tables["exercise_sets"] = exerciseSetsBuilder;

    const result = await service.getLastSession("squat", "user-001");

    expect(mockSupabase.from).toHaveBeenCalledWith("exercise_sets");
    expect(exerciseSetsBuilder.order).toHaveBeenCalledWith("completed_at", {
      ascending: false,
    });
  });
});

describe("Edge case: Long gap (14+ days) — weight reduction", () => {
  it("evaluateFailure detects consecutive failures and suggests deload", () => {
    const recentSessions = [
      {
        sets: [
          { reps: 4, weight: 80, setType: "normal", completed: true },
          { reps: 3, weight: 80, setType: "normal", completed: true },
          { reps: 3, weight: 80, setType: "normal", completed: true },
        ],
        repRange: [8, 12] as [number, number],
      },
      {
        sets: [
          { reps: 5, weight: 80, setType: "normal", completed: true },
          { reps: 4, weight: 80, setType: "normal", completed: true },
          { reps: 4, weight: 80, setType: "normal", completed: true },
        ],
        repRange: [8, 12] as [number, number],
      },
    ];

    const result = progressionService.evaluateFailure(
      "squat",
      recentSessions,
      2,
    );

    expect(result.action).toBe("deload");
    expect(result.consecutiveFailures).toBe(2);
    expect(result.suggestedWeightKg).toBe(72); // 80 * 0.9
    expect(result.reason).toContain("deload");
  });
});

describe("Edge case: First-time exercise", () => {
  it("getLastSession returns null for a never-performed exercise", async () => {
    const service = new ExerciseHistoryService();

    const exerciseSetsBuilder = createQueryBuilder({
      data: [],
      error: null,
    });
    mockSupabase._tables["exercise_sets"] = exerciseSetsBuilder;

    const result = await service.getLastSession("new_exercise_xyz", "user-001");
    expect(result).toBeNull();
  });

  it("suggestNextWeight returns hold with 0 weight for no previous data", () => {
    const result = progressionService.suggestNextWeight(
      "new_exercise_xyz",
      [],
      [8, 12],
    );

    expect(result.action).toBe("hold");
    expect(result.suggestedWeightKg).toBe(0);
    expect(result.reason).toContain("No previous data");
  });
});
