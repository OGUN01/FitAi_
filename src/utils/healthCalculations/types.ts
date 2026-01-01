/**
 * UNIVERSAL HEALTH CALCULATION SYSTEM - TYPE DEFINITIONS
 * Complete type safety for world-class adaptive calculations
 *
 * Phase 1: Foundation Types
 * Version: 1.0.0
 * Date: 2025-12-30
 */

// ============================================================================
// CLIMATE SYSTEM TYPES
// ============================================================================

export type ClimateType = 'tropical' | 'temperate' | 'cold' | 'arid';

export interface ClimateDetectionResult {
  climate: ClimateType;
  confidence: number; // 0-100
  source: 'country_database' | 'state_database' | 'gps' | 'default';
  shouldAskUser: boolean;
  characteristics?: {
    avgTempC: number;
    avgHumidity: number;
    tdeeModifier: number;
    waterModifier: number;
  };
}

// ============================================================================
// ETHNICITY/POPULATION TYPES
// ============================================================================

export type EthnicityType =
  | 'asian'           // South, East, Southeast Asian
  | 'caucasian'       // European descent
  | 'black_african'   // African descent
  | 'hispanic'        // Latin American
  | 'middle_eastern'  // Middle East, North Africa
  | 'pacific_islander' // Pacific Islands
  | 'mixed'           // Mixed ethnicity
  | 'general';        // Default/not specified

export interface EthnicityDetectionResult {
  ethnicity: EthnicityType;
  confidence: number; // 0-100
  shouldAskUser: boolean;
  message?: string;
}

// ============================================================================
// BMR FORMULA TYPES
// ============================================================================

export type BMRFormula =
  | 'mifflin_st_jeor'      // Default - most validated
  | 'katch_mcardle'        // Best with body fat %
  | 'cunningham'           // For athletes
  | 'harris_benedict';     // Legacy/comparison

export interface BMRFormulaSelection {
  formula: BMRFormula;
  reason: string;
  accuracy: string;  // e.g., "±5%" or "±10%"
  confidence: number; // 0-100
}

// ============================================================================
// ACTIVITY & TDEE TYPES
// ============================================================================

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'active'
  | 'very_active';

export type OccupationType =
  | 'desk_job'
  | 'light_active'
  | 'moderate_active'
  | 'heavy_labor'
  | 'very_active';

// ============================================================================
// DIET TYPE TYPES
// ============================================================================

export type DietType =
  | 'omnivore'
  | 'vegetarian'
  | 'vegan'
  | 'pescatarian'
  | 'keto'
  | 'low_carb'
  | 'paleo'
  | 'mediterranean';

// ============================================================================
// BODY FAT SOURCE TYPES
// ============================================================================

export type BodyFatSource =
  | 'dexa'           // Gold standard
  | 'bodpod'         // Very accurate
  | 'calipers'       // Good accuracy
  | 'manual'         // User input
  | 'ai_photo'       // AI estimation
  | 'bmi_estimate';  // Calculated from BMI

// ============================================================================
// USER PROFILE TYPES
// ============================================================================

export interface UserProfile {
  // Personal Info
  age: number;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  country: string;
  state?: string;

  // Body Metrics
  weight: number;
  height: number;
  bodyFat?: number;
  bodyFatMethod?: BodyFatSource;

  // Activity
  occupation?: OccupationType;
  activityLevel?: ActivityLevel;
  workoutExperienceYears?: number;

  // Fitness Level
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced' | 'elite';

  // Diet
  dietType?: DietType;

  // Training Age (optional advanced field)
  trainingYears?: number;

  // Health Metrics (optional)
  restingHR?: number;
  goal?: Goal;
}

// ============================================================================
// BMI CLASSIFICATION TYPES
// ============================================================================

export interface BMICutoffs {
  underweight: number;
  normalMin: number;
  normalMax: number;
  overweightMax: number;
  obeseMin: number;
  source?: string;
  notes?: string;
}

export interface BMIClassification {
  category: string;
  healthRisk: 'low' | 'moderate' | 'high' | 'very_high';
  cutoffs?: BMICutoffs;
  ethnicity?: EthnicityType;
  message?: string;
  description?: string;
  recommendations?: string[];
}

// ============================================================================
// DETECTION CONTEXT
// ============================================================================

export interface DetectionContext {
  // Auto-detected
  ethnicity?: EthnicityType;
  climate?: ClimateType;

  // Confidence scores
  ethnicityConfidence: number;
  climateConfidence: number;

  // User confirmation flags
  ethnicityConfirmed?: boolean;
  climateConfirmed?: boolean;

  // Should ask user?
  shouldAskEthnicity?: boolean;
  shouldAskClimate?: boolean;

  // Other context
  dietType?: DietType;
  bodyFatAccuracy?: BodyFatSource;
  fitnessLevel?: string;
}

// ============================================================================
// CALCULATION RESULTS
// ============================================================================

export interface BMRResult {
  bmr: number;
  formula: BMRFormula;
  accuracy: string;
  confidence: number;
  reasoning: string;
}

export interface TDEEResult {
  tdee: number;
  breakdown: {
    bmr: number;
    baseTDEE: number;
    climateModifier: number;
    finalTDEE: number;
  };
  reasoning: string;
}

export interface WaterResult {
  daily_ml: number;
  breakdown: {
    base_ml: number;
    climate_ml: number;
    activity_ml: number;
    final_ml: number;
  };
  reasoning: string;
}

export interface MacroResult {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
  distribution: {
    protein_percent: number;
    carbs_percent: number;
    fat_percent: number;
  };
  reasoning: string;
}

// ============================================================================
// CALCULATOR INTERFACES
// ============================================================================

export interface BMRCalculator {
  calculate(user: UserProfile): number;
  getFormula(): BMRFormula;
  getAccuracy(): string;
}

export interface BMICalculator {
  calculate(weight: number, height: number): number;
  getClassification(bmi: number): BMIClassification;
  getCutoffs(): BMICutoffs;
}

export interface TDEECalculator {
  calculate(bmr: number, activityLevel: ActivityLevel, climate: ClimateType): number;
}

export interface WaterCalculator {
  calculate(weight: number, activityLevel: ActivityLevel, climate: ClimateType): number;
}

// ============================================================================
// GOAL VALIDATION TYPES
// ============================================================================

export type Goal =
  | 'fat_loss'
  | 'muscle_gain'
  | 'maintenance'
  | 'athletic'
  | 'endurance'
  | 'strength';

export interface GoalValidation {
  valid: boolean;
  severity: 'success' | 'info' | 'warning' | 'error';
  message: string;
  achievementProbability?: number;
  recommendations?: string[];
  suggestedTimeline?: number;
  suggestion?: string;
  allowOverride?: boolean;
}

// ============================================================================
// MACRO TYPES
// ============================================================================

export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

// ============================================================================
// MUSCLE GAIN TYPES
// ============================================================================

export interface MuscleGainLimits {
  maxMonthlyGain: number;
  maxWeeklyGain: number;
  confidence: number;
  experienceLevel: string;
  recommendation: string;
}

// ============================================================================
// HEALTH SCORE TYPES
// ============================================================================

export interface HealthScore {
  totalScore: number;
  components: {
    bmiScore: number;
    activityScore: number;
    nutritionScore: number;
    sleepScore?: number;
    vo2maxScore?: number;
  };
  rating: 'poor' | 'fair' | 'good' | 'very_good' | 'excellent';
  recommendations: string[];
}

export interface ScoreFactor {
  name?: string;
  category?: string;
  score: number;
  weight?: number;
  maxScore?: number;
  description?: string;
}

// ============================================================================
// HEART RATE TYPES
// ============================================================================

export interface HeartRateZones {
  zone1: { min: number; max: number; name: string; description: string };
  zone2: { min: number; max: number; name: string; description: string };
  zone3: { min: number; max: number; name: string; description: string };
  zone4: { min: number; max: number; name: string; description: string };
  zone5: { min: number; max: number; name: string; description: string };
  maxHeartRate: number;
  restingHeartRate: number;
}

// ============================================================================
// VO2 MAX TYPES
// ============================================================================

export interface VO2MaxEstimate {
  vo2max: number;
  classification: string;
  percentile: number;
  description: string;
}
