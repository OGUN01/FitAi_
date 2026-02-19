export type {
  FitnessMetrics,
  WorkoutAnalytics,
  NutritionAnalytics,
  BodyCompositionAnalytics,
  SleepWellnessAnalytics,
  PredictiveInsights,
  ComprehensiveAnalytics,
} from "./types";

export {
  getDateRange,
  getMetricsInRange,
  calculateVariance,
  analyzeTrendDirection,
  calculateConsistencyScore,
} from "./helpers";

export {
  analyzeNutrition,
  calculateAverageMacros,
  calculateNutritionVarietyScore,
  calculateMealTimingScore,
} from "./nutritionAnalytics";

export {
  analyzeBodyComposition,
  getUserHeight,
  calculateGoalProgress,
  predictGoalDate,
} from "./weightAnalytics";

export {
  analyzeWorkouts,
  calculateWorkoutTypeDistribution,
  determineFavoriteWorkoutType,
  determineStrongestMuscleGroup,
  workoutTypeToMuscleGroup,
  identifyImprovementAreas,
} from "./workoutAnalytics";

export {
  calculateWorkoutStreaks,
  identifyAchievements,
} from "./streakAnalytics";

export {
  analyzeSleepWellness,
  generatePredictiveInsights,
  calculateOverallScore,
  generateImprovementSuggestions,
  analyzeTrends,
} from "./progressAnalytics";

export { analyticsEngine, default } from "./engine";
