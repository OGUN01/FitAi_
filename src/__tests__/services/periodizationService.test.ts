import { getWeekTarget, ACCUMULATION_WEEKS } from "../../services/periodizationService";
import type { RecentSessionForDeload } from "../../services/deloadService";

describe("periodizationService.getWeekTarget", () => {
  it("defaults to accumulation-week-1 targets when no mesocycle has started", () => {
    const result = getWeekTarget(0);
    expect(result.isDeloadWeek).toBe(false);
    expect(result.targetRir).toBe(3);
    expect(result.volumeMultiplier).toBe(1.0);
  });

  it("descends RIR and rises volume across the 4 accumulation weeks", () => {
    expect(ACCUMULATION_WEEKS).toBe(4);

    const week1 = getWeekTarget(1);
    expect(week1.weekInBlock).toBe(1);
    expect(week1.isDeloadWeek).toBe(false);
    expect(week1.targetRir).toBe(3);
    expect(week1.volumeMultiplier).toBe(1.0);

    const week2 = getWeekTarget(2);
    expect(week2.weekInBlock).toBe(2);
    expect(week2.targetRir).toBe(2);
    expect(week2.volumeMultiplier).toBe(1.1);

    const week3 = getWeekTarget(3);
    expect(week3.weekInBlock).toBe(3);
    expect(week3.targetRir).toBe(1);
    expect(week3.volumeMultiplier).toBe(1.2);

    const week4 = getWeekTarget(4);
    expect(week4.weekInBlock).toBe(4);
    expect(week4.targetRir).toBe(0); // near-failure right before the deload
    expect(week4.volumeMultiplier).toBe(1.3);
  });

  it("triggers a proactive deload at week 5 (deloadService.checkProactiveDeload)", () => {
    const result = getWeekTarget(5);
    expect(result.isDeloadWeek).toBe(true);
    expect(result.weekInBlock).toBe(0);
    expect(result.targetRir).toBe(5); // comfortably easy — 3 (block start) + 2
    expect(result.volumeMultiplier).toBe(0.6); // 1 - 40%
  });

  // BUG FIX: this used to assert weeks 6 and 9 ALSO deload (checkProactiveDeload
  // had no upper bound on its `>= 5` guard). It's now a repeating 5-week
  // cycle (4 accumulation + 1 deload) — see deloadService.ts.
  it("repeats automatically: week 6 restarts accumulation, weeks 7-9 continue it, week 10 deloads again", () => {
    const week6 = getWeekTarget(6);
    expect(week6.isDeloadWeek).toBe(false);
    expect(week6.weekInBlock).toBe(1);
    expect(week6.targetRir).toBe(3);
    expect(week6.volumeMultiplier).toBe(1.0);

    const week9 = getWeekTarget(9);
    expect(week9.isDeloadWeek).toBe(false);
    expect(week9.weekInBlock).toBe(4);
    expect(week9.targetRir).toBe(0);

    const week10 = getWeekTarget(10);
    expect(week10.isDeloadWeek).toBe(true);
    expect(week10.weekInBlock).toBe(0);

    // A third block, further out, also cycles correctly.
    const week15 = getWeekTarget(15);
    expect(week15.isDeloadWeek).toBe(true);
    const week11 = getWeekTarget(11);
    expect(week11.isDeloadWeek).toBe(false);
    expect(week11.weekInBlock).toBe(1);
  });

  function failedSession(reps: number, floor: number): RecentSessionForDeload {
    return { sets: [{ reps, weight: 50, completed: true }], repRange: [floor, floor + 4] };
  }

  it("triggers a reactive deload early (before week 5) on 2 consecutive failed sessions", () => {
    const recentSessions = [
      {
        exerciseId: "bench_press",
        // Most-recent-first, matching checkReactiveDeload's own iteration order.
        sessions: [failedSession(5, 8), failedSession(6, 8)],
      },
    ];
    const result = getWeekTarget(2, recentSessions);
    expect(result.isDeloadWeek).toBe(true);
    expect(result.targetRir).toBe(5);
    expect(result.volumeMultiplier).toBe(0.9); // 1 - 10% (weightReductionPercent)
    expect(result.reason).toMatch(/Reactive deload triggered early/);
  });

  it("does not trigger a reactive deload on only 1 failed session", () => {
    const recentSessions = [
      { exerciseId: "bench_press", sessions: [failedSession(5, 8)] },
    ];
    const result = getWeekTarget(2, recentSessions);
    expect(result.isDeloadWeek).toBe(false);
  });

  it("ignores recentSessions entirely when omitted", () => {
    const result = getWeekTarget(2);
    expect(result.isDeloadWeek).toBe(false);
    expect(result.weekInBlock).toBe(2);
  });
});
