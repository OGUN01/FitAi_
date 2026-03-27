import {
  checkProactiveDeload,
  checkReactiveDeload,
  generateDeloadPlan,
  DeloadSuggestion,
  DeloadPlan,
  RecentSessionForDeload,
} from "../../services/deloadService";

describe("deloadService", () => {
  describe("checkProactiveDeload", () => {
    it("returns null when mesocycleWeek < 5", () => {
      expect(checkProactiveDeload(1)).toBeNull();
      expect(checkProactiveDeload(2)).toBeNull();
      expect(checkProactiveDeload(3)).toBeNull();
      expect(checkProactiveDeload(4)).toBeNull();
    });

    it("returns proactive deload suggestion when mesocycleWeek >= 5", () => {
      const result = checkProactiveDeload(5);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("proactive");
      expect(result!.reason).toContain("Week 5");
    });

    it("returns proactive suggestion for week 6+", () => {
      const result = checkProactiveDeload(6);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("proactive");
    });

    it("suggests volume reduction of 40%", () => {
      const result = checkProactiveDeload(5);
      expect(result).not.toBeNull();
      expect(result!.volumeReductionPercent).toBe(40);
    });
  });

  describe("checkReactiveDeload", () => {
    const makeSession = (
      reps: number,
      repFloor: number,
      weight: number = 60,
    ): RecentSessionForDeload => ({
      sets: [
        { reps, weight, completed: true },
        { reps, weight, completed: true },
        { reps, weight, completed: true },
      ],
      repRange: [repFloor, repFloor + 4] as [number, number],
    });

    it("returns null when no sessions provided", () => {
      expect(checkReactiveDeload("bench_press", [])).toBeNull();
    });

    it("returns null when only 1 session failed rep floor", () => {
      const sessions = [
        makeSession(4, 8), // failed (4 < 8)
        makeSession(10, 8), // passed (10 >= 8)
      ];
      expect(checkReactiveDeload("bench_press", sessions)).toBeNull();
    });

    it("returns reactive deload when 2+ consecutive sessions failed rep floor", () => {
      const sessions = [
        makeSession(5, 8), // failed
        makeSession(6, 8), // failed
      ];
      const result = checkReactiveDeload("bench_press", sessions);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("reactive");
      expect(result!.exerciseId).toBe("bench_press");
    });

    it("returns reactive suggestion for 3 consecutive failures", () => {
      const sessions = [
        makeSession(4, 8),
        makeSession(5, 8),
        makeSession(6, 8),
      ];
      const result = checkReactiveDeload("bench_press", sessions);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("reactive");
    });

    it("does NOT trigger if non-consecutive failures", () => {
      const sessions = [
        makeSession(5, 8), // failed
        makeSession(10, 8), // passed — breaks streak
        makeSession(5, 8), // failed
      ];
      expect(checkReactiveDeload("bench_press", sessions)).toBeNull();
    });

    it("suggests 10% weight reduction", () => {
      const sessions = [makeSession(5, 8, 100), makeSession(5, 8, 100)];
      const result = checkReactiveDeload("bench_press", sessions);
      expect(result).not.toBeNull();
      expect(result!.weightReductionPercent).toBe(10);
    });

    it("early mesocycle (week 1-2): suggests weight reduction, NOT full deload", () => {
      const sessions = [makeSession(5, 8, 100), makeSession(5, 8, 100)];
      const result = checkReactiveDeload("bench_press", sessions, 1);
      expect(result).not.toBeNull();
      expect(result!.type).toBe("reactive");
      expect(result!.isEarlyMesocycle).toBe(true);
      expect(result!.weightReductionPercent).toBe(10);
    });

    it("early mesocycle (week 2): same behavior", () => {
      const sessions = [makeSession(5, 8, 100), makeSession(5, 8, 100)];
      const result = checkReactiveDeload("bench_press", sessions, 2);
      expect(result).not.toBeNull();
      expect(result!.isEarlyMesocycle).toBe(true);
    });

    it("mid mesocycle (week 3+): NOT flagged as early", () => {
      const sessions = [makeSession(5, 8, 100), makeSession(5, 8, 100)];
      const result = checkReactiveDeload("bench_press", sessions, 3);
      expect(result).not.toBeNull();
      expect(result!.isEarlyMesocycle).toBe(false);
    });
  });

  describe("generateDeloadPlan", () => {
    it("reduces sets by 40-50%", () => {
      const plan = generateDeloadPlan(10);
      expect(plan.deloadSets).toBeGreaterThanOrEqual(5);
      expect(plan.deloadSets).toBeLessThanOrEqual(6);
    });

    it("keeps same exercises flag", () => {
      const plan = generateDeloadPlan(8);
      expect(plan.keepExercises).toBe(true);
    });

    it("keeps same weight flag", () => {
      const plan = generateDeloadPlan(8);
      expect(plan.keepWeight).toBe(true);
    });

    it("returns volumeReductionPercent between 40-50", () => {
      const plan = generateDeloadPlan(10);
      expect(plan.volumeReductionPercent).toBeGreaterThanOrEqual(40);
      expect(plan.volumeReductionPercent).toBeLessThanOrEqual(50);
    });

    it("handles small set counts (1-2 sets) — reduces to at least 1", () => {
      const plan = generateDeloadPlan(1);
      expect(plan.deloadSets).toBeGreaterThanOrEqual(1);
    });

    it("handles 4 sets correctly", () => {
      const plan = generateDeloadPlan(4);
      // 4 * 0.5 = 2, 4 * 0.6 = 2.4 → 2
      expect(plan.deloadSets).toBe(2);
    });

    it("handles 3 sets correctly", () => {
      const plan = generateDeloadPlan(3);
      // 3 * 0.5 = 1.5 → 2, 3 * 0.6 = 1.8 → 2
      expect(plan.deloadSets).toBeGreaterThanOrEqual(1);
      expect(plan.deloadSets).toBeLessThanOrEqual(2);
    });
  });
});
