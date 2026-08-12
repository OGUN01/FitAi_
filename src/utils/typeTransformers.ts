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
 * - For database operations: Use toDbFormat()
 *
 * Created: January 2026 - Source of Truth Consolidation
 */

// ============================================================================
// CORE TRANSFORMATION UTILITIES
// ============================================================================

/**
 * Convert a string from camelCase to snake_case
 * e.g., "firstName" -> "first_name", "primaryGoals" -> "primary_goals"
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Deep transform object keys from camelCase to snake_case
 * Handles nested objects and arrays
 * This is the preferred format for database operations
 */
export function toDbFormat<T extends Record<string, any>>(
  obj: T,
): Record<string, any> | any[] {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null ? toDbFormat(item) : item,
    );
  }

  if (typeof obj !== "object") {
    return obj;
  }

  const transformed: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const snakeKey = camelToSnake(key);
    const value = obj[key];

    // Skip duplicate keys (when both snake_case and camelCase exist for the
    // same field). Deterministic regardless of Object.keys() iteration order:
    // a raw snake_case entry present anywhere on the object always wins over
    // a camelCase alias, so {a:1,a_b:2} and {a_b:2,a:1} (aliases of the same
    // snake key) both resolve to the snake_case entry's value.
    if (key !== snakeKey && snakeKey in obj) {
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
const FIELD_MAPPINGS = {
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

// ============================================================================
// ENUM BOUNDARY MAPPERS
// ============================================================================
// Onboarding types (DB/user-facing) and health-calc types (internal) use
// different enum values for the same concepts.  These mappers convert at the
// boundary so neither side has to know about the other's vocabulary.
//
// Canonical enums:
//   - Onboarding activity_level: sedentary | light | moderate | active | extreme
//   - Health-calc ActivityLevel : sedentary | light | moderate | active | very_active | extreme
//   - Onboarding diet_type     : vegetarian | vegan | non-veg | non_veg | pescatarian |
//                                 keto | omnivore | balanced | mediterranean | paleo
//                                 (full live DB CHECK constraint — see
//                                 supabase/migrations/20260729000001_expand_diet_type_check_constraint.sql
//                                 and .../20260729000002_align_legacy_diet_type_check.sql.
//                                 'non_veg' is a legacy alternate spelling; 'keto' /
//                                 'mediterranean' / 'paleo' are reserved for future
//                                 diet-readiness promotion of diet_type.)
//   - Health-calc DietType     : omnivore | vegetarian | vegan | pescatarian | keto | low_carb | paleo | mediterranean

/**
 * Maps onboarding activity_level → health-calc ActivityLevel.
 *
 * Onboarding uses "extreme" (matches DB CHECK constraint);
 * health-calc uses "very_active" — same concept, different label.
 *
 * All other values pass through unchanged:
 *   sedentary, light, moderate, active
 */
export function mapActivityLevelForHealthCalc(
  onboardingLevel: string,
): string {
  if (onboardingLevel === "extreme") return "very_active";
  return onboardingLevel; // sedentary, light, moderate, active pass through
}

/**
 * Maps health-calc ActivityLevel → onboarding activity_level.
 *
 * Inverse of mapActivityLevelForHealthCalc: health-calc "very_active" → onboarding "extreme".
 * Unknown values fall back to "moderate" (a safe middle value) and are logged so the
 * divergence is visible rather than silent.
 */
export function mapActivityLevelForOnboarding(
  healthCalcLevel: string,
): string {
  switch (healthCalcLevel) {
    case "sedentary":
    case "light":
    case "moderate":
    case "active":
      return healthCalcLevel;
    case "very_active":
    case "extreme":
      // Both map back to "extreme" (onboarding's label for the top tier).
      return "extreme";
    default:
      console.warn(
        `[mapActivityLevelForOnboarding] Unknown health-calc activity level "${healthCalcLevel}" — falling back to "moderate".`,
      );
      return "moderate";
  }
}

/**
 * Maps onboarding diet_type → health-calc DietType (base diet only).
 *
 *   vegetarian    → vegetarian (pass-through)
 *   vegan         → vegan (pass-through)
 *   pescatarian   → pescatarian (pass-through)
 *   non-veg       → omnivore
 *   non_veg       → omnivore  (legacy alternate spelling — see migration
 *                              20260729000001_expand_diet_type_check_constraint.sql)
 *   balanced      → omnivore  (explicit: "balanced" is the onboarding label for a
 *                              mixed/omnivorous diet; there is no separate "balanced"
 *                              DietType in health-calc)
 *   keto          → keto (pass-through)
 *   omnivore      → omnivore (pass-through — diet_type can already be stored as the
 *                              health-calc label directly)
 *   mediterranean → mediterranean (pass-through)
 *   paleo         → paleo (pass-through)
 *
 * All of the above are legal values of the live diet_type CHECK constraint. Unknown
 * (genuinely malformed) values fall back to "omnivore" and are logged. This mapper
 * does NOT apply readiness-flag overrides (keto_ready etc.) — those are handled
 * separately by nutritional.resolveDietType so the override decision is visible
 * and explicit.
 */
export function mapDietTypeForHealthCalc(
  onboardingDietType: string,
): string {
  switch (onboardingDietType) {
    case "vegetarian":
    case "vegan":
    case "pescatarian":
      return onboardingDietType;
    case "non-veg":
    case "non_veg":
    case "balanced":
      return "omnivore";
    case "keto":
    case "omnivore":
    case "mediterranean":
    case "paleo":
      return onboardingDietType;
    default:
      console.warn(
        `[mapDietTypeForHealthCalc] Unknown onboarding diet_type "${onboardingDietType}" — falling back to "omnivore".`,
      );
      return "omnivore";
  }
}

/**
 * Maps health-calc DietType → onboarding diet_type.
 *
 * NOT a lossless inverse of mapDietTypeForHealthCalc: mapDietTypeForHealthCalc
 * collapses TWO distinct onboarding values ("non-veg" and "balanced") onto the
 * same health-calc value ("omnivore"), so the reverse direction cannot recover
 * which one the user originally selected — "omnivore" → "balanced" here always,
 * never "non-veg". Similarly the specialized DietType values (keto, low_carb,
 * paleo, mediterranean) have NO distinct onboarding equivalent — they only arise
 * from readiness flags or diet-readiness promotion — so they collapse to the
 * closest compatible base diet ("balanced"). Unknown values also fall back to
 * "balanced".
 *
 * This asymmetry is intentional and safe ONLY as long as nothing re-persists
 * this function's output into a user's diet_type column — doing so would
 * silently relabel a "non-veg" user as "balanced". As of this writing this
 * function (and mapActivityLevelForOnboarding) have zero production call
 * sites — audited via repo-wide grep — so no live write path can trigger that
 * relabel today. They are kept (rather than deleted) because the diet_type
 * CHECK constraint migration's comments anticipate a future diet-readiness
 * promotion feature that would need this boundary crossing; if that feature
 * is implemented, its write path must NOT feed "omnivore" through this mapper
 * and persist the result as diet_type without first checking whether the
 * user's original selection was "non-veg" (which must round-trip losslessly).
 */
export function mapDietTypeForOnboarding(
  healthCalcDietType: string,
): string {
  switch (healthCalcDietType) {
    case "vegetarian":
    case "vegan":
    case "pescatarian":
      return healthCalcDietType;
    case "omnivore":
      return "balanced";
    // Specialized diets derived from readiness flags collapse to the closest
    // compatible base diet (they are not user-selectable onboarding diet_types):
    case "keto":
    case "low_carb":
    case "paleo":
    case "mediterranean":
      return "balanced";
    default:
      console.warn(
        `[mapDietTypeForOnboarding] Unknown health-calc DietType "${healthCalcDietType}" — falling back to "balanced".`,
      );
      return "balanced";
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  toDbFormat,
  normalizeToSnakeCase,
  mapActivityLevelForHealthCalc,
  mapActivityLevelForOnboarding,
  mapDietTypeForHealthCalc,
  mapDietTypeForOnboarding,
};
