/**
 * Regression test for a real, live-blocking onboarding bug: the live Postgres
 * `check_timeline_range` CHECK constraint on `body_analysis
 * .target_timeline_weeks` (confirmed via the Supabase Management API —
 * `CHECK ((target_timeline_weeks >= 4) AND (target_timeline_weeks <= 104))`,
 * undocumented in any migration file) was violated by ~2 of 5 fresh
 * onboarding accounts this session, intermittently, with no obvious pattern
 * — until root-caused here.
 *
 * `calculateSmartAlternatives`'s pace-card `timelineWeeks` values (shown to
 * the user, e.g. "72 weeks to goal") were computed as a plain
 * `Math.ceil(weightToLose / rate)` with NO clamping, unlike the sibling
 * `GoalVisualizationSection.tsx` computation for the SAME field, which
 * correctly clamped to [4, 104]. A small weight difference paired with an
 * aggressive pace card computes BELOW 4; a large weight difference paired
 * with a slow/safe pace card computes ABOVE 104 — both reachable through the
 * real "Choose Your Pace" onboarding UI. `useAdvancedReviewForm.ts`'s
 * `handleRateSelection` persists whichever card's timeline was implied,
 * inheriting the same unclamped value.
 *
 * Fixed by clamping every real weight-loss/gain timeline computation in this
 * file (and the corresponding persisted-value computation in
 * `useAdvancedReviewForm.ts`) to the shared `TARGET_TIMELINE_WEEKS_MIN`/`MAX`
 * constants, which now mirror the live DB constraint in one place.
 */
import { calculateSmartAlternatives } from "../../services/validation/smartAlternatives";
import {
  TARGET_TIMELINE_WEEKS_MIN,
  TARGET_TIMELINE_WEEKS_MAX,
} from "../../screens/onboarding/tabs/BodyAnalysisConstants";

describe("calculateSmartAlternatives — timelineWeeks clamped to the live DB constraint [4, 104]", () => {
  it("clamps a small weight-loss delta + aggressive pace to the MIN, not a raw sub-4-week value", () => {
    // 1kg to lose at a 1.0 kg/week "AGGRESSIVE" rate would naively compute
    // Math.ceil(1 / 1.0) = 1 week — below the DB's minimum of 4.
    const result = calculateSmartAlternatives(
      0.5, // userRequestedRate
      1600, // bmr
      2200, // tdee
      71, // currentWeight
      70, // targetWeight — only 1kg to lose
      "male",
    );

    const aggressive = result.alternatives.find((a) => a.id === "aggressive");
    expect(aggressive).toBeDefined();
    expect(aggressive!.timelineWeeks).toBeGreaterThanOrEqual(TARGET_TIMELINE_WEEKS_MIN);
    expect(aggressive!.timelineWeeks).toBeLessThanOrEqual(TARGET_TIMELINE_WEEKS_MAX);
    expect(aggressive!.timelineWeeks).toBe(TARGET_TIMELINE_WEEKS_MIN);
  });

  it("clamps a large weight-loss delta + a slow pace to the MAX, not a raw 100+-week value", () => {
    // 90kg to lose at a slow 0.3 kg/week rate would naively compute
    // Math.ceil(90 / 0.3) = 300 weeks — nearly 3x the DB's maximum of 104.
    // Uses the "KEEP MY GOAL" (user_original) card, which always reflects
    // the exact requested rate with no dedup/gating applied — the most
    // direct, unambiguous way to hit this exact computation.
    const result = calculateSmartAlternatives(
      0.3, // userRequestedRate — a genuinely slow pace
      1400,
      1700,
      150,
      60, // 90kg to lose
      "female",
    );

    const original = result.alternatives.find((a) => a.id === "user_original");
    expect(original).toBeDefined();
    expect(original!.timelineWeeks).toBeGreaterThanOrEqual(TARGET_TIMELINE_WEEKS_MIN);
    expect(original!.timelineWeeks).toBeLessThanOrEqual(TARGET_TIMELINE_WEEKS_MAX);
    expect(original!.timelineWeeks).toBe(TARGET_TIMELINE_WEEKS_MAX);
  });

  it("every real weight-loss/gain alternative's timelineWeeks stays within [4, 104] across a spread of extreme inputs", () => {
    const scenarios: Array<[number, number, number, number, number, "male" | "female"]> = [
      [0.5, 1600, 2200, 71, 70, "male"], // tiny loss delta
      [0.3, 1400, 1700, 150, 60, "female"], // huge loss delta, slow rate
      [1.0, 1800, 2600, 50, 120, "male"], // huge gain delta
      [0.2, 1500, 1650, 60, 61, "female"], // tiny gain delta
    ];

    for (const [rate, bmr, tdee, current, target, gender] of scenarios) {
      const result = calculateSmartAlternatives(rate, bmr, tdee, current, target, gender);
      for (const alt of result.alternatives) {
        // The "maintain"/"recomp" cards intentionally hardcode timelineWeeks
        // to 0 as an explicit "no fixed timeline" marker (not a real
        // weight-based calculation) — excluded from the [4,104] requirement,
        // matching how handleRateSelection's own weeklyRate<=0 fallback
        // path is handled separately.
        if (alt.id === "maintain" || alt.id === "recomp") continue;
        if (alt.timelineWeeks === 0) continue;
        expect(alt.timelineWeeks).toBeGreaterThanOrEqual(TARGET_TIMELINE_WEEKS_MIN);
        expect(alt.timelineWeeks).toBeLessThanOrEqual(TARGET_TIMELINE_WEEKS_MAX);
      }
    }
  });
});
