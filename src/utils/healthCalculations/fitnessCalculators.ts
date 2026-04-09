/**
 * FITNESS CALCULATORS
 * Heart rate zones, VO2 max, and health score calculations
 *
 * Version: 1.0.0
 * Date: 2026-02-04
 */

import {
  heartRateCalculator,
  vo2MaxCalculator,
  healthScoreCalculator,
} from "./calculators";
import type {
  HealthCalcProfile,
  HeartRateZones,
  VO2MaxEstimate,
  HealthScore as BaseHealthScore,
} from "./types";

export type { HeartRateZones, VO2MaxEstimate };

export interface HealthScore extends BaseHealthScore {
  grade?: string;
  breakdown?: {
    bmi: number;
    bodyFat: number;
    hydration: number;
    nutrition: number;
    cardiovascular: number;
  };
}

export class HeartRateCalculatorService {
  static calculateZones(
    age: number,
    gender: "male" | "female",
    restingHR: number,
  ): HeartRateZones {
    try {
      return heartRateCalculator.calculateZones(age, gender, restingHR);
    } catch (error) {
      // Re-throw to caller
      throw error;
    }
  }

  static estimateRestingHR(age: number, fitnessLevel: string): number {
    const baselines: Record<string, number> = {
      beginner: 75,
      intermediate: 65,
      advanced: 58,
      elite: 50,
    };
    if (!baselines[fitnessLevel]) {
      console.warn(`[fitnessCalculators] Unknown fitnessLevel "${fitnessLevel}" for resting HR estimation, returning 0`);
    }
    return baselines[fitnessLevel] || 0;
  }
}

export class VO2MaxCalculatorService {
  static estimate(user: HealthCalcProfile, restingHR: number): VO2MaxEstimate | null {
    if (!restingHR) {
      console.warn('[fitnessCalculators] Resting HR is 0 — cannot estimate VO2Max');
      return null;
    }
    try {
      const result = vo2MaxCalculator.estimateVO2Max(user, restingHR);
      if (!result) {
        throw new Error("VO2 max calculation returned null");
      }
      return result;
    } catch (error) {
      // Re-throw to caller
      throw error;
    }
  }

  static getClassification(
    vo2max: number,
    age: number,
    gender: "male" | "female",
  ): string {
    const classifications = {
      male: {
        20: [38, 44, 51, 56],
        30: [35, 41, 48, 53],
        40: [33, 38, 45, 50],
        50: [30, 35, 42, 47],
        60: [27, 32, 39, 44],
      },
      female: {
        20: [33, 38, 45, 50],
        30: [30, 35, 42, 47],
        40: [27, 32, 39, 44],
        50: [24, 29, 36, 41],
        60: [21, 26, 33, 38],
      },
    };

    const ageGroup = Math.floor(age / 10) * 10;
    const thresholds = classifications[gender]?.[
      ageGroup as keyof typeof classifications.male
    ] || [30, 35, 42, 47];

    if (vo2max < thresholds[0]) return "Poor";
    if (vo2max < thresholds[1]) return "Below Average";
    if (vo2max < thresholds[2]) return "Average";
    if (vo2max < thresholds[3]) return "Good";
    return "Excellent";
  }
}

export class HealthScoreCalculatorService {
  static calculate(
    user: HealthCalcProfile,
    metrics: {
      bmi: number;
      bmiCategory: string;
      waterIntake: number;
      waterTarget: number;
      protein: number;
      proteinTarget: number;
      vo2max?: number;
    },
  ): HealthScore {
    try {
      const result = healthScoreCalculator.calculate(user, metrics);
      if (!result) {
        throw new Error("Health score calculation returned null");
      }
      return result;
    } catch (error) {
      // Re-throw to caller
      throw error;
    }
  }

  static getGrade(score: number): string {
    if (score >= 90) return "A+";
    if (score >= 85) return "A";
    if (score >= 80) return "A-";
    if (score >= 75) return "B+";
    if (score >= 70) return "B";
    if (score >= 65) return "B-";
    if (score >= 60) return "C+";
    if (score >= 55) return "C";
    if (score >= 50) return "C-";
    if (score >= 45) return "D";
    return "F";
  }
}
