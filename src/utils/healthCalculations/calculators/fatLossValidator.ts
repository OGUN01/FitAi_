/**
 * FAT LOSS VALIDATOR
 * Flexible validation with tiered warnings
 *
 * Research-backed safe weight loss rates:
 * - Standard: 0.5-1 kg/week (most sustainable)
 * - Aggressive: 1-1.5 kg/week (requires strict adherence)
 * - Very Aggressive: 1.5-2 kg/week (short-term only, 8-12 weeks max)
 * - Extreme: >2 kg/week (medical supervision recommended)
 *
 * Phase 3: Advanced Health Features
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { GoalValidation } from "../types";

export class FatLossValidator {
  /**
   * Validate fat loss goal with tiered feedback system
   * Provides flexible validation rather than hard blocks
   */
  validateGoal(
    currentWeight: number,
    targetWeight: number,
    timelineWeeks: number,
    bmi: number,
  ): GoalValidation {
    const weightToLose = currentWeight - targetWeight;
    const weeklyRate = weightToLose / timelineWeeks;

    // Calculate safe deficit based on BMI
    const maxDeficit = bmi > 35 ? 1500 : bmi > 30 ? 1200 : 1000;

    // Tier 1: Standard (0.5-1 kg/week) - OPTIMAL
    if (weeklyRate <= 1.0) {
      return {
        valid: true,
        severity: "success",
        message: `${weeklyRate.toFixed(1)}kg/week is sustainable and healthy. Excellent goal! This rate maximizes fat loss while preserving muscle mass.`,
        achievementProbability: 85,
        recommendations: [
          "Maintain high protein (2.0-2.4g/kg bodyweight)",
          "Include resistance training 3-4x/week",
          "Expect steady, sustainable progress",
          "Minimal muscle loss risk",
          "High adherence likelihood",
        ],
      };
    }

    // Tier 2: Aggressive (1-1.5 kg/week) - CHALLENGING
    if (weeklyRate <= 1.5) {
      return {
        valid: true,
        severity: "info",
        message: `${weeklyRate.toFixed(1)}kg/week is aggressive but achievable. Requires strict adherence and may be challenging to maintain long-term.`,
        achievementProbability: 60,
        recommendations: [
          "Very high protein (2.5g/kg bodyweight)",
          "Aggressive resistance training 4-5x/week",
          "Monitor energy levels closely",
          "Consider diet breaks every 8-12 weeks",
          "Increased hunger and fatigue expected",
          "Track strength to monitor muscle loss",
        ],
      };
    }

    // Tier 3: Very Aggressive (1.5-2 kg/week) - HIGH RISK
    if (weeklyRate <= 2.0) {
      return {
        valid: true,
        severity: "warning",
        message: `${weeklyRate.toFixed(1)}kg/week is very aggressive. Recommended only for 8-12 weeks maximum. Significant risk of muscle loss and metabolic adaptation.`,
        achievementProbability: 40,
        recommendations: [
          "Maximum protein (2.5-3.0g/kg bodyweight)",
          "Heavy resistance training mandatory (prevent muscle loss)",
          "Plan diet breaks every 8-12 weeks",
          "Monitor strength loss carefully",
          "Consider slower approach for sustainability",
          "High refeed days (1-2x/week) may help",
          "Expect significant hunger and low energy",
        ],
        suggestedTimeline: Math.ceil(weightToLose / 1.0),
        suggestion: `Consider ${Math.ceil(weightToLose / 1.0)} weeks at 1kg/week for better muscle preservation.`,
      };
    }

    // Tier 4: Extreme (>2 kg/week) - Context-dependent
    // Higher BMI allows more aggressive deficits safely
    if (bmi > 35) {
      return {
        valid: true,
        severity: "warning",
        message: `${weeklyRate.toFixed(1)}kg/week is extreme but may be appropriate given your current BMI (${bmi.toFixed(1)}). Medical supervision strongly recommended.`,
        achievementProbability: 30,
        recommendations: [
          "Medical consultation strongly advised",
          "Very high protein (3g/kg lean mass)",
          "Frequent monitoring (weekly check-ins)",
          "Aggressive resistance training essential",
          "Plan for slower rate as BMI decreases",
          "Blood work to monitor health markers",
          "Expect significant metabolic adaptation",
        ],
        allowOverride: true,
        suggestion: `As BMI improves, plan to reduce rate to 1-1.5kg/week for final 10-15kg.`,
      };
    }

    // Tier 4: Extreme (>2 kg/week) - Low/Normal BMI
    return {
      valid: true,
      severity: "error",
      message: `${weeklyRate.toFixed(1)}kg/week is extremely aggressive and likely unsustainable. Strong risk of muscle loss, metabolic damage, and rebound weight gain.`,
      achievementProbability: 10,
      suggestion: `To lose ${weightToLose.toFixed(1)}kg safely, consider ${Math.ceil(weightToLose / 1)}weeks (1kg/week) or ${Math.ceil(weightToLose / 0.75)}weeks (0.75kg/week).`,
      allowOverride: true,
      recommendations: [
        "Strongly reconsider timeline",
        "Focus on sustainable approach",
        "Preserve lean mass priority",
        "Extreme deficits rarely work long-term",
        "Very high rebound risk",
        "Consider professional guidance",
      ],
    };
  }

  /**
   * Calculate recommended deficit based on BMI and activity level
   */
  calculateSafeDeficit(
    bmi: number,
    tdee: number,
    activityLevel: string,
  ): {
    minDeficit: number;
    maxDeficit: number;
    recommendedDeficit: number;
  } {
    let maxDeficit: number;

    // BMI-based deficit limits
    if (bmi > 35) {
      maxDeficit = 1500; // Aggressive deficit allowed for obese individuals
    } else if (bmi > 30) {
      maxDeficit = 1200;
    } else if (bmi > 27) {
      maxDeficit = 1000;
    } else {
      maxDeficit = 750; // Conservative for normal/overweight
    }

    // Activity level modifier (active people can handle larger deficits)
    const activityFactors: Record<string, number> = {
      sedentary: 0.8,
      light: 0.9,
      moderate: 1.0,
      active: 1.1,
      very_active: 1.15,
    };
    const activityMultiplier: number =
      activityFactors[activityLevel as string] || 1.0;

    const adjustedMaxDeficit = Math.round(maxDeficit * activityMultiplier);

    return {
      minDeficit: 300, // Minimum for meaningful fat loss
      maxDeficit: Math.min(adjustedMaxDeficit, tdee * 0.4), // Never exceed 40% of TDEE
      recommendedDeficit: Math.min(500, adjustedMaxDeficit * 0.7), // Conservative recommendation
    };
  }

  /**
   * Validate timeline is realistic for target weight loss
   */
  validateTimeline(
    currentWeight: number,
    targetWeight: number,
    bmi: number,
  ): {
    minWeeks: number;
    optimalWeeks: number;
    maxWeeks: number;
  } {
    const weightToLose = currentWeight - targetWeight;

    // Conservative rate: 0.5kg/week
    const maxWeeks = Math.ceil(weightToLose / 0.5);

    // Optimal rate: 0.75kg/week
    const optimalWeeks = Math.ceil(weightToLose / 0.75);

    // Aggressive rate: depends on BMI
    const aggressiveRate = bmi > 30 ? 1.5 : 1.0;
    const minWeeks = Math.ceil(weightToLose / aggressiveRate);

    return {
      minWeeks,
      optimalWeeks,
      maxWeeks,
    };
  }

  /**
   * Calculate protein requirements for fat loss
   * Higher protein = better muscle preservation
   */
  calculateProteinRequirements(
    leanBodyMass: number,
    weeklyRate: number,
  ): {
    minimum: number;
    optimal: number;
    maximum: number;
  } {
    // More aggressive deficit = higher protein needed
    let multiplier: number;

    if (weeklyRate <= 0.5) {
      multiplier = 2.0; // Moderate deficit
    } else if (weeklyRate <= 1.0) {
      multiplier = 2.2; // Standard deficit
    } else if (weeklyRate <= 1.5) {
      multiplier = 2.5; // Aggressive deficit
    } else {
      multiplier = 3.0; // Very aggressive deficit
    }

    return {
      minimum: Math.round(leanBodyMass * (multiplier - 0.3)),
      optimal: Math.round(leanBodyMass * multiplier),
      maximum: Math.round(leanBodyMass * (multiplier + 0.3)),
    };
  }
}

// Export singleton instance
export const fatLossValidator = new FatLossValidator();
