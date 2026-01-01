/**
 * Data Transformers for Cloudflare Workers API
 *
 * Converts between:
 * - Mobile app types (PersonalInfo, FitnessGoals, etc.)
 * - Workers API types (WorkoutGenerationRequest, WorkoutResponse, etc.)
 */

import { PersonalInfo, FitnessGoals, WorkoutPreferences } from '../types/user';
import { WorkoutGenerationRequest, DietGenerationRequest, WorkersResponse } from './fitaiWorkersClient';
import { DayWorkout, WeeklyWorkoutPlan } from '../types/ai';
import { BodyAnalysisData } from '../types/onboarding';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Workers API Workout Response
 */
export interface WorkoutResponse {
  title: string;
  description: string;
  duration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  warmup?: WorkoutExercise[];
  exercises: WorkoutExercise[];
  cooldown?: WorkoutExercise[];
}

export interface WorkoutExercise {
  exerciseId: string;
  sets?: number;
  reps?: number | string;
  restSeconds?: number;
  notes?: string;
  exerciseData?: {
    name: string;
    gifUrl: string;
    equipments: string[];
    targetMuscles: string[];
    instructions: string[];
  };
}

// ============================================================================
// PROFILE TRANSFORMERS
// ============================================================================

/**
 * Transform mobile app profile to Workers API workout request profile
 */
export function transformProfileForWorkoutRequest(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  bodyAnalysis: BodyAnalysisData,
  workoutPreferences?: WorkoutPreferences
): WorkoutGenerationRequest['profile'] {
  return {
    age: personalInfo.age,
    gender: personalInfo.gender === 'prefer_not_to_say' ? 'other' : personalInfo.gender,
    weight: bodyAnalysis.current_weight_kg,
    height: bodyAnalysis.height_cm,
    fitnessGoal: (fitnessGoals.primaryGoals?.[0] as any) || 'get_fit',
    experienceLevel: (fitnessGoals.experience_level as 'beginner' | 'intermediate' | 'advanced') || 'beginner',
    availableEquipment: workoutPreferences?.equipment || ['bodyweight'],
    injuries: bodyAnalysis.physical_limitations || [],
  };
}

/**
 * Transform mobile app profile to Workers API diet request profile
 */
export function transformProfileForDietRequest(
  personalInfo: PersonalInfo,
  fitnessGoals: FitnessGoals,
  bodyAnalysis: BodyAnalysisData,
  workoutPreferences?: WorkoutPreferences,
  dietPreferences?: any
): DietGenerationRequest['profile'] {
  return {
    age: personalInfo.age,
    gender: personalInfo.gender === 'prefer_not_to_say' ? 'other' : personalInfo.gender,
    weight: bodyAnalysis.current_weight_kg,
    height: bodyAnalysis.height_cm,
    fitnessGoal: (fitnessGoals.primaryGoals?.[0] as any) || 'get_fit',
    activityLevel: (workoutPreferences?.activity_level as any) || 'moderate',
  };
}

// ============================================================================
// WORKOUT TRANSFORMERS
// ============================================================================

/**
 * Transform Workers API workout response to mobile app DayWorkout
 */
export function transformWorkoutResponse(
  workoutResponse: WorkoutResponse,
  dayOfWeek?: string
): DayWorkout {
  // Combine all exercises (warmup + main + cooldown)
  const allExercises = [
    ...(workoutResponse.warmup || []).map((ex: WorkoutExercise) => ({
      ...ex,
      section: 'warmup' as const,
    })),
    ...(workoutResponse.exercises || []).map((ex: WorkoutExercise) => ({
      ...ex,
      section: 'main' as const,
    })),
    ...(workoutResponse.cooldown || []).map((ex: WorkoutExercise) => ({
      ...ex,
      section: 'cooldown' as const,
    })),
  ];

  return {
    id: `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    dayOfWeek: dayOfWeek || 'monday',
    title: workoutResponse.title,
    description: workoutResponse.description,
    duration: workoutResponse.duration,
    difficulty: workoutResponse.difficulty,
    category: 'strength', // Default, can be enhanced
    estimatedCalories: Math.round(workoutResponse.duration * 5), // Rough estimate
    exercises: allExercises.map((ex: any) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets || 3,
      reps: ex.reps || 10,
      restTime: ex.restSeconds || 60,
      notes: ex.notes,
    })),
    warmup: (workoutResponse.warmup || []).map((ex: WorkoutExercise) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets || 1,
      reps: ex.reps || 10,
      restTime: ex.restSeconds || 30,
    })),
    cooldown: (workoutResponse.cooldown || []).map((ex: WorkoutExercise) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets || 1,
      reps: ex.reps || 10,
      restTime: ex.restSeconds || 30,
    })),
    equipment: [],
    targetMuscleGroups: [],
    icon: '💪',
    tags: ['ai-generated'],
    isPersonalized: true,
    aiGenerated: true,
    createdAt: new Date().toISOString(),
    subCategory: 'full-body',
    intensityLevel: 'moderate',
    warmUp: (workoutResponse.warmup || []).map((ex: WorkoutExercise) => ({
      name: ex.exerciseData?.name || ex.exerciseId,
      duration: ex.restSeconds,
      instructions: ex.exerciseData?.instructions?.join('\n') || '',
    })),
    coolDown: (workoutResponse.cooldown || []).map((ex: WorkoutExercise) => ({
      name: ex.exerciseData?.name || ex.exerciseId,
      duration: ex.restSeconds,
      instructions: ex.exerciseData?.instructions?.join('\n') || '',
    })),
    progressionNotes: [],
    safetyConsiderations: [],
    expectedBenefits: [],
  };
}

/**
 * Transform multiple workout responses to WeeklyWorkoutPlan
 */
export function transformToWeeklyPlan(
  workouts: Array<{ workout: WorkoutResponse; dayOfWeek: string }>,
  weekNumber: number = 1
): WeeklyWorkoutPlan {
  return {
    id: `weekly_plan_${Date.now()}`,
    weekNumber,
    workouts: workouts.map(({ workout, dayOfWeek }) =>
      transformWorkoutResponse(workout, dayOfWeek)
    ),
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate workout response has required fields
 */
export function validateWorkoutResponse(response: WorkoutResponse): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!response.title) errors.push('Missing workout title');
  if (!response.description) errors.push('Missing workout description');
  if (!response.duration || response.duration <= 0) errors.push('Invalid workout duration');
  if (!response.exercises || response.exercises.length === 0) errors.push('No exercises in workout');

  // Validate exercises have GIF URLs
  const exercisesWithoutGifs = response.exercises?.filter(
    (ex: WorkoutExercise) => !ex.exerciseData?.gifUrl
  ) || [];

  if (exercisesWithoutGifs.length > 0) {
    errors.push(`${exercisesWithoutGifs.length} exercises missing GIF URLs`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract exercise count statistics from workout response
 */
export function getWorkoutStats(response: WorkoutResponse): {
  totalExercises: number;
  warmupCount: number;
  mainCount: number;
  cooldownCount: number;
  muscleGroups: string[];
  equipment: string[];
} {
  const warmupCount = response.warmup?.length || 0;
  const mainCount = response.exercises?.length || 0;
  const cooldownCount = response.cooldown?.length || 0;

  const allExercises = [
    ...(response.warmup || []),
    ...(response.exercises || []),
    ...(response.cooldown || []),
  ];

  const muscleGroups = Array.from(
    new Set(
      allExercises.flatMap(ex => ex.exerciseData?.targetMuscles || [])
    )
  );

  const equipment = Array.from(
    new Set(
      allExercises.flatMap(ex => ex.exerciseData?.equipments || [])
    )
  );

  return {
    totalExercises: warmupCount + mainCount + cooldownCount,
    warmupCount,
    mainCount,
    cooldownCount,
    muscleGroups,
    equipment,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const workersDataTransformers = {
  transformProfileForWorkoutRequest,
  transformProfileForDietRequest,
  transformWorkoutResponse,
  transformToWeeklyPlan,
  validateWorkoutResponse,
  getWorkoutStats,
};

export default workersDataTransformers;
