/**
 * Calorie Calculator Service
 * 
 * Provides accurate calorie burn calculations using MET (Metabolic Equivalent of Task) values.
 * This is the industry-standard approach used by fitness apps like MyFitnessPal, Strava, etc.
 * 
 * Formula: Calories = MET × Weight(kg) × Duration(hours)
 * 
 * Priority System:
 * 1. Smartwatch data (if available) - most accurate due to heart rate
 * 2. MET-calculated from exercises - ~80-85% accuracy
 */

import {
  getBodyPartMET,
  getEquipmentMultiplier,
  getIntensityModifier,
  getExerciseTypeOverride,
  MIN_MET,
  MAX_MET,
  DEFAULT_MET,
} from '../utils/calorieCalculations/metMappings';
import { exerciseFilterService, FilteredExercise } from './exerciseFilterService';

// =============================================================================
// TYPES
// =============================================================================

export interface ExerciseCalorieInput {
  exerciseId?: string;
  name?: string;
  bodyParts?: string[];
  equipments?: string[];
  sets?: number;
  reps?: number | string;
  duration?: number; // in seconds for time-based exercises
  restTime?: number; // in seconds
}

export interface WorkoutCalorieResult {
  totalCalories: number;
  exerciseBreakdown: Array<{
    exerciseId: string;
    name: string;
    met: number;
    durationMinutes: number;
    calories: number;
  }>;
  averageMET: number;
  totalDurationMinutes: number;
}

// =============================================================================
// CORE CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate the MET value for an exercise based on its characteristics
 * Uses body part, equipment, and exercise name to determine intensity
 */
export function getExerciseMET(exercise: FilteredExercise | ExerciseCalorieInput): number {
  const name = exercise.name || '';
  const bodyPart = exercise.bodyParts?.[0] || 'waist';
  const equipment = exercise.equipments?.[0] || 'body weight';
  
  // Check for known exercise type override first
  const override = getExerciseTypeOverride(name);
  if (override !== null) {
    return Math.min(Math.max(override, MIN_MET), MAX_MET);
  }
  
  // Calculate MET from components
  let met = getBodyPartMET(bodyPart);
  met *= getEquipmentMultiplier(equipment);
  met *= getIntensityModifier(name);
  
  // Clamp to valid range
  return Math.min(Math.max(met, MIN_MET), MAX_MET);
}

/**
 * Estimate exercise duration in minutes based on sets, reps, and rest time
 * 
 * Assumptions:
 * - Average rep takes 3 seconds (eccentric + concentric + brief pause)
 * - Rest time between sets is specified or defaults to 60 seconds
 */
export function estimateExerciseDuration(
  sets: number = 3,
  reps: number | string = 10,
  restTimeSeconds: number = 60,
  durationSeconds?: number
): number {
  // If explicit duration is provided (for time-based exercises like planks)
  if (durationSeconds && durationSeconds > 0) {
    return (durationSeconds * sets + restTimeSeconds * (sets - 1)) / 60;
  }
  
  // Parse reps (could be "8-12" format)
  let repCount: number;
  if (typeof reps === 'string') {
    // Handle ranges like "8-12" by taking the average
    const parts = reps.split('-').map(p => parseInt(p.trim(), 10));
    repCount = parts.length === 2 
      ? Math.round((parts[0] + parts[1]) / 2) 
      : parseInt(reps, 10) || 10;
  } else {
    repCount = reps || 10;
  }
  
  // Calculate total time
  const secondsPerRep = 3;
  const workTime = sets * repCount * secondsPerRep;
  const totalRestTime = restTimeSeconds * Math.max(0, sets - 1);
  const totalSeconds = workTime + totalRestTime;
  
  return totalSeconds / 60; // Convert to minutes
}

/**
 * Calculate calories burned for a single exercise
 * 
 * @param exercise - Exercise data (from database or workout)
 * @param durationMinutes - Duration in minutes (or will be estimated)
 * @param userWeightKg - User's weight in kilograms (REQUIRED - no fallback)
 * @returns Calories burned (rounded to nearest integer), or 0 if missing data
 */
export function calculateExerciseCalories(
  exercise: FilteredExercise | ExerciseCalorieInput,
  durationMinutes: number,
  userWeightKg: number | undefined | null
): number {
  // NO FALLBACK VALUES - return 0 and log if data is missing
  if (!userWeightKg || userWeightKg <= 0) {
    console.warn('[calorieCalculator] Cannot calculate calories: user weight not available');
    return 0;
  }
  
  if (durationMinutes <= 0) {
    console.warn('[calorieCalculator] Cannot calculate calories: duration is 0 or negative');
    return 0;
  }
  
  const met = getExerciseMET(exercise);
  const durationHours = durationMinutes / 60;
  const calories = met * userWeightKg * durationHours;
  
  return Math.round(calories);
}

/**
 * Calculate total calories for an entire workout
 * 
 * @param exercises - Array of exercises in the workout
 * @param userWeightKg - User's weight in kilograms (REQUIRED - no fallback)
 * @returns Detailed calorie breakdown, or zeros if weight not available
 */
export function calculateWorkoutCalories(
  exercises: ExerciseCalorieInput[],
  userWeightKg: number | undefined | null
): WorkoutCalorieResult {
  // NO FALLBACK - return empty result if weight not available
  if (!userWeightKg || userWeightKg <= 0) {
    console.warn('[calorieCalculator] Cannot calculate workout calories: user weight not available');
    return {
      totalCalories: 0,
      exerciseBreakdown: [],
      averageMET: 0,
      totalDurationMinutes: 0,
    };
  }
  const exerciseBreakdown: WorkoutCalorieResult['exerciseBreakdown'] = [];
  let totalCalories = 0;
  let totalMET = 0;
  let totalDurationMinutes = 0;
  
  for (const exercise of exercises) {
    // Try to get full exercise data from database
    let exerciseData: FilteredExercise | ExerciseCalorieInput = exercise;
    if (exercise.exerciseId) {
      const dbExercise = exerciseFilterService.getExerciseById(exercise.exerciseId);
      if (dbExercise) {
        exerciseData = { ...dbExercise, ...exercise };
      }
    }
    
    // Estimate duration from sets/reps
    const durationMinutes = estimateExerciseDuration(
      exercise.sets,
      exercise.reps,
      exercise.restTime,
      exercise.duration
    );
    
    // Calculate MET and calories
    const met = getExerciseMET(exerciseData);
    const calories = calculateExerciseCalories(exerciseData, durationMinutes, userWeightKg);
    
    // Add to totals
    totalCalories += calories;
    totalMET += met;
    totalDurationMinutes += durationMinutes;
    
    exerciseBreakdown.push({
      exerciseId: exercise.exerciseId || 'unknown',
      name: exerciseData.name || 'Unknown Exercise',
      met,
      durationMinutes,
      calories,
    });
  }
  
  return {
    totalCalories,
    exerciseBreakdown,
    averageMET: exercises.length > 0 ? totalMET / exercises.length : DEFAULT_MET,
    totalDurationMinutes,
  };
}

/**
 * Calculate calories for a completed workout based on actual progress
 * This accounts for exercises that were skipped or partially completed
 * 
 * @param workout - The workout plan with exercises
 * @param exerciseProgress - Progress tracking for each exercise
 * @param userWeightKg - User's weight in kilograms
 * @returns Actual calories burned
 */
export function calculateCompletedWorkoutCalories(
  workout: {
    exercises: ExerciseCalorieInput[];
    duration?: number;
  },
  exerciseProgress: Record<string, {
    completed: boolean;
    completedSets?: boolean[];
    actualReps?: number[];
    actualDuration?: number;
  }>,
  userWeightKg: number
): number {
  let totalCalories = 0;
  
  for (const exercise of workout.exercises) {
    const progress = exerciseProgress[exercise.exerciseId || ''];
    
    // Skip if exercise wasn't attempted
    if (!progress) continue;
    
    // Get exercise data
    let exerciseData: FilteredExercise | ExerciseCalorieInput = exercise;
    if (exercise.exerciseId) {
      const dbExercise = exerciseFilterService.getExerciseById(exercise.exerciseId);
      if (dbExercise) {
        exerciseData = { ...dbExercise, ...exercise };
      }
    }
    
    // Calculate based on actual progress
    let completedSets = exercise.sets || 3;
    let avgReps = typeof exercise.reps === 'number' ? exercise.reps : 10;
    
    if (progress.completedSets) {
      completedSets = progress.completedSets.filter(Boolean).length;
    }
    if (progress.actualReps && progress.actualReps.length > 0) {
      avgReps = progress.actualReps.reduce((a, b) => a + b, 0) / progress.actualReps.length;
    }
    
    // Estimate duration based on actual progress
    const durationMinutes = estimateExerciseDuration(
      completedSets,
      avgReps,
      exercise.restTime,
      progress.actualDuration
    );
    
    // Calculate calories
    const calories = calculateExerciseCalories(exerciseData, durationMinutes, userWeightKg);
    totalCalories += calories;
  }
  
  return totalCalories;
}

/**
 * Quick estimate for workout calories based on duration and difficulty
 * Used when exercise details aren't available but user weight is known
 * 
 * @param durationMinutes - Workout duration in minutes
 * @param difficulty - Workout difficulty level
 * @param userWeightKg - User's weight in kilograms (REQUIRED - no fallback)
 * @returns Estimated calories, or 0 if weight not available
 */
export function quickEstimateCalories(
  durationMinutes: number,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  userWeightKg: number | undefined | null
): number {
  // NO FALLBACK - return 0 if weight not available
  if (!userWeightKg || userWeightKg <= 0) {
    console.warn('[calorieCalculator] Cannot quick estimate calories: user weight not available');
    return 0;
  }
  
  if (durationMinutes <= 0) {
    return 0;
  }
  
  // Average MET by difficulty
  const difficultyMET: Record<string, number> = {
    beginner: 4.0,
    intermediate: 5.5,
    advanced: 7.0,
  };
  
  const met = difficultyMET[difficulty] || 5.5;
  const durationHours = durationMinutes / 60;
  
  return Math.round(met * userWeightKg * durationHours);
}

/**
 * Get calories per minute for display purposes
 * Shows users how intense an exercise is
 * 
 * @param exercise - Exercise data
 * @param userWeightKg - User's weight in kilograms (REQUIRED - no fallback)
 * @returns Calories per minute, or 0 if weight not available
 */
export function getCaloriesPerMinute(
  exercise: FilteredExercise | ExerciseCalorieInput,
  userWeightKg: number | undefined | null
): number {
  if (!userWeightKg || userWeightKg <= 0) {
    return 0;
  }
  const met = getExerciseMET(exercise);
  return Math.round((met * userWeightKg) / 60);
}

// =============================================================================
// EXPORT DEFAULT SERVICE
// =============================================================================

export const calorieCalculator = {
  getExerciseMET,
  estimateExerciseDuration,
  calculateExerciseCalories,
  calculateWorkoutCalories,
  calculateCompletedWorkoutCalories,
  quickEstimateCalories,
  getCaloriesPerMinute,
};

export default calorieCalculator;

