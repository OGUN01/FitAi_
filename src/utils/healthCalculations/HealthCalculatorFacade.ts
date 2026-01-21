/**
 * HEALTH CALCULATOR FACADE
 * Unified API for all health calculations in FitAI
 *
 * This facade provides a single entry point for:
 * - All health metric calculations (BMR, BMI, TDEE, water, macros, etc.)
 * - Goal validation
 * - Metric recalculation
 * - Data export
 *
 * Usage in onboarding:
 * ```typescript
 * const metrics = HealthCalculatorFacade.calculateAllMetrics(userProfile);
 * await saveToDatabase(metrics);
 * ```
 *
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import {
  detectClimate,
  detectEthnicity,
  detectBestBMRFormula,
} from "./autoDetection";
import {
  getBMRCalculator,
  getBMICalculator,
  tdeeCalculator,
  waterCalculator,
  macroCalculator,
  muscleGainCalculator,
  fatLossValidator,
  heartRateCalculator,
  vo2MaxCalculator,
  healthScoreCalculator,
} from "./calculators";
import type {
  UserProfile,
  ActivityLevel,
  DietType,
  ClimateType,
  EthnicityType,
  BMRFormula,
} from "./types";

// ============================================================================
// TYPES FOR FACADE
// ============================================================================

export interface ComprehensiveHealthMetrics {
  // Core Metrics
  bmr: number;
  bmi: number;
  bmiClassification: {
    category: string;
    healthRisk: "low" | "moderate" | "high" | "very_high";
    ethnicity: EthnicityType;
    message: string;
  };
  tdee: number;
  dailyCalories: number;

  // Hydration & Nutrition
  waterIntakeML: number;
  protein: number;
  carbs: number;
  fat: number;
  macroSplit: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  };

  // Advanced Cardio Metrics (optional)
  heartRateZones?: {
    resting: number;
    fatBurn: { min: number; max: number };
    cardio: { min: number; max: number };
    peak: { min: number; max: number };
    maxHR: number;
  } | null;

  vo2max?: {
    vo2max: number;
    classification: string;
    fitnessAge: number;
  } | null;

  // Health Assessment (optional)
  healthScore?: {
    totalScore: number;
    grade: string;
    breakdown: {
      bmi: number;
      bodyFat: number;
      hydration: number;
      nutrition: number;
      cardiovascular: number;
    };
    recommendations: string[];
  } | null;

  // Goal-Specific Metrics (optional)
  muscleGainLimits?: {
    monthlyRate: number;
    yearlyGain: number;
    classification: string;
  } | null;

  fatLossValidation?: {
    valid: boolean;
    severity: "success" | "warning" | "error";
    message: string;
    weeklyRate: number;
  } | null;

  // Context & Metadata
  climate: ClimateType;
  ethnicity: EthnicityType;
  bmrFormula: BMRFormula;
  bmrAccuracy: string;
  bmrConfidence: number;
  calculationDate: string;

  // Calculation breakdown for transparency
  breakdown?: {
    bmr: {
      formula: BMRFormula;
      value: number;
      accuracy: string;
    };
    tdee: {
      baseTDEE: number;
      climateModifier: number;
      finalTDEE: number;
    };
    water: {
      base_ml: number;
      climate_ml: number;
      activity_ml: number;
      final_ml: number;
    };
  };
}

export interface GoalInput {
  type: "fat_loss" | "muscle_gain" | "maintenance" | "recomp";
  targetWeight?: number;
  targetGain?: number;
  timelineWeeks?: number;
  timelineMonths?: number;
}

export interface GoalValidationResult {
  valid: boolean;
  severity: "success" | "warning" | "error";
  message: string;
  suggestions?: string[];
  adjustedTimeline?: number;
  weeklyRate?: number;
}

// ============================================================================
// HEALTH CALCULATOR FACADE
// ============================================================================

export class HealthCalculatorFacade {
  /**
   * Calculate ALL health metrics for a user
   * This is the main method - one call does everything
   */
  static calculateAllMetrics(user: UserProfile): ComprehensiveHealthMetrics {
    console.log("[FACADE] Starting comprehensive health calculations for user");

    // ========================================================================
    // STEP 1: AUTO-DETECT CONTEXT
    // ========================================================================

    const climateResult = detectClimate(user.country, user.state);
    const ethnicityResult = detectEthnicity(user.country);
    const formulaSelection = detectBestBMRFormula(user);

    console.log("[FACADE] Context detected:", {
      climate: climateResult.climate,
      ethnicity: ethnicityResult.ethnicity,
      bmrFormula: formulaSelection.formula,
    });

    // ========================================================================
    // STEP 2: SELECT APPROPRIATE CALCULATORS
    // ========================================================================

    const bmrCalc = getBMRCalculator(
      !!user.bodyFat,
      user.fitnessLevel === "elite",
    );
    const bmiCalc = getBMICalculator(ethnicityResult.ethnicity as any);

    // ========================================================================
    // STEP 3: CALCULATE CORE METRICS
    // ========================================================================

    const bmr = bmrCalc.calculate(user);
    const bmi = bmiCalc.calculate(user.weight, user.height);
    const bmiClass = bmiCalc.getClassification(bmi);

    const activityLevel: ActivityLevel = user.activityLevel || "moderate";
    const tdee = tdeeCalculator.calculate(
      bmr,
      activityLevel,
      climateResult.climate,
    );
    const water = waterCalculator.calculate(
      user.weight,
      activityLevel,
      climateResult.climate,
    );

    console.log("[FACADE] Core metrics calculated:", { bmr, bmi, tdee, water });

    // ========================================================================
    // STEP 4: CALCULATE MACROS
    // ========================================================================

    const dietType: DietType = user.dietType || "omnivore";
    const goalType = (user.goal || "maintenance") as any;
    const protein = macroCalculator.calculateProtein(
      user.weight,
      goalType,
      dietType,
    );
    const macros = macroCalculator.calculateMacroSplit(tdee, protein, dietType);

    console.log("[FACADE] Macros calculated:", { protein, macros });

    // ========================================================================
    // STEP 5: ADVANCED CALCULATIONS (OPTIONAL)
    // ========================================================================

    // Heart Rate Zones (requires resting HR)
    let hrZones = null;
    const restingHR = user.restingHR;
    if (restingHR) {
      try {
        hrZones = heartRateCalculator.calculateZones(
          user.age,
          user.gender,
          restingHR,
        );
        console.log("[FACADE] Heart rate zones calculated");
      } catch (error) {
        console.warn("[FACADE] Failed to calculate heart rate zones:", error);
      }
    }

    // VO2 Max Estimate (requires resting HR)
    let vo2max = null;
    if (restingHR) {
      try {
        vo2max = vo2MaxCalculator.estimateVO2Max(user, restingHR);
        console.log("[FACADE] VO2 max estimated:", vo2max?.vo2max);
      } catch (error) {
        console.warn("[FACADE] Failed to estimate VO2 max:", error);
      }
    }

    // Health Score (comprehensive assessment)
    let healthScore = null;
    try {
      healthScore = healthScoreCalculator.calculate(user, {
        bmi,
        bmiCategory: bmiClass.category,
        waterIntake: water,
        waterTarget: water,
        protein,
        proteinTarget: protein,
        vo2max: vo2max?.vo2max,
      });
      console.log("[FACADE] Health score calculated:", healthScore.totalScore);
    } catch (error) {
      console.warn("[FACADE] Failed to calculate health score:", error);
    }

    // ========================================================================
    // STEP 6: GOAL-SPECIFIC CALCULATIONS
    // ========================================================================

    let muscleGainLimits = null;
    const userGoal = user.goal;
    if (userGoal === "muscle_gain") {
      try {
        muscleGainLimits = muscleGainCalculator.calculateMaxGainRate(user);
        console.log("[FACADE] Muscle gain limits calculated");
      } catch (error) {
        console.warn("[FACADE] Failed to calculate muscle gain limits:", error);
      }
    }

    // Fat loss validation happens in validateGoal method

    // ========================================================================
    // STEP 7: ASSEMBLE COMPREHENSIVE RESULT
    // ========================================================================

    const result: ComprehensiveHealthMetrics = {
      // Core Metrics
      bmr,
      bmi,
      bmiClassification: {
        category: bmiClass.category,
        healthRisk: bmiClass.healthRisk,
        ethnicity: bmiClass.ethnicity,
        message: bmiClass.message,
      },
      tdee,
      dailyCalories: tdee,

      // Hydration & Nutrition
      waterIntakeML: water,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      macroSplit: {
        protein_g: macros.protein,
        carbs_g: macros.carbs,
        fat_g: macros.fat,
        protein_percent: Math.round(((macros.protein * 4) / tdee) * 100),
        carbs_percent: Math.round(((macros.carbs * 4) / tdee) * 100),
        fat_percent: Math.round(((macros.fat * 9) / tdee) * 100),
      },

      // Advanced Metrics
      heartRateZones: hrZones,
      vo2max,
      healthScore,
      muscleGainLimits,

      // Context
      climate: climateResult.climate,
      ethnicity: ethnicityResult.ethnicity,
      bmrFormula: formulaSelection.formula,
      bmrAccuracy: formulaSelection.accuracy,
      bmrConfidence: formulaSelection.confidence,
      calculationDate: new Date().toISOString(),

      // Breakdown for transparency
      breakdown: {
        bmr: {
          formula: formulaSelection.formula,
          value: bmr,
          accuracy: formulaSelection.accuracy,
        },
        tdee: {
          baseTDEE: bmr * this.getActivityMultiplier(activityLevel),
          climateModifier: this.getClimateModifier(climateResult.climate),
          finalTDEE: tdee,
        },
        water: {
          base_ml: user.weight * 33,
          climate_ml: this.getClimateWaterBonus(
            climateResult.climate,
            user.weight,
          ),
          activity_ml: this.getActivityWaterBonus(activityLevel, user.weight),
          final_ml: water,
        },
      },
    };

    console.log("[FACADE] ✅ All metrics calculated successfully");
    return result;
  }

  /**
   * Validate a user's fitness goal
   */
  static validateGoal(
    user: UserProfile,
    goal: GoalInput,
  ): GoalValidationResult {
    console.log("[FACADE] Validating goal:", goal.type);

    if (goal.type === "fat_loss") {
      if (!goal.targetWeight || !goal.timelineWeeks) {
        return {
          valid: false,
          severity: "error",
          message: "Fat loss goal requires target weight and timeline",
        };
      }

      const bmi = user.weight / Math.pow(user.height / 100, 2);
      const validation = fatLossValidator.validateGoal(
        user.weight,
        goal.targetWeight,
        goal.timelineWeeks,
        bmi,
      );

      return {
        valid: validation.valid,
        severity: validation.severity,
        message: validation.message,
        suggestions: validation.suggestion ? [validation.suggestion] : [],
        adjustedTimeline: validation.adjustedTimeline,
        weeklyRate: validation.weeklyRate,
      };
    }

    if (goal.type === "muscle_gain") {
      if (!goal.targetGain || !goal.timelineMonths) {
        return {
          valid: false,
          severity: "error",
          message: "Muscle gain goal requires target gain and timeline",
        };
      }

      const validation = muscleGainCalculator.validateGoal(
        goal.targetGain,
        goal.timelineMonths,
        user,
      );

      return {
        valid: validation.valid,
        severity: validation.severity,
        message: validation.message,
        suggestions: validation.suggestion ? [validation.suggestion] : [],
      };
    }

    // Maintenance or recomp goals are generally valid
    return {
      valid: true,
      severity: "success",
      message: "Valid goal!",
    };
  }

  /**
   * Recalculate metrics after profile update
   * Useful when user updates their weight, activity level, etc.
   */
  static recalculateMetrics(user: UserProfile): ComprehensiveHealthMetrics {
    console.log("[FACADE] Recalculating metrics after profile update");
    return this.calculateAllMetrics(user);
  }

  /**
   * Export metrics in a shareable format
   */
  static exportMetrics(metrics: ComprehensiveHealthMetrics): string {
    return JSON.stringify(
      {
        summary: {
          dailyCalories: metrics.dailyCalories,
          protein: metrics.protein,
          carbs: metrics.carbs,
          fat: metrics.fat,
          water: `${(metrics.waterIntakeML / 1000).toFixed(1)}L`,
          bmi: metrics.bmi.toFixed(1),
          bmr: Math.round(metrics.bmr),
        },
        context: {
          climate: metrics.climate,
          ethnicity: metrics.ethnicity,
          formula: metrics.bmrFormula,
        },
        calculationDate: metrics.calculationDate,
      },
      null,
      2,
    );
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private static getActivityMultiplier(level: ActivityLevel): number {
    const multipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    return multipliers[level] || 1.55;
  }

  private static getClimateModifier(climate: ClimateType): number {
    const modifiers = {
      tropical: 1.05,
      temperate: 1.0,
      cold: 1.1,
      arid: 1.03,
    };
    return modifiers[climate] || 1.0;
  }

  private static getClimateWaterBonus(
    climate: ClimateType,
    weight: number,
  ): number {
    const bonuses = {
      tropical: weight * 10,
      temperate: 0,
      cold: 0,
      arid: weight * 8,
    };
    return bonuses[climate] || 0;
  }

  private static getActivityWaterBonus(
    level: ActivityLevel,
    weight: number,
  ): number {
    const bonuses = {
      sedentary: 0,
      light: weight * 5,
      moderate: weight * 10,
      active: weight * 15,
      very_active: weight * 20,
    };
    return bonuses[level] || 0;
  }
}
