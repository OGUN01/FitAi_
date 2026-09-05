/**
 * Workout Engine v2 Phase 6B — pure aggregator tests for the new
 * hard-set %, weekly-effort-trend, and volume-landmark-zone sections in
 * BuilderAnalyticsPanel.tsx. The component's other aggregators
 * (aggregateWeeklyVolume, aggregateMuscleHeatmap, topExercises) have no
 * existing test coverage; these are new and get their own coverage per the
 * project's testing discipline this session.
 */
import {
  computeHardSetPercent,
  aggregateWeeklyEffort,
  computeCurrentWeekVolumeZones,
  volumeZoneColor,
  volumeZoneLabel,
} from "../../../components/fitness/builder/BuilderAnalyticsPanel";
import { HARD_SET_RPE_THRESHOLD } from "../../../utils/effortScale";

// Real ExerciseDB hash ID confirmed elsewhere this session: "barbell full
// squat", primaryMuscles include glutes/quadriceps (lower-body compound) —
// deliberately reused rather than a synthetic id so the catalog resolution
// path (getCatalogEntry) is exercised for real, matching how
// volumeLandmarksService.test.ts already does this.
const BARBELL_SQUAT_HASH_ID = "qXTaZnJ";

describe("BuilderAnalyticsPanel effort + volume-zone aggregators", () => {
  describe("computeHardSetPercent", () => {
    it("returns null (not 0) when there is no rated data at all", () => {
      expect(computeHardSetPercent([])).toBeNull();
      expect(
        computeHardSetPercent([{ hardSetCount: 0, ratedWorkingSetCount: 0 }]),
      ).toBeNull();
    });

    it("computes hard sets / rated working sets, not / all working sets", () => {
      // 2 hard out of 4 rated = 50% — a 3rd bucket's unrated sets must NOT
      // dilute the denominator.
      const result = computeHardSetPercent([
        { hardSetCount: 2, ratedWorkingSetCount: 4 },
      ]);
      expect(result).toBe(50);
    });

    it("sums across multiple buckets before dividing", () => {
      const result = computeHardSetPercent([
        { hardSetCount: 1, ratedWorkingSetCount: 2 }, // 50%
        { hardSetCount: 3, ratedWorkingSetCount: 8 }, // 37.5%
      ]);
      // (1+3) / (2+8) = 40%, not an average of 50% and 37.5%
      expect(result).toBe(40);
    });

    it("rounds to the nearest integer percent", () => {
      const result = computeHardSetPercent([
        { hardSetCount: 1, ratedWorkingSetCount: 3 },
      ]);
      expect(result).toBe(33); // 33.33... -> 33
    });
  });

  describe("aggregateWeeklyEffort", () => {
    const isoNow = new Date().toISOString();

    it("returns `weeks` buckets, oldest to newest, all zero for empty history", () => {
      const result = aggregateWeeklyEffort([], 4);
      expect(result).toHaveLength(4);
      expect(result.every((w) => w.total === 0)).toBe(true);
      expect(result[result.length - 1].weekLabel).toBe("This wk");
    });

    it("skips entries with avgRpe10 === null rather than treating them as 0", () => {
      const result = aggregateWeeklyEffort(
        [{ date: isoNow, avgRpe10: null }],
        4,
      );
      // A null-only week must still show as an empty (0) bar, not NaN or a
      // real average pulled toward 0.
      expect(result.every((w) => Number.isFinite(w.total))).toBe(true);
      expect(result[result.length - 1].total).toBe(0);
    });

    it("averages multiple same-week entries", () => {
      const result = aggregateWeeklyEffort(
        [
          { date: isoNow, avgRpe10: 6 },
          { date: isoNow, avgRpe10: 8 },
        ],
        4,
      );
      expect(result[result.length - 1].total).toBe(7);
    });
  });

  describe("computeCurrentWeekVolumeZones", () => {
    it("gives zero actual sets (under_mev) for a muscle with no logged history", () => {
      const zones = computeCurrentWeekVolumeZones([], "intermediate", "general");
      // 10 major muscle groups, every one at 0 actual sets with no history.
      expect(zones.length).toBeGreaterThan(0);
      expect(zones.every((z) => z.actualSets === 0)).toBe(true);
      expect(zones.every((z) => z.zone === "under_mev")).toBe(true);
    });

    it("only counts THIS WEEK's sets, ignoring older history", () => {
      const now = new Date();
      const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000);
      const zonesFromOldOnly = computeCurrentWeekVolumeZones(
        [
          {
            exerciseId: BARBELL_SQUAT_HASH_ID,
            date: eightWeeksAgo.toISOString(),
            totalSets: 20,
          },
        ],
        "intermediate",
        "general",
      );
      const quads = zonesFromOldOnly.find((z) => z.muscle === "quadriceps");
      expect(quads?.actualSets).toBe(0);
    });

    it("credits primary-muscle sets from a real catalog exercise logged this week", () => {
      const zones = computeCurrentWeekVolumeZones(
        [
          {
            exerciseId: BARBELL_SQUAT_HASH_ID,
            date: new Date().toISOString(),
            totalSets: 3,
          },
        ],
        "intermediate",
        "general",
      );
      const quads = zones.find((z) => z.muscle === "quadriceps");
      expect(quads).toBeDefined();
      expect(quads!.actualSets).toBeGreaterThan(0);
      // mev < mav < mrv must hold for a real landmark set — sanity check the
      // wired-through computeAllVolumeLandmarks values, not just the zone label.
      expect(quads!.mev).toBeLessThan(quads!.mav);
      expect(quads!.mav).toBeLessThanOrEqual(quads!.mrv);
    });

    it("scales landmarks down for a beginner vs an advanced trainee", () => {
      const beginnerZones = computeCurrentWeekVolumeZones([], "beginner", "general");
      const advancedZones = computeCurrentWeekVolumeZones([], "advanced", "general");
      const bQuads = beginnerZones.find((z) => z.muscle === "quadriceps")!;
      const aQuads = advancedZones.find((z) => z.muscle === "quadriceps")!;
      expect(bQuads.mrv).toBeLessThan(aQuads.mrv);
    });
  });

  describe("volumeZoneColor / volumeZoneLabel", () => {
    it("returns a distinct, defined value for all four zones", () => {
      const zones = ["under_mev", "mev_to_mav", "mav_to_mrv", "over_mrv"] as const;
      const colorsSeen = new Set(zones.map(volumeZoneColor));
      const labelsSeen = new Set(zones.map(volumeZoneLabel));
      expect(colorsSeen.size).toBe(4);
      expect(labelsSeen.size).toBe(4);
      for (const z of zones) {
        expect(volumeZoneColor(z)).toBeTruthy();
        expect(volumeZoneLabel(z)).toBeTruthy();
      }
    });
  });

  it("HARD_SET_RPE_THRESHOLD stays 7 — hard-set % and the histogram share this constant", () => {
    // Guards against effortScale.ts's threshold silently drifting out from
    // under the hard-set % computed here.
    expect(HARD_SET_RPE_THRESHOLD).toBe(7);
  });
});
