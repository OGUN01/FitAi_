/**
 * COMPREHENSIVE HEALTH SCORE CALCULATOR
 * Overall health assessment across multiple dimensions
 *
 * Scoring Dimensions (100 points total):
 * - BMI/Body Composition (20 points)
 * - Activity Level (20 points)
 * - Hydration (15 points)
 * - Nutrition/Protein (25 points)
 * - Cardiovascular Fitness (20 points)
 *
 * Grade Scale:
 * - A (90-100): Excellent health
 * - B (80-89): Good health
 * - C (70-79): Fair health
 * - D (60-69): Needs improvement
 * - F (<60): Poor health
 *
 * Phase 3: Advanced Health Features
 * Version: 1.0.0
 * Date: 2025-12-30
 */

import { UserProfile, HealthScore, ScoreFactor, ActivityLevel } from "../types";

interface HealthMetrics {
  bmi?: number;
  bmiCategory?: string;
  waterIntake?: number;
  waterTarget?: number;
  protein?: number;
  proteinTarget?: number;
  vo2max?: number;
}

export class HealthScoreCalculator {
  /**
   * Calculate comprehensive health score
   * Assesses multiple health dimensions and provides actionable feedback
   *
   * @param user - User profile with age, gender, activity level
   * @param metrics - Health metrics (BMI, water, protein, VO2 max, etc.)
   * @returns Health score with breakdown and recommendations
   */
  calculate(user: UserProfile, metrics: HealthMetrics): HealthScore {
    let totalScore = 0;
    const factors: ScoreFactor[] = [];

    // 1. BMI/Body Composition Assessment (20 points)
    const bmiScore = this.assessBMI(metrics.bmi, metrics.bmiCategory);
    totalScore += bmiScore;
    factors.push({
      category: "BMI/Body Composition",
      score: bmiScore,
      maxScore: 20,
    });

    // 2. Activity Level Assessment (20 points)
    const activityScore = this.assessActivity(
      user.activityLevel || "sedentary",
    );
    totalScore += activityScore;
    factors.push({
      category: "Physical Activity",
      score: activityScore,
      maxScore: 20,
    });

    // 3. Hydration Assessment (15 points)
    // CRITICAL: waterTarget should come from calculated metrics, not hardcoded
    // Skip hydration scoring if target is not provided
    const waterTarget = metrics.waterTarget;
    if (waterTarget && waterTarget > 0) {
      const hydrationScore = this.assessHydration(
        metrics.waterIntake ?? 0, // 0 if not tracked
        waterTarget,
      );
      totalScore += hydrationScore;
      factors.push({
        category: "Hydration",
        score: hydrationScore,
        maxScore: 15,
      });
    }

    // 4. Nutrition/Protein Assessment (25 points)
    // CRITICAL: proteinTarget should come from calculated metrics, not hardcoded
    // Skip nutrition scoring if target is not provided
    const proteinTarget = metrics.proteinTarget;
    if (proteinTarget && proteinTarget > 0) {
      const nutritionScore = this.assessNutrition(
        metrics.protein ?? 0, // 0 if not tracked
        proteinTarget,
      );
      totalScore += nutritionScore;
      factors.push({
        category: "Nutrition Quality",
        score: nutritionScore,
        maxScore: 25,
      });
    }

    // 5. Cardiovascular Fitness Assessment (20 points)
    if (metrics.vo2max) {
      const cardioScore = this.assessCardio(
        metrics.vo2max,
        user.age,
        user.gender,
      );
      totalScore += cardioScore;
      factors.push({
        category: "Cardiovascular Fitness",
        score: cardioScore,
        maxScore: 20,
      });
    } else {
      // Default neutral score if VO2 max not available
      factors.push({
        category: "Cardiovascular Fitness",
        score: 10,
        maxScore: 20,
      });
      totalScore += 10;
    }

    // Cap score at 100
    const finalScore = Math.max(0, Math.min(100, totalScore));

    return {
      totalScore: Math.round(finalScore),
      components: {
        bmiScore:
          factors.find((f) => f.category === "BMI/Body Composition")?.score ||
          0,
        activityScore:
          factors.find((f) => f.category === "Physical Activity")?.score || 0,
        nutritionScore:
          factors.find((f) => f.category === "Nutrition Quality")?.score || 0,
        vo2maxScore: factors.find(
          (f) => f.category === "Cardiovascular Fitness",
        )?.score,
      },
      rating: this.getRating(finalScore),
      recommendations: this.getRecommendations(factors, user),
    };
  }

  /**
   * Assess BMI and body composition (20 points)
   */
  private assessBMI(bmi?: number, category?: string): number {
    if (!bmi) return 10; // Neutral if no data

    // Optimal range: 18.5-24.9 = 20 points
    if (bmi >= 18.5 && bmi <= 24.9) {
      return 20;
    }

    // Slightly overweight (25-27) or underweight (17-18.5) = 15 points
    if ((bmi >= 25 && bmi <= 27) || (bmi >= 17 && bmi < 18.5)) {
      return 15;
    }

    // Overweight (27-30) or very underweight (15-17) = 10 points
    if ((bmi >= 27 && bmi <= 30) || (bmi >= 15 && bmi < 17)) {
      return 10;
    }

    // Obese Class I (30-35) or severely underweight (<15) = 5 points
    if ((bmi >= 30 && bmi <= 35) || bmi < 15) {
      return 5;
    }

    // Obese Class II+ (>35) = 0 points
    return 0;
  }

  /**
   * Assess activity level (20 points)
   */
  private assessActivity(activityLevel: ActivityLevel | string): number {
    const activityScores: Record<string, number> = {
      sedentary: 5,
      light: 10,
      moderate: 15,
      active: 18,
      very_active: 20,
    };

    return activityScores[activityLevel] || 5;
  }

  /**
   * Assess hydration (15 points)
   */
  private assessHydration(intake: number, target: number): number {
    if (!target || target === 0) return 8; // Neutral

    const percentage = (intake / target) * 100;

    if (percentage >= 100) return 15; // Meeting or exceeding target
    if (percentage >= 80) return 12; // Close to target
    if (percentage >= 60) return 9; // Moderate deficit
    if (percentage >= 40) return 6; // Significant deficit
    return 3; // Very poor hydration
  }

  /**
   * Assess nutrition/protein intake (25 points)
   */
  private assessNutrition(protein: number, target: number): number {
    if (!target || target === 0) return 13; // Neutral

    const percentage = (protein / target) * 100;

    // Optimal range: 90-120% of target = 25 points
    if (percentage >= 90 && percentage <= 120) return 25;

    // Good range: 80-90% or 120-130% = 20 points
    if (
      (percentage >= 80 && percentage < 90) ||
      (percentage > 120 && percentage <= 130)
    ) {
      return 20;
    }

    // Acceptable: 70-80% or 130-150% = 15 points
    if (
      (percentage >= 70 && percentage < 80) ||
      (percentage > 130 && percentage <= 150)
    ) {
      return 15;
    }

    // Below optimal: 50-70% or 150-200% = 10 points
    if (
      (percentage >= 50 && percentage < 70) ||
      (percentage > 150 && percentage <= 200)
    ) {
      return 10;
    }

    // Poor: <50% or >200% = 5 points
    return 5;
  }

  /**
   * Assess cardiovascular fitness via VO2 max (20 points)
   */
  private assessCardio(
    vo2max: number,
    age: number,
    gender: "male" | "female" | "other" | "prefer_not_to_say",
  ): number {
    // Age and gender-specific thresholds
    let excellent: number;
    let good: number;
    let average: number;

    if (gender === "male") {
      if (age < 30) {
        excellent = 60;
        good = 52;
        average = 45;
      } else if (age < 50) {
        excellent = 52;
        good = 46;
        average = 40;
      } else {
        excellent = 44;
        good = 39;
        average = 34;
      }
    } else {
      // Female or other
      if (age < 30) {
        excellent = 56;
        good = 47;
        average = 40;
      } else if (age < 50) {
        excellent = 48;
        good = 42;
        average = 36;
      } else {
        excellent = 40;
        good = 35;
        average = 30;
      }
    }

    if (vo2max >= excellent) return 20; // Excellent
    if (vo2max >= good) return 16; // Good
    if (vo2max >= average) return 12; // Average
    if (vo2max >= average * 0.8) return 8; // Below average
    return 4; // Poor
  }

  /**
   * Convert score to rating
   */
  private getRating(
    score: number,
  ): "poor" | "fair" | "good" | "very_good" | "excellent" {
    if (score >= 90) return "excellent";
    if (score >= 80) return "very_good";
    if (score >= 70) return "good";
    if (score >= 60) return "fair";
    return "poor";
  }

  /**
   * Generate personalized recommendations based on weak areas
   */
  private getRecommendations(
    factors: ScoreFactor[],
    user: UserProfile,
  ): string[] {
    const recommendations: string[] = [];

    factors.forEach((factor) => {
      const percentage =
        (factor.maxScore ?? 0) > 0
          ? (factor.score / (factor.maxScore ?? 1)) * 100
          : 0;

      // Focus on areas scoring below 70%
      if (percentage < 70) {
        switch (factor.category) {
          case "BMI/Body Composition":
            recommendations.push(
              "Improve body composition through balanced nutrition and exercise",
              "Consider consulting a healthcare provider about healthy weight goals",
            );
            break;

          case "Physical Activity":
            recommendations.push(
              "Increase physical activity to at least 150 minutes moderate exercise per week",
              "Start with small, achievable increases in daily movement",
            );
            break;

          case "Hydration":
            recommendations.push(
              "Increase water intake to meet daily hydration goals",
              "Set reminders to drink water throughout the day",
            );
            break;

          case "Nutrition Quality":
            recommendations.push(
              "Prioritize protein intake to meet daily targets",
              "Focus on whole foods and balanced macronutrient distribution",
            );
            break;

          case "Cardiovascular Fitness":
            recommendations.push(
              "Build aerobic capacity with regular cardio exercise",
              "Gradually increase cardio intensity and duration",
            );
            break;
        }
      }
    });

    // If no major issues, provide general optimization tips
    if (recommendations.length === 0) {
      recommendations.push(
        "Excellent health! Continue current habits",
        "Focus on consistency and gradual progression",
        "Consider setting performance-based goals",
      );
    }

    // Limit to top 5 most important recommendations
    return recommendations.slice(0, 5);
  }

  /**
   * Get health score trend analysis
   * Useful for tracking progress over time
   */
  analyzeTrend(
    currentScore: number,
    previousScore?: number,
  ): {
    trend: "improving" | "stable" | "declining";
    change: number;
    message: string;
  } {
    if (!previousScore) {
      return {
        trend: "stable",
        change: 0,
        message: "Baseline health score established",
      };
    }

    const change = currentScore - previousScore;

    if (change >= 5) {
      return {
        trend: "improving",
        change: Math.round(change),
        message: `Health score improved by ${Math.round(change)} points! Keep up the great work.`,
      };
    }

    if (change <= -5) {
      return {
        trend: "declining",
        change: Math.round(change),
        message: `Health score declined by ${Math.abs(Math.round(change))} points. Review your habits and make adjustments.`,
      };
    }

    return {
      trend: "stable",
      change: Math.round(change),
      message: "Health score is stable. Focus on consistency.",
    };
  }
}

// Export singleton instance
export const healthScoreCalculator = new HealthScoreCalculator();
