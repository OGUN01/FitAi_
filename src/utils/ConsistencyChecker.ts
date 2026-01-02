/**
 * ConsistencyChecker Utility
 *
 * Validates that OLD and NEW systems produce identical results for the FitAI app.
 * Performs deep comparison of local storage data and database data, validates schema
 * integrity, and generates detailed discrepancy reports.
 *
 * Database Schema Reference (from Supabase):
 * - profiles: User profile information (id, email, name, age, gender, etc.)
 * - diet_preferences: Diet settings (diet_type, allergies, restrictions, etc.)
 * - body_analysis: Body metrics and measurements (height_cm, current_weight_kg, etc.)
 * - workout_preferences: Workout settings (location, equipment, intensity, etc.)
 * - advanced_review: Calculated health metrics and recommendations
 */

import { supabase } from '../services/supabase';
import type {
  PersonalInfo,
  DietPreferences,
  WorkoutPreferences,
  BodyMetrics,
  FitnessGoals,
} from '../types/user';
import type {
  UserProfile,
  BodyAnalysis,
  ValidationResult,
  SyncableData,
} from '../types/profileData';

// ============================================================================
// TYPES
// ============================================================================

export type DiscrepancySeverity = 'info' | 'warning' | 'error';

export interface Discrepancy {
  dataType: string;
  field: string;
  oldValue: any;
  newValue: any;
  severity: DiscrepancySeverity;
}

export interface ConsistencyReport {
  timestamp: string;
  userId: string | null;
  checks: {
    localStorageMatch: boolean;
    databaseMatch: boolean;
    schemaValid: boolean;
  };
  discrepancies: Discrepancy[];
  recommendations: string[];
}

export type DataType =
  | 'profiles'
  | 'diet_preferences'
  | 'body_analysis'
  | 'workout_preferences'
  | 'advanced_review'
  | 'personalInfo'
  | 'dietPreferences'
  | 'workoutPreferences'
  | 'bodyMetrics'
  | 'fitnessGoals';

// ============================================================================
// SCHEMA DEFINITIONS (Based on Supabase table structures)
// ============================================================================

interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'uuid' | 'timestamp';
  required: boolean;
  nullable?: boolean;
  validValues?: any[];
  minValue?: number;
  maxValue?: number;
}

interface TableSchema {
  tableName: string;
  fields: SchemaField[];
}

const DATABASE_SCHEMAS: Record<string, TableSchema> = {
  profiles: {
    tableName: 'profiles',
    fields: [
      { name: 'id', type: 'uuid', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'first_name', type: 'string', required: true },
      { name: 'last_name', type: 'string', required: true },
      { name: 'age', type: 'number', required: true, minValue: 13, maxValue: 120 },
      {
        name: 'gender',
        type: 'string',
        required: true,
        validValues: ['male', 'female', 'other', 'prefer_not_to_say'],
      },
      { name: 'profile_picture', type: 'string', required: false, nullable: true },
      {
        name: 'units',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['metric', 'imperial'],
      },
      { name: 'notifications_enabled', type: 'boolean', required: false, nullable: true },
      { name: 'dark_mode', type: 'boolean', required: false, nullable: true },
      { name: 'country', type: 'string', required: false, nullable: true },
      { name: 'state', type: 'string', required: false, nullable: true },
      { name: 'region', type: 'string', required: false, nullable: true },
      { name: 'wake_time', type: 'string', required: false, nullable: true },
      { name: 'sleep_time', type: 'string', required: false, nullable: true },
      {
        name: 'occupation_type',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['desk_job', 'light_active', 'moderate_active', 'heavy_labor', 'very_active'],
      },
      {
        name: 'media_preference',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['animation', 'human', 'both'],
      },
      {
        name: 'data_usage_mode',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['wifi_only', 'always'],
      },
      {
        name: 'subscription_tier',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['guest', 'free', 'premium', 'enterprise'],
      },
      { name: 'detected_climate', type: 'string', required: false, nullable: true },
      { name: 'detected_ethnicity', type: 'string', required: false, nullable: true },
      { name: 'ethnicity_confirmed', type: 'boolean', required: false, nullable: true },
      { name: 'climate_confirmed', type: 'boolean', required: false, nullable: true },
      { name: 'preferred_bmr_formula', type: 'string', required: false, nullable: true },
      { name: 'resting_heart_rate', type: 'number', required: false, nullable: true, minValue: 30, maxValue: 200 },
      { name: 'created_at', type: 'timestamp', required: true },
      { name: 'updated_at', type: 'timestamp', required: true },
    ],
  },
  diet_preferences: {
    tableName: 'diet_preferences',
    fields: [
      { name: 'id', type: 'uuid', required: true },
      { name: 'user_id', type: 'uuid', required: true },
      {
        name: 'diet_type',
        type: 'string',
        required: true,
        validValues: ['vegetarian', 'vegan', 'non-veg', 'pescatarian', 'keto', 'omnivore'],
      },
      { name: 'allergies', type: 'array', required: true },
      { name: 'restrictions', type: 'array', required: true },
      { name: 'keto_ready', type: 'boolean', required: false, nullable: true },
      { name: 'intermittent_fasting_ready', type: 'boolean', required: false, nullable: true },
      { name: 'paleo_ready', type: 'boolean', required: false, nullable: true },
      { name: 'mediterranean_ready', type: 'boolean', required: false, nullable: true },
      { name: 'low_carb_ready', type: 'boolean', required: false, nullable: true },
      { name: 'high_protein_ready', type: 'boolean', required: false, nullable: true },
      { name: 'breakfast_enabled', type: 'boolean', required: false, nullable: true },
      { name: 'lunch_enabled', type: 'boolean', required: false, nullable: true },
      { name: 'dinner_enabled', type: 'boolean', required: false, nullable: true },
      { name: 'snacks_enabled', type: 'boolean', required: false, nullable: true },
      {
        name: 'cooking_skill_level',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['beginner', 'intermediate', 'advanced', 'not_applicable'],
      },
      {
        name: 'max_prep_time_minutes',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 5,
        maxValue: 180,
      },
      {
        name: 'budget_level',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['low', 'medium', 'high'],
      },
      { name: 'drinks_enough_water', type: 'boolean', required: false, nullable: true },
      { name: 'limits_sugary_drinks', type: 'boolean', required: false, nullable: true },
      { name: 'eats_regular_meals', type: 'boolean', required: false, nullable: true },
      { name: 'avoids_late_night_eating', type: 'boolean', required: false, nullable: true },
      { name: 'controls_portion_sizes', type: 'boolean', required: false, nullable: true },
      { name: 'reads_nutrition_labels', type: 'boolean', required: false, nullable: true },
      { name: 'eats_processed_foods', type: 'boolean', required: false, nullable: true },
      { name: 'eats_5_servings_fruits_veggies', type: 'boolean', required: false, nullable: true },
      { name: 'limits_refined_sugar', type: 'boolean', required: false, nullable: true },
      { name: 'includes_healthy_fats', type: 'boolean', required: false, nullable: true },
      { name: 'drinks_alcohol', type: 'boolean', required: false, nullable: true },
      { name: 'smokes_tobacco', type: 'boolean', required: false, nullable: true },
      { name: 'drinks_coffee', type: 'boolean', required: false, nullable: true },
      { name: 'takes_supplements', type: 'boolean', required: false, nullable: true },
      { name: 'created_at', type: 'timestamp', required: true },
      { name: 'updated_at', type: 'timestamp', required: true },
    ],
  },
  body_analysis: {
    tableName: 'body_analysis',
    fields: [
      { name: 'id', type: 'uuid', required: true },
      { name: 'user_id', type: 'uuid', required: true },
      { name: 'height_cm', type: 'number', required: true, minValue: 100, maxValue: 250 },
      { name: 'current_weight_kg', type: 'number', required: true, minValue: 30, maxValue: 300 },
      { name: 'target_weight_kg', type: 'number', required: true, minValue: 30, maxValue: 300 },
      {
        name: 'target_timeline_weeks',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 4,
        maxValue: 104,
      },
      {
        name: 'body_fat_percentage',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 3,
        maxValue: 50,
      },
      { name: 'waist_cm', type: 'number', required: false, nullable: true },
      { name: 'hip_cm', type: 'number', required: false, nullable: true },
      { name: 'chest_cm', type: 'number', required: false, nullable: true },
      { name: 'front_photo_url', type: 'string', required: false, nullable: true },
      { name: 'side_photo_url', type: 'string', required: false, nullable: true },
      { name: 'back_photo_url', type: 'string', required: false, nullable: true },
      { name: 'ai_estimated_body_fat', type: 'number', required: false, nullable: true },
      {
        name: 'ai_body_type',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['ectomorph', 'mesomorph', 'endomorph'],
      },
      {
        name: 'ai_confidence_score',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 100,
      },
      { name: 'medical_conditions', type: 'array', required: true },
      { name: 'medications', type: 'array', required: false, nullable: true },
      { name: 'physical_limitations', type: 'array', required: false, nullable: true },
      { name: 'pregnancy_status', type: 'boolean', required: true },
      { name: 'pregnancy_trimester', type: 'number', required: false, nullable: true },
      { name: 'breastfeeding_status', type: 'boolean', required: true },
      {
        name: 'stress_level',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['low', 'moderate', 'high'],
      },
      { name: 'bmi', type: 'number', required: false, nullable: true },
      { name: 'bmr', type: 'number', required: false, nullable: true },
      { name: 'ideal_weight_min', type: 'number', required: false, nullable: true },
      { name: 'ideal_weight_max', type: 'number', required: false, nullable: true },
      { name: 'waist_hip_ratio', type: 'number', required: false, nullable: true },
      { name: 'photos', type: 'object', required: false, nullable: true },
      { name: 'analysis', type: 'object', required: false, nullable: true },
      { name: 'body_fat_source', type: 'string', required: false, nullable: true },
      { name: 'body_fat_measured_at', type: 'timestamp', required: false, nullable: true },
      { name: 'created_at', type: 'timestamp', required: true },
      { name: 'updated_at', type: 'timestamp', required: true },
    ],
  },
  workout_preferences: {
    tableName: 'workout_preferences',
    fields: [
      { name: 'id', type: 'uuid', required: true },
      { name: 'user_id', type: 'uuid', required: true },
      {
        name: 'location',
        type: 'string',
        required: true,
        validValues: ['home', 'gym', 'both'],
      },
      { name: 'equipment', type: 'array', required: true },
      { name: 'time_preference', type: 'number', required: false, nullable: true },
      {
        name: 'intensity',
        type: 'string',
        required: true,
        validValues: ['beginner', 'intermediate', 'advanced'],
      },
      { name: 'workout_types', type: 'array', required: false, nullable: true },
      { name: 'primary_goals', type: 'array', required: true },
      {
        name: 'activity_level',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['sedentary', 'light', 'moderate', 'active', 'extreme'],
      },
      {
        name: 'workout_experience_years',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 50,
      },
      {
        name: 'workout_frequency_per_week',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 7,
      },
      {
        name: 'can_do_pushups',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 200,
      },
      {
        name: 'can_run_minutes',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 300,
      },
      {
        name: 'flexibility_level',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['poor', 'fair', 'good', 'excellent'],
      },
      { name: 'weekly_weight_loss_goal', type: 'number', required: false, nullable: true },
      { name: 'preferred_workout_times', type: 'array', required: false, nullable: true },
      { name: 'enjoys_cardio', type: 'boolean', required: false, nullable: true },
      { name: 'enjoys_strength_training', type: 'boolean', required: false, nullable: true },
      { name: 'enjoys_group_classes', type: 'boolean', required: false, nullable: true },
      { name: 'prefers_outdoor_activities', type: 'boolean', required: false, nullable: true },
      { name: 'needs_motivation', type: 'boolean', required: false, nullable: true },
      { name: 'prefers_variety', type: 'boolean', required: false, nullable: true },
      { name: 'training_years', type: 'number', required: false, nullable: true },
      { name: 'created_at', type: 'timestamp', required: true },
      { name: 'updated_at', type: 'timestamp', required: true },
    ],
  },
  advanced_review: {
    tableName: 'advanced_review',
    fields: [
      { name: 'id', type: 'uuid', required: true },
      { name: 'user_id', type: 'uuid', required: false, nullable: true },
      { name: 'calculated_bmi', type: 'number', required: false, nullable: true },
      { name: 'calculated_bmr', type: 'number', required: false, nullable: true },
      { name: 'calculated_tdee', type: 'number', required: false, nullable: true },
      { name: 'metabolic_age', type: 'number', required: false, nullable: true },
      { name: 'daily_calories', type: 'number', required: false, nullable: true },
      { name: 'daily_protein_g', type: 'number', required: false, nullable: true },
      { name: 'daily_carbs_g', type: 'number', required: false, nullable: true },
      { name: 'daily_fat_g', type: 'number', required: false, nullable: true },
      { name: 'daily_water_ml', type: 'number', required: false, nullable: true },
      { name: 'daily_fiber_g', type: 'number', required: false, nullable: true },
      { name: 'healthy_weight_min', type: 'number', required: false, nullable: true },
      { name: 'healthy_weight_max', type: 'number', required: false, nullable: true },
      { name: 'weekly_weight_loss_rate', type: 'number', required: false, nullable: true },
      { name: 'estimated_timeline_weeks', type: 'number', required: false, nullable: true },
      { name: 'total_calorie_deficit', type: 'number', required: false, nullable: true },
      { name: 'ideal_body_fat_min', type: 'number', required: false, nullable: true },
      { name: 'ideal_body_fat_max', type: 'number', required: false, nullable: true },
      { name: 'lean_body_mass', type: 'number', required: false, nullable: true },
      { name: 'fat_mass', type: 'number', required: false, nullable: true },
      { name: 'estimated_vo2_max', type: 'number', required: false, nullable: true },
      {
        name: 'overall_health_score',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 100,
      },
      {
        name: 'diet_readiness_score',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 100,
      },
      {
        name: 'fitness_readiness_score',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 100,
      },
      {
        name: 'goal_realistic_score',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 100,
      },
      {
        name: 'validation_status',
        type: 'string',
        required: false,
        nullable: true,
        validValues: ['passed', 'warnings', 'blocked'],
      },
      { name: 'validation_errors', type: 'object', required: false, nullable: true },
      { name: 'validation_warnings', type: 'object', required: false, nullable: true },
      { name: 'refeed_schedule', type: 'object', required: false, nullable: true },
      { name: 'medical_adjustments', type: 'array', required: false, nullable: true },
      { name: 'bmr_formula_used', type: 'string', required: false, nullable: true },
      { name: 'bmr_formula_accuracy', type: 'string', required: false, nullable: true },
      {
        name: 'bmr_formula_confidence',
        type: 'number',
        required: false,
        nullable: true,
        minValue: 0,
        maxValue: 100,
      },
      { name: 'climate_used', type: 'string', required: false, nullable: true },
      { name: 'climate_tdee_modifier', type: 'number', required: false, nullable: true },
      { name: 'climate_water_modifier', type: 'number', required: false, nullable: true },
      { name: 'ethnicity_used', type: 'string', required: false, nullable: true },
      { name: 'bmi_cutoffs_used', type: 'object', required: false, nullable: true },
      { name: 'calculations_version', type: 'string', required: false, nullable: true },
      { name: 'bmi_category', type: 'string', required: false, nullable: true },
      { name: 'bmi_health_risk', type: 'string', required: false, nullable: true },
      { name: 'heart_rate_zones', type: 'object', required: false, nullable: true },
      { name: 'vo2_max_estimate', type: 'number', required: false, nullable: true },
      { name: 'vo2_max_classification', type: 'string', required: false, nullable: true },
      { name: 'health_score', type: 'number', required: false, nullable: true },
      { name: 'health_grade', type: 'string', required: false, nullable: true },
      { name: 'detected_climate', type: 'string', required: false, nullable: true },
      { name: 'detected_ethnicity', type: 'string', required: false, nullable: true },
      // Heart rate target zones
      { name: 'target_hr_fat_burn_min', type: 'number', required: false, nullable: true },
      { name: 'target_hr_fat_burn_max', type: 'number', required: false, nullable: true },
      { name: 'target_hr_cardio_min', type: 'number', required: false, nullable: true },
      { name: 'target_hr_cardio_max', type: 'number', required: false, nullable: true },
      { name: 'target_hr_peak_min', type: 'number', required: false, nullable: true },
      { name: 'target_hr_peak_max', type: 'number', required: false, nullable: true },
      // Workout recommendations
      { name: 'recommended_workout_frequency', type: 'number', required: false, nullable: true, minValue: 0, maxValue: 7 },
      { name: 'recommended_cardio_minutes', type: 'number', required: false, nullable: true },
      { name: 'recommended_strength_sessions', type: 'number', required: false, nullable: true },
      // Sleep metrics
      { name: 'recommended_sleep_hours', type: 'number', required: false, nullable: true },
      { name: 'current_sleep_duration', type: 'number', required: false, nullable: true },
      { name: 'sleep_efficiency_score', type: 'number', required: false, nullable: true, minValue: 0, maxValue: 100 },
      // Data quality metrics
      { name: 'data_completeness_percentage', type: 'number', required: false, nullable: true, minValue: 0, maxValue: 100 },
      { name: 'reliability_score', type: 'number', required: false, nullable: true, minValue: 0, maxValue: 100 },
      { name: 'personalization_level', type: 'number', required: false, nullable: true, minValue: 0, maxValue: 100 },
      { name: 'created_at', type: 'timestamp', required: false, nullable: true },
      { name: 'updated_at', type: 'timestamp', required: false, nullable: true },
    ],
  },
};

// ============================================================================
// CONSISTENCY CHECKER CLASS
// ============================================================================

export class ConsistencyChecker {
  private discrepancies: Discrepancy[] = [];
  private currentReport: ConsistencyReport | null = null;

  constructor() {
    this.log('ConsistencyChecker initialized');
  }

  // ============================================================================
  // LOGGING HELPERS
  // ============================================================================

  private log(message: string, data?: any): void {
    if (data !== undefined) {
      console.log(`[ConsistencyChecker] ${message}`, data);
    } else {
      console.log(`[ConsistencyChecker] ${message}`);
    }
  }

  private logWarning(message: string, data?: any): void {
    if (data !== undefined) {
      console.warn(`[ConsistencyChecker] WARNING: ${message}`, data);
    } else {
      console.warn(`[ConsistencyChecker] WARNING: ${message}`);
    }
  }

  private logError(message: string, data?: any): void {
    if (data !== undefined) {
      console.error(`[ConsistencyChecker] ERROR: ${message}`, data);
    } else {
      console.error(`[ConsistencyChecker] ERROR: ${message}`);
    }
  }

  // ============================================================================
  // DEEP COMPARISON UTILITIES
  // ============================================================================

  /**
   * Performs deep equality check between two values
   */
  private deepEqual(a: any, b: any): boolean {
    // Handle null/undefined
    if (a === b) return true;
    if (a === null || b === null) return false;
    if (a === undefined || b === undefined) return false;

    // Handle different types
    if (typeof a !== typeof b) return false;

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEqual(a[i], b[i])) return false;
      }
      return true;
    }

    // Handle objects
    if (typeof a === 'object' && typeof b === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);

      if (keysA.length !== keysB.length) return false;

      for (const key of keysA) {
        if (!keysB.includes(key)) return false;
        if (!this.deepEqual(a[key], b[key])) return false;
      }
      return true;
    }

    // Handle primitives
    return a === b;
  }

  /**
   * Determines severity based on field importance
   */
  private determineSeverity(dataType: string, field: string): DiscrepancySeverity {
    // Critical fields that must match exactly
    const errorFields = [
      'id',
      'user_id',
      'email',
      'height_cm',
      'current_weight_kg',
      'target_weight_kg',
      'pregnancy_status',
      'breastfeeding_status',
      'medical_conditions',
      'diet_type',
      'primary_goals',
    ];

    // Important fields that should match
    const warningFields = [
      'age',
      'gender',
      'location',
      'intensity',
      'activity_level',
      'body_fat_percentage',
      'allergies',
      'restrictions',
      'equipment',
    ];

    if (errorFields.includes(field)) {
      return 'error';
    }

    if (warningFields.includes(field)) {
      return 'warning';
    }

    return 'info';
  }

  /**
   * Adds a discrepancy to the list
   */
  private addDiscrepancy(
    dataType: string,
    field: string,
    oldValue: any,
    newValue: any
  ): void {
    const severity = this.determineSeverity(dataType, field);

    const discrepancy: Discrepancy = {
      dataType,
      field,
      oldValue,
      newValue,
      severity,
    };

    this.discrepancies.push(discrepancy);

    if (severity === 'error') {
      this.logError(`Critical mismatch in ${dataType}.${field}`, {
        old: oldValue,
        new: newValue,
      });
    } else if (severity === 'warning') {
      this.logWarning(`Mismatch in ${dataType}.${field}`, {
        old: oldValue,
        new: newValue,
      });
    } else {
      this.log(`Info: Difference in ${dataType}.${field}`, {
        old: oldValue,
        new: newValue,
      });
    }
  }

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Compares local storage data between old and new systems
   * Performs deep comparison and logs all discrepancies
   */
  compareLocalData(oldData: any, newData: any): boolean {
    this.log('Starting local data comparison');
    this.discrepancies = [];

    if (!oldData && !newData) {
      this.log('Both old and new data are empty - match');
      return true;
    }

    if (!oldData || !newData) {
      this.logWarning('One dataset is missing', {
        hasOldData: !!oldData,
        hasNewData: !!newData,
      });
      this.addDiscrepancy('root', 'data_presence', !!oldData, !!newData);
      return false;
    }

    let isMatch = true;

    // Compare each data type
    const dataTypes = [
      'personalInfo',
      'dietPreferences',
      'workoutPreferences',
      'bodyMetrics',
      'fitnessGoals',
    ];

    for (const dataType of dataTypes) {
      const oldSection = oldData[dataType];
      const newSection = newData[dataType];

      if (!this.deepEqual(oldSection, newSection)) {
        isMatch = false;
        this.compareObjects(dataType, oldSection || {}, newSection || {});
      }
    }

    this.log(`Local data comparison complete. Match: ${isMatch}`);
    return isMatch;
  }

  /**
   * Recursively compares two objects and logs discrepancies
   */
  private compareObjects(
    dataType: string,
    oldObj: any,
    newObj: any,
    prefix: string = ''
  ): void {
    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {}),
    ]);

    for (const key of allKeys) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];

      if (!this.deepEqual(oldValue, newValue)) {
        // If both are objects, recurse
        if (
          typeof oldValue === 'object' &&
          typeof newValue === 'object' &&
          !Array.isArray(oldValue) &&
          !Array.isArray(newValue) &&
          oldValue !== null &&
          newValue !== null
        ) {
          this.compareObjects(dataType, oldValue, newValue, fieldPath);
        } else {
          this.addDiscrepancy(dataType, fieldPath, oldValue, newValue);
        }
      }
    }
  }

  /**
   * Fetches data from database and compares with both old and new system representations
   */
  async compareDatabaseData(userId: string): Promise<boolean> {
    this.log(`Starting database comparison for user: ${userId}`);
    this.discrepancies = [];

    try {
      // Fetch data from all relevant tables
      const [
        { data: profileData, error: profileError },
        { data: dietData, error: dietError },
        { data: bodyData, error: bodyError },
        { data: workoutData, error: workoutError },
        { data: advancedData, error: advancedError },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('diet_preferences').select('*').eq('user_id', userId).single(),
        supabase.from('body_analysis').select('*').eq('user_id', userId).single(),
        supabase.from('workout_preferences').select('*').eq('user_id', userId).single(),
        supabase.from('advanced_review').select('*').eq('user_id', userId).single(),
      ]);

      // Log any fetch errors
      if (profileError && profileError.code !== 'PGRST116') {
        this.logWarning('Error fetching profile', profileError);
      }
      if (dietError && dietError.code !== 'PGRST116') {
        this.logWarning('Error fetching diet preferences', dietError);
      }
      if (bodyError && bodyError.code !== 'PGRST116') {
        this.logWarning('Error fetching body analysis', bodyError);
      }
      if (workoutError && workoutError.code !== 'PGRST116') {
        this.logWarning('Error fetching workout preferences', workoutError);
      }
      if (advancedError && advancedError.code !== 'PGRST116') {
        this.logWarning('Error fetching advanced review', advancedError);
      }

      const databaseData = {
        profiles: profileData,
        diet_preferences: dietData,
        body_analysis: bodyData,
        workout_preferences: workoutData,
        advanced_review: advancedData,
      };

      // Validate each table's data against schema
      let allValid = true;

      for (const [tableName, data] of Object.entries(databaseData)) {
        if (data) {
          const validation = this.validateDataIntegrity(data, tableName as DataType);
          if (!validation.isValid) {
            allValid = false;
            this.log(`Validation failed for ${tableName}`, validation.errors);
          }
        }
      }

      this.log(`Database comparison complete. All valid: ${allValid}`);
      return allValid && this.discrepancies.length === 0;
    } catch (error) {
      this.logError('Database comparison failed', error);
      throw error;
    }
  }

  /**
   * Validates that data matches the expected schema
   */
  validateDataIntegrity(data: any, dataType: DataType): ValidationResult {
    this.log(`Validating data integrity for: ${dataType}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    // Get schema for data type
    const schema = DATABASE_SCHEMAS[dataType];

    if (!schema) {
      // For non-database types, perform basic validation
      return this.validateLocalDataType(data, dataType);
    }

    // Validate each field against schema
    for (const field of schema.fields) {
      const value = data[field.name];

      // Check required fields
      if (field.required && (value === undefined || value === null)) {
        errors.push(`Required field '${field.name}' is missing`);
        continue;
      }

      // Skip validation for null/undefined optional fields
      if (value === undefined || value === null) {
        if (!field.nullable && !field.required) {
          warnings.push(`Optional field '${field.name}' is null/undefined`);
        }
        continue;
      }

      // Validate type
      const typeValid = this.validateFieldType(value, field.type);
      if (!typeValid) {
        errors.push(
          `Field '${field.name}' has invalid type. Expected ${field.type}, got ${typeof value}`
        );
      }

      // Validate enum values
      if (field.validValues && !field.validValues.includes(value)) {
        errors.push(
          `Field '${field.name}' has invalid value '${value}'. Valid values: ${field.validValues.join(', ')}`
        );
      }

      // Validate numeric ranges
      if (field.type === 'number' && typeof value === 'number') {
        if (field.minValue !== undefined && value < field.minValue) {
          errors.push(
            `Field '${field.name}' value ${value} is below minimum ${field.minValue}`
          );
        }
        if (field.maxValue !== undefined && value > field.maxValue) {
          errors.push(
            `Field '${field.name}' value ${value} is above maximum ${field.maxValue}`
          );
        }
      }
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
    };

    this.log(`Validation result for ${dataType}:`, result);
    return result;
  }

  /**
   * Validates field type
   */
  private validateFieldType(
    value: any,
    expectedType: SchemaField['type']
  ): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && !Array.isArray(value) && value !== null;
      case 'uuid':
        return (
          typeof value === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
        );
      case 'timestamp':
        return typeof value === 'string' || value instanceof Date;
      default:
        return true;
    }
  }

  /**
   * Validates local data types (non-database)
   */
  private validateLocalDataType(data: any, dataType: DataType): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (dataType) {
      case 'personalInfo':
        if (!data.first_name) errors.push("Missing required field 'first_name'");
        if (!data.last_name) errors.push("Missing required field 'last_name'");
        if (typeof data.age !== 'number') errors.push("'age' must be a number");
        if (!data.gender) errors.push("Missing required field 'gender'");
        break;

      case 'dietPreferences':
        if (!data.diet_type) errors.push("Missing required field 'diet_type'");
        if (!Array.isArray(data.allergies))
          errors.push("'allergies' must be an array");
        if (!Array.isArray(data.restrictions))
          errors.push("'restrictions' must be an array");
        break;

      case 'workoutPreferences':
        if (!data.location) errors.push("Missing required field 'location'");
        if (!Array.isArray(data.equipment))
          errors.push("'equipment' must be an array");
        if (!data.intensity) errors.push("Missing required field 'intensity'");
        if (!Array.isArray(data.primary_goals))
          errors.push("'primary_goals' must be an array");
        break;

      case 'bodyMetrics':
        if (typeof data.height_cm !== 'number')
          errors.push("'height_cm' must be a number");
        if (typeof data.current_weight_kg !== 'number')
          errors.push("'current_weight_kg' must be a number");
        if (!Array.isArray(data.medical_conditions))
          warnings.push("'medical_conditions' should be an array");
        break;

      case 'fitnessGoals':
        if (!Array.isArray(data.primary_goals))
          errors.push("'primary_goals' must be an array");
        if (!data.time_commitment)
          errors.push("Missing required field 'time_commitment'");
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Runs a complete consistency audit
   */
  async runFullAudit(userId?: string): Promise<ConsistencyReport> {
    this.log(`Starting full audit${userId ? ` for user: ${userId}` : ''}`);
    this.discrepancies = [];

    const checks = {
      localStorageMatch: true,
      databaseMatch: true,
      schemaValid: true,
    };

    // If userId provided, run database checks
    if (userId) {
      try {
        checks.databaseMatch = await this.compareDatabaseData(userId);
      } catch {
        checks.databaseMatch = false;
      }
    }

    // Generate recommendations based on discrepancies
    const recommendations = this.generateRecommendations();

    // Check if schema is valid based on discrepancies
    checks.schemaValid = !this.discrepancies.some(
      (d) => d.severity === 'error' && d.field.includes('type')
    );

    this.currentReport = {
      timestamp: new Date().toISOString(),
      userId: userId || null,
      checks,
      discrepancies: [...this.discrepancies],
      recommendations,
    };

    this.log('Full audit complete', this.currentReport);
    return this.currentReport;
  }

  /**
   * Generates a detailed report of any discrepancies
   */
  generateReport(): ConsistencyReport {
    if (this.currentReport) {
      return this.currentReport;
    }

    // Generate a new report based on current state
    const recommendations = this.generateRecommendations();

    const report: ConsistencyReport = {
      timestamp: new Date().toISOString(),
      userId: null,
      checks: {
        localStorageMatch: this.discrepancies.length === 0,
        databaseMatch: true,
        schemaValid: !this.discrepancies.some((d) => d.severity === 'error'),
      },
      discrepancies: [...this.discrepancies],
      recommendations,
    };

    this.log('Report generated', report);
    return report;
  }

  /**
   * Generates recommendations based on discrepancies
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Group discrepancies by severity
    const errors = this.discrepancies.filter((d) => d.severity === 'error');
    const warnings = this.discrepancies.filter((d) => d.severity === 'warning');
    const infos = this.discrepancies.filter((d) => d.severity === 'info');

    if (errors.length > 0) {
      recommendations.push(
        `CRITICAL: Found ${errors.length} critical data mismatches that require immediate attention.`
      );

      // Specific recommendations for common error types
      const hasIdMismatch = errors.some((e) => e.field === 'id' || e.field === 'user_id');
      if (hasIdMismatch) {
        recommendations.push(
          'ID mismatch detected - verify data migration completed correctly.'
        );
      }

      const hasMedicalMismatch = errors.some((e) =>
        ['pregnancy_status', 'breastfeeding_status', 'medical_conditions'].includes(
          e.field
        )
      );
      if (hasMedicalMismatch) {
        recommendations.push(
          'Medical data mismatch - review health-related fields for safety.'
        );
      }
    }

    if (warnings.length > 0) {
      recommendations.push(
        `Found ${warnings.length} data inconsistencies that should be reviewed.`
      );

      const hasWeightMismatch = warnings.some((e) =>
        ['current_weight_kg', 'target_weight_kg', 'height_cm'].includes(e.field)
      );
      if (hasWeightMismatch) {
        recommendations.push(
          'Body measurements differ - consider re-syncing user data.'
        );
      }
    }

    if (infos.length > 0 && errors.length === 0 && warnings.length === 0) {
      recommendations.push(
        `Found ${infos.length} minor differences (informational only).`
      );
    }

    if (this.discrepancies.length === 0) {
      recommendations.push('All data is consistent between old and new systems.');
    }

    // Add general recommendations
    if (errors.length > 0 || warnings.length > 0) {
      recommendations.push('Consider running a full data migration to resolve inconsistencies.');
      recommendations.push(
        'Review the discrepancy details to identify root causes.'
      );
    }

    return recommendations;
  }

  /**
   * Clears all stored discrepancies and reports
   */
  clear(): void {
    this.discrepancies = [];
    this.currentReport = null;
    this.log('Cleared all discrepancies and reports');
  }

  /**
   * Returns the current list of discrepancies
   */
  getDiscrepancies(): Discrepancy[] {
    return [...this.discrepancies];
  }

  /**
   * Checks if there are any critical errors
   */
  hasCriticalErrors(): boolean {
    return this.discrepancies.some((d) => d.severity === 'error');
  }

  /**
   * Gets a summary of discrepancies by severity
   */
  getSummary(): { errors: number; warnings: number; info: number } {
    return {
      errors: this.discrepancies.filter((d) => d.severity === 'error').length,
      warnings: this.discrepancies.filter((d) => d.severity === 'warning').length,
      info: this.discrepancies.filter((d) => d.severity === 'info').length,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const consistencyChecker = new ConsistencyChecker();

export default ConsistencyChecker;
