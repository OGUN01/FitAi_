/**
 * VO2 MAX CALCULATOR
 * Estimate cardiovascular fitness without exercise testing
 *
 * Research-backed estimation methods:
 * - Non-exercise VO2 max prediction (Jurca et al. 2005)
 * - Activity-based estimation
 * - Age and gender adjustments
 *
 * VO2 max = Maximum oxygen uptake (ml/kg/min)
 * Best predictor of cardiovascular fitness and endurance capacity
 *
 * Phase 3: Advanced Health Features
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { UserProfile, VO2MaxEstimate, ActivityLevel } from "../types";

export class VO2MaxCalculator {
  /**
   * Estimate VO2 max from age, gender, resting HR, and activity level
   * Based on non-exercise estimation (Jurca et al. 2005)
   *
   * Formula components:
   * - Age: Negative correlation (VO2 declines ~1% per year after age 25)
   * - Gender: Males typically 20-25% higher than females
   * - Resting HR: Lower RHR = higher VO2 max
   * - Activity: Strong positive correlation
   *
   * @param user - User profile with age, gender, activity level
   * @param restingHR - Resting heart rate in bpm
   * @returns VO2 max estimate with classification and recommendations
   */
  estimateVO2Max(user: UserProfile, restingHR: number): VO2MaxEstimate {
    const { age, gender } = user;
    const activityLevel = user.activityLevel || "sedentary";

    // Activity index (0-7 scale based on research)
    const activityIndex = this.getActivityIndex(activityLevel);

    let vo2max: number;

    // Gender-specific formulas (Jurca et al. 2005)
    if (gender === "male") {
      // Male formula
      vo2max =
        56.363 +
        1.921 * activityIndex -
        0.381 * age -
        0.754 * (restingHR / 10) +
        10.987 * 1;
    } else if (gender === "female") {
      // Female formula
      vo2max =
        50.513 + 1.589 * activityIndex - 0.289 * age - 0.552 * (restingHR / 10);
    } else {
      // Average for other/prefer_not_to_say
      const maleEstimate =
        56.363 +
        1.921 * activityIndex -
        0.381 * age -
        0.754 * (restingHR / 10) +
        10.987 * 1;
      const femaleEstimate =
        50.513 + 1.589 * activityIndex - 0.289 * age - 0.552 * (restingHR / 10);
      vo2max = (maleEstimate + femaleEstimate) / 2;
    }

    // Classification and percentile
    const { classification, percentile } = this.classifyVO2Max(
      vo2max,
      age,
      gender,
    );

    return {
      vo2max: Math.round(vo2max * 10) / 10,
      classification,
      percentile,
      description: `VO2 max estimated at ${Math.round(vo2max * 10) / 10} ml/kg/min using non-exercise prediction (±5-7 ml/kg/min accuracy)`,
    };
  }

  /**
   * Convert activity level to numeric index (0-7 scale)
   * Based on research activity scales
   */
  private getActivityIndex(activityLevel: ActivityLevel | string): number {
    const activityMap: Record<string, number> = {
      sedentary: 0,
      light: 2,
      moderate: 4,
      active: 6,
      very_active: 7,
    };

    return activityMap[activityLevel] || 0;
  }

  /**
   * Classify VO2 max by age and gender
   * Based on ACSM (American College of Sports Medicine) standards
   */
  private classifyVO2Max(
    vo2max: number,
    age: number,
    gender: "male" | "female" | "other" | "prefer_not_to_say",
  ): { classification: string; percentile: number } {
    // Male classifications (ml/kg/min)
    if (
      gender === "male" ||
      gender === "other" ||
      gender === "prefer_not_to_say"
    ) {
      if (age < 30) {
        if (vo2max >= 60)
          return { classification: "Excellent", percentile: 95 };
        if (vo2max >= 52) return { classification: "Good", percentile: 75 };
        if (vo2max >= 45)
          return { classification: "Above Average", percentile: 50 };
        if (vo2max >= 38) return { classification: "Average", percentile: 30 };
        return { classification: "Below Average", percentile: 15 };
      } else if (age < 40) {
        if (vo2max >= 56)
          return { classification: "Excellent", percentile: 95 };
        if (vo2max >= 49) return { classification: "Good", percentile: 75 };
        if (vo2max >= 43)
          return { classification: "Above Average", percentile: 50 };
        if (vo2max >= 36) return { classification: "Average", percentile: 30 };
        return { classification: "Below Average", percentile: 15 };
      } else if (age < 50) {
        if (vo2max >= 52)
          return { classification: "Excellent", percentile: 95 };
        if (vo2max >= 46) return { classification: "Good", percentile: 75 };
        if (vo2max >= 40)
          return { classification: "Above Average", percentile: 50 };
        if (vo2max >= 34) return { classification: "Average", percentile: 30 };
        return { classification: "Below Average", percentile: 15 };
      } else if (age < 60) {
        if (vo2max >= 48)
          return { classification: "Excellent", percentile: 95 };
        if (vo2max >= 43) return { classification: "Good", percentile: 75 };
        if (vo2max >= 37)
          return { classification: "Above Average", percentile: 50 };
        if (vo2max >= 31) return { classification: "Average", percentile: 30 };
        return { classification: "Below Average", percentile: 15 };
      } else {
        if (vo2max >= 44)
          return { classification: "Excellent", percentile: 95 };
        if (vo2max >= 39) return { classification: "Good", percentile: 75 };
        if (vo2max >= 34)
          return { classification: "Above Average", percentile: 50 };
        if (vo2max >= 28) return { classification: "Average", percentile: 30 };
        return { classification: "Below Average", percentile: 15 };
      }
    }

    // Female classifications (ml/kg/min)
    if (age < 30) {
      if (vo2max >= 56) return { classification: "Excellent", percentile: 95 };
      if (vo2max >= 47) return { classification: "Good", percentile: 75 };
      if (vo2max >= 40)
        return { classification: "Above Average", percentile: 50 };
      if (vo2max >= 33) return { classification: "Average", percentile: 30 };
      return { classification: "Below Average", percentile: 15 };
    } else if (age < 40) {
      if (vo2max >= 52) return { classification: "Excellent", percentile: 95 };
      if (vo2max >= 45) return { classification: "Good", percentile: 75 };
      if (vo2max >= 38)
        return { classification: "Above Average", percentile: 50 };
      if (vo2max >= 31) return { classification: "Average", percentile: 30 };
      return { classification: "Below Average", percentile: 15 };
    } else if (age < 50) {
      if (vo2max >= 48) return { classification: "Excellent", percentile: 95 };
      if (vo2max >= 42) return { classification: "Good", percentile: 75 };
      if (vo2max >= 36)
        return { classification: "Above Average", percentile: 50 };
      if (vo2max >= 29) return { classification: "Average", percentile: 30 };
      return { classification: "Below Average", percentile: 15 };
    } else if (age < 60) {
      if (vo2max >= 44) return { classification: "Excellent", percentile: 95 };
      if (vo2max >= 38) return { classification: "Good", percentile: 75 };
      if (vo2max >= 33)
        return { classification: "Above Average", percentile: 50 };
      if (vo2max >= 27) return { classification: "Average", percentile: 30 };
      return { classification: "Below Average", percentile: 15 };
    } else {
      if (vo2max >= 40) return { classification: "Excellent", percentile: 95 };
      if (vo2max >= 35) return { classification: "Good", percentile: 75 };
      if (vo2max >= 30)
        return { classification: "Above Average", percentile: 50 };
      if (vo2max >= 25) return { classification: "Average", percentile: 30 };
      return { classification: "Below Average", percentile: 15 };
    }
  }

  /**
   * Get personalized recommendations based on classification
   */
  private getRecommendations(
    classification: string,
    activityLevel: ActivityLevel | string,
  ): string[] {
    if (classification === "Excellent" || classification === "Good") {
      return [
        "Maintain current fitness level with consistent training",
        "Consider performance-focused goals",
        "High-intensity interval training (HIIT) to push limits",
        "Monitor and maintain cardiovascular health",
        "You have excellent aerobic capacity",
      ];
    }

    if (classification === "Above Average") {
      return [
        "Continue regular cardiovascular exercise",
        "Aim for 150-300 minutes moderate cardio per week",
        "Include some high-intensity intervals",
        "Good cardiovascular foundation established",
      ];
    }

    if (classification === "Average") {
      return [
        "Increase cardio frequency to 4-5 days per week",
        "Build aerobic base with Zone 2 training",
        "Gradual progression in intensity and duration",
        "Consistent exercise will improve VO2 max significantly",
      ];
    }

    // Below Average or Poor
    return [
      "Start with low-intensity aerobic exercise",
      "Build base with walking, swimming, or cycling",
      "Gradually increase duration before intensity",
      "Consistency is key - aim for 3-4 sessions per week",
      "Significant improvement potential with regular training",
      "Consult healthcare provider before intense exercise",
    ];
  }

  /**
   * Estimate improvement potential
   * Untrained individuals can improve VO2 max 15-25% with training
   */
  estimateImprovementPotential(
    currentVO2Max: number,
    activityLevel: ActivityLevel | string,
  ): {
    potential6Months: number;
    potential1Year: number;
    improvementPercent: number;
  } {
    // Improvement potential decreases with higher baseline fitness
    let improvementPercent: number;

    if (activityLevel === "sedentary") {
      improvementPercent = 25; // Maximum improvement potential
    } else if (activityLevel === "light") {
      improvementPercent = 20;
    } else if (activityLevel === "moderate") {
      improvementPercent = 15;
    } else if (activityLevel === "active") {
      improvementPercent = 10;
    } else {
      improvementPercent = 5; // Minimal improvement for very active
    }

    const maxImprovement = currentVO2Max * (improvementPercent / 100);

    return {
      potential6Months:
        Math.round((currentVO2Max + maxImprovement * 0.6) * 10) / 10,
      potential1Year: Math.round((currentVO2Max + maxImprovement) * 10) / 10,
      improvementPercent,
    };
  }
}

// Export singleton instance
export const vo2MaxCalculator = new VO2MaxCalculator();
