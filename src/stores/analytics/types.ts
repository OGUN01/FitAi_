// Analytics Store Types
// Type definitions for analytics store and related data structures

import {
  ComprehensiveAnalytics,
  FitnessMetrics,
  WorkoutAnalytics,
  NutritionAnalytics,
  BodyCompositionAnalytics,
  SleepWellnessAnalytics,
  PredictiveInsights,
} from "../../services/analyticsEngine";

export interface AnalyticsSummary {
  totalWorkouts: number;
  averageScore: number;
  currentStreak: number;
  recentTrend: string;
}

export type TimePeriod = "week" | "month" | "quarter" | "year";

export interface ChartDataPoint {
  date: string;
  value: number;
}

export interface WorkoutFrequencyData {
  date: string;
  count: number;
}

export interface WeightProgressData {
  date: string;
  weight: number;
}

export interface SleepPatternData {
  date: string;
  hours: number;
  quality?: number;
}

export interface CaloriesBurnedData {
  date: string;
  calories: number;
}

export interface WaterIntakeData {
  date: string;
  milliliters: number;
}

export interface PerformanceScoreData {
  date: string;
  score: number;
}

export interface ChartData {
  workoutFrequency: WorkoutFrequencyData[];
  weightProgress: WeightProgressData[];
  sleepPattern: SleepPatternData[];
  caloriesBurned: CaloriesBurnedData[];
  waterIntake: WaterIntakeData[];
  performanceScore: PerformanceScoreData[];
}

export interface AnalyticsStore {
  // State
  isLoading: boolean;
  isInitialized: boolean;
  currentAnalytics: ComprehensiveAnalytics | null;
  analyticsSummary: AnalyticsSummary;
  selectedPeriod: TimePeriod;
  metricsHistory: FitnessMetrics[];

  // Chart Data
  chartData: ChartData;

  // Actions
  initialize: () => Promise<void>;
  addDailyMetrics: (metrics: FitnessMetrics) => Promise<void>;
  generateAnalytics: (period?: TimePeriod) => Promise<void>;
  setPeriod: (period: TimePeriod) => void;
  refreshAnalytics: () => Promise<void>;
  getWorkoutAnalytics: () => WorkoutAnalytics | null;
  getNutritionAnalytics: () => NutritionAnalytics | null;
  getBodyCompositionAnalytics: () => BodyCompositionAnalytics | null;
  getSleepWellnessAnalytics: () => SleepWellnessAnalytics | null;
  getPredictiveInsights: () => PredictiveInsights | null;

  // Chart Data Generators
  generateChartData: () => void;
  getWorkoutFrequencyData: (days: number) => WorkoutFrequencyData[];
  getWeightProgressData: (days: number) => WeightProgressData[];
  getSleepPatternData: (days: number) => SleepPatternData[];
  getPerformanceScoreData: (days: number) => PerformanceScoreData[];

  // Insights & Recommendations
  getTopInsights: () => string[];
  getImprovementAreas: () => string[];
  getPositiveTrends: () => string[];
  getNegativeTrends: () => string[];
  getAchievements: () => string[];

  // Reset store (for logout)
  reset: () => void;
}

// Re-export analytics engine types for convenience
export type {
  ComprehensiveAnalytics,
  FitnessMetrics,
  WorkoutAnalytics,
  NutritionAnalytics,
  BodyCompositionAnalytics,
  SleepWellnessAnalytics,
  PredictiveInsights,
};
