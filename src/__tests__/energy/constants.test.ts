/**
 * Energy model constants — Phase A.1 tests.
 */

import {
  NEAT_MULTIPLIERS,
  REALIZATION_FACTORS,
  RATE_BAND_THRESHOLDS,
  LEDGER_WINDOWS,
  CARDIO_INTENSITY_MODIFIERS,
  CARDIAC_RESPITORY_CONDITIONS,
  MIN_MEANINGFUL_WEEKLY_RATE_KG,
  MAX_PROJECTION_WEEKS,
} from "../../services/energy/constants";
import { CALORIE_PER_KG } from "../../services/validation/constants";

describe("energy/constants", () => {
  describe("NEAT_MULTIPLIERS", () => {
    it("excludes planned exercise (lower than ACTIVITY_MULTIPLIERS)", () => {
      // sedentary 1.20 vs the existing ACTIVITY_MULTIPLIERS sedentary 1.2 —
      // the key difference is that light/moderate/active/very_active are
      // all LOWER because they don't bake in exercise.
      expect(NEAT_MULTIPLIERS.sedentary).toBe(1.2);
      expect(NEAT_MULTIPLIERS.light).toBe(1.3);
      expect(NEAT_MULTIPLIERS.moderate).toBe(1.4);
      expect(NEAT_MULTIPLIERS.active).toBe(1.5);
      expect(NEAT_MULTIPLIERS.very_active).toBe(1.6);
    });

    it("includes the onboarding 'extreme' alias", () => {
      expect(NEAT_MULTIPLIERS.extreme).toBe(1.6);
    });
  });

  describe("CALORIE_PER_KG re-export", () => {
    it("re-exports the same constant from validation/constants", () => {
      // Importing from the energy constants should give the same value.
      const energyCal = require("../../services/energy/constants").CALORIE_PER_KG;
      expect(energyCal).toBe(CALORIE_PER_KG);
      expect(CALORIE_PER_KG).toBe(7700);
    });
  });

  describe("REALIZATION_FACTORS", () => {
    it("spans 0.75–1.00", () => {
      expect(REALIZATION_FACTORS.conservative).toBe(0.75);
      expect(REALIZATION_FACTORS.moderate).toBe(0.85);
      expect(REALIZATION_FACTORS.optimistic).toBe(1.0);
      expect(REALIZATION_FACTORS.optimistic).toBeGreaterThan(REALIZATION_FACTORS.conservative);
    });
  });

  describe("RATE_BAND_THRESHOLDS", () => {
    it("safe ≤ 0.75% body weight/week", () => {
      expect(RATE_BAND_THRESHOLDS.safe).toBe(0.0075);
    });
    it("unpredictable > 1.5% body weight/week", () => {
      expect(RATE_BAND_THRESHOLDS.unpredictable).toBe(0.015);
    });
  });

  describe("LEDGER_WINDOWS", () => {
    it("has observed/blended thresholds", () => {
      expect(LEDGER_WINDOWS.observedMinWeighIns).toBe(6);
      expect(LEDGER_WINDOWS.blendedMinWeighIns).toBe(3);
      expect(LEDGER_WINDOWS.observedLookbackDays).toBe(28);
      expect(LEDGER_WINDOWS.blendedMarginDays).toBe(4);
      expect(LEDGER_WINDOWS.observedMarginDays).toBe(2);
    });
  });

  describe("CARDIO_INTENSITY_MODIFIERS", () => {
    it("maps low/moderate/high", () => {
      expect(CARDIO_INTENSITY_MODIFIERS.low).toBe(0.8);
      expect(CARDIO_INTENSITY_MODIFIERS.moderate).toBe(1.0);
      expect(CARDIO_INTENSITY_MODIFIERS.high).toBe(1.2);
    });
    it("aliases onboarding intensity labels", () => {
      expect(CARDIO_INTENSITY_MODIFIERS.beginner).toBe(0.8);
      expect(CARDIO_INTENSITY_MODIFIERS.intermediate).toBe(1.0);
      expect(CARDIO_INTENSITY_MODIFIERS.advanced).toBe(1.2);
    });
  });

  describe("CARDIAC_RESPITORY_CONDITIONS", () => {
    it("contains heart-disease, hypertension, asthma, sleep-apnea", () => {
      expect(CARDIAC_RESPITORY_CONDITIONS.has("heart-disease")).toBe(true);
      expect(CARDIAC_RESPITORY_CONDITIONS.has("hypertension")).toBe(true);
      expect(CARDIAC_RESPITORY_CONDITIONS.has("asthma")).toBe(true);
      expect(CARDIAC_RESPITORY_CONDITIONS.has("sleep-apnea")).toBe(true);
    });
    it("does NOT contain conditions that are not cardiac/respiratory", () => {
      expect(CARDIAC_RESPITORY_CONDITIONS.has("diabetes-type2")).toBe(false);
      expect(CARDIAC_RESPITORY_CONDITIONS.has("arthritis")).toBe(false);
    });
  });

  describe("projection guards", () => {
    it("has a meaningful minimum rate", () => {
      expect(MIN_MEANINGFUL_WEEKLY_RATE_KG).toBeGreaterThan(0);
      expect(MIN_MEANINGFUL_WEEKLY_RATE_KG).toBeLessThan(0.1);
    });
    it("caps projection at 5 years", () => {
      expect(MAX_PROJECTION_WEEKS).toBe(260);
    });
  });
});
