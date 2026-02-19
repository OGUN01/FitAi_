/**
 * SHARED TYPES FOR HEALTH CALCULATIONS MODULES
 * Types used across multiple calculation modules
 */

// Body fat percentage data source and priority
export interface BodyFatData {
  value: number;
  source: "user_input" | "ai_analysis" | "bmi_estimation" | "default_estimate";
  confidence: "high" | "medium" | "low";
  showWarning: boolean;
}

// Activity validation result
export interface ActivityValidationResult {
  isValid: boolean;
  minimumRequired?: string;
  message?: string;
}

// Intensity recommendation result
export interface IntensityRecommendation {
  recommendedIntensity: "beginner" | "intermediate" | "advanced";
  reasoning: string;
}

// Macronutrient distribution
export interface MacronutrientDistribution {
  protein: number;
  carbs: number;
  fat: number;
}

// Ideal weight range
export interface WeightRange {
  min: number;
  max: number;
}

// Body composition breakdown
export interface BodyComposition {
  leanMass: number;
  fatMass: number;
}

// Heart rate training zones
export interface HeartRateZones {
  fatBurn: { min: number; max: number };
  cardio: { min: number; max: number };
  peak: { min: number; max: number };
}
