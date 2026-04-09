/**
 * BODY METRICS CALCULATORS
 * Core body metrics calculations: BMR and BMI
 *
 * This module provides:
 * - BMR calculation using detected formulas
 * - BMI calculation with ethnicity-specific cutoffs
 * - Helper functions for body metrics
 *
 * Version: 1.0.0
 * Date: 2026-02-04
 */

import { getBMRCalculator, getBMICalculator } from "./calculators";
import type { HealthCalcProfile, EthnicityType } from "./types";

// ============================================================================
// TYPES
// ============================================================================

export interface BMRResult {
  value: number;
  formula: string;
  accuracy: string;
}

export interface BMIResult {
  value: number;
  classification: {
    category: string;
    healthRisk: "low" | "moderate" | "high" | "very_high";
    ethnicity: EthnicityType;
    message: string;
  };
}

// ============================================================================
// BMR CALCULATOR
// ============================================================================

export class BMRCalculatorService {
  /**
   * Calculate BMR using appropriate formula
   */
  static calculate(user: HealthCalcProfile, formula?: string): BMRResult {
    const calculator = getBMRCalculator(
      !!user.bodyFat,
      user.fitnessLevel === "elite",
    );

    const bmr = calculator.calculate(user);

    return {
      value: bmr,
      formula: formula || "auto-detected",
      accuracy: !!user.bodyFat ? "±5%" : "±10%",
    };
  }

  /**
   * Get BMR with detailed breakdown
   */
  static calculateWithBreakdown(user: HealthCalcProfile): {
    bmr: number;
    formula: string;
    accuracy: string;
    breakdown: {
      weight_contribution: number;
      height_contribution: number;
      age_contribution: number;
      gender_modifier: number;
    };
  } {
    const result = this.calculate(user);

    // Simplified breakdown (actual formulas vary)
    const weightContrib = user.weight * 10;
    const heightContrib = user.height * 6.25;
    const ageContrib = user.age * 5;
    const genderMod = user.gender === "male" ? 5 : -161;

    return {
      bmr: result.value,
      formula: result.formula,
      accuracy: result.accuracy,
      breakdown: {
        weight_contribution: weightContrib,
        height_contribution: heightContrib,
        age_contribution: -ageContrib,
        gender_modifier: genderMod,
      },
    };
  }
}

// ============================================================================
// BMI CALCULATOR
// ============================================================================

export class BMICalculatorService {
  /**
   * Calculate BMI with ethnicity-specific classification
   */
  static calculate(
    weight: number,
    height: number,
    ethnicity: EthnicityType,
  ): BMIResult {
    const calculator = getBMICalculator(ethnicity);
    const bmi = calculator.calculate(weight, height);
    const classification = calculator.getClassification(bmi);

    return {
      value: bmi,
      classification: {
        category: classification.category,
        healthRisk: classification.healthRisk,
        ethnicity: ethnicity,
        message: classification.message || "",
      },
    };
  }

  /**
   * Get BMI with comparison across ethnicities
   */
  static calculateWithComparison(
    weight: number,
    height: number,
  ): {
    bmi: number;
    classifications: {
      asian: string;
      african: string;
      caucasian: string;
      hispanic: string;
      general: string;
    };
  } {
    const bmi = weight / Math.pow(height / 100, 2);

    const ethnicities: Array<
      "asian" | "african" | "caucasian" | "hispanic" | "general"
    > = ["asian", "african", "caucasian", "hispanic", "general"];

    const classifications = {} as {
      asian: string;
      african: string;
      caucasian: string;
      hispanic: string;
      general: string;
    };
    ethnicities.forEach((eth) => {
      const calc = getBMICalculator(eth);
      const result = calc.getClassification(bmi);
      classifications[eth] = result.category;
    });

    return {
      bmi,
      classifications,
    };
  }

  /**
   * Get ideal weight range for height and ethnicity
   */
  static getIdealWeightRange(
    height: number,
    ethnicity: EthnicityType,
  ): { min: number; max: number; target: number } {
    // Get ethnicity-specific healthy BMI range
    let minBMI = 18.5;
    let maxBMI = 25;

    if (ethnicity === "asian") {
      minBMI = 18.5;
      maxBMI = 23;
    } else if (ethnicity === "black_african") {
      minBMI = 18.5;
      maxBMI = 27;
    }

    const heightM = height / 100;
    const minWeight = minBMI * Math.pow(heightM, 2);
    const maxWeight = maxBMI * Math.pow(heightM, 2);
    const targetWeight = ((minBMI + maxBMI) / 2) * Math.pow(heightM, 2);

    return {
      min: Math.round(minWeight * 10) / 10,
      max: Math.round(maxWeight * 10) / 10,
      target: Math.round(targetWeight * 10) / 10,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate lean body mass
 */
export function calculateLeanBodyMass(weight: number, bodyFat: number): number {
  return weight * (1 - bodyFat / 100);
}

/**
 * Estimate body fat percentage from BMI
 */
export function estimateBodyFatFromBMI(
  bmi: number,
  age: number,
  gender: "male" | "female",
): number {
  // Deurenberg formula
  const genderFactor = gender === "male" ? 1 : 0;
  return 1.2 * bmi + 0.23 * age - 10.8 * genderFactor - 5.4;
}

/**
 * Calculate body surface area (Mosteller formula)
 */
export function calculateBodySurfaceArea(
  weight: number,
  height: number,
): number {
  return Math.sqrt((height * weight) / 3600);
}
