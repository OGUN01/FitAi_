import { ComprehensiveAnalytics } from "./types";

export const getTopInsights = (
  currentAnalytics: ComprehensiveAnalytics | null,
): string[] => {
  if (!currentAnalytics) return [];

  const insights: string[] = [];

  if (currentAnalytics.workout.progressTrend === "improving") {
    insights.push(
      `🚀 Your workout frequency is trending upward with ${currentAnalytics.workout.averageWorkoutsPerWeek.toFixed(1)} sessions per week`,
    );
  }

  if (currentAnalytics.sleepWellness.averageSleepHours >= 7.5) {
    insights.push(
      `😴 Excellent sleep habits with ${currentAnalytics.sleepWellness.averageSleepHours.toFixed(1)} hours average`,
    );
  }

  if (currentAnalytics.workout.streakCurrent >= 7) {
    insights.push(
      `🔥 Amazing ${currentAnalytics.workout.streakCurrent}-day workout streak!`,
    );
  }

  if (currentAnalytics.nutrition.nutritionScore >= 80) {
    insights.push(
      `🥗 Great nutrition quality with ${currentAnalytics.nutrition.nutritionScore}/100 score`,
    );
  }

  if (currentAnalytics.overallScore >= 80) {
    insights.push(
      `⭐ Outstanding overall performance at ${currentAnalytics.overallScore}/100`,
    );
  }

  return insights.slice(0, 3);
};

export const getImprovementAreas = (
  currentAnalytics: ComprehensiveAnalytics | null,
): string[] => {
  if (!currentAnalytics) return [];
  return currentAnalytics.improvementSuggestions || [];
};

export const getPositiveTrends = (
  currentAnalytics: ComprehensiveAnalytics | null,
): string[] => {
  if (!currentAnalytics) return [];
  return currentAnalytics.trends.positive || [];
};

export const getNegativeTrends = (
  currentAnalytics: ComprehensiveAnalytics | null,
): string[] => {
  if (!currentAnalytics) return [];
  return currentAnalytics.trends.negative || [];
};

export const getAchievements = (
  currentAnalytics: ComprehensiveAnalytics | null,
): string[] => {
  if (!currentAnalytics) return [];
  return currentAnalytics.achievements || [];
};

export const getPersonalizedRecommendation = (
  currentAnalytics: ComprehensiveAnalytics | null,
): string => {
  if (!currentAnalytics) {
    return "Start logging your workouts and wellness metrics to get personalized recommendations!";
  }

  if (currentAnalytics.workout.consistencyScore < 50) {
    return "Focus on workout consistency - even 15 minutes daily can create lasting habits!";
  }

  if (currentAnalytics.sleepWellness.averageSleepHours < 7) {
    return "Prioritize sleep - aim for 7-9 hours to boost recovery and performance!";
  }

  if (currentAnalytics.nutrition.waterIntakeAverage < 2.5) {
    return "Increase your water intake to at least 2.5L daily for better performance!";
  }

  if (currentAnalytics.workout.averageWorkoutsPerWeek < 3) {
    return "Try to increase your workout frequency to 3-4 sessions per week!";
  }

  return "You're doing great! Keep maintaining your current habits and consider challenging yourself with new goals!";
};
