import { brzycki, epley, estimateOneRepMax } from "../../utils/oneRepMax";

describe("oneRepMax", () => {
  describe("brzycki", () => {
    it("estimates 1RM for 100kg x 10 reps ≈ 133.4kg", () => {
      const result = brzycki(100, 10);
      expect(result).toBeGreaterThan(132);
      expect(result).toBeLessThan(135);
    });

    it("returns weight unchanged when reps >= 37", () => {
      expect(brzycki(100, 37)).toBe(100);
      expect(brzycki(100, 50)).toBe(100);
    });

    it("returns weight unchanged when reps <= 0", () => {
      expect(brzycki(100, 0)).toBe(100);
      expect(brzycki(100, -1)).toBe(100);
    });

    it("returns weight for 1 rep", () => {
      // For 1 rep: 100 / (1.0278 - 0.0278*1) = 100 / 1.0 = 100
      expect(brzycki(100, 1)).toBeCloseTo(100, 0);
    });
  });

  describe("epley", () => {
    it("estimates 1RM for 100kg x 10 reps ≈ 133.3kg", () => {
      const result = epley(100, 10);
      expect(result).toBeGreaterThan(132);
      expect(result).toBeLessThan(135);
    });

    it("returns weight unchanged when reps = 0", () => {
      expect(epley(100, 0)).toBe(100);
    });

    it("returns weight unchanged when reps < 0", () => {
      expect(epley(100, -5)).toBe(100);
    });

    it("calculates correctly for 1 rep", () => {
      // 100 * (1 + 1/30) ≈ 103.33
      expect(epley(100, 1)).toBeCloseTo(103.33, 0);
    });
  });

  describe("estimateOneRepMax", () => {
    it("returns weight unchanged for 1 rep (identity)", () => {
      expect(estimateOneRepMax(100, 1)).toBe(100);
    });

    it("averages brzycki and epley for 1-10 reps", () => {
      const result = estimateOneRepMax(80, 5);
      expect(result).toBeGreaterThan(90);
      expect(result).toBeLessThan(100);
    });

    it("uses epley only for >10 reps", () => {
      const result = estimateOneRepMax(60, 15);
      const expected = epley(60, 15);
      expect(result).toBe(expected);
    });

    it("averages correctly at exactly 10 reps", () => {
      const result = estimateOneRepMax(100, 10);
      const expected = (brzycki(100, 10) + epley(100, 10)) / 2;
      expect(result).toBeCloseTo(expected, 2);
    });
  });
});
