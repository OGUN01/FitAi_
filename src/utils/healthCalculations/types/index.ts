/**
 * Core types for the Universal Health System
 * These types support any user globally with population-specific calculations
 */

import { UserProfile } from '../../../types/user';

// Activity Levels (standardized across all calculators)
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

// Climate Types (affects TDEE and water needs)
export type ClimateType = 'tropical' | 'temperate' | 'cold' | 'arid';

// Diet Types (affects macro calculations)
export type DietType =
  | 'omnivore'
  | 'pescatarian'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'low_carb'
  | 'paleo'
  | 'mediterranean';

// Population Groups (for BMI classification)
export type PopulationType = 'asian' | 'african' | 'caucasian' | 'hispanic' | 'athletic' | 'general';

// Fitness Goals
export type Goal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'maintenance'
  | 'athletic'
  | 'endurance'
  | 'strength';

// BMI Classification Result
export interface BMIClassification {
  category: 'Underweight' | 'Normal' | 'Overweight' | 'Obese';
  description: string;
  healthRisk: 'low' | 'moderate' | 'high' | 'very_high';
  recommendations: string[];
}

// BMI Cutoffs (population-specific)
export interface BMICutoffs {
  underweight: number;
  normalMin: number;
  normalMax: number;
  overweightMax: number;
  obeseMin: number;
}

// Macro Distribution
export interface Macros {
  protein: number;  // grams
  fat: number;      // grams
  carbs: number;    // grams
}

// Complete Health Metrics (output of all calculators)
export interface HealthMetrics {
  bmr: number;              // Basal Metabolic Rate (kcal)
  bmi: number;              // Body Mass Index
  bmiClassification: BMIClassification;
  tdee: number;             // Total Daily Energy Expenditure (kcal)
  waterIntake: number;      // Daily water intake (ml)
  macros: Macros;           // Protein, fat, carbs (grams)

  // Metadata
  formulaUsed: string;
  accuracy: string;
  lastUpdated: Date;
}

// User context for calculations
export interface CalculationContext {
  user: UserProfile;
  activityLevel: ActivityLevel;
  climate: ClimateType;
  goal: Goal;
  populationType?: PopulationType;
}

// Ethnicity types (for BMI/BMR calculations)
export type EthnicityType = 'asian' | 'african' | 'caucasian' | 'hispanic' | 'general';

// BMR Formula types
export type BMRFormula = 'mifflin_st_jeor' | 'katch_mcardle' | 'cunningham' | 'harris_benedict';

// Re-export UserProfile for convenience
export type { UserProfile };

// ============================================================================
// PHASE 3: ADVANCED HEALTH FEATURES TYPES
// ============================================================================

// Muscle Gain Limits
export interface MuscleGainLimits {
  monthlyKg: number;
  yearlyKg: number;
  category: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
  confidenceLevel: 'low' | 'medium' | 'high';
}

// Goal Validation Result
export interface GoalValidation {
  valid: boolean;
  severity: 'success' | 'info' | 'warning' | 'error';
  message: string;
  achievementProbability: number;
  suggestedTimeline?: number;
  recommendations?: string[];
  allowOverride?: boolean;
  suggestion?: string;
}

// Heart Rate Zones
export interface HeartRateZone {
  name: string;
  min: number;
  max: number;
  intensity: string;
  purpose: string;
  benefits: string[];
}

export interface HeartRateZones {
  zone1: HeartRateZone;
  zone2: HeartRateZone;
  zone3: HeartRateZone;
  zone4: HeartRateZone;
  zone5: HeartRateZone;
  metadata: {
    maxHR: number;
    restingHR: number;
    formula: string;
    method: string;
  };
}

// VO2 Max Estimation
export interface VO2MaxEstimate {
  vo2max: number;
  classification: string;
  percentile: number;
  method: string;
  accuracy: string;
  recommendations: string[];
}

// Health Score
export interface ScoreFactor {
  category: string;
  score: number;
  maxScore: number;
}

export interface HealthScore {
  totalScore: number;
  grade: string;
  factors: ScoreFactor[];
  recommendations: string[];
}
