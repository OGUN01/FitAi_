import type {
  PersonalInfo,
  FitnessGoals,
  WorkoutPreferences,
  BodyMetrics,
} from "../../types/user";
import type { AdvancedReviewData } from "../../types/onboarding";
import type {
  WorkoutGenerationRequest,
  WorkersResponse,
  WorkoutPlan,
} from "../fitaiWorkersClient";
import type { WeeklyWorkoutPlan, Workout } from "../../types/ai";
import { FITNESS_GOAL_MAP, EQUIPMENT_MAP } from "./mapping-constants";
import { resolveCurrentWeight } from "../currentWeight";
import {
  getWorkoutDaysFromPreferences,
  mapWorkoutCategory,
  mapDifficulty,
  calculateEstimatedCalories,
  transformExercises,
  transformExerciseItem,
  extractEquipment,
  extractTargetMuscles,
  getWorkoutIcon,
} from "./helper-utils";

export function transformForWorkoutRequest(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  bodyMetrics?: BodyMetrics,
  workoutPreferences?: WorkoutPreferences,
  options?: {
    requestWeeklyPlan?: boolean;
    workoutType?: string;
    duration?: number;
    focusMuscles?: string[];
    currentWeightKg?: number | null;
    // H13: Advanced review data for health-based recommendations
    advancedReview?: AdvancedReviewData | null;
  },
): WorkoutGenerationRequest {
  const experienceLevel =
    workoutPreferences?.intensity ||
    fitnessGoals.experience_level ||
    fitnessGoals.experience ||
    "beginner";

  const rawGoal =
    fitnessGoals.primary_goals?.[0] ||
    fitnessGoals.primaryGoals?.[0] ||
    "general_fitness";
  const primaryGoal = FITNESS_GOAL_MAP[rawGoal] || "maintenance";

  const rawEquipment = workoutPreferences?.equipment ||
    fitnessGoals.preferred_equipment || ["bodyweight"];

  const equipment = rawEquipment
    .map((eq) => EQUIPMENT_MAP[eq.toLowerCase()] || eq)
    .filter((value, index, self) => self.indexOf(value) === index);

  const injuries = bodyMetrics?.physical_limitations || [];

  const medicalConditions = bodyMetrics?.medical_conditions || [];
  const medications = bodyMetrics?.medications || [];

  const pregnancyStatus = bodyMetrics?.pregnancy_status || false;
  const pregnancyTrimester = bodyMetrics?.pregnancy_trimester;
  const breastfeedingStatus = bodyMetrics?.breastfeeding_status || false;
  const resolvedCurrentWeight = resolveCurrentWeight({
    weightHistory:
      typeof options?.currentWeightKg === "number"
        ? [{ date: new Date().toISOString(), weight: options.currentWeightKg }]
        : [],
    bodyAnalysisWeight: bodyMetrics?.current_weight_kg ?? personalInfo.weight,
  });

  const preferredWorkoutTime =
    workoutPreferences?.preferred_workout_times?.[0] || "morning";

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
    preferredWorkoutTime: preferredWorkoutTime,
  };

  const advancedReview = options?.advancedReview;
  return {
    profile: {
      age: personalInfo.age,
      gender: personalInfo.gender,
      weight: resolvedCurrentWeight.value as number,
      height: (bodyMetrics?.height_cm ?? personalInfo.height) as number,
      fitnessGoal: primaryGoal,
      experienceLevel: experienceLevel,
      availableEquipment: equipment,
      injuries: injuries,
      medications: medications,
      pregnancyStatus: pregnancyStatus,
      pregnancyTrimester: pregnancyTrimester,
      breastfeedingStatus: breastfeedingStatus,
    } as any,
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
    // H13: Advanced Review Recommendations (Priority 4)
    recommendations: advancedReview ? {
      frequency: advancedReview.recommended_workout_frequency ?? null,
      cardioMinutes: advancedReview.recommended_cardio_minutes ?? null,
      strengthSessions: advancedReview.recommended_strength_sessions ?? null,
    } : undefined,
    focusMuscles: options?.focusMuscles,
  } as any;
}

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
    } as any);
  }

  return {
    id: workoutPlan.id || `weekly_workout_${Date.now()}`,
    weekNumber,
    workouts: workouts as any,
    planTitle: workoutPlan.title || "Your Personalized Workout Plan",
    planDescription: workoutPlan.description,
    restDays: [1, 3, 5],
    totalEstimatedCalories: workouts.reduce(
      (sum, w) => sum + (w.estimatedCalories || 0),
      0,
    ),
  };
}
