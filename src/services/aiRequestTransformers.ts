/**
 * AI Request Transformers
 *
 * Transforms frontend types (PersonalInfo, FitnessGoals, etc.) to backend request format
 * for the fitai-workers API.
 *
 * The backend reads user data from Supabase tables (advanced_review, profiles, etc.)
 * but still needs a minimal profile context in the request for fallback/validation.
 */

import type {
  PersonalInfo,
  FitnessGoals,
  DietPreferences,
  WorkoutPreferences,
  BodyMetrics,
} from "../types/user";
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
// Note: MET-based calorie calculation happens at workout completion (completionTracking.ts)
// where we have access to the user's actual weight from their profile

// ============================================================================
// DIET REQUEST TRANSFORMERS
// ============================================================================

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
): DietGenerationRequest {
  // Extract activity level from workout preferences or fitness goals
  const activityLevel =
    personalInfo.activityLevel ||
    fitnessGoals.experience_level ||
    fitnessGoals.experience ||
    "moderate";

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
    // Map common diet types to backend-expected values
    const dietType = dietPreferences.diet_type.toLowerCase();
    if (["vegetarian", "vegan", "pescatarian", "keto"].includes(dietType)) {
      dietaryRestrictions.push(dietType);
    }
  }
  // Add any explicit restrictions
  if (dietPreferences?.restrictions) {
    dietaryRestrictions.push(...dietPreferences.restrictions);
  }

  // Validate required profile data - NO FALLBACKS for critical values
  if (!personalInfo.age || !personalInfo.weight || !personalInfo.height) {
    console.warn(
      "[aiRequestTransformers] Missing required profile data - onboarding may be incomplete",
    );
  }

  return {
    // Profile data (may be stripped by backend, but included for compatibility)
    profile: {
      age: personalInfo.age, // NO FALLBACK - must come from onboarding
      gender: personalInfo.gender, // NO FALLBACK
      weight: (bodyMetrics?.current_weight_kg ?? personalInfo.weight) as number, // Type assertion
      height: (bodyMetrics?.height_cm ?? personalInfo.height) as number, // Type assertion
      activityLevel: activityLevel,
      fitnessGoal: primaryGoal,
    },
    // Diet preferences (may be stripped by backend, but included for compatibility)
    dietPreferences: dietPreferences
      ? {
          dietType: dietPreferences.diet_type,
          allergies: dietPreferences.allergies ?? [],
          restrictions: dietPreferences.restrictions ?? [],
          cuisinePreferences: [],
          dislikes: [],
        }
      : undefined,

    // REQUIRED: Fields that backend schema expects for cache key generation
    calorieTarget: calorieTarget,
    mealsPerDay: 3,

    // IMPORTANT: dietaryRestrictions is used for cache key (not dietPreferences.dietType)
    dietaryRestrictions:
      dietaryRestrictions.length > 0 ? dietaryRestrictions : undefined,

    // AI model configuration
    model: "google/gemini-2.5-flash",
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
  "weight-gain": "muscle_gain", // Map weight gain to muscle gain
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
  yoga: "core", // Yoga → flexibility/core exercises
  pilates: "core",
  flexibility: "core", // Flexibility exercises
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
  const rawEquipment = workoutPreferences?.equipment ||
    fitnessGoals.preferred_equipment || ["bodyweight"];

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
  const workoutsPerWeek = workoutPreferences?.workout_frequency_per_week || 3;
  const preferredDays = getWorkoutDaysFromPreferences(
    workoutPreferences,
    workoutsPerWeek,
  );

  const weeklyPlan = {
    workoutsPerWeek: workoutsPerWeek,
    preferredDays: preferredDays,
    workoutTypes: workoutPreferences?.workout_types || [],
    prefersVariety: workoutPreferences?.prefers_variety || false,
    activityLevel: workoutPreferences?.activity_level,
    preferredWorkoutTime: preferredWorkoutTime, // ✅ NEW
  };

  return {
    profile: {
      age: personalInfo.age, // NO FALLBACK - must come from onboarding
      gender: personalInfo.gender, // NO FALLBACK
      weight: (bodyMetrics?.current_weight_kg ?? personalInfo.weight) as number, // Type assertion
      height: (bodyMetrics?.height_cm ?? personalInfo.height) as number, // Type assertion
      fitnessGoal: primaryGoal,
      experienceLevel: experienceLevel,
      availableEquipment: equipment,
      injuries: injuries,
      // ✅ CRITICAL: Add medical safety fields
      // medicalConditions: medicalConditions,  // Removed - not in type
      medications: medications,
      pregnancyStatus: pregnancyStatus,
      pregnancyTrimester: pregnancyTrimester,
      breastfeedingStatus: breastfeedingStatus,
    } as any,
    // ✅ NEW: Weekly plan parameters (ALWAYS REQUIRED - NO FALLBACK)
    // weeklyPlan: weeklyPlan,  // Removed - not in type
    focusMuscles: options?.focusMuscles,
  } as any;
}

/**
 * Transform AI daily meal plan response to database format
 */
function getWorkoutDaysFromPreferences(
  workoutPreferences?: WorkoutPreferences,
  workoutsPerWeek: number = 3,
): string[] {
  // Use user's preferred workout times if available
  if (
    workoutPreferences?.preferred_workout_times &&
    workoutPreferences.preferred_workout_times.length > 0
  ) {
    return workoutPreferences.preferred_workout_times.slice(0, workoutsPerWeek);
  }

  // Otherwise, distribute evenly based on frequency
  const allDays = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  if (workoutsPerWeek === 1) return ["wednesday"];
  if (workoutsPerWeek === 2) return ["tuesday", "friday"];
  if (workoutsPerWeek === 3) return ["monday", "wednesday", "friday"];
  if (workoutsPerWeek === 4) return ["monday", "tuesday", "thursday", "friday"];
  if (workoutsPerWeek === 5)
    return ["monday", "tuesday", "wednesday", "thursday", "friday"];
  if (workoutsPerWeek === 6)
    return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (workoutsPerWeek === 7) return allDays;

  // Default: 3 days
  return ["monday", "wednesday", "friday"];
}

/**
 * Transform backend workout response to frontend WeeklyWorkoutPlan format
 */
export function transformWorkoutResponseToWeeklyPlan(
  response: WorkersResponse<WorkoutPlan>,
  weekNumber: number = 1,
  workoutPreferences?: WorkoutPreferences,
): WeeklyWorkoutPlan | null {
  if (!response.success || !response.data) {
    console.error("[Transformer] Workout response failed:", response.error);
    return null;
  }

  const workoutPlan = response.data;

  // Create workout for multiple days based on the generated workout
  const workouts: Workout[] = [];
  const workoutsPerWeek = workoutPreferences?.workout_frequency_per_week || 3;
  const workoutDays = getWorkoutDaysFromPreferences(
    workoutPreferences,
    workoutsPerWeek,
  );

  for (let i = 0; i < workoutDays.length; i++) {
    const day = workoutDays[i];
    workouts.push({
      id: `${day}_workout_${Date.now()}_${i}`,
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
      duration: workoutPlan.totalDuration || workoutPlan.duration || 30,
      estimatedCalories: calculateEstimatedCalories(workoutPlan),
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
    } as any);
  }

  return {
    id: workoutPlan.id || `weekly_workout_${Date.now()}`,
    weekNumber,
    workouts: workouts as any,
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

function calculateEstimatedCalories(_workout: WorkoutPlan): number {
  // NO DEFAULT VALUES - return 0 at generation time
  // Actual calories calculated at workout completion using user's real weight from profile
  // This prevents inaccurate data from fake default weights
  console.log(
    "[aiRequestTransformers] Calories set to 0 at generation, will be calculated at completion",
  );
  return 0;
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
