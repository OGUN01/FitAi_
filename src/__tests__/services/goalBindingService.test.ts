import { getGoalBinding, GOAL_BINDINGS } from "../../services/goalBindingService";
import type { TrainingEmphasis } from "../../services/volumeLandmarksService";

describe("goalBindingService", () => {
  it("has a binding for every training emphasis", () => {
    const emphases: TrainingEmphasis[] = ["strength", "hypertrophy", "endurance", "general"];
    for (const emphasis of emphases) {
      expect(GOAL_BINDINGS[emphasis]).toBeDefined();
    }
  });

  it("strength: low reps, long rest, linear scheme", () => {
    const binding = getGoalBinding("strength");
    expect(binding.repRange).toEqual([3, 6]);
    expect(binding.restSeconds[0]).toBeGreaterThanOrEqual(150);
    expect(binding.defaultScheme).toBe("linear");
  });

  it("hypertrophy: moderate reps, moderate rest, double scheme", () => {
    const binding = getGoalBinding("hypertrophy");
    expect(binding.repRange).toEqual([8, 12]);
    expect(binding.defaultScheme).toBe("double");
  });

  it("endurance: high reps, short rest", () => {
    const binding = getGoalBinding("endurance");
    expect(binding.repRange[0]).toBeGreaterThanOrEqual(15);
    expect(binding.restSeconds[1]).toBeLessThanOrEqual(60);
  });

  it("every binding's rep range and rest range are internally ordered (min <= max)", () => {
    for (const emphasis of Object.keys(GOAL_BINDINGS) as TrainingEmphasis[]) {
      const b = GOAL_BINDINGS[emphasis];
      expect(b.repRange[0]).toBeLessThanOrEqual(b.repRange[1]);
      expect(b.restSeconds[0]).toBeLessThanOrEqual(b.restSeconds[1]);
    }
  });

  it("rest time generally decreases as rep range increases across the 4 bindings (strength > hypertrophy/general > endurance)", () => {
    expect(GOAL_BINDINGS.strength.restSeconds[0]).toBeGreaterThan(GOAL_BINDINGS.hypertrophy.restSeconds[0]);
    expect(GOAL_BINDINGS.hypertrophy.restSeconds[1]).toBeGreaterThanOrEqual(GOAL_BINDINGS.endurance.restSeconds[1]);
  });
});
