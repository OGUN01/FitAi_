/**
 * MUSCLE GAIN CALCULATOR
 * Experience-based natural muscle gain limits
 *
 * Research-backed formulas from:
 * - Lyle McDonald's Model (Natural Muscle Building)
 * - Alan Aragon's Model (Monthly Gains)
 * - Eric Helms (Muscle Gain Hierarchy)
 *
 * Phase 3: Advanced Health Features
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { UserProfile, MuscleGainLimits, GoalValidation } from "../types";

export class MuscleGainCalculator {
  /**
   * Calculate maximum realistic muscle gain rate
   * Based on research by Lyle McDonald, Alan Aragon, Eric Helms
   *
   * Natural muscle gain limits by training experience:
   * - Beginner (0-1 years): 1-2% bodyweight/month
   * - Intermediate (1-3 years): 0.5-1% bodyweight/month
   * - Advanced (3-5 years): 0.25-0.5% bodyweight/month
   * - Elite (5+ years): 0.1-0.25% bodyweight/month
   */
  calculateMaxGainRate(user: UserProfile): MuscleGainLimits {
    const trainingYears = user.workoutExperienceYears || 0;
    const age = user.age;
    const gender = user.gender;

    // Base rates by experience (kg/month)
    let monthlyKg: number;
    let category: "Beginner" | "Intermediate" | "Advanced" | "Elite";

    if (trainingYears < 1) {
      monthlyKg = gender === "male" ? 1.0 : 0.5;
      category = "Beginner";
    } else if (trainingYears < 3) {
      monthlyKg = gender === "male" ? 0.5 : 0.25;
      category = "Intermediate";
    } else if (trainingYears < 5) {
      monthlyKg = gender === "male" ? 0.25 : 0.125;
      category = "Advanced";
    } else {
      monthlyKg = gender === "male" ? 0.1 : 0.05;
      category = "Elite";
    }

    // Age adjustments (research-backed)
    if (age < 20) {
      // Natural growth hormone advantage
      monthlyKg *= 1.15;
    } else if (age >= 40 && age < 50) {
      // Slight decline in anabolic hormones
      monthlyKg *= 0.9;
    } else if (age >= 50 && age < 60) {
      // Moderate hormonal decline
      monthlyKg *= 0.8;
    } else if (age >= 60) {
      // Sarcopenia (age-related muscle loss) mitigation
      monthlyKg *= 0.7;
    }

    return {
      maxMonthlyGain: Math.round(monthlyKg * 100) / 100,
      maxWeeklyGain: Math.round((monthlyKg / 4) * 100) / 100,
      confidence: trainingYears > 0 ? 90 : 70,
      experienceLevel: category,
      recommendation: `As a ${category.toLowerCase()} lifter, you can expect to gain approximately ${Math.round(monthlyKg * 100) / 100}kg per month with proper training and nutrition.`,
    };
  }

  /**
   * Validate muscle gain goal against natural limits
   * Provides tiered feedback with realistic expectations
   */
  validateGoal(
    targetGain: number,
    timelineMonths: number,
    user: UserProfile,
  ): GoalValidation {
    const limits = this.calculateMaxGainRate(user);
    const maxGain = limits.maxMonthlyGain * timelineMonths;
    const requestedRate = targetGain / timelineMonths;

    // Tier 1: Within natural limits (80%+ achievement probability)
    if (targetGain <= maxGain) {
      return {
        valid: true,
        severity: "success",
        message: `Realistic goal! Natural limit: ${maxGain.toFixed(1)}kg in ${timelineMonths} months. Your target of ${targetGain.toFixed(1)}kg is achievable with proper training and nutrition.`,
        achievementProbability: 80,
        recommendations: [
          "Progressive overload training",
          "Protein: 1.6-2.2g/kg bodyweight",
          "Calorie surplus: 200-300 cal/day",
          "Adequate sleep (7-9 hours)",
          "Patience and consistency",
        ],
      };
    }

    // Tier 2: Slightly optimistic (50% achievement probability)
    if (targetGain <= maxGain * 1.3) {
      return {
        valid: true,
        severity: "info",
        message: `Slightly optimistic (${requestedRate.toFixed(2)}kg/month). Natural limit is ~${limits.maxMonthlyGain.toFixed(2)}kg/month, but perfect conditions might allow ${targetGain.toFixed(1)}kg in ${timelineMonths} months.`,
        achievementProbability: 50,
        suggestedTimeline: Math.ceil(targetGain / limits.maxMonthlyGain),
        recommendations: [
          "Very strict training adherence required",
          "High protein: 2.0-2.4g/kg bodyweight",
          "Optimal sleep and stress management",
          "Consider longer timeline for sustainability",
          `Realistic timeline: ${Math.ceil(targetGain / limits.maxMonthlyGain)} months`,
        ],
      };
    }

    // Tier 3: Very optimistic (20% achievement probability)
    return {
      valid: true,
      severity: "warning",
      message: `Very optimistic goal. Natural limit is ${maxGain.toFixed(1)}kg in ${timelineMonths} months (${limits.maxMonthlyGain.toFixed(2)}kg/month for ${limits.experienceLevel} lifters). Realistic expectation: ${maxGain.toFixed(1)}kg. Extra weight will likely be fat.`,
      achievementProbability: 20,
      suggestedTimeline: Math.ceil(targetGain / limits.maxMonthlyGain),
      recommendations: [
        "Focus on progressive overload",
        "Ensure adequate protein (2.0-2.4g/kg)",
        "Small calorie surplus (200-300 cal)",
        "Expect slower progress as experience increases",
        `Consider realistic timeline: ${Math.ceil(targetGain / limits.maxMonthlyGain)} months`,
        "Track body composition, not just scale weight",
        "Adjust expectations to avoid unnecessary fat gain",
      ],
    };
  }

  /**
   * Estimate muscle gain potential for first year
   * Useful for setting long-term expectations
   */
  estimateFirstYearPotential(user: UserProfile): {
    optimistic: number;
    realistic: number;
    conservative: number;
  } {
    const limits = this.calculateMaxGainRate(user);
    const baseYearly = limits.maxMonthlyGain * 12;

    return {
      optimistic: Math.round(baseYearly * 1.2 * 100) / 100,
      realistic: baseYearly,
      conservative: Math.round(baseYearly * 0.8 * 100) / 100,
    };
  }

  /**
   * Calculate total natural muscle gain potential (career)
   * Based on Alan Aragon's career muscle gain potential
   */
  calculateCareerPotential(user: UserProfile): {
    totalPotential: number;
    timeToReach: number;
    breakdown: {
      year1: number;
      year2: number;
      year3: number;
      year4: number;
      year5plus: number;
    };
  } {
    const gender = user.gender;
    const baseMultiplier = gender === "male" ? 1.0 : 0.5;

    // Career potential by year (decreasing returns)
    const year1 = 12 * baseMultiplier;
    const year2 = 6 * baseMultiplier;
    const year3 = 3 * baseMultiplier;
    const year4 = 1.5 * baseMultiplier;
    const year5plus = 1 * baseMultiplier;

    const totalPotential = year1 + year2 + year3 + year4 + year5plus;

    return {
      totalPotential: Math.round(totalPotential * 100) / 100,
      timeToReach: 5,
      breakdown: {
        year1: Math.round(year1 * 100) / 100,
        year2: Math.round(year2 * 100) / 100,
        year3: Math.round(year3 * 100) / 100,
        year4: Math.round(year4 * 100) / 100,
        year5plus: Math.round(year5plus * 100) / 100,
      },
    };
  }
}

// Export singleton instance
export const muscleGainCalculator = new MuscleGainCalculator();
