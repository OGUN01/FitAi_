/**
 * Type definitions for calculated metrics
 */

/**
 * Calculated metrics from onboarding - NO FALLBACKS
 * All values are nullable to indicate missing data clearly
 */
export interface CalculatedMetrics {
  // === Daily Nutritional Targets (from advanced_review) ===
  dailyCalories: number | null;
  dailyProteinG: number | null;
  dailyCarbsG: number | null;
  dailyFatG: number | null;
  dailyWaterML: number | null;
  dailyFiberG: number | null;

  // === Metabolic Calculations (from advanced_review) ===
  calculatedBMI: number | null;
  calculatedBMR: number | null;
  calculatedTDEE: number | null;
  metabolicAge: number | null;

  // === BMI Classification (from advanced_review) ===
  bmiCategory: string | null;
  bmiHealthRisk: string | null;

  // === Auto-Detected Context (from advanced_review) ===
  detectedClimate: string | null;
  detectedEthnicity: string | null;
  bmrFormulaUsed: string | null;

  // === Weight Goals (from advanced_review & body_analysis) ===
  currentWeightKg: number | null;
  targetWeightKg: number | null;
  healthyWeightMin: number | null;
  healthyWeightMax: number | null;
  weeklyWeightLossRate: number | null;
  estimatedTimelineWeeks: number | null;

  // === Body Metrics (from body_analysis) ===
  heightCm: number | null;
  bodyFatPercentage: number | null;
  idealWeightMin: number | null;
  idealWeightMax: number | null;
  ideal_body_fat_max: number | null; // From advanced_review.ideal_body_fat_max

  // === Personal Info (from profiles) ===
  age: number | null;
  gender: string | null;
  country: string | null;
  state: string | null;

  // === Activity (from workout_preferences) ===
  activityLevel: string | null;
  primaryGoals: string[] | null;

  // === Workout Preferences (from workout_preferences) ===
  workoutDurationMinutes: number | null; // User's preferred workout duration from onboarding
  workoutFrequencyPerWeek: number | null; // How many days per week user wants to workout

  // === Workout Recommendations (from advanced_review) ===
  recommendedCardioMinutes: number | null; // Daily recommended cardio minutes
  mealsPerDay: number | null; // Number of meals per day

  // === Health Scores (from advanced_review) ===
  healthScore: number | null;
  healthGrade: string | null;
  fitnessReadinessScore: number | null;
  dietReadinessScore: number | null;

  // === Heart Rate Zones (from advanced_review) ===
  heartRateZones: {
    fatBurn: { min: number; max: number };
    cardio: { min: number; max: number };
    peak: { min: number; max: number };
  } | null;

  // === VO2 Max (from advanced_review) ===
  vo2MaxEstimate: number | null;
  vo2MaxClassification: string | null;
}

export interface UseCalculatedMetricsReturn {
  // Data
  metrics: CalculatedMetrics | null;
  dailyCalories: number | null; // Convenience getter

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Data availability flags
  hasCompletedOnboarding: boolean;
  hasCalculatedMetrics: boolean;

  // Actions
  refreshMetrics: () => Promise<void>;
  clearCache: () => void;

  // Convenience getters (throw-free, for UI binding)
  // These return the raw nullable values - UI should handle null states
  getWaterGoalLiters: () => number | null;
  getCalorieTarget: () => number | null;
  getMacroTargets: () => {
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  };
}
