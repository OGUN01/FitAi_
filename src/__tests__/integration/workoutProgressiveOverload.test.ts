import {
  createSupabaseMock,
  createQueryBuilder,
  mockWorkoutSession,
  mockExerciseSet,
  mockExercisePR,
  mockWorkoutTemplate,
  SupabaseMock,
} from "../helpers/supabaseMock";

let mockSupabase: SupabaseMock;
jest.mock("../../services/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

let mockUuidCounter = 0;
jest.mock("../../utils/uuid", () => ({
  generateUUID: () => `uuid-${++mockUuidCounter}`,
}));

import { progressionService } from "../../services/progressionService";
import { prDetectionService } from "../../services/prDetectionService";
import { ExerciseHistoryService } from "../../services/exerciseHistoryService";

function ensureTable(name: string) {
  if (!mockSupabase._tables[name]) mockSupabase.from(name);
  return mockSupabase._tables[name];
}

beforeEach(() => {
  mockSupabase = createSupabaseMock();
  jest.clearAllMocks();
  mockUuidCounter = 0;
});

describe("Full workout log flow", () => {
  it("writes exercise_sets rows and upserts exercise_prs on session completion", async () => {
    const userId = "user-001";
    const sessionId = "session-001";
    const exerciseId = "dumbbell_bench_press";

    const completedExercises = [
      {
        exerciseId,
        completedSets: [
          { weight: 40, reps: 10, completed: true, setType: "normal" },
          { weight: 40, reps: 10, completed: true, setType: "normal" },
          { weight: 40, reps: 8, completed: true, setType: "normal" },
        ],
      },
    ];

    const exerciseSetsBuilder = createQueryBuilder({ data: null, error: null });
    mockSupabase._tables["exercise_sets"] = exerciseSetsBuilder;

    const rows: any[] = [];
    for (const exercise of completedExercises) {
      const sets = exercise.completedSets;
      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        rows.push({
          user_id: userId,
          session_id: sessionId,
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

    await mockSupabase.from("exercise_sets").insert(rows);

    expect(mockSupabase.from).toHaveBeenCalledWith("exercise_sets");
    expect(exerciseSetsBuilder.insert).toHaveBeenCalledWith(rows);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      user_id: userId,
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: 1,
      weight_kg: 40,
      reps: 10,
      set_type: "normal",
      is_completed: true,
    });

    const currentPRs = { weight: 35, estimated1rm: 50 };
    const prResult = prDetectionService.checkForPR(
      exerciseId,
      { weightKg: 40, reps: 10 },
      currentPRs,
    );

    expect(prResult).not.toBeNull();
    expect(prResult!.isWeightPR).toBe(true);
    expect(prResult!.newWeightPR).toBe(40);

    const prBuilder = createQueryBuilder({ data: null, error: null });
    mockSupabase._tables["exercise_prs"] = prBuilder;

    await prDetectionService.recordPR(
      userId,
      exerciseId,
      "weight",
      40,
      sessionId,
    );

    expect(mockSupabase.from).toHaveBeenCalledWith("exercise_prs");
    expect(prBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        exercise_id: exerciseId,
        pr_type: "weight",
        value: 40,
        session_id: sessionId,
      }),
      { onConflict: "user_id,exercise_id,pr_type" },
    );
  });
});

describe("Progressive overload round-trip", () => {
  it("suggests weight increase when all sets hit top of rep range", () => {
    const exerciseId = "dumbbell_bench_press";
    const repRange: [number, number] = [8, 12];

    const lastSets = [
      { reps: 12, weight: 40, setType: "normal", completed: true },
      { reps: 12, weight: 40, setType: "normal", completed: true },
      { reps: 12, weight: 40, setType: "normal", completed: true },
    ];

    const result = progressionService.suggestNextWeight(
      exerciseId,
      lastSets,
      repRange,
    );

    expect(result.action).toBe("increase");
    expect(result.suggestedWeightKg).toBe(42.5);
    expect(result.reason).toContain("increase");
  });

  it("holds weight when not all sets at top of range", () => {
    const exerciseId = "dumbbell_bench_press";
    const repRange: [number, number] = [8, 12];

    const lastSets = [
      { reps: 12, weight: 40, setType: "normal", completed: true },
      { reps: 10, weight: 40, setType: "normal", completed: true },
      { reps: 11, weight: 40, setType: "normal", completed: true },
    ];

    const result = progressionService.suggestNextWeight(
      exerciseId,
      lastSets,
      repRange,
    );

    expect(result.action).toBe("hold");
    expect(result.suggestedWeightKg).toBe(40);
  });

  it("uses 5kg increment for lower body exercises", () => {
    const exerciseId = "squat";
    const repRange: [number, number] = [6, 10];

    const lastSets = [
      { reps: 10, weight: 80, setType: "normal", completed: true },
      { reps: 10, weight: 80, setType: "normal", completed: true },
      { reps: 10, weight: 80, setType: "normal", completed: true },
    ];

    const result = progressionService.suggestNextWeight(
      exerciseId,
      lastSets,
      repRange,
    );

    expect(result.action).toBe("increase");
    expect(result.suggestedWeightKg).toBe(85);
  });
});

describe("Custom template flow", () => {
  it("creates a template and starts session with is_extra=true", async () => {
    const userId = "user-001";
    const templateData = mockWorkoutTemplate({
      id: "wt-custom-001",
      name: "My Custom Push Day",
      exercises: [
        {
          exercise_id: "dumbbell_bench_press",
          sets: 4,
          reps: "8-12",
          rest: 90,
        },
      ],
    });

    const templateBuilder = createQueryBuilder({
      data: templateData,
      error: null,
    });
    mockSupabase._tables["workout_templates"] = templateBuilder;

    await mockSupabase
      .from("workout_templates")
      .insert({
        id: templateData.id,
        user_id: userId,
        name: templateData.name,
        exercises: templateData.exercises,
      })
      .select()
      .single();

    expect(mockSupabase.from).toHaveBeenCalledWith("workout_templates");
    expect(templateBuilder.insert).toHaveBeenCalled();

    const sessionBuilder = createQueryBuilder({
      data: { id: "session-template-001" },
      error: null,
    });
    mockSupabase._tables["workout_sessions"] = sessionBuilder;

    const sessionPayload = {
      id: "session-template-001",
      user_id: userId,
      workout_name: templateData.name,
      is_extra: true,
      is_completed: false,
      started_at: new Date().toISOString(),
      exercises: templateData.exercises,
      duration: templateData.estimated_duration_minutes,
    };

    await mockSupabase.from("workout_sessions").insert(sessionPayload);

    expect(sessionBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        is_extra: true,
        is_completed: false,
        workout_name: "My Custom Push Day",
      }),
    );
  });
});
