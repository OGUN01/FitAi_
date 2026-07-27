import {
  calculateBMI,
  getBMICategory,
  getBMICategoryWithRisk,
  getAsianBMICategory,
  validateBMIInputs,
} from "../../../utils/healthCalculations/core/bmiCalculation";
import {
  calculateBMR,
  calculateBMRHarrisBenedict,
  calculateBMRKatchMcArdle,
  calculateBMRCunningham,
  calculateBMRWithFormula,
  validateBMRInputs,
} from "../../../utils/healthCalculations/core/bmrCalculation";
import {
  calculateTDEE,
  calculateTDEEWithClimate,
  calculateTDEEDetailed,
  calculateBaseTDEE,
  getCalorieTarget,
  validateTDEEInputs,
} from "../../../utils/healthCalculations/core/tdeeCalculation";
import type { ActivityLevel, ClimateType } from "../../../utils/healthCalculations/types";

describe("bmiCalculation", () => {
  describe("calculateBMI", () => {
    it("calculates BMI rounded to 1 decimal place", () => {
      // 70 / (1.75 ^ 2) = 70 / 3.0625 = 22.857 -> 22.9
      expect(calculateBMI(70, 175)).toBe(22.9);
    });

    it("throws when weight is 0, null, or undefined", () => {
      expect(() => calculateBMI(0, 175)).toThrow("Weight is required");
      expect(() => calculateBMI(null as unknown as number, 175)).toThrow(
        "Weight is required",
      );
      expect(() => calculateBMI(undefined as unknown as number, 175)).toThrow(
        "Weight is required",
      );
    });

    it("throws when height is 0, null, or undefined", () => {
      expect(() => calculateBMI(70, 0)).toThrow("Height is required");
      expect(() => calculateBMI(70, null as unknown as number)).toThrow(
        "Height is required",
      );
      expect(() => calculateBMI(70, undefined as unknown as number)).toThrow(
        "Height is required",
      );
    });

    it("throws when weight is out of the 30-300 kg range", () => {
      expect(() => calculateBMI(25, 175)).toThrow("between 30-300");
      expect(() => calculateBMI(350, 175)).toThrow("between 30-300");
    });

    it("throws when height is out of the 100-250 cm range", () => {
      expect(() => calculateBMI(70, 90)).toThrow("between 100-250");
      expect(() => calculateBMI(70, 260)).toThrow("between 100-250");
    });
  });

  describe("getBMICategory", () => {
    it("classifies standard WHO categories", () => {
      expect(getBMICategory(17)).toBe("Underweight");
      expect(getBMICategory(22)).toBe("Normal weight");
      expect(getBMICategory(27)).toBe("Overweight");
      expect(getBMICategory(32)).toBe("Obese");
    });
  });

  describe("getBMICategoryWithRisk", () => {
    it("returns moderate risk for underweight", () => {
      const result = getBMICategoryWithRisk(17);
      expect(result.category).toBe("Underweight");
      expect(result.risk).toBe("moderate");
    });

    it("returns low risk for normal weight", () => {
      const result = getBMICategoryWithRisk(22);
      expect(result.category).toBe("Normal weight");
      expect(result.risk).toBe("low");
    });

    it("returns moderate risk for overweight", () => {
      const result = getBMICategoryWithRisk(27);
      expect(result.category).toBe("Overweight");
      expect(result.risk).toBe("moderate");
    });

    it("returns high risk for obese", () => {
      const result = getBMICategoryWithRisk(32);
      expect(result.category).toBe("Obese");
      expect(result.risk).toBe("high");
    });
  });

  describe("getAsianBMICategory", () => {
    it("uses lower thresholds than standard WHO", () => {
      // 22 is still normal (< 23.0 cutoff)
      expect(getAsianBMICategory(22)).toBe("Normal weight");
      // 24 is overweight in Asian scale (>= 23.0, < 27.5) but normal in standard
      expect(getAsianBMICategory(24)).toBe("Overweight");
      // 28 is obese in Asian scale (>= 27.5) vs 30 in standard
      expect(getAsianBMICategory(28)).toBe("Obese");
    });
  });

  describe("validateBMIInputs", () => {
    it("returns valid result for in-range inputs", () => {
      const result = validateBMIInputs(70, 175);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("adds an error when weight is missing", () => {
      const result = validateBMIInputs(null, 175);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Weight is required");
    });

    it("adds an error when height is out of range", () => {
      const result = validateBMIInputs(70, 90);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Height must be between 100-250 cm");
    });
  });
});

describe("bmrCalculation", () => {
  describe("calculateBMR (Mifflin-St Jeor)", () => {
    it("calculates BMR for a male", () => {
      // base = 10*70 + 6.25*175 - 5*30 = 700 + 1093.75 - 150 = 1643.75; +5 = 1648.75 -> 1649
      expect(calculateBMR(70, 175, 30, "male")).toBe(1649);
    });

    it("calculates BMR for a female", () => {
      // base = 10*60 + 6.25*165 - 5*25 = 600 + 1031.25 - 125 = 1506.25; -161 = 1345.25 -> 1345
      expect(calculateBMR(60, 165, 25, "female")).toBe(1345);
    });

    it("uses base - 78 for 'other' gender (average of male/female offsets)", () => {
      // base = 1643.75; 1643.75 - 78 = 1565.75 -> 1566
      expect(calculateBMR(70, 175, 30, "other")).toBe(1566);
      expect(calculateBMR(70, 175, 30, "prefer_not_to_say")).toBe(1566);
    });

    it("throws when weight, height, age, or gender is missing/zero", () => {
      expect(() => calculateBMR(0, 175, 30, "male")).toThrow("Weight is required");
      expect(() => calculateBMR(70, 0, 30, "male")).toThrow("Height is required");
      expect(() => calculateBMR(70, 175, 0, "male")).toThrow("Age is required");
      expect(() => calculateBMR(70, 175, 30, "")).toThrow("Gender is required");
    });

    it("throws when weight, height, or age is out of range", () => {
      expect(() => calculateBMR(25, 175, 30, "male")).toThrow("between 30-300");
      expect(() => calculateBMR(350, 175, 30, "male")).toThrow("between 30-300");
      expect(() => calculateBMR(70, 90, 30, "male")).toThrow("between 100-250");
      expect(() => calculateBMR(70, 260, 30, "male")).toThrow("between 100-250");
      expect(() => calculateBMR(70, 175, 10, "male")).toThrow("between 13-120");
      expect(() => calculateBMR(70, 175, 130, "male")).toThrow("between 13-120");
    });
  });

  describe("calculateBMRHarrisBenedict", () => {
    it("calculates BMR for a male", () => {
      // 88.362 + 13.397*70 + 4.799*175 - 5.677*30
      // = 88.362 + 937.79 + 839.825 - 170.31 = 1695.667 -> 1696
      expect(calculateBMRHarrisBenedict(70, 175, 30, "male")).toBe(1696);
    });

    it("calculates BMR for a female", () => {
      // 447.593 + 9.247*60 + 3.098*165 - 4.33*25
      // = 447.593 + 554.82 + 511.17 - 108.25 = 1405.333 -> 1405
      expect(calculateBMRHarrisBenedict(60, 165, 25, "female")).toBe(1405);
    });

    it("throws when any parameter is missing", () => {
      expect(() => calculateBMRHarrisBenedict(0, 175, 30, "male")).toThrow();
      expect(() => calculateBMRHarrisBenedict(70, 0, 30, "male")).toThrow();
      expect(() => calculateBMRHarrisBenedict(70, 175, 0, "male")).toThrow();
      expect(() => calculateBMRHarrisBenedict(70, 175, 30, "")).toThrow();
    });
  });

  describe("calculateBMRKatchMcArdle", () => {
    it("calculates BMR from lean body mass", () => {
      // leanMass = 70 * (1 - 0.15) = 59.5; 370 + 21.6*59.5 = 370 + 1285.2 = 1655.2 -> 1655
      expect(calculateBMRKatchMcArdle(70, 15)).toBe(1655);
    });

    it("throws when body fat is below 5% or above 60%", () => {
      expect(() => calculateBMRKatchMcArdle(70, 3)).toThrow("between 5-60");
      expect(() => calculateBMRKatchMcArdle(70, 65)).toThrow("between 5-60");
    });

    it("throws when weight or body fat is missing", () => {
      expect(() => calculateBMRKatchMcArdle(0, 15)).toThrow();
      expect(() => calculateBMRKatchMcArdle(70, 0)).toThrow();
    });
  });

  describe("calculateBMRCunningham", () => {
    it("calculates BMR for an athlete with low body fat", () => {
      // leanMass = 59.5; 500 + 22*59.5 = 500 + 1309 = 1809
      expect(calculateBMRCunningham(70, 15)).toBe(1809);
    });

    it("throws when body fat is below 5% or above 25% (stricter than Katch-McArdle)", () => {
      expect(() => calculateBMRCunningham(70, 3)).toThrow("5-25");
      expect(() => calculateBMRCunningham(70, 30)).toThrow("5-25");
    });

    it("throws when weight or body fat is missing", () => {
      expect(() => calculateBMRCunningham(0, 15)).toThrow();
      expect(() => calculateBMRCunningham(70, 0)).toThrow();
    });
  });

  describe("calculateBMRWithFormula", () => {
    it("uses Harris-Benedict when preferredFormula is set", () => {
      const result = calculateBMRWithFormula({
        weightKg: 70,
        heightCm: 175,
        age: 30,
        gender: "male",
        preferredFormula: "harris-benedict",
      });
      expect(result.bmr).toBe(1696);
      expect(result.formula).toBe("Harris-Benedict Revised (1984)");
      expect(result.accuracy).toBe("±10-15%");
    });

    it("throws when preferredFormula is katch-mcardle but body fat is missing", () => {
      expect(() =>
        calculateBMRWithFormula({
          weightKg: 70,
          heightCm: 175,
          age: 30,
          gender: "male",
          preferredFormula: "katch-mcardle",
        }),
      ).toThrow("Body fat percentage required for Katch-McArdle formula");
    });

    it("auto-selects Cunningham for an athlete with body fat <= 25", () => {
      const result = calculateBMRWithFormula({
        weightKg: 70,
        heightCm: 175,
        age: 30,
        gender: "male",
        bodyFatPercentage: 15,
        isAthlete: true,
      });
      expect(result.bmr).toBe(1809);
      expect(result.formula).toBe("Cunningham (1980) - Athlete Formula");
      expect(result.accuracy).toBe("±5%");
    });

    it("auto-selects Katch-McArdle when body fat is in the 5-60 range (non-athlete)", () => {
      // leanMass = 70*(1-0.30) = 49; 370 + 21.6*49 = 370 + 1058.4 = 1428.4 -> 1428
      const result = calculateBMRWithFormula({
        weightKg: 70,
        heightCm: 175,
        age: 30,
        gender: "male",
        bodyFatPercentage: 30,
        isAthlete: false,
      });
      expect(result.bmr).toBe(1428);
      expect(result.formula).toBe("Katch-McArdle (1996)");
      expect(result.accuracy).toBe("±5%");
    });

    it("falls back to Mifflin-St Jeor when no body fat is provided", () => {
      const result = calculateBMRWithFormula({
        weightKg: 70,
        heightCm: 175,
        age: 30,
        gender: "male",
      });
      expect(result.bmr).toBe(1649);
      expect(result.formula).toBe("Mifflin-St Jeor (1990)");
      expect(result.accuracy).toBe("±10%");
    });
  });

  describe("validateBMRInputs", () => {
    it("returns valid result for complete in-range inputs", () => {
      const result = validateBMRInputs({
        weightKg: 70,
        heightCm: 175,
        age: 30,
        gender: "male",
      });
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("adds an error for each invalid field", () => {
      const result = validateBMRInputs({
        weightKg: 0,
        heightCm: 50,
        age: 5,
        gender: "",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Weight is required");
      expect(result.errors).toContain("Height must be between 100-250 cm");
      expect(result.errors).toContain("Age must be between 13-120 years");
      expect(result.errors).toContain("Gender is required");
      expect(result.errors).toHaveLength(4);
    });
  });
});

describe("tdeeCalculation", () => {
  describe("calculateTDEE", () => {
    it("calculates TDEE for moderate activity", () => {
      // 1680 * 1.55 = 2604
      const moderate: ActivityLevel = "moderate";
      expect(calculateTDEE(1680, moderate)).toBe(2604);
    });

    it("calculates TDEE for sedentary activity", () => {
      // 1680 * 1.2 = 2016
      const sedentary: ActivityLevel = "sedentary";
      expect(calculateTDEE(1680, sedentary)).toBe(2016);
    });

    it("throws when BMR is <= 0", () => {
      expect(() => calculateTDEE(0, "moderate")).toThrow("Valid BMR required");
      expect(() => calculateTDEE(-100, "moderate")).toThrow("Valid BMR required");
    });

    it("throws when activity level is invalid", () => {
      expect(() =>
        calculateTDEE(1680, "invalid_level" as unknown as ActivityLevel),
      ).toThrow("Invalid activity level");
    });
  });

  describe("calculateTDEEWithClimate", () => {
    it("applies the tropical climate multiplier", () => {
      // 1680 * 1.55 * 1.075 = 2604 * 1.075 = 2799.3 -> 2799
      const moderate: ActivityLevel = "moderate";
      const tropical: ClimateType = "tropical";
      expect(calculateTDEEWithClimate(1680, moderate, tropical)).toBe(2799);
    });

    it("uses a 1.0 multiplier for the default temperate climate", () => {
      const moderate: ActivityLevel = "moderate";
      expect(calculateTDEEWithClimate(1680, moderate)).toBe(2604);
    });
  });

  describe("calculateTDEEDetailed", () => {
    it("returns a breakdown with the expected shape and formula string", () => {
      const moderate: ActivityLevel = "moderate";
      const tropical: ClimateType = "tropical";
      const result = calculateTDEEDetailed(1680, moderate, tropical);

      expect(result.tdee).toBe(2799);
      expect(result.breakdown).toEqual({
        bmr: 1680,
        activityMultiplier: 1.55,
        climateMultiplier: 1.075,
        activityTDEE: 2604,
        finalTDEE: 2799,
      });
      expect(result.formula).toBe(
        "BMR (1680) × Activity (1.55) × Climate (1.075) = 2799 kcal/day",
      );
    });
  });

  describe("calculateBaseTDEE", () => {
    it("calculates base TDEE from a desk_job occupation", () => {
      // 1680 * 1.25 = 2100
      expect(calculateBaseTDEE(1680, "desk_job")).toBe(2100);
    });

    it("defaults to the 1.25 multiplier for an unknown occupation", () => {
      expect(calculateBaseTDEE(1680, "unknown_occupation")).toBe(2100);
    });

    it("throws when BMR is <= 0", () => {
      expect(() => calculateBaseTDEE(0, "desk_job")).toThrow("Valid BMR required");
    });
  });

  describe("getCalorieTarget", () => {
    it("caps fat_loss deficit at 25% of TDEE for a moderate rate", () => {
      // weeklyDeficit = 0.5 * 7700 = 3850; dailyAdj = 3850/7 = 550;
      // cap = 2800 * 0.25 = 700; min(550, 700) = 550; 2800 - 550 = 2250
      expect(getCalorieTarget(2800, "fat_loss", 0.5)).toBe(2250);
    });

    it("caps muscle_gain surplus at 15% of TDEE", () => {
      // dailyAdj = 550; cap = 2800 * 0.15 = 420; min(550, 420) = 420; 2800 + 420 = 3220
      expect(getCalorieTarget(2800, "muscle_gain", 0.5)).toBe(3220);
    });

    it("returns TDEE unchanged for maintenance", () => {
      expect(getCalorieTarget(2800, "maintenance", 0.5)).toBe(2800);
    });

    it("binds at the 25% cap for fat_loss with an aggressive rate", () => {
      // weeklyDeficit = 2.0 * 7700 = 15400; dailyAdj = 15400/7 = 2200;
      // cap = 700; min(2200, 700) = 700; 2800 - 700 = 2100
      expect(getCalorieTarget(2800, "fat_loss", 2.0)).toBe(2100);
    });
  });

  describe("validateTDEEInputs", () => {
    it("returns valid result for in-range inputs", () => {
      const result = validateTDEEInputs(1680, "moderate");
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it("adds an error when BMR is missing or non-positive", () => {
      const result = validateTDEEInputs(0, "moderate");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Valid BMR is required");
    });

    it("adds an error when BMR is outside the 800-4000 range", () => {
      const result = validateTDEEInputs(500, "moderate");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("BMR must be between 800-4000 kcal/day");
    });

    it("adds an error when activity level is invalid", () => {
      const result = validateTDEEInputs(
        1680,
        "invalid_level" as unknown as ActivityLevel,
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Invalid activity level: invalid_level");
    });
  });
});
