import {
  detectClimate,
  detectEthnicity,
  detectBestBMRFormula,
} from "./autoDetection";
import {
  BMRCalculatorService,
  BMICalculatorService,
} from "./bodyMetricsCalculators";
import {
  TDEECalculatorService,
  WaterCalculatorService,
  MacroCalculatorService,
} from "./nutritionCalculators";
import {
  HeartRateCalculatorService,
  VO2MaxCalculatorService,
  HealthScoreCalculatorService,
} from "./fitnessCalculators";
import { MuscleGainCalculatorService } from "./goalCalculators";
import type { UserProfile, ActivityLevel, DietType } from "./types";
import type { ComprehensiveHealthMetrics } from "./facadeTypes";

export class MetricsCalculator {
  static calculateAllMetrics(user: UserProfile): ComprehensiveHealthMetrics {
    console.log("[FACADE] Starting comprehensive health calculations for user");

    const climateResult = detectClimate(user.country, user.state);
    const ethnicityResult = detectEthnicity(user.country);
    const formulaSelection = detectBestBMRFormula(user);

    console.log("[FACADE] Context detected:", {
      climate: climateResult.climate,
      ethnicity: ethnicityResult.ethnicity,
      bmrFormula: formulaSelection.formula,
    });

    const bmrResult = BMRCalculatorService.calculate(
      user,
      formulaSelection.formula,
    );
    const bmiResult = BMICalculatorService.calculate(
      user.weight,
      user.height,
      ethnicityResult.ethnicity,
    );

    const activityLevel: ActivityLevel = user.activityLevel || "moderate";
    const tdeeResult = TDEECalculatorService.calculate(
      bmrResult.value,
      activityLevel,
      climateResult.climate,
    );
    const waterResult = WaterCalculatorService.calculate(
      user.weight,
      activityLevel,
      climateResult.climate,
    );

    console.log("[FACADE] Core metrics calculated:", {
      bmr: bmrResult.value,
      bmi: bmiResult.value,
      tdee: tdeeResult.tdee,
      water: waterResult.totalML,
    });

    const dietType: DietType = user.dietType || "omnivore";
    const goalType = (user.goal || "maintenance") as any;
    const macroResult = MacroCalculatorService.calculate(
      tdeeResult.tdee,
      user.weight,
      goalType,
      dietType,
    );

    console.log("[FACADE] Macros calculated:", {
      protein: macroResult.protein,
      macros: macroResult,
    });

    let hrZones = null;
    const restingHR = user.restingHR;
    if (restingHR && (user.gender === "male" || user.gender === "female")) {
      try {
        hrZones = HeartRateCalculatorService.calculateZones(
          user.age,
          user.gender as "male" | "female",
          restingHR,
        );
        console.log("[FACADE] Heart rate zones calculated");
      } catch (error) {
        console.warn("[FACADE] Failed to calculate heart rate zones:", error);
      }
    }

    let vo2max = null;
    if (restingHR) {
      try {
        vo2max = VO2MaxCalculatorService.estimate(user, restingHR);
        console.log("[FACADE] VO2 max estimated:", vo2max?.vo2max);
      } catch (error) {
        console.warn("[FACADE] Failed to estimate VO2 max:", error);
      }
    }

    let healthScore = null;
    try {
      healthScore = HealthScoreCalculatorService.calculate(user, {
        bmi: bmiResult.value,
        bmiCategory: bmiResult.classification.category,
        waterIntake: waterResult.totalML,
        waterTarget: waterResult.totalML,
        protein: macroResult.protein,
        proteinTarget: macroResult.protein,
        vo2max: vo2max?.vo2max,
      });
      console.log("[FACADE] Health score calculated:", healthScore.totalScore);
    } catch (error) {
      console.warn("[FACADE] Failed to calculate health score:", error);
    }

    let muscleGainLimits = null;
    const userGoal = user.goal;
    if (userGoal === "muscle_gain") {
      try {
        muscleGainLimits = MuscleGainCalculatorService.calculateLimits(user);
        console.log("[FACADE] Muscle gain limits calculated");
      } catch (error) {
        console.warn("[FACADE] Failed to calculate muscle gain limits:", error);
      }
    }

    const result: ComprehensiveHealthMetrics = {
      bmr: bmrResult.value,
      bmi: bmiResult.value,
      bmiClassification: {
        category: bmiResult.classification.category,
        healthRisk: bmiResult.classification.healthRisk,
        ethnicity: bmiResult.classification.ethnicity as any,
        message: bmiResult.classification.message as any,
      },
      tdee: tdeeResult.tdee,
      dailyCalories: tdeeResult.tdee,

      waterIntakeML: waterResult.totalML,
      protein: macroResult.protein,
      carbs: macroResult.carbs,
      fat: macroResult.fat,
      macroSplit: {
        protein_g: macroResult.protein,
        carbs_g: macroResult.carbs,
        fat_g: macroResult.fat,
        protein_percent: macroResult.percentages.protein_percent,
        carbs_percent: macroResult.percentages.carbs_percent,
        fat_percent: macroResult.percentages.fat_percent,
      },

      heartRateZones: hrZones as any,
      vo2max: vo2max as any,
      healthScore: healthScore as any,
      muscleGainLimits: muscleGainLimits as any,

      climate: climateResult.climate,
      ethnicity: ethnicityResult.ethnicity,
      bmrFormula: formulaSelection.formula,
      bmrAccuracy: formulaSelection.accuracy,
      bmrConfidence: formulaSelection.confidence,
      calculationDate: new Date().toISOString(),

      breakdown: {
        bmr: {
          formula: formulaSelection.formula,
          value: bmrResult.value,
          accuracy: formulaSelection.accuracy,
        },
        tdee: {
          baseTDEE: tdeeResult.baseTDEE,
          climateModifier: tdeeResult.climateModifier,
          finalTDEE: tdeeResult.finalTDEE,
        },
        water: waterResult.breakdown,
      },
    };

    console.log("[FACADE] ✅ All metrics calculated successfully");
    return result;
  }
}
