// Analytics Types and Interfaces
// All type definitions for the FitAI Analytics Engine

export interface FitnessMetrics {
  date: string;
  workoutCount: number;
  totalWorkoutTime: number; // minutes
  caloriesBurned: number;
  averageHeartRate?: number;
  steps: number;
  distance: number; // km
  activeMinutes: number;
  restingHeartRate?: number;
  weight?: number;
  bodyFat?: number;
  muscleMass?: number;
  sleepHours: number;
  sleepQuality?: number; // 1-10
  stressLevel?: number; // 1-10
  energyLevel?: number; // 1-10
  mood?: number; // 1-10
  waterIntake: number; // liters
  nutritionScore?: number; // 1-100

  // Extended fields provided by some data sources
  recentWorkouts?: Array<{ type: string; [key: string]: unknown }>;
  nutrition?: {
    protein?: number;
    carbohydrates?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    calories?: number;
  };
  height?: number; // cm
}

export interface WorkoutAnalytics {
  totalWorkouts: number;
  averageWorkoutsPerWeek: number;
  totalWorkoutTime: number;
  averageWorkoutDuration: number;
  favoriteWorkoutType: string;
  strongestMuscleGroup: string;
  improvementAreas: string[];
  consistencyScore: number; // 1-100
  progressTrend: "improving" | "maintaining" | "declining";
  weeklyGoalCompletion: number; // percentage
  streakCurrent: number;
  streakLongest: number;
  caloriesBurnedTotal: number;
  caloriesBurnedAverage: number;
  workoutTypeDistribution: Record<string, number>;
}

export interface NutritionAnalytics {
  averageCaloriesPerDay: number;
  averageMacros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  nutritionScore: number; // 1-100
  mealLoggingConsistency: number; // percentage
  waterIntakeAverage: number;
  deficiencies: string[];
  improvements: string[];
  mealTimingScore: number; // 1-100
  varietyScore: number; // 1-100
  processingScore: number; // 1-100 (lower = more whole foods)
}

export interface BodyCompositionAnalytics {
  weightTrend: "losing" | "gaining" | "maintaining";
  weightChangeRate: number; // kg per week
  bodyFatTrend?: "decreasing" | "increasing" | "stable";
  muscleMassTrend?: "gaining" | "losing" | "stable";
  bmiCategory: string;
  progressTowardsGoal: number; // percentage
  predictedGoalDate?: string;
  recommendedWeightRange: { min: number; max: number };
}

export interface SleepWellnessAnalytics {
  averageSleepHours: number;
  sleepConsistency: number; // 1-100
  sleepQualityTrend: "improving" | "declining" | "stable";
  optimalBedtime: string;
  sleepDebt: number; // hours
  recoveryScore: number; // 1-100
  stressLevelTrend: "improving" | "worsening" | "stable";
  energyLevelTrend: "improving" | "declining" | "stable";
}

export interface PredictiveInsights {
  goalAchievementProbability: number; // percentage
  estimatedGoalDate?: string;
  recommendedAdjustments: string[];
  riskFactors: string[];
  strengthAreas: string[];
  nextMilestone: {
    description: string;
    estimatedDate: string;
    confidence: number; // percentage
  };
  performancePrediction: {
    nextWeek: "better" | "similar" | "worse";
    confidence: number;
    reasoning: string[];
  };
  // Additional property used in HomeScreen
  plateauRisk?: string;
}

export interface ComprehensiveAnalytics {
  period: "week" | "month" | "quarter" | "year";
  dateRange: { start: string; end: string };
  workout: WorkoutAnalytics;
  nutrition: NutritionAnalytics;
  bodyComposition: BodyCompositionAnalytics;
  sleepWellness: SleepWellnessAnalytics;
  predictiveInsights: PredictiveInsights;
  overallScore: number; // 1-100
  improvementSuggestions: string[];
  achievements: string[];
  trends: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
}
