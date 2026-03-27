import { createSupabaseMock, SupabaseMock } from "../helpers/supabaseMock";

let mockSupabase: SupabaseMock;
jest.mock("../../services/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

import { prDetectionService } from "../../services/prDetectionService";
import { estimateOneRepMax } from "../../utils/oneRepMax";

function ensureTable(name: string) {
  if (!mockSupabase._tables[name]) mockSupabase.from(name);
  return mockSupabase._tables[name];
}

describe("PRDetectionService", () => {
  beforeEach(() => {
    mockSupabase = createSupabaseMock();
    jest.clearAllMocks();
  });

  describe("checkForPR", () => {
    it("detects weight PR when weightKg exceeds current weight PR", () => {
      const result = prDetectionService.checkForPR(
        "bench_press",
        { weightKg: 85, reps: 5 },
        { weight: 80, estimated1rm: 200 },
      );

      expect(result).not.toBeNull();
      expect(result!.isWeightPR).toBe(true);
      expect(result!.is1RMPR).toBe(false);
      expect(result!.newWeightPR).toBe(85);
    });

    it("detects estimated 1RM PR when new 1RM exceeds current", () => {
      const new1RM = estimateOneRepMax(80, 5);

      const result = prDetectionService.checkForPR(
        "bench_press",
        { weightKg: 80, reps: 5 },
        { weight: 100, estimated1rm: 50 },
      );

      expect(result).not.toBeNull();
      expect(result!.is1RMPR).toBe(true);
      expect(result!.new1RMPR).toBeCloseTo(new1RM, 2);
      expect(result!.isWeightPR).toBe(false);
    });

    it("detects both PRs simultaneously", () => {
      const result = prDetectionService.checkForPR(
        "bench_press",
        { weightKg: 100, reps: 5 },
        { weight: 80, estimated1rm: 50 },
      );

      expect(result).not.toBeNull();
      expect(result!.isWeightPR).toBe(true);
      expect(result!.is1RMPR).toBe(true);
      expect(result!.newWeightPR).toBe(100);
      expect(result!.new1RMPR).toBeCloseTo(estimateOneRepMax(100, 5), 2);
    });

    it("returns null when no improvement", () => {
      const result = prDetectionService.checkForPR(
        "bench_press",
        { weightKg: 60, reps: 5 },
        { weight: 80, estimated1rm: 200 },
      );

      expect(result).toBeNull();
    });

    it("returns null for bodyweight exercise (weight=0)", () => {
      const result = prDetectionService.checkForPR(
        "push_up",
        { weightKg: 0, reps: 15 },
        { weight: 0, estimated1rm: 0 },
      );

      expect(result).toBeNull();
    });

    it("treats missing currentPRs as 0", () => {
      const result = prDetectionService.checkForPR(
        "bench_press",
        { weightKg: 50, reps: 8 },
        {},
      );

      expect(result).not.toBeNull();
      expect(result!.isWeightPR).toBe(true);
      expect(result!.is1RMPR).toBe(true);
    });
  });

  describe("recordPR", () => {
    it("calls supabase upsert with correct payload", async () => {
      const table = ensureTable("exercise_prs");
      table._resolve({ data: null, error: null });

      await prDetectionService.recordPR(
        "user-1",
        "bench_press",
        "weight",
        85,
        "session-1",
      );

      expect(table.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          exercise_id: "bench_press",
          pr_type: "weight",
          value: 85,
          session_id: "session-1",
        }),
        { onConflict: "user_id,exercise_id,pr_type" },
      );
    });

    it("uses null session_id when not provided", async () => {
      const table = ensureTable("exercise_prs");
      table._resolve({ data: null, error: null });

      await prDetectionService.recordPR(
        "user-1",
        "bench_press",
        "estimated_1rm",
        91.67,
      );

      expect(table.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: null,
        }),
        { onConflict: "user_id,exercise_id,pr_type" },
      );
    });

    it("logs error on supabase failure", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      const table = ensureTable("exercise_prs");
      table._resolve({
        data: null,
        error: { message: "DB error", code: "500" },
      });

      await prDetectionService.recordPR("user-1", "bench_press", "weight", 85);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[PRDetectionService]"),
        expect.anything(),
      );
      consoleSpy.mockRestore();
    });
  });
});
