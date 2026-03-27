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

import { ExerciseHistoryService } from "../../services/exerciseHistoryService";
import { prDetectionService } from "../../services/prDetectionService";

beforeEach(() => {
  mockSupabase = createSupabaseMock();
  jest.clearAllMocks();
});

function generateMockSets(sessionCount: number, setsPerSession: number) {
  const rows: any[] = [];
  const now = new Date();
  for (let s = 0; s < sessionCount; s++) {
    const sessionDate = new Date(now.getTime() - s * 24 * 60 * 60 * 1000);
    const sessionId = `session-${s}`;
    for (let i = 0; i < setsPerSession; i++) {
      rows.push(
        mockExerciseSet({
          id: `es-${s}-${i}`,
          session_id: sessionId,
          exercise_id: "squat",
          set_number: i + 1,
          weight_kg: 80 + s * 0.5,
          reps: 8 + (i % 3),
          is_completed: true,
          completed_at: new Date(
            sessionDate.getTime() + i * 60000,
          ).toISOString(),
        }),
      );
    }
  }
  return rows;
}

describe("Performance: getHistory with 90 sessions", () => {
  it("completes in < 200ms", async () => {
    const mockData = generateMockSets(90, 4);
    const exerciseSetsBuilder = createQueryBuilder({
      data: mockData,
      error: null,
    });
    mockSupabase._tables["exercise_sets"] = exerciseSetsBuilder;

    const service = new ExerciseHistoryService();

    const start = Date.now();
    const result = await service.getHistory("squat", "user-001", 90);
    const elapsed = Date.now() - start;

    expect(result.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(200);
  });
});

describe("Performance: getLastSession with realistic data", () => {
  it("completes in < 500ms", async () => {
    const mockData = generateMockSets(30, 5);
    const exerciseSetsBuilder = createQueryBuilder({
      data: mockData,
      error: null,
    });
    mockSupabase._tables["exercise_sets"] = exerciseSetsBuilder;

    const service = new ExerciseHistoryService();

    const start = Date.now();
    const result = await service.getLastSession("squat", "user-001");
    const elapsed = Date.now() - start;

    expect(result).not.toBeNull();
    expect(elapsed).toBeLessThan(500);
  });
});

describe("Performance: checkForPR", () => {
  it("completes in < 50ms per call (averaged over 100 calls)", () => {
    const currentPRs = { weight: 100, estimated1rm: 130 };
    const newSet = { weightKg: 105, reps: 5 };

    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      prDetectionService.checkForPR("squat", newSet, currentPRs);
    }
    const elapsed = Date.now() - start;

    const perCall = elapsed / 100;
    expect(perCall).toBeLessThan(50);

    const result = prDetectionService.checkForPR("squat", newSet, currentPRs);
    expect(result).not.toBeNull();
    expect(result!.isWeightPR).toBe(true);
  });
});
