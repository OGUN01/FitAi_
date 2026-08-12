// 🧮 COMPREHENSIVE HEALTH CALCULATIONS ENGINE
// 50+ Mathematical Formulas for Fitness and Health Metrics

import { calculateBMI as calculateBMICore } from "./healthCalculations/core/bmiCalculation";
import { calculateBMR as calculateBMRCore } from "./healthCalculations/core/bmrCalculation";
import {
  calculateTDEE as calculateTDEECore,
  calculateBaseTDEE as calculateBaseTDEECore,
} from "./healthCalculations/core/tdeeCalculation";
import { getMETValue } from "./healthCalculations/core/metValues";
import type { ActivityLevel } from "./healthCalculations/types";

// ============================================================================
// BASIC METABOLIC CALCULATIONS
// ============================================================================

export class MetabolicCalculations {
  /**
   * Calculate BMI (Body Mass Index) - delegates to SSOT
   */
  static calculateBMI(weightKg: number, heightCm: number): number {
    return calculateBMICore(weightKg, heightCm);
  }

  /**
   * Calculate BMR (Basal Metabolic Rate) - delegates to SSOT
   */
  static calculateBMR(
    weightKg: number,
    heightCm: number,
    age: number,
    gender: string,
  ): number {
    return calculateBMRCore(weightKg, heightCm, age, gender);
  }

  /**
   * Calculate TDEE (Total Daily Energy Expenditure) - delegates to SSOT
   */
  static calculateTDEE(bmr: number, activityLevel: string): number {
    return calculateTDEECore(bmr, activityLevel as ActivityLevel);
  }

  /**
   * Calculate Base TDEE from Occupation - delegates to SSOT
   */
  static calculateBaseTDEE(bmr: number, occupation: string): number {
    return calculateBaseTDEECore(bmr, occupation);
  }

  /**
   * Estimate calories burned in a single workout session using MET values
   * Formula: MET × weight(kg) × duration(hours)
   */
  static estimateSessionCalorieBurn(
    durationMinutes: number,
    intensity: string,
    weight: number,
    workoutTypes: string[],
  ): number {
    // Determine workout type (use first in array, or 'mixed')
    const primaryType = workoutTypes[0]?.toLowerCase() || "mixed";
    const met = getMETValue(intensity, primaryType);

    // Formula: Calories = MET × weight(kg) × duration(hours)
    const hours = durationMinutes / 60;
    const caloriesBurned = met * weight * hours;

    return Math.round(caloriesBurned);
  }

  /**
   * Calculate total weekly exercise calorie burn
   */
  static calculateWeeklyExerciseBurn(
    frequency: number,
    duration: number,
    intensity: string,
    weight: number,
    workoutTypes: string[],
  ): number {
    const perSession = this.estimateSessionCalorieBurn(
      duration,
      intensity,
      weight,
      workoutTypes,
    );
    return perSession * frequency;
  }

  /**
   * Calculate average daily exercise calorie burn
   */
  static calculateDailyExerciseBurn(
    frequency: number,
    duration: number,
    intensity: string,
    weight: number,
    workoutTypes: string[],
  ): number {
    const weekly = this.calculateWeeklyExerciseBurn(
      frequency,
      duration,
      intensity,
      weight,
      workoutTypes,
    );
    return Math.round(weekly / 7);
  }

  /**
   * Get final body fat percentage using priority logic
   * Priority: User Input > AI Analysis > BMI Estimation > Default
   */
  static getFinalBodyFatPercentage(
    userInput?: number,
    aiEstimated?: number,
    aiConfidence?: number,
    bmi?: number,
    gender?: string,
    age?: number,
  ): {
    value: number;
    source:
      | "user_input"
      | "ai_analysis"
      | "bmi_estimation"
      | "default_estimate";
    confidence: "high" | "medium" | "low";
    showWarning: boolean;
  } {
    // Priority 1: User manual input (most reliable)
    if (userInput !== undefined && userInput > 0) {
      return {
        value: userInput,
        source: "user_input",
        confidence: "high",
        showWarning: false,
      };
    }

    // Priority 2: AI estimation (if confidence > 70%)
    if (aiEstimated && aiConfidence && aiConfidence > 70) {
      return {
        value: aiEstimated,
        source: "ai_analysis",
        confidence: "medium",
        showWarning: true,
      };
    }

    // Priority 3: BMI estimation (rough approximation)
    if (bmi && gender && age) {
      const estimated = this.estimateBodyFatFromBMI(bmi, gender, age);
      return {
        value: estimated,
        source: "bmi_estimation",
        confidence: "low",
        showWarning: true,
      };
    }

    // Fallback: Use conservative middle value
    return {
      value: gender === "male" ? 20 : 28,
      source: "default_estimate",
      confidence: "low",
      showWarning: true,
    };
  }

  /**
   * Calculate recommended intensity based on experience and fitness tests
   * Returns recommendation + reasoning (user can override)
   */
  static calculateRecommendedIntensity(
    workoutExperience: number,
    canDoPushups: number,
    canRunMinutes: number,
    age: number,
    gender: string,
  ): {
    recommendedIntensity: "beginner" | "intermediate" | "advanced";
    reasoning: string;
  } {
    // Primary factor: Experience (most reliable)
    if (workoutExperience >= 3) {
      return {
        recommendedIntensity: "advanced",
        reasoning: "3+ years training experience indicates advanced level",
      };
    }

    if (workoutExperience < 1) {
      return {
        recommendedIntensity: "beginner",
        reasoning:
          "Less than 1 year experience - starting with beginner intensity for safety",
      };
    }

    // For 1-3 years experience, use fitness assessment
    const pushupThreshold =
      gender === "male" ? (age < 40 ? 25 : 20) : age < 40 ? 15 : 10;

    const runThreshold = 15; // 15 minutes continuous run

    const meetsStrengthStandard = canDoPushups >= pushupThreshold;
    const meetsCardioStandard = canRunMinutes >= runThreshold;

    if (meetsStrengthStandard && meetsCardioStandard) {
      return {
        recommendedIntensity: "advanced",
        reasoning:
          "Strong fitness test results indicate advanced level capability",
      };
    }

    if (meetsStrengthStandard || meetsCardioStandard) {
      return {
        recommendedIntensity: "intermediate",
        reasoning: "1-3 years experience with solid fitness test results",
      };
    }

    return {
      recommendedIntensity: "beginner",
      reasoning: "Building foundation strength and cardio base recommended",
    };
  }

  /**
   * Calculate additional calories needed for pregnancy/breastfeeding
   * Evidence-based adjustments for maternal health and fetal development
   */
  static calculatePregnancyCalories(
    tdee: number,
    pregnancyStatus: boolean,
    trimester?: 1 | 2 | 3,
    breastfeedingStatus?: boolean,
  ): number {
    // Breastfeeding takes priority (can't be pregnant and breastfeeding simultaneously)
    if (breastfeedingStatus) {
      return tdee + 500; // +500 cal for milk production
    }

    if (pregnancyStatus && trimester) {
      if (trimester === 1) {
        return tdee; // No additional calories needed first trimester
      } else if (trimester === 2) {
        return tdee + 340; // +340 cal second trimester (rapid fetal growth)
      } else if (trimester === 3) {
        return tdee + 450; // +450 cal third trimester (maximum growth)
      }
    }

    return tdee;
  }

  /**
   * Calculate diet readiness score from 14 health habits
   * Returns 0-100 score predicting adherence likelihood
   */
  static calculateDietReadinessScore(dietPreferences: any): number {
    // Neutral-baseline rubric (parity with healthCalculations/metabolic.ts — the
    // review-tab SSOT). Unanswered habits map to a NEUTRAL 50 instead of the old
    // offset formula's ~23/13, which false-flagged untouched habit sections as
    // LOW_DIET_READINESS. Original relative weights preserved.
    let positive = 0;
    // Positive habits (add points)
    if (dietPreferences.drinks_enough_water) positive += 10;
    if (dietPreferences.limits_sugary_drinks) positive += 15;
    if (dietPreferences.eats_regular_meals) positive += 25; // Most predictive
    if (dietPreferences.avoids_late_night_eating) positive += 10;
    if (dietPreferences.controls_portion_sizes) positive += 30; // Highly predictive
    if (dietPreferences.reads_nutrition_labels) positive += 20;
    if (dietPreferences.eats_5_servings_fruits_veggies) positive += 20;
    if (dietPreferences.limits_refined_sugar) positive += 15;
    if (dietPreferences.includes_healthy_fats) positive += 10;

    let negative = 0;
    // Negative habits (subtract points)
    if (dietPreferences.eats_processed_foods) negative += 20;
    if (dietPreferences.drinks_alcohol) negative += 10;
    if (dietPreferences.smokes_tobacco) negative += 15;

    // Neutral 50 baseline; positives lift toward 100, negatives sink toward 0.
    // Max positive: 155, max negative: 45.
    const score = 50 + (positive / 155) * 50 - (negative / 45) * 50;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Calculate daily water intake recommendation
   * Formula: 35ml per kg body weight
   */
  static calculateWaterIntake(weightKg: number): number {
    return Math.round(weightKg * 35); // Returns ml
  }

  /**
   * Calculate daily fiber recommendation
   * Formula: 14g per 1000 calories
   */
  static calculateFiber(dailyCalories: number): number {
    return Math.round((dailyCalories / 1000) * 14);
  }

  /**
   * Estimate body fat percentage from BMI using Deurenberg formula
   */
  static estimateBodyFatFromBMI(
    bmi: number,
    gender: string,
    age: number,
  ): number {
    if (gender === "male") {
      return Math.round(1.2 * bmi + 0.23 * age - 16.2);
    } else if (gender === "female") {
      return Math.round(1.2 * bmi + 0.23 * age - 5.4);
    } else {
      // For 'other', use average
      const maleEst = 1.2 * bmi + 0.23 * age - 16.2;
      const femaleEst = 1.2 * bmi + 0.23 * age - 5.4;
      return Math.round((maleEst + femaleEst) / 2);
    }
  }

  /**
   * Apply age-based metabolic adjustments to TDEE
   * Metabolism declines with age - progressive adjustments
   */
  static applyAgeModifier(tdee: number, age: number, gender: string): number {
    let modifier = 1.0;

    // Note: Mifflin-St Jeor already accounts for age via -5×age in BMR.
    // Only apply additional modifier for ages ≥40 where metabolic slowdown
    // exceeds what the linear age term captures (parity with
    // healthCalculations/metabolic.ts — the SSOT this delegate chain follows).
    if (age >= 60) {
      modifier = 0.85; // -15% metabolism
    } else if (age >= 50) {
      modifier = 0.9; // -10% metabolism
    } else if (age >= 40) {
      modifier = 0.95; // -5% metabolism
    }
    // No modifier for age < 40 — the Mifflin formula covers it.

    // Additional adjustment for women in menopause age range
    if (gender === "female" && age >= 45 && age <= 55) {
      modifier = modifier * 0.95; // Additional -5% for potential menopause
    }

    return tdee * modifier;
  }

  /**
   * Apply sleep penalty to timeline
   * 20% timeline extension per hour of sleep under 7
   */
  static applySleepPenalty(timelineWeeks: number, sleepHours: number): number {
    if (sleepHours >= 7) return timelineWeeks; // No penalty

    // 20% penalty for each hour under 7
    const hoursUnder = 7 - sleepHours;
    const penaltyPercent = hoursUnder * 0.2;

    return Math.ceil(timelineWeeks * (1 + penaltyPercent));
  }

  /**
   * Calculate Metabolic Age
   * Compares actual BMR to expected BMR for age/gender
   * Uses improved age-based reference curves
   */
  static calculateMetabolicAge(
    bmr: number,
    chronologicalAge: number,
    gender: string,
    weightKg?: number,
  ): number {
    // Get expected BMR for chronological age
    const referenceBMR = MetabolicCalculations.getExpectedBMRForAge(
      chronologicalAge,
      gender,
    );

    // Reference BMRs are calibrated to a 70 kg person (see getExpectedBMRForAge).
    // When body weight is available, scale the reference to the user's frame —
    // otherwise heavier users (higher absolute BMR) always look "metabolically
    // young" and collapse to the floor of 18 (parity with
    // healthCalculations/metabolic.ts).
    const expectedBMR =
      weightKg && weightKg > 0 ? referenceBMR * (weightKg / 70) : referenceBMR;

    // S18 parity: percentage-based comparison (mirrors
    // healthCalculations/metabolic.ts — the review-tab SSOT). The old absolute
    // calPerYear=10 formula biased large-framed users to the floor, and ages
    // 13–17 hit no bracket → −Infinity → masked to exactly 18 for every teen.
    // Each 10% BMR deviation from the age-group reference = ~5 metabolic years.
    const bmrDifferencePercent = (expectedBMR - bmr) / expectedBMR;
    const metabolicAgeAdjustment = bmrDifferencePercent * 50;

    const metabolicAge = chronologicalAge + metabolicAgeAdjustment;

    // Cap between realistic bounds
    return Math.max(18, Math.min(85, Math.round(metabolicAge)));
  }

  /**
   * Get expected BMR for a given age and gender
   * Uses age-adjusted reference values based on population norms
   */
  private static getExpectedBMRForAge(age: number, gender: string): number {
    // Reference BMR values by age ranges (calibrated to 70kg for both sexes).
    // S18: teen brackets (onboarding floor is 13) — previously ages 13–17
    // matched nothing and every teen got metabolic age exactly 18.
    const maleReferences = [
      { ageRange: [13, 17], bmr: 1750 },
      { ageRange: [18, 24], bmr: 1750 },
      { ageRange: [25, 34], bmr: 1700 },
      { ageRange: [35, 44], bmr: 1650 },
      { ageRange: [45, 54], bmr: 1580 },
      { ageRange: [55, 64], bmr: 1500 },
      { ageRange: [65, 120], bmr: 1400 },
    ];

    const femaleReferences = [
      { ageRange: [13, 17], bmr: 1500 },
      { ageRange: [18, 24], bmr: 1500 },
      { ageRange: [25, 34], bmr: 1450 },
      { ageRange: [35, 44], bmr: 1400 },
      { ageRange: [45, 54], bmr: 1350 },
      { ageRange: [55, 64], bmr: 1300 },
      { ageRange: [65, 120], bmr: 1250 },
    ];

    const references = gender === "male" ? maleReferences : femaleReferences;

    // Find matching age range
    const match = references.find(
      (ref) => age >= ref.ageRange[0] && age <= ref.ageRange[1],
    );
    if (!match) {
      console.warn('[healthCalculations] Age out of range for BMR lookup, returning 0');
      return 0;
    }
    return match.bmr;
  }
}

// ============================================================================
// NUTRITIONAL CALCULATIONS
// ============================================================================
// NutritionalCalculations previously lived here as a hand-copied duplicate of
// healthCalculations/nutritional.ts and had silently drifted (underscore-only
// "muscle_gain" goal check that never matched the real "muscle-gain" values
// onboarding stores). It had zero production callers via this bare-specifier
// path — every live caller already imports the folder version directly — so
// it is re-exported below instead of duplicated. See the bottom of this file.

// ============================================================================
// BODY COMPOSITION CALCULATIONS
// ============================================================================

export class BodyCompositionCalculations {
  /**
   * Calculate ideal weight range using gender-specific formulas
   * Uses a combination of BMI and gender-based formulas (Devine, Robinson)
   * @param heightCm - Height in centimeters
   * @param gender - Gender ('male', 'female', 'other', 'prefer_not_to_say')
   * @param age - Age in years (optional, for age-based adjustments)
   */
  static calculateIdealWeightRange(
    heightCm: number,
    gender: string,
    age?: number,
  ): { min: number; max: number } {
    const heightM = heightCm / 100;

    // For 'other' or 'prefer_not_to_say', use BMI-based calculation
    if (gender === "other" || gender === "prefer_not_to_say") {
      return {
        min: Math.round(18.5 * heightM * heightM * 100) / 100,
        max: Math.round(24.9 * heightM * heightM * 100) / 100,
      };
    }

    // Convert height to inches for Devine/Robinson formulas
    const heightInches = heightCm / 2.54;
    const heightOver5Feet = Math.max(0, heightInches - 60); // Inches over 5 feet (60 inches)

    let idealWeight: number;

    if (gender === "male") {
      // Devine Formula for men: 50 kg + 2.3 kg per inch over 5 feet
      idealWeight = 50 + 2.3 * heightOver5Feet;
    } else {
      // Devine Formula for women: 45.5 kg + 2.3 kg per inch over 5 feet
      idealWeight = 45.5 + 2.3 * heightOver5Feet;
    }

    // Create a range: ±10% from ideal weight (clinically accepted range)
    const minWeight = idealWeight * 0.9;
    const maxWeight = idealWeight * 1.1;

    return {
      min: Math.round(minWeight * 100) / 100,
      max: Math.round(maxWeight * 100) / 100,
    };
  }

  /**
   * Calculate healthy weight loss rate based on weight and gender
   * Research shows men can lose weight faster while preserving lean muscle mass
   * Women should aim for slightly lower rates to maintain muscle mass
   * Formula: 0.5-1% of body weight per week, adjusted by gender
   *
   * @param currentWeight - Current weight in kg
   * @param gender - Gender ('male', 'female', 'other', 'prefer_not_to_say')
   * @returns Weekly weight loss rate in kg
   */
  static calculateHealthyWeightLossRate(
    currentWeight: number,
    gender?: string,
  ): number {
    // Calculate as percentage of body weight (0.5-1% per week is safe)
    let baseRate: number;

    if (currentWeight > 100) {
      baseRate = currentWeight * 0.01; // 1% for heavier individuals
    } else if (currentWeight > 80) {
      baseRate = currentWeight * 0.008; // 0.8% for moderate weight
    } else {
      baseRate = currentWeight * 0.006; // 0.6% for lighter individuals
    }

    // Gender-specific adjustments based on research
    // Women lose more lean muscle mass, so slightly lower rate is healthier
    if (gender === "female") {
      baseRate = baseRate * 0.85; // 15% lower for women to preserve muscle
    } else if (gender === "male") {
      baseRate = baseRate * 1.0; // Full rate for men
    } else {
      baseRate = baseRate * 0.925; // Middle ground for other/prefer_not_to_say
    }

    // Cap at safe limits (0.3-1.0 kg per week — aligned with ValidationEngine deficit cap)
    return Math.max(0.3, Math.min(1.0, baseRate));
  }

  /**
   * Calculate body fat percentage ranges (healthy ranges by age/gender)
   */
  static getHealthyBodyFatRange(
    age: number,
    gender: string,
  ): { min: number; max: number } {
    const ranges = {
      male: {
        "18-24": { min: 6, max: 17 },
        "25-34": { min: 7, max: 18 },
        "35-44": { min: 12, max: 21 },
        "45-54": { min: 14, max: 23 },
        "55+": { min: 16, max: 25 },
      },
      female: {
        "18-24": { min: 16, max: 24 },
        "25-34": { min: 16, max: 25 },
        "35-44": { min: 17, max: 28 },
        "45-54": { min: 18, max: 30 },
        "55+": { min: 18, max: 31 },
      },
    };

    const ageGroup =
      age < 25
        ? "18-24"
        : age < 35
          ? "25-34"
          : age < 45
            ? "35-44"
            : age < 55
              ? "45-54"
              : "55+";
    return (
      ranges[gender as keyof typeof ranges]?.[
        ageGroup as keyof typeof ranges.male
      ] || ranges.male["25-34"]
    );
  }

  /**
   * Calculate lean body mass and fat mass
   */
  static calculateBodyComposition(
    weightKg: number,
    bodyFatPercentage: number,
  ): {
    leanMass: number;
    fatMass: number;
  } {
    const fatMass = (weightKg * bodyFatPercentage) / 100;
    const leanMass = weightKg - fatMass;

    return {
      leanMass: Math.round(leanMass * 100) / 100,
      fatMass: Math.round(fatMass * 100) / 100,
    };
  }

  /**
   * Calculate waist-to-hip ratio
   */
  static calculateWaistHipRatio(waistCm: number, hipCm: number): number {
    return Math.round((waistCm / hipCm) * 100) / 100;
  }
}

// ============================================================================
// CARDIOVASCULAR FITNESS CALCULATIONS, FITNESS RECOMMENDATIONS, HEALTH
// SCORING, SLEEP ANALYSIS, MASTER CALCULATION ENGINE
// ============================================================================
// CardiovascularCalculations, FitnessRecommendations, HealthScoring,
// SleepAnalysis and HealthCalculationEngine previously lived here as
// hand-copied duplicates of their healthCalculations/*.ts counterparts.
// HealthScoring.calculateOverallHealthScore in particular had silently
// drifted from the fixed folder version: it started from a flat 100 and
// applied zero confidence weighting for missing optional fields (bmi,
// sleep window), so a near-empty profile scored near-100 instead of an
// honest mid-range value. None of these five had a live production caller
// via this bare-specifier path — every real call site imports the folder
// versions directly (e.g. useReviewValidation.ts imports
// HealthCalculationEngine from "./healthCalculations/master-engine") — so
// they are re-exported from the fixed folder implementations below instead
// of being duplicated here, eliminating the possibility of future drift.

// ============================================================================
// RE-EXPORTS FROM UNIVERSAL HEALTH CALCULATION SYSTEM
// ============================================================================
// Re-export key functions from the modular health calculations system
// This ensures backward compatibility when importing from 'utils/healthCalculations'

export {
  // Auto-detection functions
  detectClimate,
  detectEthnicity,
  detectBestBMRFormula,

  // Calculators
  waterCalculator,
  tdeeCalculator,
  macroCalculator,

  // Calculator classes
  ClimateAdaptiveWaterCalculator,
  ClimateAdaptiveTDEECalculator,

  // Types
  type ActivityLevel,
  type ClimateType,
  type ClimateDetectionResult,
} from "./healthCalculations/index";

// Fixed, single-source implementations — importing from the bare
// "utils/healthCalculations" specifier now always resolves to the same
// classes the live app uses, so a new caller can never accidentally
// reintroduce a fixed bug via this file.
export { CardiovascularCalculations } from "./healthCalculations/cardiovascular";
export { FitnessRecommendations } from "./healthCalculations/fitness-recommendations";
export { HealthScoring } from "./healthCalculations/health-scoring";
export { SleepAnalysis } from "./healthCalculations/sleep-analysis";
export { HealthCalculationEngine } from "./healthCalculations/master-engine";
export { NutritionalCalculations, resolveDietType } from "./healthCalculations/nutritional";
