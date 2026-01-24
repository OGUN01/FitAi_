/**
 * Type Transformers - Utilities for converting between snake_case (database/API) and camelCase (app)
 *
 * SINGLE SOURCE OF TRUTH PATTERN:
 * - Database/Supabase: Always uses snake_case (e.g., first_name, primary_goals)
 * - App internal: Uses camelCase in some legacy components (e.g., firstName, primaryGoals)
 *
 * This utility ensures consistent transformation at API boundaries.
 *
 * USAGE:
 * - When RECEIVING data from Supabase: Data is already in snake_case (preferred format)
 * - When SENDING data to Supabase: Ensure data is in snake_case
 * - For legacy components expecting camelCase: Use toAppFormat()
 * - For database operations: Use toDbFormat()
 *
 * Created: January 2026 - Source of Truth Consolidation
 */

// ============================================================================
// CORE TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Convert a string from snake_case to camelCase
 * e.g., "first_name" -> "firstName", "primary_goals" -> "primaryGoals"
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert a string from camelCase to snake_case
 * e.g., "firstName" -> "first_name", "primaryGoals" -> "primary_goals"
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Deep transform object keys from snake_case to camelCase
 * Handles nested objects and arrays
 */
export function toAppFormat<T extends Record<string, any>>(
  obj: T,
): Record<string, any> {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null ? toAppFormat(item) : item,
    ) as any;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const transformed: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const camelKey = snakeToCamel(key);
    const value = obj[key];

    if (value !== null && typeof value === "object") {
      if (Array.isArray(value)) {
        transformed[camelKey] = value.map((item) =>
          typeof item === "object" && item !== null ? toAppFormat(item) : item,
        );
      } else if (value instanceof Date) {
        transformed[camelKey] = value;
      } else {
        transformed[camelKey] = toAppFormat(value);
      }
    } else {
      transformed[camelKey] = value;
    }

    // Also keep original key for backward compatibility during migration
    if (key !== camelKey) {
      transformed[key] = transformed[camelKey];
    }
  }

  return transformed;
}

/**
 * Deep transform object keys from camelCase to snake_case
 * Handles nested objects and arrays
 * This is the preferred format for database operations
 */
export function toDbFormat<T extends Record<string, any>>(
  obj: T,
): Record<string, any> {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null ? toDbFormat(item) : item,
    ) as any;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const transformed: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key);
    const value = obj[key];

    // Skip duplicate keys (when both snake_case and camelCase exist)
    if (transformed[snakeKey] !== undefined && key !== snakeKey) {
      continue;
    }

    if (value !== null && typeof value === "object") {
      if (Array.isArray(value)) {
        transformed[snakeKey] = value.map((item) =>
          typeof item === "object" && item !== null ? toDbFormat(item) : item,
        );
      } else if (value instanceof Date) {
        transformed[snakeKey] = value;
      } else {
        transformed[snakeKey] = toDbFormat(value);
      }
    } else {
      transformed[snakeKey] = value;
    }
  }

  return transformed;
}

// ============================================================================
// SPECIFIC FIELD MAPPINGS (for known field transformations)
// ============================================================================

/**
 * Known field mappings between legacy camelCase and database snake_case
 * These are fields that have been identified as having inconsistent naming
 */
export const FIELD_MAPPINGS = {
  // PersonalInfo fields
  firstName: "first_name",
  lastName: "last_name",
  wakeTime: "wake_time",
  sleepTime: "sleep_time",
  occupationType: "occupation_type",
  profilePicture: "profile_picture",
  darkMode: "dark_mode",
  notificationsEnabled: "notifications_enabled",

  // FitnessGoals/WorkoutPreferences fields
  primaryGoals: "primary_goals",
  timeCommitment: "time_commitment",
  experienceLevel: "experience_level",
  timePreference: "time_preference",
  workoutTypes: "workout_types",
  activityLevel: "activity_level",
  workoutFrequencyPerWeek: "workout_frequency_per_week",
  preferredWorkoutTimes: "preferred_workout_times",
  workoutExperienceYears: "workout_experience_years",
  canDoPushups: "can_do_pushups",
  canRunMinutes: "can_run_minutes",
  flexibilityLevel: "flexibility_level",
  weeklyWeightLossGoal: "weekly_weight_loss_goal",
  prefersVariety: "prefers_variety",
  enjoyCardio: "enjoys_cardio",
  enjoysStrengthTraining: "enjoys_strength_training",
  enjoysGroupClasses: "enjoys_group_classes",
  prefersOutdoorActivities: "prefers_outdoor_activities",
  needsMotivation: "needs_motivation",

  // BodyAnalysis fields
  heightCm: "height_cm",
  currentWeightKg: "current_weight_kg",
  targetWeightKg: "target_weight_kg",
  targetTimelineWeeks: "target_timeline_weeks",
  bodyFatPercentage: "body_fat_percentage",
  waistCm: "waist_cm",
  hipCm: "hip_cm",
  chestCm: "chest_cm",
  frontPhotoUrl: "front_photo_url",
  sidePhotoUrl: "side_photo_url",
  backPhotoUrl: "back_photo_url",
  aiEstimatedBodyFat: "ai_estimated_body_fat",
  aiBodyType: "ai_body_type",
  aiConfidenceScore: "ai_confidence_score",
  medicalConditions: "medical_conditions",
  physicalLimitations: "physical_limitations",
  pregnancyStatus: "pregnancy_status",
  pregnancyTrimester: "pregnancy_trimester",
  breastfeedingStatus: "breastfeeding_status",
  stressLevel: "stress_level",
  idealWeightMin: "ideal_weight_min",
  idealWeightMax: "ideal_weight_max",
  waistHipRatio: "waist_hip_ratio",

  // DietPreferences fields
  dietType: "diet_type",
  cuisinePreferences: "cuisine_preferences",
  snacksCount: "snacks_count",
  ketoReady: "keto_ready",
  intermittentFastingReady: "intermittent_fasting_ready",
  paleoReady: "paleo_ready",
  mediterraneanReady: "mediterranean_ready",
  lowCarbReady: "low_carb_ready",
  highProteinReady: "high_protein_ready",
  breakfastEnabled: "breakfast_enabled",
  lunchEnabled: "lunch_enabled",
  dinnerEnabled: "dinner_enabled",
  snacksEnabled: "snacks_enabled",
  cookingSkillLevel: "cooking_skill_level",
  maxPrepTimeMinutes: "max_prep_time_minutes",
  budgetLevel: "budget_level",
  drinksEnoughWater: "drinks_enough_water",
  limitsSugaryDrinks: "limits_sugary_drinks",
  eatsRegularMeals: "eats_regular_meals",
  avoidsLateNightEating: "avoids_late_night_eating",
  controlsPortionSizes: "controls_portion_sizes",
  readsNutritionLabels: "reads_nutrition_labels",
  eatsProcessedFoods: "eats_processed_foods",
  eats5ServingsFruitsVeggies: "eats_5_servings_fruits_veggies",
  limitsRefinedSugar: "limits_refined_sugar",
  includesHealthyFats: "includes_healthy_fats",
  drinksAlcohol: "drinks_alcohol",
  smokesTobacco: "smokes_tobacco",
  drinksCoffee: "drinks_coffee",
  takesSupplements: "takes_supplements",

  // AdvancedReview fields
  calculatedBmi: "calculated_bmi",
  calculatedBmr: "calculated_bmr",
  calculatedTdee: "calculated_tdee",
  metabolicAge: "metabolic_age",
  dailyCalories: "daily_calories",
  dailyProteinG: "daily_protein_g",
  dailyCarbsG: "daily_carbs_g",
  dailyFatG: "daily_fat_g",
  dailyWaterMl: "daily_water_ml",
  dailyFiberG: "daily_fiber_g",
  healthyWeightMin: "healthy_weight_min",
  healthyWeightMax: "healthy_weight_max",
  weeklyWeightLossRate: "weekly_weight_loss_rate",
  estimatedTimelineWeeks: "estimated_timeline_weeks",
  totalCalorieDeficit: "total_calorie_deficit",
  idealBodyFatMin: "ideal_body_fat_min",
  idealBodyFatMax: "ideal_body_fat_max",
  leanBodyMass: "lean_body_mass",
  fatMass: "fat_mass",
  estimatedVo2Max: "estimated_vo2_max",
  maxHeartRate: "max_heart_rate",
  targetHrFatBurnMin: "target_hr_fat_burn_min",
  targetHrFatBurnMax: "target_hr_fat_burn_max",
  targetHrCardioMin: "target_hr_cardio_min",
  targetHrCardioMax: "target_hr_cardio_max",
  targetHrPeakMin: "target_hr_peak_min",
  targetHrPeakMax: "target_hr_peak_max",
  recommendedWorkoutFrequency: "recommended_workout_frequency",
  recommendedCardioMinutes: "recommended_cardio_minutes",
  recommendedStrengthSessions: "recommended_strength_sessions",
  overallHealthScore: "overall_health_score",
  dietReadinessScore: "diet_readiness_score",
  fitnessReadinessScore: "fitness_readiness_score",
  goalRealisticScore: "goal_realistic_score",
  recommendedSleepHours: "recommended_sleep_hours",
  currentSleepDuration: "current_sleep_duration",
  sleepEfficiencyScore: "sleep_efficiency_score",
  dataCompletenessPercentage: "data_completeness_percentage",
  reliabilityScore: "reliability_score",
  personalizationLevel: "personalization_level",
  validationStatus: "validation_status",
  validationErrors: "validation_errors",
  validationWarnings: "validation_warnings",
  refeedSchedule: "refeed_schedule",
  medicalAdjustments: "medical_adjustments",
} as const;

/**
 * Reverse mapping: snake_case to camelCase
 */
export const REVERSE_FIELD_MAPPINGS: Record<string, string> = Object.entries(
  FIELD_MAPPINGS,
).reduce(
  (acc, [camel, snake]) => {
    acc[snake] = camel;
    return acc;
  },
  {} as Record<string, string>,
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a value is a plain object (not array, null, Date, etc.)
 */
function isPlainObject(value: any): value is Record<string, any> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  );
}

/**
 * Normalize field names using known mappings
 * This is useful when you receive data that might have mixed naming conventions
 */
export function normalizeToSnakeCase<T extends Record<string, any>>(
  obj: T,
): Record<string, any> {
  if (!isPlainObject(obj)) {
    return obj;
  }

  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if this is a known camelCase field
    const snakeKey = FIELD_MAPPINGS[key as keyof typeof FIELD_MAPPINGS] || key;

    // Recursively normalize nested objects
    if (isPlainObject(value)) {
      normalized[snakeKey] = normalizeToSnakeCase(value);
    } else if (Array.isArray(value)) {
      normalized[snakeKey] = value.map((item) =>
        isPlainObject(item) ? normalizeToSnakeCase(item) : item,
      );
    } else {
      normalized[snakeKey] = value;
    }
  }

  return normalized;
}

/**
 * Normalize field names using known mappings to camelCase
 * For legacy components that expect camelCase
 */
export function normalizeToCamelCase<T extends Record<string, any>>(
  obj: T,
): Record<string, any> {
  if (!isPlainObject(obj)) {
    return obj;
  }

  const normalized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if this is a known snake_case field
    const camelKey = REVERSE_FIELD_MAPPINGS[key] || key;

    // Recursively normalize nested objects
    if (isPlainObject(value)) {
      normalized[camelKey] = normalizeToCamelCase(value);
    } else if (Array.isArray(value)) {
      normalized[camelKey] = value.map((item) =>
        isPlainObject(item) ? normalizeToCamelCase(item) : item,
      );
    } else {
      normalized[camelKey] = value;
    }

    // Also keep original key for backward compatibility
    if (key !== camelKey) {
      normalized[key] = normalized[camelKey];
    }
  }

  return normalized;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  snakeToCamel,
  camelToSnake,
  toAppFormat,
  toDbFormat,
  normalizeToSnakeCase,
  normalizeToCamelCase,
  FIELD_MAPPINGS,
  REVERSE_FIELD_MAPPINGS,
};
