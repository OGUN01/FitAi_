import {
  computeVolumeLandmarks,
  computeAllVolumeLandmarks,
  resolveTrainingEmphasis,
  countWeeklySetsByMuscle,
  classifyVolumeZone,
} from "../../services/volumeLandmarksService";
import { MAJOR_MUSCLE_GROUPS } from "../../services/workoutInsightsService";
import type { CatalogEntry } from "../../data/exerciseCatalog.generated";

describe("volumeLandmarksService", () => {
  describe("resolveTrainingEmphasis", () => {
    it("returns 'general' for undefined/empty goals", () => {
      expect(resolveTrainingEmphasis(undefined)).toBe("general");
      expect(resolveTrainingEmphasis([])).toBe("general");
    });

    it("strength wins over muscle-gain when both are selected", () => {
      expect(resolveTrainingEmphasis(["muscle-gain", "strength"])).toBe("strength");
    });

    it("maps muscle-gain and weight-gain to hypertrophy", () => {
      expect(resolveTrainingEmphasis(["muscle-gain"])).toBe("hypertrophy");
      expect(resolveTrainingEmphasis(["weight-gain"])).toBe("hypertrophy");
    });

    it("hypertrophy wins over endurance when both are selected", () => {
      expect(resolveTrainingEmphasis(["endurance", "muscle-gain"])).toBe("hypertrophy");
    });

    it("maps weight-loss/general_fitness/flexibility to general", () => {
      expect(resolveTrainingEmphasis(["weight-loss"])).toBe("general");
      expect(resolveTrainingEmphasis(["general_fitness"])).toBe("general");
      expect(resolveTrainingEmphasis(["flexibility"])).toBe("general");
    });

    it("ignores unrecognized goal ids rather than throwing", () => {
      expect(resolveTrainingEmphasis(["some_future_goal_id"])).toBe("general");
    });
  });

  describe("computeVolumeLandmarks", () => {
    it("intermediate + hypertrophy uses the MRV baseline unscaled", () => {
      // chest MRV baseline = 20 (workoutInsightsService.MAX_RECOVERABLE_SETS)
      const result = computeVolumeLandmarks("chest", "intermediate", "hypertrophy");
      expect(result.mrv).toBe(20);
      expect(result.mav).toBe(15); // round(20 * 0.75)
      expect(result.mev).toBe(9); // round(20 * 0.45)
    });

    it("scales down for beginners on a general goal", () => {
      // scale = 0.75 (beginner) * 0.9 (general) = 0.675
      // mrv = round(20 * 0.675) = round(13.5) = 14
      const result = computeVolumeLandmarks("chest", "beginner", "general");
      expect(result.mrv).toBe(14);
      expect(result.mav).toBe(11); // round(14 * 0.75) = round(10.5) = 11
      expect(result.mev).toBe(6); // round(14 * 0.45) = round(6.3) = 6
    });

    it("scales for advanced + strength (higher ceiling, lower volume-per-goal)", () => {
      // scale = 1.2 (advanced) * 0.8 (strength) = 0.96
      // mrv = round(20 * 0.96) = round(19.2) = 19
      const result = computeVolumeLandmarks("chest", "advanced", "strength");
      expect(result.mrv).toBe(19);
      expect(result.mav).toBe(14); // round(19 * 0.75) = 14.25 -> 14
      expect(result.mev).toBe(9); // round(19 * 0.45) = 8.55 -> 9
    });

    it("always orders mev <= mav <= mrv", () => {
      const trainingAges = ["beginner", "intermediate", "advanced"] as const;
      const emphases = ["strength", "hypertrophy", "endurance", "general"] as const;
      for (const muscle of MAJOR_MUSCLE_GROUPS) {
        for (const age of trainingAges) {
          for (const emphasis of emphases) {
            const l = computeVolumeLandmarks(muscle, age, emphasis);
            expect(l.mev).toBeLessThanOrEqual(l.mav);
            expect(l.mav).toBeLessThanOrEqual(l.mrv);
          }
        }
      }
    });

    it("falls back to a 12-set MRV baseline for an unknown muscle group", () => {
      const result = computeVolumeLandmarks("obliques", "intermediate", "hypertrophy");
      expect(result.mrv).toBe(12);
    });
  });

  describe("computeAllVolumeLandmarks", () => {
    it("returns landmarks for every major muscle group", () => {
      const all = computeAllVolumeLandmarks("intermediate", "hypertrophy");
      for (const muscle of MAJOR_MUSCLE_GROUPS) {
        expect(all[muscle]).toBeDefined();
        expect(all[muscle].mrv).toBeGreaterThan(0);
      }
    });
  });

  describe("countWeeklySetsByMuscle", () => {
    // Synthetic catalog resolver — doesn't depend on the real 1,552-row
    // generated catalog, matches CatalogEntry's shape for the fields used.
    const catalog: Record<string, Partial<CatalogEntry>> = {
      bench_press: { primaryMuscles: ["chest"], secondaryMuscles: ["triceps", "shoulders"] },
      squat: { primaryMuscles: ["quadriceps", "glutes"], secondaryMuscles: ["hamstrings"] },
      unknown_id: undefined as any,
    };
    const resolver = (id: string) => (catalog[id] as CatalogEntry) ?? null;

    it("gives primary muscles full credit and secondary muscles half credit", () => {
      const counts = countWeeklySetsByMuscle(
        [{ exerciseId: "bench_press", setCount: 3 }],
        resolver,
      );
      expect(counts["chest"]).toBe(3);
      expect(counts["triceps"]).toBe(1.5);
      expect(counts["shoulders"]).toBe(1.5);
    });

    it("sums credit across multiple exercises hitting the same muscle", () => {
      const counts = countWeeklySetsByMuscle(
        [
          { exerciseId: "bench_press", setCount: 3 },
          { exerciseId: "bench_press", setCount: 4 },
        ],
        resolver,
      );
      expect(counts["chest"]).toBe(7);
    });

    it("handles multiple primary muscles on one exercise", () => {
      const counts = countWeeklySetsByMuscle(
        [{ exerciseId: "squat", setCount: 4 }],
        resolver,
      );
      expect(counts["quadriceps"]).toBe(4);
      expect(counts["glutes"]).toBe(4);
      expect(counts["hamstrings"]).toBe(2); // secondary, half credit
    });

    it("returns an empty tally for an unresolvable exerciseId (never throws)", () => {
      const counts = countWeeklySetsByMuscle(
        [{ exerciseId: "totally_unknown", setCount: 3 }],
        resolver,
      );
      expect(counts).toEqual({});
    });
  });

  describe("classifyVolumeZone", () => {
    const landmarks = { mev: 9, mav: 15, mrv: 20 };

    it("classifies each zone boundary correctly", () => {
      expect(classifyVolumeZone(5, landmarks)).toBe("under_mev");
      expect(classifyVolumeZone(9, landmarks)).toBe("mev_to_mav"); // at MEV, not under it
      expect(classifyVolumeZone(14, landmarks)).toBe("mev_to_mav");
      expect(classifyVolumeZone(15, landmarks)).toBe("mav_to_mrv"); // at MAV, in the sweet spot band
      expect(classifyVolumeZone(20, landmarks)).toBe("mav_to_mrv"); // at MRV, still recoverable
      expect(classifyVolumeZone(21, landmarks)).toBe("over_mrv");
    });
  });
});
