/**
 * AI Request Transformers
 *
 * Transforms frontend types (PersonalInfo, FitnessGoals, etc.) to backend request format
 * for the fitai-workers API.
 *
 * The backend reads user data from Supabase tables (advanced_review, profiles, etc.)
 * but still needs a minimal profile context in the request for fallback/validation.
 */

/** Single place to update the AI model used for all requests (BUG-59) */
const DEFAULT_AI_MODEL = "google/gemini-2.5-flash";

import type {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  BodyMetrics,
} from "../types/user";
import type { AdvancedReviewData } from "../types/onboarding";
import type {
  DietGenerationRequest,
  WorkoutGenerationRequest,
  WorkersResponse,
  DietPlan,
  WorkoutPlan,
} from "./fitaiWorkersClient";
import type {
  WeeklyMealPlan,
  WeeklyWorkoutPlan,
  Meal,
  DayMeal,
  Workout,
} from "../types/ai";
import type { MealItem, Food } from "../types/diet";
import { resolveCurrentWeight } from "./currentWeight";
import { mapActivityLevelForHealthCalc } from "../utils/typeTransformers";
// Note: MET-based calorie calculation happens at workout completion (completionTracking.ts)
// where we have access to the user's actual weight from their profile

// ============================================================================
// DIET REQUEST TRANSFORMERS
// ============================================================================

const WEEKDAY_SEQUENCE = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function clampInt(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value as number)));
}

function getRequestedMealsPerDay(dietPreferences?: DietPreferences): number {
  if (!dietPreferences) {
    return 3;
  }

  let mealsPerDay = 0;

  if (dietPreferences.breakfast_enabled !== false) mealsPerDay += 1;
  if (dietPreferences.lunch_enabled !== false) mealsPerDay += 1;
  if (dietPreferences.dinner_enabled !== false) mealsPerDay += 1;
  if (dietPreferences.snacks_enabled) mealsPerDay += (dietPreferences.snacks_count ?? 2);

  return mealsPerDay > 0 ? mealsPerDay : 3;
}

function mapSupportedDietaryRestriction(
  restriction: string | undefined,
): string | null {
  if (!restriction) {
    return null;
  }

  const normalized = restriction.trim().toLowerCase().replace(/\s+/g, "-");
  const supportedRestrictions: Record<string, string | null> = {
    vegetarian: "vegetarian",
    vegan: "vegan",
    pescatarian: "pescatarian",
    keto: "keto",
    "gluten-free": "gluten_free",
    gluten_free: "gluten_free",
    "dairy-free": "dairy_free",
    dairy_free: "dairy_free",
    "nut-free": "nut_free",
    nut_free: "nut_free",
    halal: "halal",
    kosher: "kosher",
    "low-carb": "low_carb",
    low_carb: "low_carb",
    // These are valid onboarding values that map to no restriction (worker default path)
    "non-veg": null,
    balanced: null,
  };

  if (!(normalized in supportedRestrictions)) {
    console.warn('[aiRequestTransformers] Unsupported diet_type — restriction will not be applied:', restriction);
  }
  return supportedRestrictions[normalized] ?? null;
}

function normalizeDayOfWeek(dayOfWeek: unknown): string | null {
  if (typeof dayOfWeek !== "string") {
    return null;
  }

  const normalized = dayOfWeek.trim().toLowerCase();
  return WEEKDAY_SEQUENCE.includes(normalized as (typeof WEEKDAY_SEQUENCE)[number])
    ? normalized
    : null;
}

function inferDayOfWeekFromPosition(
  mealIndex: number,
  requestedDaysCount: number,
  mealsPerDay: number,
  fallbackDay: string,
): string {
  if (requestedDaysCount <= 1) {
    return fallbackDay;
  }

  const inferredDayIndex = Math.min(
    requestedDaysCount - 1,
    Math.floor(mealIndex / Math.max(1, mealsPerDay)),
  );

  return WEEKDAY_SEQUENCE[inferredDayIndex];
}

/**
 * Transform frontend types to DietGenerationRequest for backend
 *
 * IMPORTANT: The backend schema expects specific fields for cache key generation:
 * - calorieTarget (required)
 * - dietaryRestrictions (array like ['vegetarian'])
 * - mealsPerDay
 * - macros (optional)
 * - excludeIngredients (optional)
 *
 * The backend loads actual user data from Supabase (profile, preferences) via JWT auth.
 * Fields like 'profile' and 'dietPreferences' are stripped by Zod validation.
 */
export function transformForDietRequest(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  bodyMetrics?: BodyMetrics,
  dietPreferences?: DietPreferences,
  calorieTarget?: number,
  generationOptions: {
    daysCount?: number;
    mealsPerDay?: number;
    advancedReview?: AdvancedReviewData | null;
    currentWeightKg?: number | null;
    weeklyWeightLossGoal?: number | null;
    targetTimelineWeeks?: number | null;
  } = {},
): DietGenerationRequest {
  // Extract activity level from workout preferences or fitness goals
  // Apply mapActivityLevelForHealthCalc so 'extreme' → 'very_active' (worker TDEE expects this)
  const activityLevel = mapActivityLevelForHealthCalc(
    personalInfo.activityLevel ||
    fitnessGoals.experience_level ||
    fitnessGoals.experience ||
    "moderate"
  );

  // Get primary fitness goal
  const primaryGoal =
    fitnessGoals.primary_goals?.[0] ||
    fitnessGoals.primaryGoals?.[0] ||
    "general_fitness";

  // Build dietaryRestrictions array from diet_type (backend expects this for cache key)
  // Valid values: 'vegetarian', 'vegan', 'pescatarian', 'gluten_free', 'dairy_free',
  //               'nut_free', 'halal', 'kosher', 'low_carb', 'keto'
  const dietaryRestrictions: string[] = [];
  if (dietPreferences?.diet_type) {
    const supportedDietType = mapSupportedDietaryRestriction(
      dietPreferences.diet_type,
    );
    if (supportedDietType) {
      dietaryRestrictions.push(supportedDietType);
    }
  }
  // Add any explicit restrictions
  if (dietPreferences?.restrictions) {
    dietaryRestrictions.push(
      ...dietPreferences.restrictions
        .map((restriction) => mapSupportedDietaryRestriction(restriction))
        .filter((restriction): restriction is string => Boolean(restriction)),
    );
  }
  const uniqueDietaryRestrictions = [...new Set(dietaryRestrictions)];

  const excludeIngredients = Array.isArray((dietPreferences as DietPreferences & { dislikes?: string[] })?.dislikes)
    ? ((dietPreferences as DietPreferences & { dislikes?: string[] }).dislikes as string[]).filter(Boolean)
    : [];
  const mealsPerDay = clampInt(
    generationOptions.mealsPerDay ?? getRequestedMealsPerDay(dietPreferences),
    1,
    6,
    3,
  );
  const daysCount = clampInt(generationOptions.daysCount, 1, 7, 1);
  const advancedReview = generationOptions.advancedReview;
  const resolvedCurrentWeight = resolveCurrentWeight({
    bodyAnalysisWeight:
      generationOptions.currentWeightKg ??
      bodyMetrics?.current_weight_kg ??
      personalInfo.weight,
  });

  // Validate required profile data - NO FALLBACKS for critical values
  if (!personalInfo.age || !personalInfo.weight || !personalInfo.height) {
    console.warn('[aiRequestTransformers] Missing critical user metrics:', {
      age: personalInfo.age,
      weight: personalInfo.weight,
      height: personalInfo.height,
    });
  }

  if (personalInfo.age === undefined || personalInfo.age === null) {
    console.warn('[aiRequestTransformers] personalInfo.age is undefined — falling back to 25 for diet request');
  }

  return {
    // Rich request context so the worker can use the latest onboarding values
    // even before Supabase has finished syncing.
    profile: {
      age: personalInfo.age ?? 25,
      gender: personalInfo.gender, // NO FALLBACK
      weight:
        (resolvedCurrentWeight.value ?? personalInfo.weight ?? null) as number | null, // null = explicitly missing, not 0
      height: (bodyMetrics?.height_cm ?? personalInfo.height ?? null) as number | null, // null = explicitly missing, not 0
      activity_level: activityLevel,
      fitness_goal: primaryGoal,
      country: personalInfo.country,
      state: personalInfo.state,
      occupation_type: personalInfo.occupation_type,
      wake_time: personalInfo.wake_time,
      sleep_time: personalInfo.sleep_time,
    },
    country: personalInfo.country,
    dietPreferences: dietPreferences
      ? {
          diet_type: dietPreferences.diet_type,
          allergies: dietPreferences.allergies ?? [],
          restrictions: dietPreferences.restrictions ?? [],
          cuisine_preferences: dietPreferences.cuisine_preferences ?? [],
          dislikes: excludeIngredients,
          breakfast_enabled: dietPreferences.breakfast_enabled,
          lunch_enabled: dietPreferences.lunch_enabled,
          dinner_enabled: dietPreferences.dinner_enabled,
          snacks_enabled: dietPreferences.snacks_enabled,
          snacks_count: dietPreferences.snacks_count,
          cooking_skill_level: dietPreferences.cooking_skill_level,
          max_prep_time_minutes: dietPreferences.max_prep_time_minutes,
          budget_level: dietPreferences.budget_level,
          cooking_methods: dietPreferences.cooking_methods || [],
          keto_ready: dietPreferences.keto_ready,
          intermittent_fasting_ready:
            dietPreferences.intermittent_fasting_ready,
          paleo_ready: dietPreferences.paleo_ready,
          mediterranean_ready: dietPreferences.mediterranean_ready,
          low_carb_ready: dietPreferences.low_carb_ready,
          high_protein_ready: dietPreferences.high_protein_ready,
          drinks_enough_water: dietPreferences.drinks_enough_water,
          limits_sugary_drinks: dietPreferences.limits_sugary_drinks,
          eats_regular_meals: dietPreferences.eats_regular_meals,
          avoids_late_night_eating: dietPreferences.avoids_late_night_eating,
          controls_portion_sizes: dietPreferences.controls_portion_sizes,
          reads_nutrition_labels: dietPreferences.reads_nutrition_labels,
          eats_processed_foods: dietPreferences.eats_processed_foods,
          eats_5_servings_fruits_veggies:
            dietPreferences.eats_5_servings_fruits_veggies,
          limits_refined_sugar: dietPreferences.limits_refined_sugar,
          includes_healthy_fats: dietPreferences.includes_healthy_fats,
          drinks_alcohol: dietPreferences.drinks_alcohol,
          smokes_tobacco: dietPreferences.smokes_tobacco,
          drinks_coffee: dietPreferences.drinks_coffee,
          takes_supplements: dietPreferences.takes_supplements,
        }
      : undefined,
    bodyMetrics: bodyMetrics
      ? {
          height_cm: bodyMetrics.height_cm,
          current_weight_kg:
            resolvedCurrentWeight.value ?? bodyMetrics.current_weight_kg,
          target_weight_kg: bodyMetrics.target_weight_kg,
          body_fat_percentage: bodyMetrics.body_fat_percentage,
          medical_conditions: bodyMetrics.medical_conditions ?? [],
          medications: bodyMetrics.medications ?? [],
          physical_limitations: bodyMetrics.physical_limitations ?? [],
          pregnancy_status: bodyMetrics.pregnancy_status ?? false,
          pregnancy_trimester: bodyMetrics.pregnancy_trimester,
          breastfeeding_status: bodyMetrics.breastfeeding_status ?? false,
          stress_level: bodyMetrics.stress_level,
        }
      : undefined,
    advancedReview: advancedReview
      ? {
          daily_calories: advancedReview.daily_calories ?? undefined,
          daily_protein_g: advancedReview.daily_protein_g ?? undefined,
          daily_carbs_g: advancedReview.daily_carbs_g ?? undefined,
          daily_fat_g: advancedReview.daily_fat_g ?? undefined,
          daily_water_ml: advancedReview.daily_water_ml ?? undefined,
          daily_fiber_g: advancedReview.daily_fiber_g ?? undefined,
          calculated_bmi: advancedReview.calculated_bmi ?? undefined,
          bmi_category: advancedReview.bmi_category ?? undefined,
          overall_health_score: advancedReview.overall_health_score ?? undefined,
        }
      : undefined,

    // REQUIRED: Fields that backend schema expects for cache key generation
    // BUG-92: When calorieTarget not explicitly passed, use advancedReview.daily_calories
    // so AI plans at the user's actual deficit target, not the DB maintenance value
    calorieTarget: calorieTarget ?? advancedReview?.daily_calories ?? (() => {
      const goal = primaryGoal ?? '';
      let fallback: number;
      if (goal.includes('loss') || goal.includes('cut')) fallback = 1800;
      else if (goal.includes('gain') || goal.includes('bulk')) fallback = 2800;
      else fallback = 2200; // maintenance
      console.error('[aiRequestTransformers] calorieTarget missing — using goal-based fallback:', fallback);
      return fallback;
    })(),
    mealsPerDay,
    daysCount,

    // Goal rate and deadline — AI needs these to calibrate deficit and pacing
    weeklyWeightLossGoal: generationOptions.weeklyWeightLossGoal ?? undefined,
    targetTimelineWeeks: generationOptions.targetTimelineWeeks ??
      bodyMetrics?.target_timeline_weeks ??
      undefined,

    // IMPORTANT: dietaryRestrictions is used for cache key (not dietPreferences.dietType)
    dietaryRestrictions:
      uniqueDietaryRestrictions.length > 0
        ? uniqueDietaryRestrictions
        : undefined,
    excludeIngredients:
      excludeIngredients.length > 0 ? excludeIngredients : undefined,

    // AI model configuration
    model: DEFAULT_AI_MODEL,
    temperature: 0.7,
  };
}

// ============================================================================
// WORKOUT REQUEST TRANSFORMERS
// ============================================================================

/**
 * Map onboarding fitness goals to Workers API format
 * Onboarding uses hyphens (weight-loss), API expects underscores (weight_loss)
 */
const FITNESS_GOAL_MAP: Record<string, string> = {
  "weight-loss": "weight_loss",
  // BUG-55: weight-gain (health/recovery intent) ≠ muscle_gain (hypertrophy intent).
  // Keep muscle_gain as it IS a weight-gain goal; muscle-gain explicitly selects bodybuilding.
  // weight-gain users may be underweight/recovering — use maintenance (general programming).
  "weight-gain": "maintenance",
  "muscle-gain": "muscle_gain",
  general_fitness: "maintenance", // Map general fitness to maintenance
  "general-fitness": "maintenance",
  strength: "strength",
  endurance: "endurance",
  flexibility: "flexibility",
  "athletic-performance": "athletic_performance",
  athletic_performance: "athletic_performance",
  // Already correct format
  weight_loss: "weight_loss",
  muscle_gain: "muscle_gain",
  maintenance: "maintenance",
};

/**
 * Map onboarding equipment to Workers API format
 * Onboarding: plural, hyphens (dumbbells, cable-machine)
 * API: singular, spaces (dumbbell, cable)
 */
const EQUIPMENT_MAP: Record<string, string> = {
  // Plural → Singular
  dumbbells: "dumbbell",
  kettlebells: "kettlebell",
  barbells: "barbell",

  // Hyphen → Space
  bodyweight: "body weight",
  "resistance-bands": "resistance band",
  "resistance-band": "resistance band",
  "cable-machine": "cable",
  "stationary-bike": "stationary bike",
  "pull-up-bar": "body weight", // Pull-up bar is bodyweight exercise
  "yoga-mat": "body weight", // Yoga mat implies bodyweight
  bench: "body weight", // Bench is implied with barbell
  treadmill: "body weight", // Cardio equipment, not needed for strength
  "rowing-machine": "body weight", // Cardio equipment

  // Already correct format
  "body weight": "body weight",
  dumbbell: "dumbbell",
  barbell: "barbell",
  kettlebell: "kettlebell",
  band: "band",
  cable: "cable",
  machine: "machine",
  "medicine ball": "medicine ball",
  "resistance band": "resistance band",
  "stationary bike": "stationary bike",
};

/**
 * Map onboarding workout preferences to API workout type
 * Onboarding: What user LIKES (strength, cardio, yoga)
 * API: What workout to GENERATE (full_body, upper_body, cardio, etc.)
 */
const WORKOUT_TYPE_MAP: Record<string, string> = {
  strength: "full_body",
  cardio: "cardio",
  hiit: "full_body", // HIIT is full body with intensity
  yoga: "full_body", // Yoga → full body, not just core
  pilates: "full_body", // Pilates → full body functional movement
  flexibility: "full_body", // Flexibility training → full body
  functional: "full_body",
  sports: "full_body",
  dance: "cardio",
  "martial-arts": "full_body",

  // Already correct format
  full_body: "full_body",
  upper_body: "upper_body",
  lower_body: "lower_body",
  push: "push",
  pull: "pull",
  legs: "legs",
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  arms: "arms",
  core: "core",
};

/**
 * Transform frontend types to WorkoutGenerationRequest for backend
 *
 * IMPORTANT: This function maps onboarding data to Workers API format:
 * - Fitness goals: weight-loss → weight_loss
 * - Equipment: dumbbells → dumbbell, bodyweight → body weight
 * - Workout type: strength (preference) → full_body (actual workout)
 */
export function transformForWorkoutRequest(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  bodyMetrics?: BodyMetrics,
  workoutPreferences?: WorkoutPreferences,
  options?: {
    requestWeeklyPlan?: boolean; // ✅ NEW: Flag for weekly plan
    workoutType?: string;
    duration?: number;
    focusMuscles?: string[];
    currentWeightKg?: number | null;
    weekNumber?: number;
    regenerationSeed?: number; // Varies exercise selection on regeneration
    // H13: Advanced review data for health-based recommendations
    advancedReview?: AdvancedReviewData | null;
  },
): WorkoutGenerationRequest {
  // Get experience level
  const experienceLevel =
    workoutPreferences?.intensity ||
    fitnessGoals.experience_level ||
    fitnessGoals.experience ||
    "beginner";

  // Get primary fitness goal and map to API format
  const rawGoal =
    fitnessGoals.primary_goals?.[0] ||
    fitnessGoals.primaryGoals?.[0] ||
    "general_fitness";
  const primaryGoal = FITNESS_GOAL_MAP[rawGoal] || "maintenance";

  // Get available equipment and map to API format
  // Empty arrays are truthy, so check .length to ensure bodyweight fallback fires
  const rawEquipment = (workoutPreferences?.equipment?.length ? workoutPreferences.equipment : null)
    || (fitnessGoals.preferred_equipment?.length ? fitnessGoals.preferred_equipment : null)
    || ["bodyweight"];

  const equipment = rawEquipment
    .map((eq) => EQUIPMENT_MAP[eq.toLowerCase()] || eq)
    .filter((value, index, self) => self.indexOf(value) === index); // Deduplicate

  // Get physical limitations/injuries
  const injuries = bodyMetrics?.physical_limitations || [];

  // ✅ CRITICAL: Get medical conditions and medications
  const medicalConditions = bodyMetrics?.medical_conditions || [];
  const medications = bodyMetrics?.medications || [];

  // ✅ CRITICAL: Get pregnancy/breastfeeding status
  const pregnancyStatus = bodyMetrics?.pregnancy_status || false;
  const pregnancyTrimester = bodyMetrics?.pregnancy_trimester;
  const breastfeedingStatus = bodyMetrics?.breastfeeding_status || false;

  // ✅ NEW: Get preferred workout time
  const preferredWorkoutTime =
    workoutPreferences?.preferred_workout_times?.[0] || "morning";

  // ✅ NEW: Build weekly plan object (ALWAYS REQUIRED - NO FALLBACK)
  const workoutsPerWeek = workoutPreferences?.workout_frequency_per_week ?? undefined;
  const preferredDays = getWorkoutDaysFromPreferences(
    workoutPreferences,
    workoutsPerWeek,
  );

  const weeklyPlan = {
    workoutsPerWeek: workoutsPerWeek ?? 3,
    preferredDays: preferredDays,
    workoutTypes: workoutPreferences?.workout_types || [],
    prefersVariety: workoutPreferences?.prefers_variety || false,
    activityLevel: workoutPreferences?.activity_level
      ? mapActivityLevelForHealthCalc(workoutPreferences.activity_level)
      : undefined,
    preferredWorkoutTime: preferredWorkoutTime, // ✅ NEW
  };
  const resolvedCurrentWeight = resolveCurrentWeight({
    bodyAnalysisWeight:
      options?.currentWeightKg ??
      bodyMetrics?.current_weight_kg ??
      personalInfo.weight,
  });

  // Map gender: worker expects 'male' | 'female' | 'other'
  const mappedGender: 'male' | 'female' | 'other' =
    personalInfo.gender === 'male' || personalInfo.gender === 'female'
      ? personalInfo.gender
      : 'other';

  // H13: Wire ignored onboarding fields into workout generation request
  const advancedReview = options?.advancedReview;
  if (personalInfo.age === undefined || personalInfo.age === null) {
    console.warn('[aiRequestTransformers] personalInfo.age is undefined — falling back to 25 for workout request');
  }

  return {
    profile: {
      age: personalInfo.age ?? 25,
      gender: mappedGender,
      weight: resolvedCurrentWeight.value ?? personalInfo.weight ?? null,
      height: bodyMetrics?.height_cm ?? personalInfo.height ?? null,
      fitnessGoal: primaryGoal,
      experienceLevel: experienceLevel,
      availableEquipment: equipment,
      workoutDuration: options?.duration ?? workoutPreferences?.time_preference ?? undefined,
      injuries: injuries,
      medications: medications,
      // GAP-04: medicalConditions and stressLevel were missing — Worker safety filter needs them
      medicalConditions: bodyMetrics?.medical_conditions ?? [],
      stressLevel: (bodyMetrics?.stress_level as 'low' | 'moderate' | 'high' | undefined),
      pregnancyStatus: pregnancyStatus,
      pregnancyTrimester: pregnancyTrimester,
      breastfeedingStatus: breastfeedingStatus,
    },
    weeklyPlan: weeklyPlan,
    // H13: Fitness Assessment (Priority 1 - concrete ability indicators)
    fitnessAssessment: {
      pushupCount: workoutPreferences?.can_do_pushups ?? 0,
      runningMinutes: workoutPreferences?.can_run_minutes ?? 0,
      flexibilityLevel: workoutPreferences?.flexibility_level ?? 'fair',
      experienceYears: workoutPreferences?.workout_experience_years ?? 0,
    },
    // H13: Location preference (Priority 2)
    workoutLocation: workoutPreferences?.location ?? 'both',
    // H13: Preference booleans (Priority 3)
    enjoysCardio: workoutPreferences?.enjoys_cardio ?? true,
    enjoysStrength: workoutPreferences?.enjoys_strength_training ?? true,
    enjoysGroupClasses: workoutPreferences?.enjoys_group_classes ?? false,
    prefersOutdoor: workoutPreferences?.prefers_outdoor_activities ?? false,
    needsMotivation: workoutPreferences?.needs_motivation ?? false,
    // H13: Advanced Review Recommendations (Priority 4 - calculated from health picture)
    recommendations: advancedReview ? {
      frequency: advancedReview.recommended_workout_frequency ?? null,
      cardioMinutes: advancedReview.recommended_cardio_minutes ?? null,
      strengthSessions: advancedReview.recommended_strength_sessions ?? null,
    } : undefined,
    focusMuscles: options?.focusMuscles,
    weekNumber: options?.weekNumber,
    regenerationSeed: options?.regenerationSeed,
  };
}

/**
 * Transform AI daily meal plan response to database format
 */
function getWorkoutDaysFromPreferences(
  workoutPreferences?: WorkoutPreferences,
  workoutsPerWeek: number = 3,
): string[] {
  // preferred_workout_times stores time-of-day values ('morning', 'evening'), not day names.
  // Use frequency-based defaults to determine training days.
  const allDays = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  if (workoutsPerWeek === 1) return ['wednesday'];
  if (workoutsPerWeek === 2) return ['tuesday', 'friday'];
  if (workoutsPerWeek === 3) return ['monday', 'wednesday', 'friday'];
  if (workoutsPerWeek === 4) return ['monday', 'tuesday', 'thursday', 'friday'];
  if (workoutsPerWeek === 5) return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  if (workoutsPerWeek === 6) return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  if (workoutsPerWeek === 7) return allDays;
  return ['monday', 'wednesday', 'friday'];
}

/**
 * Transform backend workout response to frontend WeeklyWorkoutPlan format
 */
export function transformWorkoutResponseToWeeklyPlan(
  response: WorkersResponse<WorkoutPlan>,
  weekNumber: number = 1,
  workoutPreferences?: WorkoutPreferences,
  userWeightKg?: number,
): WeeklyWorkoutPlan | null {
  if (!response.success || !response.data) {
    console.error("[Transformer] Workout response failed:", response.error);
    return null;
  }

  const workoutPlan = response.data;

  // Create workout for multiple days based on the generated workout
  const workouts: Workout[] = [];
  const workoutsPerWeek = workoutPreferences?.workout_frequency_per_week ?? 3;
  const workoutDays = getWorkoutDaysFromPreferences(
    workoutPreferences,
    workoutsPerWeek,
  );

  const daySlotCounts = new Map<string, number>();
  for (let i = 0; i < workoutDays.length; i++) {
    const day = workoutDays[i];
    const slotIndex = daySlotCounts.get(day) ?? 0;
    daySlotCounts.set(day, slotIndex + 1);
    workouts.push({
      id: `${day}_workout_${slotIndex}`,
      title: workoutPlan.title || "AI Generated Workout",
      description: workoutPlan.description || "",
      category: mapWorkoutCategory(workoutPlan) as
        | "strength"
        | "flexibility"
        | "cardio"
        | "hiit"
        | "yoga"
        | "pilates"
        | "hybrid",
      difficulty: mapDifficulty(workoutPlan.difficulty),
      duration: workoutPlan.totalDuration ?? workoutPlan.duration ?? 0,
      estimatedCalories: calculateEstimatedCalories(workoutPlan, userWeightKg),
      exercises: transformExercises(workoutPlan),
      equipment: extractEquipment(workoutPlan),
      targetMuscleGroups: extractTargetMuscles(workoutPlan),
      icon: getWorkoutIcon(workoutPlan),
      tags: ["ai-generated", workoutPlan.difficulty || "intermediate"],
      isPersonalized: true,
      aiGenerated: true,
      dayOfWeek: day,
      warmup: workoutPlan.warmup?.map(transformExerciseItem) || [],
      cooldown: workoutPlan.cooldown?.map(transformExerciseItem) || [],
      createdAt: new Date().toISOString(),
    } as Workout);
  }

  return {
    id: workoutPlan.id || `weekly_workout_week_${weekNumber}`,
    weekNumber,
    workouts: workouts as WeeklyWorkoutPlan["workouts"],
    planTitle: workoutPlan.title || "Your Personalized Workout Plan",
    planDescription: workoutPlan.description,
    restDays: [1, 3, 5], // Tuesday, Thursday, Saturday, Sunday indices
    totalEstimatedCalories: workouts.reduce(
      (sum, w) => sum + (w.estimatedCalories || 0),
      0,
    ),
  };
}

// ============================================================================
// DIET RESPONSE TRANSFORMERS
// ============================================================================

/**
 * Transform backend diet response to frontend WeeklyMealPlan format
 *
 * Backend meals have: { name, mealType, foods: [{ name, quantity, nutrition: { calories, protein, carbs, fats, fiber, sugar } }], totalCalories, totalNutrition: { protein, carbs, fats, fiber, sugar } }
 * Frontend DayMeal expects: { type, items: MealItem[], totalCalories, totalMacros: { protein, carbohydrates, fat, fiber, sugar } }
 *
 * Key field mappings:
 *   backend 'fats' → frontend 'fat'
 *   backend 'carbs' → frontend 'carbohydrates'
 *   backend 'foods' → frontend 'items' (MealItem[])
 *   backend 'sugar' → frontend 'sugar' (pass-through)
 */
export function transformDietResponseToWeeklyPlan(
  response: WorkersResponse<DietPlan>,
  weekNumber: number = 1,
  options: {
    requestedDaysCount?: number;
  } = {},
): WeeklyMealPlan | null {
  if (!response.success || !response.data) {
    console.error("[Transformer] Diet response failed:", response.error);
    return null;
  }

  const dietPlan = response.data;
  const meals = dietPlan.meals;

  if (!meals || !Array.isArray(meals) || meals.length === 0) {
    console.error("[Transformer] No meals in diet response");
    return null;
  }

  const now = new Date().toISOString();
  const requestedDaysCount = clampInt(options.requestedDaysCount, 1, 7, 1);

  // Get current day of week for single-day assignment
  const todayIndex = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const todayName = WEEKDAY_SEQUENCE[todayIndex === 0 ? 6 : todayIndex - 1]; // Adjust to Mon-based
  const inferredMealsPerDay =
    requestedDaysCount > 1
      ? Math.max(1, Math.ceil(meals.length / requestedDaysCount))
      : meals.length;

  const dayMeals: DayMeal[] = meals.map(
    (meal: any, index: number): DayMeal => {
      // Map backend foods[] to frontend MealItem[]
      const items: MealItem[] = (meal.foods || meal.items || []).map(
        (food: any, foodIndex: number): MealItem => {
          const nutrition = food.nutrition || {};
          const calories =
            nutrition.calories || food.calories || 0;
          // Normalize carb field name at intake point (backend may send 'carbs' or 'carbohydrates')
          const carbs = nutrition.carbohydrates ?? nutrition.carbs ?? food.carbohydrates ?? food.carbs ?? 0;
          const macros = {
            protein: nutrition.protein || food.protein || 0,
            carbohydrates: carbs,
            fat:
              nutrition.fats ||
              nutrition.fat ||
              food.fats ||
              food.fat ||
              0,
            fiber: nutrition.fiber || food.fiber || 0,
            sugar: nutrition.sugar || food.sugar || 0,
          };

          // Build a minimal Food object for the MealItem
          const foodObj: Food = {
            id: food.id || `food_${Date.now()}_${index}_${foodIndex}`,
            name: food.name || "Unknown Food",
            category: "prepared_foods",
            nutrition: {
              calories,
              macros,
              servingSize: (() => { const rawQty = parseFloat(String(food.quantity)); return (!isNaN(rawQty) && rawQty > 0) ? rawQty : 100; })(),
              servingUnit: food.unit || "g",
            },
            allergens: [],
            dietaryLabels: [],
            verified: false,
            createdAt: now,
            updatedAt: now,
          };

          return {
            id: food.id || `meal_item_${Date.now()}_${index}_${foodIndex}`,
            foodId: foodObj.id,
            food: foodObj,
            name: food.name || "Unknown Food",
            quantity: food.quantity || food.amount || 1,
            calories,
            macros,
          };
        },
      );

      // Map backend totalNutrition to frontend totalMacros
      const totalNutrition = meal.totalNutrition || {};
      // Normalize carb field name at intake point (backend may send 'carbs' or 'carbohydrates')
      const totalCarbs = totalNutrition.carbohydrates ?? totalNutrition.carbs ?? 0;
      const totalMacros = {
        protein: totalNutrition.protein || 0,
        carbohydrates: totalCarbs,
        fat: totalNutrition.fats || totalNutrition.fat || 0,
        fiber: totalNutrition.fiber || 0,
        sugar: totalNutrition.sugar || 0,
      };

      return {
        id: meal.id || `meal_${Date.now()}_${index}`,
        type: mapMealType(meal.mealType || meal.type || "lunch"),
        name: meal.name || `Meal ${index + 1}`,
        description:
          meal.description ||
          `${mapMealType(meal.mealType || meal.type || "lunch")} - ${items.length} items`,
        items,
        foods: items, // Backward compatibility alias
        totalCalories: totalNutrition.calories || meal.totalCalories || 0,
        totalMacros,
        preparationTime: meal.preparationTime || meal.prepTime || 15,
        cookingInstructions: meal.cookingInstructions || [],
        difficulty: mapDifficultyLevel(meal.difficulty),
        tags: [
          "ai-generated",
          mapMealType(meal.mealType || meal.type || "lunch"),
        ],
        dayOfWeek:
          normalizeDayOfWeek(meal.dayOfWeek) ||
          inferDayOfWeekFromPosition(
            index,
            requestedDaysCount,
            inferredMealsPerDay,
            todayName,
          ),
        isPersonalized: true,
        aiGenerated: true,
        createdAt: now,
      };
    },
  );

  return {
    id: dietPlan.id || `weekly_meal_plan_${Date.now()}`,
    weekNumber,
    meals: dayMeals,
    planTitle: dietPlan.title || "Your Personalized Meal Plan",
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapMealType(type: string): "breakfast" | "lunch" | "dinner" | "snack" {
  const typeMap: Record<string, "breakfast" | "lunch" | "dinner" | "snack"> = {
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snack: "snack",
    snack1: "snack",
    snack2: "snack",
    morning_snack: "snack",
    afternoon_snack: "snack",
    evening_snack: "snack",
  };
  return typeMap[type?.toLowerCase()] || "lunch";
}

function mapDifficultyLevel(difficulty?: string): "easy" | "medium" | "hard" {
  const diffMap: Record<string, "easy" | "medium" | "hard"> = {
    easy: "easy",
    simple: "easy",
    beginner: "easy",
    medium: "medium",
    moderate: "medium",
    intermediate: "medium",
    hard: "hard",
    difficult: "hard",
    advanced: "hard",
  };
  return diffMap[difficulty?.toLowerCase() || ""] || "easy";
}

function mapWorkoutCategory(workout: WorkoutPlan): string {
  // Determine category based on workout content
  if (workout.title?.toLowerCase().includes("cardio")) return "cardio";
  if (workout.title?.toLowerCase().includes("hiit")) return "hiit";
  if (workout.title?.toLowerCase().includes("strength")) return "strength";
  if (workout.title?.toLowerCase().includes("yoga")) return "flexibility";
  return "strength";
}

function mapDifficulty(
  difficulty?: string,
): "beginner" | "intermediate" | "advanced" {
  const diffMap: Record<string, "beginner" | "intermediate" | "advanced"> = {
    beginner: "beginner",
    easy: "beginner",
    intermediate: "intermediate",
    moderate: "intermediate",
    advanced: "advanced",
    hard: "advanced",
    expert: "advanced",
  };
  return diffMap[difficulty?.toLowerCase() || ""] || "intermediate";
}

function calculateEstimatedCalories(workout: WorkoutPlan, userWeightKg?: number): number {
  // BUG-58: Use MET × duration estimate instead of always returning 0
  // Actual calories are recalculated with real user weight at workout completion
  const durationHours = ((workout.totalDuration ?? workout.duration ?? 0)) / 60;
  const difficulty = workout.difficulty?.toLowerCase() || 'intermediate';
  const metByDifficulty: Record<string, number> = {
    beginner: 4,
    intermediate: 6,
    advanced: 8,
  };
  const met = metByDifficulty[difficulty] ?? 6;
  // 70kg = WHO reference weight when actual weight unavailable
  return Math.round(met * (userWeightKg ?? 70) * durationHours);
}

function transformExercises(workout: WorkoutPlan): any[] {
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || []),
  ];

  return allExercises.map((ex, index) => ({
    exerciseId: ex.exerciseId || `ex_${index}`,
    sets: ex.sets || 3,
    reps: ex.reps || ex.targetReps || "10-12",
    restTime: ex.restSeconds || ex.restTime || 60,
    weight: undefined,
    exerciseData: ex.exerciseData,
  }));
}

function transformExerciseItem(ex: any) {
  return {
    exerciseId: ex.exerciseId,
    sets: ex.sets || 1,
    reps: ex.reps || ex.targetReps || "30 seconds",
    restTime: ex.restSeconds || 30,
    exerciseData: ex.exerciseData,
  };
}

function extractEquipment(workout: WorkoutPlan): string[] {
  const equipment = new Set<string>();
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || []),
  ];

  for (const ex of allExercises) {
    if (ex.exerciseData?.equipments) {
      ex.exerciseData.equipments.forEach((eq: string) => equipment.add(eq));
    }
  }

  return equipment.size > 0 ? Array.from(equipment) : ["bodyweight"];
}

function extractTargetMuscles(workout: WorkoutPlan): string[] {
  const muscles = new Set<string>();
  const allExercises = [
    ...(workout.warmup || []),
    ...(workout.exercises || []),
    ...(workout.cooldown || []),
  ];

  for (const ex of allExercises) {
    if (ex.exerciseData?.targetMuscles) {
      ex.exerciseData.targetMuscles.forEach((m: string) => muscles.add(m));
    }
    if (ex.exerciseData?.bodyParts) {
      ex.exerciseData.bodyParts.forEach((bp: string) => muscles.add(bp));
    }
  }

  return muscles.size > 0 ? Array.from(muscles) : ["full body"];
}

function getWorkoutIcon(workout: WorkoutPlan): string {
  const category = mapWorkoutCategory(workout);
  const icons: Record<string, string> = {
    strength: "barbell-outline",
    cardio: "bicycle-outline",
    hiit: "flash-outline",
    flexibility: "body-outline",
  };
  return icons[category] || "fitness-outline";
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  DietGenerationRequest,
  WorkoutGenerationRequest,
  WorkersResponse,
  DietPlan,
  WorkoutPlan,
};
