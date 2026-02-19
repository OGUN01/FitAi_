import {
  FitnessMetrics,
  SleepWellnessAnalytics,
  PredictiveInsights,
  ComprehensiveAnalytics,
} from "./types";
import { calculateVariance, analyzeTrendDirection } from "./helpers";

export function analyzeSleepWellness(
  metrics: FitnessMetrics[],
): SleepWellnessAnalytics {
  const sleepHours = metrics.map((m) => m.sleepHours);
  const sleepQualities = metrics
    .filter((m) => m.sleepQuality)
    .map((m) => m.sleepQuality!);
  const stressLevels = metrics
    .filter((m) => m.stressLevel)
    .map((m) => m.stressLevel!);
  const energyLevels = metrics
    .filter((m) => m.energyLevel)
    .map((m) => m.energyLevel!);

  const avgSleepHours =
    sleepHours.reduce((sum, hours) => sum + hours, 0) / sleepHours.length;
  const avgSleepQuality =
    sleepQualities.length > 0
      ? sleepQualities.reduce((sum, quality) => sum + quality, 0) /
        sleepQualities.length
      : 7;

  const sleepVariance = calculateVariance(sleepHours);
  const sleepConsistency = Math.max(0, 100 - sleepVariance * 10);

  const optimalSleep = 8;
  const sleepDebt = Math.max(
    0,
    (optimalSleep - avgSleepHours) * sleepHours.length,
  );

  const avgStress =
    stressLevels.length > 0
      ? stressLevels.reduce((sum, stress) => sum + stress, 0) /
        stressLevels.length
      : 5;
  const avgEnergy =
    energyLevels.length > 0
      ? energyLevels.reduce((sum, energy) => sum + energy, 0) /
        energyLevels.length
      : 7;

  const recoveryScore = Math.round(
    (avgSleepQuality * 10 + (10 - avgStress) * 10 + avgEnergy * 10) / 3,
  );

  return {
    averageSleepHours: avgSleepHours,
    sleepConsistency: Math.round(sleepConsistency),
    sleepQualityTrend: "stable",
    optimalBedtime: "22:30",
    sleepDebt: Math.round(sleepDebt),
    recoveryScore,
    stressLevelTrend: "stable",
    energyLevelTrend: "stable",
  };
}

export async function generatePredictiveInsights(
  metrics: FitnessMetrics[],
): Promise<PredictiveInsights> {
  const workoutTrend = analyzeTrendDirection(
    metrics.map((m) => m.workoutCount),
  );

  let goalAchievementProbability = 75;

  if (workoutTrend > 0.1) goalAchievementProbability += 15;
  else if (workoutTrend < -0.1) goalAchievementProbability -= 15;

  const estimatedDays = Math.max(
    30,
    90 - (goalAchievementProbability - 50) * 2,
  );
  const estimatedGoalDate = new Date(
    Date.now() + estimatedDays * 24 * 60 * 60 * 1000,
  );

  let nextWeekPrediction: "better" | "similar" | "worse" = "similar";
  let confidence = 70;

  if (workoutTrend > 0.2) {
    nextWeekPrediction = "better";
    confidence = 85;
  } else if (workoutTrend < -0.2) {
    nextWeekPrediction = "worse";
    confidence = 80;
  }

  return {
    goalAchievementProbability: Math.min(
      95,
      Math.max(5, goalAchievementProbability),
    ),
    estimatedGoalDate: estimatedGoalDate.toISOString(),
    recommendedAdjustments: [
      "Increase workout frequency by 1 session per week",
      "Focus on protein intake post-workout",
      "Maintain consistent sleep schedule",
    ],
    riskFactors: workoutTrend < -0.1 ? ["Decreasing workout frequency"] : [],
    strengthAreas: ["Consistency in tracking", "Balanced approach"],
    nextMilestone: {
      description: "10-workout milestone",
      estimatedDate: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      confidence: 80,
    },
    performancePrediction: {
      nextWeek: nextWeekPrediction,
      confidence,
      reasoning: [
        `Current workout trend: ${workoutTrend > 0 ? "positive" : workoutTrend < 0 ? "negative" : "stable"}`,
        "Based on recent consistency patterns",
      ],
    },
  };
}

export function calculateOverallScore(
  analytics: ComprehensiveAnalytics,
): number {
  const weights = {
    workout: 0.3,
    nutrition: 0.25,
    sleep: 0.2,
    bodyComposition: 0.15,
    consistency: 0.1,
  };

  const scores = {
    workout: analytics.workout.consistencyScore,
    nutrition: analytics.nutrition.nutritionScore,
    sleep: analytics.sleepWellness.recoveryScore,
    bodyComposition: analytics.bodyComposition.progressTowardsGoal,
    consistency: analytics.workout.consistencyScore,
  };

  const overallScore = Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + scores[key as keyof typeof scores] * weight;
  }, 0);

  return Math.round(Math.min(100, Math.max(0, overallScore)));
}

export function generateImprovementSuggestions(
  analytics: ComprehensiveAnalytics,
): string[] {
  const suggestions: string[] = [];

  if (analytics.workout.consistencyScore < 70) {
    suggestions.push(
      "🏋️ Try scheduling workouts at the same time each day for better consistency",
    );
  }
  if (analytics.workout.averageWorkoutsPerWeek < 3) {
    suggestions.push(
      "💪 Aim for at least 3 workouts per week to maintain fitness gains",
    );
  }

  if (analytics.nutrition.nutritionScore < 75) {
    suggestions.push(
      "🥗 Focus on adding more whole foods and vegetables to your meals",
    );
  }
  if (analytics.nutrition.waterIntakeAverage < 2.5) {
    suggestions.push("💧 Increase water intake to at least 2.5 liters per day");
  }

  if (analytics.sleepWellness.averageSleepHours < 7) {
    suggestions.push(
      "😴 Prioritize getting 7-9 hours of sleep for optimal recovery",
    );
  }
  if (analytics.sleepWellness.sleepConsistency < 70) {
    suggestions.push(
      "🕒 Try to maintain a consistent sleep schedule, even on weekends",
    );
  }

  if (analytics.bodyComposition.progressTowardsGoal < 50) {
    suggestions.push(
      "📊 Consider adjusting your calorie intake or exercise intensity",
    );
  }

  return suggestions.slice(0, 5);
}

export function analyzeTrends(metrics: FitnessMetrics[]): {
  positive: string[];
  negative: string[];
  neutral: string[];
} {
  const trends = {
    positive: [] as string[],
    negative: [] as string[],
    neutral: [] as string[],
  };

  const workoutTrend = analyzeTrendDirection(
    metrics.map((m) => m.workoutCount),
  );
  if (workoutTrend > 0.1) {
    trends.positive.push("📈 Increasing workout frequency");
  } else if (workoutTrend < -0.1) {
    trends.negative.push("📉 Decreasing workout frequency");
  } else {
    trends.neutral.push("➡️ Stable workout frequency");
  }

  const sleepTrend = analyzeTrendDirection(metrics.map((m) => m.sleepHours));
  if (sleepTrend > 0.1) {
    trends.positive.push("😴 Improving sleep duration");
  } else if (sleepTrend < -0.1) {
    trends.negative.push("😴 Declining sleep duration");
  }

  const waterTrend = analyzeTrendDirection(metrics.map((m) => m.waterIntake));
  if (waterTrend > 0.1) {
    trends.positive.push("💧 Increasing hydration");
  } else if (waterTrend < -0.1) {
    trends.negative.push("💧 Decreasing hydration");
  }

  return trends;
}
