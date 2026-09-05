/**
 * Regression test for achievementEngine.ts's multi-requirement progress
 * calculation.
 *
 * Covers a real bug found via live testing: a compound/AND achievement
 * (e.g. "balanced-week" — 3 workouts AND 3 meals logged AND 1 water goal
 * hit) used to report progress as the BEST (maximum) fraction across its
 * requirements, so meeting just ONE of several requirements showed a
 * misleading 100%-full progress bar for an achievement that was nowhere
 * near actually unlocked. Progress must instead reflect the WORST
 * (minimum, i.e. bottleneck) fraction — the honest "how close am I to
 * unlocking this" measure for an AND-type achievement.
 */
import { achievementEngine } from "../../services/achievementEngine";

describe("achievementEngine — multi-requirement progress", () => {
  const userId = "test-user-balanced-week";

  beforeEach(async () => {
    await achievementEngine.initialize();
  });

  it("does not show a misleadingly-full progress row when the bottleneck requirement is untouched", async () => {
    // Fully meets ONE of "balanced-week"'s three requirements
    // (nutrition_log target 3) while completely untouched on the other two
    // (workout_count target 3, water_intake target 1) — the bottleneck
    // (minimum) fraction is 0. The engine intentionally doesn't create an
    // in-progress row for 0 progress (see its own "avoids polluting the
    // map" comment) — the key assertion is that this achievement is NOT
    // reported as 100%/complete-looking despite meals being fully done,
    // which the old best-fraction logic would have done.
    await achievementEngine.checkAchievements(userId, {
      totalWorkouts: 0,
      nutritionLogs: 3,
      waterGoalsHit: 0,
    });

    const progressMap = achievementEngine.getUserAchievementProgress(userId);
    const balancedWeek = progressMap.get("balanced-week");

    expect(balancedWeek).toBeUndefined();
  });

  it("only unlocks once every requirement is actually met", async () => {
    const userId2 = "test-user-balanced-week-complete";
    await achievementEngine.checkAchievements(userId2, {
      totalWorkouts: 3,
      nutritionLogs: 3,
      waterGoalsHit: 1,
    });

    const progressMap = achievementEngine.getUserAchievementProgress(userId2);
    const balancedWeek = progressMap.get("balanced-week");

    expect(balancedWeek?.isCompleted).toBe(true);
    expect(balancedWeek?.progress).toBe(balancedWeek?.maxProgress);
  });

  it("mid-progress on the bottleneck requirement reflects proportionally, not the best one", async () => {
    const userId3 = "test-user-balanced-week-partial";
    // Meals fully done (3/3 = 100%), water fully done (1/1 = 100%), but
    // workouts only 1/3 (~33%) — the achievement's maxProgress is
    // max(3, 3, 1) = 3, so a worst-fraction of 1/3 should round to 1.
    await achievementEngine.checkAchievements(userId3, {
      totalWorkouts: 1,
      nutritionLogs: 3,
      waterGoalsHit: 1,
    });

    const progressMap = achievementEngine.getUserAchievementProgress(userId3);
    const balancedWeek = progressMap.get("balanced-week");

    expect(balancedWeek?.isCompleted).toBe(false);
    expect(balancedWeek?.maxProgress).toBe(3);
    // worstFraction = 1/3 ≈ 0.333 → round(0.333 * 3) = 1, NOT 3 (which the
    // old best-fraction logic would have shown, since meals/water were 100%).
    expect(balancedWeek?.progress).toBe(1);
  });
});
