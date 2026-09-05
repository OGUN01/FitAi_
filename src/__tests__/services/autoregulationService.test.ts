import {
  computeAutoregulationSignal,
  applyAutoregulation,
} from "../../services/autoregulationService";
import type { ProgressionPrescription } from "../../services/progression/types";

describe("autoregulationService", () => {
  describe("computeAutoregulationSignal", () => {
    it("flags a rising RPE trend across sessions (most-recent-first ordering)", () => {
      // Most recent (8) is the hardest, oldest (6) was easiest — effort has
      // been climbing session over session at presumably the same prescription.
      const signal = computeAutoregulationSignal([
        { avgRpe10: 8 },
        { avgRpe10: 7 },
        { avgRpe10: 6 },
      ]);
      expect(signal.bias).toBe("suppress_increase");
      expect(signal.reason).toMatch(/trended up/);
    });

    it("does NOT flag a falling RPE trend (getting easier over time)", () => {
      const signal = computeAutoregulationSignal([
        { avgRpe10: 6 },
        { avgRpe10: 7 },
        { avgRpe10: 8 },
      ]);
      expect(signal.bias).toBe("neutral");
    });

    it("needs at least 2 rated sessions to establish a trend", () => {
      const signal = computeAutoregulationSignal([{ avgRpe10: 8 }]);
      expect(signal.bias).toBe("neutral");
    });

    it("skips null (unrated) sessions when building the trend", () => {
      const signal = computeAutoregulationSignal([
        { avgRpe10: null },
        { avgRpe10: 8 },
        { avgRpe10: 7 },
      ]);
      expect(signal.bias).toBe("suppress_increase");
    });

    it("flags low sleep even with a flat/falling RPE trend", () => {
      const signal = computeAutoregulationSignal(
        [{ avgRpe10: 6 }, { avgRpe10: 7 }],
        5, // hours
      );
      expect(signal.bias).toBe("suppress_increase");
      expect(signal.reason).toMatch(/slept under/i);
    });

    it("combines rising RPE + low sleep into one reason", () => {
      const signal = computeAutoregulationSignal(
        [{ avgRpe10: 8 }, { avgRpe10: 7 }],
        5,
      );
      expect(signal.bias).toBe("suppress_increase");
      expect(signal.reason).toMatch(/trended up/);
      expect(signal.reason).toMatch(/slept under/i);
    });

    it("is neutral with no history and good/no sleep data", () => {
      expect(computeAutoregulationSignal([]).bias).toBe("neutral");
      expect(computeAutoregulationSignal([], 8).bias).toBe("neutral");
      expect(computeAutoregulationSignal([], null).bias).toBe("neutral");
      expect(computeAutoregulationSignal([], undefined).bias).toBe("neutral");
    });
  });

  describe("applyAutoregulation", () => {
    const basePrescription: ProgressionPrescription = {
      scheme: "double",
      action: "increase",
      suggestedWeightKg: 65,
      reason: "All sets at 12 reps — increase by 2.5kg",
    };

    it("downgrades an 'increase' to a 'hold' at the previous session's weight when suppressed", () => {
      const result = applyAutoregulation(
        basePrescription,
        { bias: "suppress_increase", reason: "Effort has trended up" },
        60,
      );
      expect(result.action).toBe("hold");
      expect(result.suggestedWeightKg).toBe(60);
      expect(result.doubleJump).toBe(false);
      expect(result.reason).toMatch(/Effort has trended up/);
      expect(result.reason).toMatch(/the numbers alone said/);
    });

    it("leaves a 'hold' prescription untouched even when suppressed — nothing to dampen further", () => {
      const holdPrescription: ProgressionPrescription = {
        ...basePrescription,
        action: "hold",
      };
      const result = applyAutoregulation(
        holdPrescription,
        { bias: "suppress_increase", reason: "irrelevant" },
        60,
      );
      expect(result).toEqual(holdPrescription);
    });

    it("leaves a 'deload' prescription untouched even when suppressed", () => {
      const deloadPrescription: ProgressionPrescription = {
        ...basePrescription,
        action: "deload",
      };
      const result = applyAutoregulation(
        deloadPrescription,
        { bias: "suppress_increase", reason: "irrelevant" },
        60,
      );
      expect(result).toEqual(deloadPrescription);
    });

    it("leaves any prescription untouched when the signal is neutral", () => {
      const result = applyAutoregulation(
        basePrescription,
        { bias: "neutral", reason: "no signal" },
        60,
      );
      expect(result).toEqual(basePrescription);
    });

    it("clears doubleJump when downgrading a double-jump increase", () => {
      const doubleJumpPrescription: ProgressionPrescription = {
        ...basePrescription,
        suggestedWeightKg: 70,
        doubleJump: true,
      };
      const result = applyAutoregulation(
        doubleJumpPrescription,
        { bias: "suppress_increase", reason: "Effort has trended up" },
        60,
      );
      expect(result.action).toBe("hold");
      expect(result.doubleJump).toBe(false);
      expect(result.suggestedWeightKg).toBe(60);
    });
  });
});
