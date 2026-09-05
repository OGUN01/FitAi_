import { brzycki, epley, lombardi, estimateOneRepMax, MAX_RELIABLE_REPS } from "../../utils/oneRepMax";

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

    it("averages brzycki, epley and lombardi for 11-12 reps", () => {
      const result = estimateOneRepMax(60, 12);
      const expected = (brzycki(60, 12) + epley(60, 12) + lombardi(60, 12)) / 3;
      expect(result).toBeCloseTo(expected as number, 2);
    });

    it("averages correctly at exactly 10 reps", () => {
      const result = estimateOneRepMax(100, 10);
      const expected = (brzycki(100, 10) + epley(100, 10)) / 2;
      expect(result).toBeCloseTo(expected, 2);
    });

    it("returns null beyond MAX_RELIABLE_REPS — formulas diverge past this point", () => {
      expect(MAX_RELIABLE_REPS).toBe(12);
      expect(estimateOneRepMax(60, 13)).toBeNull();
      expect(estimateOneRepMax(60, 20)).toBeNull();
    });

    it("returns null for zero/negative weight or reps", () => {
      expect(estimateOneRepMax(0, 10)).toBeNull();
      expect(estimateOneRepMax(-10, 10)).toBeNull();
      expect(estimateOneRepMax(100, 0)).toBeNull();
      expect(estimateOneRepMax(100, -1)).toBeNull();
    });
  });

  describe("lombardi", () => {
    it("estimates 1RM for 100kg x 10 reps", () => {
      // 100 * 10^0.10 ≈ 125.9
      expect(lombardi(100, 10)).toBeCloseTo(125.89, 1);
    });

    it("returns weight unchanged when reps <= 0", () => {
      expect(lombardi(100, 0)).toBe(100);
      expect(lombardi(100, -1)).toBe(100);
    });
  });
});
