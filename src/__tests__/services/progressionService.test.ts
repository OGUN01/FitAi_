import { progressionService } from "../../services/progressionService";
import type { LastSet } from "../../services/progressionService";

function makeSets(count: number, reps: number, weight: number): LastSet[] {
  return Array.from({ length: count }, () => ({
    reps,
    weight,
    setType: "normal",
    completed: true,
  }));
}

describe("progressionService", () => {
  describe("suggestNextWeight", () => {
    it("increases upper body weight by 2.5kg when all sets at top of range", () => {
      const sets = makeSets(3, 12, 60);
      const result = progressionService.suggestNextWeight(
        "bench_press",
        sets,
        [8, 12],
        false,
        false,
      );
      expect(result.action).toBe("increase");
      expect(result.suggestedWeightKg).toBe(62.5);
    });

    it("increases lower body weight by 5kg when all sets at top of range", () => {
      const sets = makeSets(3, 12, 100);
      const result = progressionService.suggestNextWeight(
        "squat",
        sets,
        [8, 12],
        false,
        true,
      );
      expect(result.action).toBe("increase");
      expect(result.suggestedWeightKg).toBe(105);
    });

    it("holds when not all reps at top of range", () => {
      const sets: LastSet[] = [
        { reps: 10, weight: 60, setType: "normal", completed: true },
        { reps: 11, weight: 60, setType: "normal", completed: true },
        { reps: 12, weight: 60, setType: "normal", completed: true },
      ];
      const result = progressionService.suggestNextWeight(
        "bench_press",
        sets,
        [8, 12],
        false,
        false,
      );
      expect(result.action).toBe("hold");
      expect(result.suggestedWeightKg).toBe(60);
    });

    it("holds when sets not completed", () => {
      const sets: LastSet[] = [
        { reps: 12, weight: 60, setType: "normal", completed: true },
        { reps: 12, weight: 60, setType: "normal", completed: false },
        { reps: 12, weight: 60, setType: "normal", completed: true },
      ];
      const result = progressionService.suggestNextWeight(
        "bench_press",
        sets,
        [8, 12],
        false,
        false,
      );
      expect(result.action).toBe("hold");
      expect(result.suggestedWeightKg).toBe(60);
    });

    it("returns hold with reason when lastSets is empty", () => {
      const result = progressionService.suggestNextWeight(
        "bench_press",
        [],
        [8, 12],
        false,
        false,
      );
      expect(result.action).toBe("hold");
      expect(result.suggestedWeightKg).toBe(0);
      expect(result.reason.toLowerCase()).toContain("no previous data");
    });

    it("holds for bodyweight exercises (rep progression only)", () => {
      const sets = makeSets(3, 12, 0);
      const result = progressionService.suggestNextWeight(
        "push_up",
        sets,
        [8, 12],
        true,
        false,
      );
      expect(result.action).toBe("hold");
      expect(result.suggestedWeightKg).toBe(0);
    });

    it("holds for time-based exercises", () => {
      const sets = makeSets(3, 60, 0);
      const result = progressionService.suggestNextWeight(
        "plank",
        sets,
        [30, 60],
        false,
        false,
      );
      expect(result.action).toBe("hold");
    });

    it("auto-detects lower body from exerciseId when isMuscleGroupLower not passed", () => {
      const sets = makeSets(3, 12, 100);
      const result = progressionService.suggestNextWeight(
        "squat",
        sets,
        [8, 12],
      );
      expect(result.action).toBe("increase");
      expect(result.suggestedWeightKg).toBe(105);
    });
  });

  describe("isBodyweightExercise", () => {
    it("returns true for bodyweight exercises", () => {
      expect(progressionService.isBodyweightExercise("push_up")).toBe(true);
      expect(progressionService.isBodyweightExercise("pull_up")).toBe(true);
      expect(progressionService.isBodyweightExercise("plank")).toBe(true);
      expect(progressionService.isBodyweightExercise("burpee")).toBe(true);
    });

    it("returns false for weighted exercises", () => {
      expect(progressionService.isBodyweightExercise("bench_press")).toBe(
        false,
      );
      expect(progressionService.isBodyweightExercise("squat")).toBe(false);
      expect(progressionService.isBodyweightExercise("deadlift")).toBe(false);
    });
  });

  describe("isTimeBased", () => {
    it("returns true for holds/timed exercises", () => {
      expect(progressionService.isTimeBased("plank")).toBe(true);
      expect(progressionService.isTimeBased("wall_sit")).toBe(true);
      expect(progressionService.isTimeBased("hollow_body")).toBe(true);
      expect(progressionService.isTimeBased("superman")).toBe(true);
    });

    it("returns false for rep-based exercises", () => {
      expect(progressionService.isTimeBased("bench_press")).toBe(false);
      expect(progressionService.isTimeBased("push_up")).toBe(false);
      expect(progressionService.isTimeBased("squat")).toBe(false);
    });
  });

  describe("getMuscleGroup", () => {
    it("returns lower for lower body exercises", () => {
      expect(progressionService.getMuscleGroup("squat")).toBe("lower");
      expect(progressionService.getMuscleGroup("deadlift")).toBe("lower");
      expect(progressionService.getMuscleGroup("leg_press")).toBe("lower");
      expect(progressionService.getMuscleGroup("hip_thrust")).toBe("lower");
      expect(progressionService.getMuscleGroup("bodyweight_squat")).toBe(
        "lower",
      );
    });

    it("returns core for core exercises", () => {
      expect(progressionService.getMuscleGroup("plank")).toBe("core");
      expect(progressionService.getMuscleGroup("crunch")).toBe("core");
      expect(progressionService.getMuscleGroup("russian_twist")).toBe("core");
      expect(progressionService.getMuscleGroup("leg_raise")).toBe("core");
    });

    it("returns upper for everything else", () => {
      expect(progressionService.getMuscleGroup("bench_press")).toBe("upper");
      expect(progressionService.getMuscleGroup("overhead_press")).toBe("upper");
      expect(progressionService.getMuscleGroup("bicep_curl")).toBe("upper");
    });
  });

  describe("evaluateFailure", () => {
    it("returns none when 0 failures", () => {
      const sessions = [
        { sets: makeSets(3, 10, 60), repRange: [8, 12] as [number, number] },
        { sets: makeSets(3, 10, 60), repRange: [8, 12] as [number, number] },
      ];
      const result = progressionService.evaluateFailure(
        "bench_press",
        sessions,
      );
      expect(result.action).toBe("none");
      expect(result.consecutiveFailures).toBe(0);
    });

    it("returns hold when 1 consecutive failure", () => {
      const sessions = [
        { sets: makeSets(3, 6, 60), repRange: [8, 12] as [number, number] },
        { sets: makeSets(3, 10, 60), repRange: [8, 12] as [number, number] },
      ];
      const result = progressionService.evaluateFailure(
        "bench_press",
        sessions,
      );
      expect(result.action).toBe("hold");
      expect(result.consecutiveFailures).toBe(1);
      expect(result.reason).toContain("One failure");
    });

    it("returns deload when 2+ consecutive failures", () => {
      const sessions = [
        { sets: makeSets(3, 6, 60), repRange: [8, 12] as [number, number] },
        { sets: makeSets(3, 5, 60), repRange: [8, 12] as [number, number] },
        { sets: makeSets(3, 10, 60), repRange: [8, 12] as [number, number] },
      ];
      const result = progressionService.evaluateFailure(
        "bench_press",
        sessions,
      );
      expect(result.action).toBe("deload");
      expect(result.consecutiveFailures).toBe(2);
      expect(result.suggestedWeightKg).toBe(54);
    });

    it("does not count non-consecutive failures as deload", () => {
      const sessions = [
        { sets: makeSets(3, 6, 60), repRange: [8, 12] as [number, number] },
        { sets: makeSets(3, 10, 60), repRange: [8, 12] as [number, number] },
        { sets: makeSets(3, 6, 60), repRange: [8, 12] as [number, number] },
      ];
      const result = progressionService.evaluateFailure(
        "bench_press",
        sessions,
      );
      expect(result.action).toBe("hold");
      expect(result.consecutiveFailures).toBe(1);
    });

    it("respects custom failureThreshold", () => {
      const sessions = [
        { sets: makeSets(3, 6, 60), repRange: [8, 12] as [number, number] },
        { sets: makeSets(3, 5, 60), repRange: [8, 12] as [number, number] },
        { sets: makeSets(3, 10, 60), repRange: [8, 12] as [number, number] },
      ];
      const result = progressionService.evaluateFailure(
        "bench_press",
        sessions,
        3,
      );
      expect(result.action).toBe("hold");
      expect(result.consecutiveFailures).toBe(2);

      const result2 = progressionService.evaluateFailure(
        "bench_press",
        sessions,
        2,
      );
      expect(result2.action).toBe("deload");
    });

    it("handles empty sessions", () => {
      const result = progressionService.evaluateFailure("bench_press", []);
      expect(result.action).toBe("none");
      expect(result.consecutiveFailures).toBe(0);
    });
  });
});
