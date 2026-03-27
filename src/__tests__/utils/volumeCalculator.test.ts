import { totalVolume, totalVolumeKg } from "../../utils/volumeCalculator";

describe("volumeCalculator", () => {
  describe("totalVolume", () => {
    it("calculates volume as sum of weightKg * reps", () => {
      const sets = [
        { weightKg: 60, reps: 10 },
        { weightKg: 60, reps: 8 },
        { weightKg: 55, reps: 6 },
      ];
      // 600 + 480 + 330 = 1410
      expect(totalVolume(sets)).toBe(1410);
    });

    it("returns 0 for empty sets", () => {
      expect(totalVolume([])).toBe(0);
    });

    it("handles single set", () => {
      expect(totalVolume([{ weightKg: 100, reps: 5 }])).toBe(500);
    });

    it("returns 0 for bodyweight exercises (weight=0)", () => {
      const sets = [
        { weightKg: 0, reps: 15 },
        { weightKg: 0, reps: 12 },
      ];
      expect(totalVolume(sets)).toBe(0);
    });
  });

  describe("totalVolumeKg", () => {
    it("is an alias for totalVolume", () => {
      const sets = [
        { weightKg: 80, reps: 5 },
        { weightKg: 80, reps: 5 },
      ];
      expect(totalVolumeKg(sets)).toBe(totalVolume(sets));
      expect(totalVolumeKg(sets)).toBe(800);
    });
  });
});
