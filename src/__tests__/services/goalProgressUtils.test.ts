import { getWeightGoalProgress } from "../../components/progress/goalProgressUtils";

describe("getWeightGoalProgress", () => {
  it("uses earliest weight history as the baseline", () => {
    const result = getWeightGoalProgress({
      currentWeightKg: 92,
      targetWeightKg: 85,
      weightHistory: [
        { date: "2026-01-01", weight: 100 },
        { date: "2026-02-01", weight: 96 },
        { date: "2026-03-01", weight: 92 },
      ],
      fallbackStartWeightKg: 92,
      targetTimelineWeeks: 15,
    });

    expect(result.startWeightKg).toBe(100);
    expect(result.weightProgress).toBeCloseTo(8 / 15, 5);
    expect(result.weeklyRateKg).toBeCloseTo(1, 5);
    expect(result.weeksLeft).toBe(7);
  });

  it("falls back to the supplied start weight when no history exists", () => {
    const result = getWeightGoalProgress({
      currentWeightKg: 90,
      targetWeightKg: 80,
      weightHistory: [],
      fallbackStartWeightKg: 95,
      weeklyRateKg: 0.5,
    });

    expect(result.startWeightKg).toBe(95);
    expect(result.weightProgress).toBeCloseTo(0.33333, 4);
    expect(result.weeksLeft).toBe(20);
  });

  it("treats already-at-target journeys as complete", () => {
    const result = getWeightGoalProgress({
      currentWeightKg: 80,
      targetWeightKg: 80,
      weightHistory: [],
      fallbackStartWeightKg: 80,
    });

    expect(result.weightProgress).toBe(1);
    expect(result.weeksLeft).toBeNull();
  });
});
