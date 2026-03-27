import {
  createSupabaseMock,
  mockExerciseSet,
  mockExercisePR,
  SupabaseMock,
} from "../helpers/supabaseMock";

let mockSupabase: SupabaseMock;
jest.mock("../../services/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

import {
  ExerciseHistoryService,
  LastSessionData,
  ExerciseHistoryEntry,
  ExercisePR,
} from "../../services/exerciseHistoryService";

function ensureTable(name: string) {
  if (!mockSupabase._tables[name]) mockSupabase.from(name);
  return mockSupabase._tables[name];
}

describe("ExerciseHistoryService", () => {
  let service: ExerciseHistoryService;

  beforeEach(() => {
    mockSupabase = createSupabaseMock();
    service = new ExerciseHistoryService();
  });

  describe("getLastSession", () => {
    it("returns last session data grouped by session_id", async () => {
      const sessionId = "session-abc";
      const sets = [
        mockExerciseSet({
          session_id: sessionId,
          set_number: 1,
          weight_kg: 60,
          reps: 10,
          set_type: "normal",
          completed_at: "2026-03-25T10:00:00.000Z",
        }),
        mockExerciseSet({
          session_id: sessionId,
          set_number: 2,
          weight_kg: 60,
          reps: 8,
          set_type: "normal",
          completed_at: "2026-03-25T10:02:00.000Z",
        }),
        mockExerciseSet({
          session_id: sessionId,
          set_number: 3,
          weight_kg: 55,
          reps: 10,
          set_type: "failure",
          completed_at: "2026-03-25T10:04:00.000Z",
        }),
      ];

      ensureTable("exercise_sets")._resolve({
        data: sets,
        error: null,
      });

      const result = await service.getLastSession("bench_press", "user-1");

      expect(result).not.toBeNull();
      expect(result!.sessionId).toBe(sessionId);
      expect(result!.sets).toHaveLength(3);
      expect(result!.sets[0]).toEqual({
        setNumber: 1,
        weightKg: 60,
        reps: 10,
        setType: "normal",
      });
      expect(result!.sets[2]).toEqual({
        setNumber: 3,
        weightKg: 55,
        reps: 10,
        setType: "failure",
      });

      // Verify query chain
      expect(mockSupabase.from).toHaveBeenCalledWith("exercise_sets");
      const query = mockSupabase._tables["exercise_sets"];
      expect(query!.select).toHaveBeenCalled();
      expect(query!.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(query!.eq).toHaveBeenCalledWith("exercise_id", "bench_press");
      expect(query!.eq).toHaveBeenCalledWith("is_completed", true);
      expect(query!.order).toHaveBeenCalledWith("completed_at", {
        ascending: false,
      });
    });

    it("returns null when no history exists", async () => {
      ensureTable("exercise_sets")._resolve({
        data: [],
        error: null,
      });

      const result = await service.getLastSession("squat", "user-1");

      expect(result).toBeNull();
    });

    it("returns null when userId is undefined", async () => {
      const result = await service.getLastSession("squat", "");

      expect(result).toBeNull();
      // Should NOT query supabase at all
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it("returns null on supabase error", async () => {
      ensureTable("exercise_sets")._resolve({
        data: null,
        error: { message: "DB error", code: "500" },
      });

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const result = await service.getLastSession("bench_press", "user-1");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("groups by session_id and takes only the latest session", async () => {
      // Return sets from the latest session only (query ordered by completed_at DESC, limited)
      const latestSession = "session-latest";
      const sets = [
        mockExerciseSet({
          session_id: latestSession,
          set_number: 1,
          weight_kg: 70,
          reps: 8,
          completed_at: "2026-03-25T10:00:00.000Z",
        }),
        mockExerciseSet({
          session_id: latestSession,
          set_number: 2,
          weight_kg: 70,
          reps: 6,
          completed_at: "2026-03-25T10:02:00.000Z",
        }),
      ];

      ensureTable("exercise_sets")._resolve({
        data: sets,
        error: null,
      });

      const result = await service.getLastSession("deadlift", "user-1");

      expect(result!.sessionId).toBe(latestSession);
      expect(result!.sets).toHaveLength(2);
    });
  });

  describe("getHistory", () => {
    it("returns history entries grouped by session", async () => {
      const sets = [
        mockExerciseSet({
          session_id: "session-1",
          set_number: 1,
          weight_kg: 60,
          reps: 10,
          completed_at: "2026-03-25T10:00:00.000Z",
        }),
        mockExerciseSet({
          session_id: "session-1",
          set_number: 2,
          weight_kg: 60,
          reps: 8,
          completed_at: "2026-03-25T10:02:00.000Z",
        }),
        mockExerciseSet({
          session_id: "session-2",
          set_number: 1,
          weight_kg: 65,
          reps: 8,
          completed_at: "2026-03-20T10:00:00.000Z",
        }),
      ];

      ensureTable("exercise_sets")._resolve({
        data: sets,
        error: null,
      });

      const result = await service.getHistory("bench_press", "user-1");

      expect(result).toHaveLength(2);
      expect(result[0].sessionId).toBe("session-1");
      expect(result[0].sets).toHaveLength(2);
      expect(result[1].sessionId).toBe("session-2");
      expect(result[1].sets).toHaveLength(1);
    });

    it("returns empty array when no history", async () => {
      ensureTable("exercise_sets")._resolve({
        data: [],
        error: null,
      });

      const result = await service.getHistory("squat", "user-1");

      expect(result).toEqual([]);
    });

    it("returns empty array when userId is empty", async () => {
      const result = await service.getHistory("squat", "");

      expect(result).toEqual([]);
    });

    it("calculates estimated1RM from heaviest set", async () => {
      const sets = [
        mockExerciseSet({
          session_id: "session-1",
          set_number: 1,
          weight_kg: 100,
          reps: 5,
          completed_at: "2026-03-25T10:00:00.000Z",
        }),
      ];

      ensureTable("exercise_sets")._resolve({
        data: sets,
        error: null,
      });

      const result = await service.getHistory("squat", "user-1");

      // estimateOneRepMax uses averaged Brzycki+Epley for 5 reps: ~114.6
      expect(result[0].estimated1RM).toBeCloseTo(114.6, 0);
    });
  });

  describe("getPersonalRecords", () => {
    it("returns PRs for exercise", async () => {
      const prs = [
        mockExercisePR({
          pr_type: "weight",
          value: 100,
          achieved_at: "2026-03-25T10:00:00.000Z",
        }),
        mockExercisePR({
          pr_type: "estimated_1rm",
          value: 120,
          achieved_at: "2026-03-20T10:00:00.000Z",
        }),
      ];

      ensureTable("exercise_prs")._resolve({
        data: prs,
        error: null,
      });

      const result = await service.getPersonalRecords("bench_press", "user-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        prType: "weight",
        value: 100,
        achievedAt: "2026-03-25T10:00:00.000Z",
        sessionId: "ws-test-001",
      });
      expect(result[1]).toEqual({
        prType: "estimated_1rm",
        value: 120,
        achievedAt: "2026-03-20T10:00:00.000Z",
        sessionId: "ws-test-001",
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("exercise_prs");
      const query = mockSupabase._tables["exercise_prs"];
      expect(query!.eq).toHaveBeenCalledWith("user_id", "user-1");
      expect(query!.eq).toHaveBeenCalledWith("exercise_id", "bench_press");
    });

    it("returns empty array when no PRs", async () => {
      ensureTable("exercise_prs")._resolve({ data: [], error: null });

      const result = await service.getPersonalRecords("squat", "user-1");

      expect(result).toEqual([]);
    });

    it("returns empty array when userId is empty", async () => {
      const result = await service.getPersonalRecords("squat", "");

      expect(result).toEqual([]);
    });
  });
});
