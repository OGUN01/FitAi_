/**
 * GOAL CALCULATORS
 * Muscle gain and fat loss validation
 *
 * Version: 1.0.0
 * Date: 2026-02-04
 */

import { muscleGainCalculator, fatLossValidator } from "./calculators";
import type { UserProfile, GoalValidation } from "./types";

export interface MuscleGainLimits {
  monthlyRate: number;
  yearlyGain: number;
  classification: string;
}

export interface FatLossValidation {
  valid: boolean;
  severity: "success" | "warning" | "error";
  message: string;
  weeklyRate: number;
  adjustedTimeline?: number;
}

export class MuscleGainCalculatorService {
  static calculateLimits(user: UserProfile): MuscleGainLimits {
    try {
      const limits = muscleGainCalculator.calculateMaxGainRate(user);
      return {
        monthlyRate: limits.maxMonthlyGain,
        yearlyGain: limits.maxMonthlyGain * 12,
        classification: limits.experienceLevel,
      };
    } catch (error) {
      console.warn("[MuscleGainCalculator] Failed:", error);
      throw error;
    }
  }

  static validateGoal(
    targetGain: number,
    timelineMonths: number,
    user: UserProfile,
  ): GoalValidation {
    try {
      return muscleGainCalculator.validateGoal(
        targetGain,
        timelineMonths,
        user,
      );
    } catch (error) {
      console.warn("[MuscleGainCalculator] Validation failed:", error);
      return {
        valid: false,
        severity: "error",
        message: "Unable to validate muscle gain goal",
      };
    }
  }

  static getExperienceLevel(
    trainingYears: number,
    gender: "male" | "female" | "other" | "prefer_not_to_say",
  ): string {
    if (trainingYears < 1) return "Beginner";
    if (trainingYears < 2) return "Intermediate";
    if (trainingYears < 4) return "Advanced";
    return "Elite";
  }

  static getMonthlyGainRate(
    experienceLevel: string,
    gender: "male" | "female" | "other" | "prefer_not_to_say",
  ): number {
    const rates: Record<string, { male: number; female: number }> = {
      Beginner: { male: 1.0, female: 0.5 },
      Intermediate: { male: 0.5, female: 0.25 },
      Advanced: { male: 0.25, female: 0.125 },
      Elite: { male: 0.125, female: 0.0625 },
    };

    const rate = rates[experienceLevel];
    if (!rate) return 0.5;

    return gender === "female" ? rate.female : rate.male;
  }
}

export class FatLossValidatorService {
  static validate(
    currentWeight: number,
    targetWeight: number,
    timelineWeeks: number,
    bmi: number,
  ): FatLossValidation {
    try {
      const validation = fatLossValidator.validateGoal(
        currentWeight,
        targetWeight,
        timelineWeeks,
        bmi,
      );

      return {
        valid: validation.valid,
        severity: validation.severity as "success" | "warning" | "error",
        message: validation.message,
        weeklyRate: validation.weeklyRate || 0,
        adjustedTimeline: validation.adjustedTimeline,
      };
    } catch (error) {
      console.warn("[FatLossValidator] Failed:", error);
      return {
        valid: false,
        severity: "error",
        message: "Unable to validate fat loss goal",
        weeklyRate: 0,
      };
    }
  }

  static getSafeWeeklyRate(bmi: number): { min: number; max: number } {
    if (bmi > 30) {
      return { min: 0.5, max: 1.0 };
    } else if (bmi > 25) {
      return { min: 0.3, max: 0.7 };
    } else {
      return { min: 0.2, max: 0.5 };
    }
  }

  static estimateTimeline(
    currentWeight: number,
    targetWeight: number,
    bmi: number,
  ): { weeks: number; months: number } {
    const weightLoss = currentWeight - targetWeight;
    const safeRate = this.getSafeWeeklyRate(bmi);
    const avgWeeklyRate = (safeRate.min + safeRate.max) / 2;

    const weeks = Math.ceil(weightLoss / avgWeeklyRate);
    const months = Math.ceil(weeks / 4);

    return { weeks, months };
  }

  static getRecommendations(bmi: number, weeklyRate: number): string[] {
    const recommendations: string[] = [];

    const safeRate = this.getSafeWeeklyRate(bmi);
    if (weeklyRate > safeRate.max) {
      recommendations.push(
        `Reduce rate to ${safeRate.max} kg/week for sustainable results`,
      );
    }
    if (weeklyRate < safeRate.min) {
      recommendations.push(
        `Increase deficit slightly - current rate may be too slow`,
      );
    }

    if (bmi > 30) {
      recommendations.push("Consider consulting a healthcare professional");
    }

    recommendations.push("Focus on strength training to preserve muscle mass");
    recommendations.push("Ensure adequate protein intake (2.0-2.5g/kg)");

    return recommendations;
  }
}
