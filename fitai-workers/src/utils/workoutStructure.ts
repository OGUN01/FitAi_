/**
 * FitAI Workers - Workout Structure Assignment System
 *
 * Deterministic assignment of sets, reps, rest periods, tempo, and coaching tips
 * based on:
 * - Exercise classification (compound/auxiliary/isolation)
 * - Experience level (beginner/intermediate/advanced)
 * - Fitness goal (muscle_gain, strength, endurance, weight_loss)
 * - Medical conditions (intensity caps, modifications)
 *
 * OUTPUT: Fully structured workout with all parameters ready for user
 */

import type { ClassifiedExercise, WorkoutDayExercises } from './exerciseSelection';
import type { UserProfile } from './validation';
import type { UserSafetyProfile } from './safetyFilter';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: number;
  reps: number | string; // Number or range like "8-12" or "AMRAP" or "30 seconds"
  restSeconds: number;
  notes?: string;
  tempo?: string; // "2-1-2" (eccentric-pause-concentric)
}

export interface StructuredWorkout {
  title: string;
  description: string;
  totalDuration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedCalories: number;

  warmup?: WorkoutExercise[];
  exercises: WorkoutExercise[];
  cooldown?: WorkoutExercise[];

  coachingTips: string[];
  progressionNotes: string;
}

// ============================================================================
// BASE PARAMETERS BY EXPERIENCE LEVEL
// ============================================================================

interface ExperienceParameters {
  compound: { sets: number; reps: string; rest: number; tempo: string };
  auxiliary: { sets: number; reps: string; rest: number; tempo: string };
  isolation: { sets: number; reps: string; rest: number; tempo: string };
}

const BASE_PARAMETERS: Record<'beginner' | 'intermediate' | 'advanced', ExperienceParameters> = {
  beginner: {
    compound: { sets: 3, reps: '10-12', rest: 90, tempo: '2-0-2' },
    auxiliary: { sets: 3, reps: '10-12', rest: 75, tempo: '2-0-2' },
    isolation: { sets: 2, reps: '12-15', rest: 60, tempo: '2-0-2' },
  },

  intermediate: {
    compound: { sets: 4, reps: '8-10', rest: 120, tempo: '3-0-2' },
    auxiliary: { sets: 3, reps: '10-12', rest: 90, tempo: '2-0-2' },
    isolation: { sets: 3, reps: '12-15', rest: 60, tempo: '2-0-2' },
  },

  advanced: {
    compound: { sets: 5, reps: '6-8', rest: 180, tempo: '3-1-2' },
    auxiliary: { sets: 4, reps: '8-10', rest: 120, tempo: '3-0-2' },
    isolation: { sets: 3, reps: '12-15', rest: 75, tempo: '2-1-2' },
  },
};

// ============================================================================
// GOAL-SPECIFIC ADJUSTMENTS
// ============================================================================

interface GoalAdjustments {
  repsMultiplier: number; // Multiply base reps
  setsMultiplier: number; // Multiply base sets
  restMultiplier: number; // Multiply base rest
  tempo: string; // Override tempo
  intensityNote: string;
}

const GOAL_ADJUSTMENTS: Record<string, GoalAdjustments> = {
  muscle_gain: {
    repsMultiplier: 1.0, // 8-12 reps (hypertrophy range)
    setsMultiplier: 1.0,
    restMultiplier: 1.0, // 90s rest
    tempo: '3-1-2', // Slower eccentric for muscle damage
    intensityNote: 'Focus on progressive overload. Increase weight when you can complete all sets with good form.',
  },

  strength: {
    repsMultiplier: 0.7, // 3-6 reps (strength range)
    setsMultiplier: 1.2, // More sets for strength
    restMultiplier: 1.5, // 180s rest for full recovery
    tempo: '3-1-1', // Slower eccentric, explosive concentric
    intensityNote: 'Prioritize heavy weight over reps. Rest fully between sets. Focus on barbell compounds.',
  },

  endurance: {
    repsMultiplier: 1.5, // 15-20 reps (endurance range)
    setsMultiplier: 0.8, // Fewer sets
    restMultiplier: 0.5, // 45s rest (metabolic stress)
    tempo: '2-0-1', // Faster tempo
    intensityNote: 'Maintain steady pace. Challenge cardiovascular system. Short rest periods.',
  },

  weight_loss: {
    repsMultiplier: 1.3, // 12-15 reps (metabolic range)
    setsMultiplier: 1.0,
    restMultiplier: 0.3, // 30s rest (circuit style)
    tempo: '2-0-1', // Faster tempo for calorie burn
    intensityNote: 'Keep heart rate elevated. Minimal rest between exercises. Focus on compound movements.',
  },

  athletic_performance: {
    repsMultiplier: 1.0, // 8-12 reps (balanced)
    setsMultiplier: 1.0,
    restMultiplier: 0.8, // 90s rest
    tempo: '2-0-X', // Explosive concentric (X = as fast as possible)
    intensityNote: 'Focus on power and explosiveness. Train movement patterns, not just muscles.',
  },

  general_fitness: {
    repsMultiplier: 1.0, // 10-12 reps
    setsMultiplier: 1.0,
    restMultiplier: 1.0, // 90s rest
    tempo: '2-0-2', // Standard tempo
    intensityNote: 'Balanced approach. Focus on form and consistency. Progress gradually.',
  },

  flexibility: {
    repsMultiplier: 1.5, // 15-20 reps (mobility range)
    setsMultiplier: 0.7, // Fewer sets
    restMultiplier: 0.7, // 60s rest
    tempo: '3-2-3', // Slow and controlled
    intensityNote: 'Prioritize full range of motion. Include dynamic stretching. Focus on movement quality.',
  },

  maintenance: {
    repsMultiplier: 1.0, // 10-12 reps
    setsMultiplier: 0.8, // Fewer sets
    restMultiplier: 1.0, // 90s rest
    tempo: '2-0-2', // Standard tempo
    intensityNote: 'Maintain current fitness level. Consistency over intensity. Enjoy your workouts.',
  },
};

// ============================================================================
// MEDICAL CONDITION MODIFICATIONS
// ============================================================================

/**
 * Apply medical condition modifications to workout parameters
 */
function applyMedicalModifications(
  params: { sets: number; reps: string; rest: number },
  safetyProfile?: UserSafetyProfile
): { sets: number; reps: string; rest: number; warnings: string[] } {

  if (!safetyProfile) {
    return { ...params, warnings: [] };
  }

  let modifiedSets = params.sets;
  let modifiedRest = params.rest;
  const warnings: string[] = [];

  // Pregnancy modifications
  if (safetyProfile.pregnancy_status) {
    const trimester = parseInt(String(safetyProfile.pregnancy_trimester || 1));

    if (trimester === 3) {
      // Trimester 3: Reduce volume significantly
      modifiedSets = Math.max(2, Math.floor(params.sets * 0.6));
      modifiedRest = Math.max(params.rest, 120); // Longer rest
      warnings.push('Trimester 3: Reduced volume and longer rest periods');
    } else if (trimester === 2) {
      // Trimester 2: Moderate reduction
      modifiedSets = Math.max(2, Math.floor(params.sets * 0.8));
      modifiedRest = Math.max(params.rest, 90);
      warnings.push('Trimester 2: Moderate intensity, avoid supine positions');
    }
  }

  // Heart disease: Severe restrictions
  if (safetyProfile.medical_conditions?.some(c => c.toLowerCase().includes('heart'))) {
    modifiedSets = Math.max(2, Math.floor(params.sets * 0.6));
    modifiedRest = Math.max(180, modifiedRest); // Long rest for recovery
    warnings.push('⚠️ Heart disease: RPE 5-6 max, extended rest periods');
  }

  // Hypertension: Moderate restrictions
  if (safetyProfile.medical_conditions?.some(c => c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('blood pressure'))) {
    modifiedRest = Math.max(120, modifiedRest);
    warnings.push('⚠️ Hypertension: Avoid breath-holding, monitor blood pressure');
  }

  // High stress: Reduce volume
  if (safetyProfile.stress_level === 'high') {
    modifiedSets = Math.max(2, Math.floor(params.sets * 0.8));
    warnings.push('High stress: Reduced volume for better recovery');
  }

  // Seniors (65+): Conservative approach
  if (safetyProfile.age >= 65) {
    modifiedSets = Math.max(2, Math.floor(params.sets * 0.8));
    modifiedRest = Math.max(120, modifiedRest);
    warnings.push('Senior modifications: Longer rest, focus on form and balance');
  }

  return {
    sets: modifiedSets,
    reps: params.reps,
    rest: modifiedRest,
    warnings,
  };
}

// ============================================================================
// MAIN ASSIGNMENT FUNCTION
// ============================================================================

/**
 * Assign sets, reps, rest, tempo, and notes to exercises
 */
export function assignWorkoutParameters(
  workoutDay: WorkoutDayExercises,
  profile: UserProfile,
  safetyProfile?: UserSafetyProfile
): WorkoutExercise[] {

  const experienceLevel = profile.experienceLevel;
  const fitnessGoal = profile.fitnessGoal;

  // Get base parameters for experience level
  const baseParams = BASE_PARAMETERS[experienceLevel];

  // Get goal adjustments
  const goalAdjust = GOAL_ADJUSTMENTS[fitnessGoal] || GOAL_ADJUSTMENTS.general_fitness;

  const structuredExercises: WorkoutExercise[] = [];

  for (const exercise of workoutDay.exercises) {
    // Get base parameters for exercise classification
    let params = exercise.classification === 'cardio'
      ? baseParams.auxiliary // Cardio uses auxiliary params
      : baseParams[exercise.classification] || baseParams.auxiliary;

    // Apply goal adjustments
    const adjustedSets = Math.max(1, Math.round(params.sets * goalAdjust.setsMultiplier));
    const adjustedRest = Math.round(params.rest * goalAdjust.restMultiplier);

    // Adjust reps based on goal
    let adjustedReps: string;
    if (typeof params.reps === 'string' && params.reps.includes('-')) {
      // Parse range like "8-12"
      const [min, max] = params.reps.split('-').map((n: string) => parseInt(n.trim()));
      const newMin = Math.max(1, Math.round(min * goalAdjust.repsMultiplier));
      const newMax = Math.max(newMin, Math.round(max * goalAdjust.repsMultiplier));
      adjustedReps = `${newMin}-${newMax}`;
    } else {
      adjustedReps = params.reps;
    }

    // Apply medical modifications
    const { sets, reps, rest } = applyMedicalModifications(
      { sets: adjustedSets, reps: adjustedReps, rest: adjustedRest },
      safetyProfile
    );

    // Determine tempo (goal override or base)
    const tempo = goalAdjust.tempo || params.tempo;

    // Generate exercise-specific notes
    const notes = generateExerciseNotes(exercise, profile, safetyProfile);

    structuredExercises.push({
      exerciseId: exercise.exerciseId,
      name: exercise.name,
      sets,
      reps,
      restSeconds: rest,
      tempo,
      notes: notes || undefined,
    });
  }

  return structuredExercises;
}

// ============================================================================
// COACHING NOTES GENERATION
// ============================================================================

/**
 * Generate exercise-specific coaching notes
 */
function generateExerciseNotes(
  exercise: ClassifiedExercise,
  profile: UserProfile,
  safetyProfile?: UserSafetyProfile
): string | null {

  const notes: string[] = [];

  // Beginner notes for complex exercises
  if (profile.experienceLevel === 'beginner' && exercise.complexityScore >= 8) {
    notes.push('⚠️ Complex exercise - focus on form, consider trainer guidance');
  }

  // Pregnancy modifications
  if (safetyProfile?.pregnancy_status) {
    if (exercise.metadata?.requiresValsalva) {
      notes.push('Avoid breath-holding - breathe continuously');
    }
  }

  // Injury-specific modifications
  if (safetyProfile?.injuries && safetyProfile.injuries.length > 0) {
    const nameLower = exercise.name.toLowerCase();

    // Back injury modifications
    if (safetyProfile.injuries.some(i => i.toLowerCase().includes('back'))) {
      if (nameLower.includes('row') || nameLower.includes('deadlift')) {
        notes.push('Keep spine neutral, engage core, avoid rounding');
      }
    }

    // Knee injury modifications
    if (safetyProfile.injuries.some(i => i.toLowerCase().includes('knee'))) {
      if (nameLower.includes('squat') || nameLower.includes('lunge')) {
        notes.push('Reduce range of motion, knees behind toes');
      }
    }

    // Shoulder injury modifications
    if (safetyProfile.injuries.some(i => i.toLowerCase().includes('shoulder'))) {
      if (nameLower.includes('press') || nameLower.includes('raise')) {
        notes.push('Reduce range of motion, avoid overhead if painful');
      }
    }
  }

  // Compound exercise tips
  if (exercise.classification === 'compound') {
    notes.push('Prioritize this exercise - most effective for gains');
  }

  return notes.length > 0 ? notes.join('. ') : null;
}

/**
 * Generate workout-level coaching tips
 */
export function generateCoachingTips(
  profile: UserProfile,
  workoutType: string,
  safetyProfile?: UserSafetyProfile
): string[] {

  const tips: string[] = [];

  // Goal-specific tips
  const goalAdjust = GOAL_ADJUSTMENTS[profile.fitnessGoal] || GOAL_ADJUSTMENTS.general_fitness;
  tips.push(`🎯 ${goalAdjust.intensityNote}`);

  // Experience-level tips
  if (profile.experienceLevel === 'beginner') {
    tips.push('📚 Focus on learning proper form before increasing weight');
    tips.push('⏱️ Take your time between sets - recovery is important');
  } else if (profile.experienceLevel === 'advanced') {
    tips.push('💪 Push intensity on compound lifts - you can handle it');
    tips.push('📈 Track your lifts to ensure progressive overload');
  }

  // Safety tips based on conditions
  if (safetyProfile?.pregnancy_status) {
    tips.push('🤰 Monitor intensity - you should be able to hold a conversation');
    tips.push('💧 Stay well-hydrated throughout workout');
  }

  if (safetyProfile?.medical_conditions?.some(c => c.toLowerCase().includes('heart'))) {
    tips.push('❤️ CRITICAL: Monitor heart rate, stay within prescribed limits');
    tips.push('🛑 Stop immediately if chest pain, dizziness, or shortness of breath');
  }

  if (safetyProfile?.age && safetyProfile.age >= 65) {
    tips.push('🧘 Prioritize balance and stability - use support if needed');
    tips.push('⏰ Take extra warm-up time (10-15 minutes)');
  }

  // Workout-specific tips
  if (workoutType.toLowerCase().includes('hiit') || workoutType.toLowerCase().includes('circuit')) {
    tips.push('🔥 Keep moving - minimize rest between exercises');
    tips.push('💨 Focus on breathing - don\'t hold your breath');
  }

  if (workoutType.toLowerCase().includes('legs')) {
    tips.push('🦵 Leg day is crucial - don\'t skip it');
    tips.push('🥤 Have protein within 30 minutes post-workout');
  }

  return tips;
}

/**
 * Generate progression notes
 */
export function generateProgressionNotes(
  profile: UserProfile,
  weekNumber: number
): string {

  const experienceLevel = profile.experienceLevel;
  const goal = profile.fitnessGoal;

  let note = '';

  // Week-specific progression
  if (weekNumber === 1) {
    note = 'Week 1: Focus on form and technique. Use conservative weights to learn movement patterns.';
  } else if (weekNumber === 2) {
    note = 'Week 2: Increase weight by 5-10% if form was good last week. Maintain proper technique.';
  } else if (weekNumber === 3) {
    note = 'Week 3: Push intensity - aim for RPE 7-8 on main lifts. This is your peak week.';
  } else if (weekNumber === 4) {
    note = 'Week 4: Deload week - reduce weight by 20% and volume by 30%. Focus on recovery.';
  }

  // Add goal-specific progression
  if (goal === 'strength') {
    note += ' For strength: Add 2.5-5kg to barbell lifts when you complete all sets.';
  } else if (goal === 'muscle_gain') {
    note += ' For muscle gain: Increase weight when you can do 2+ extra reps beyond target range.';
  } else if (goal === 'weight_loss') {
    note += ' For weight loss: Reduce rest periods by 5-10s each week to increase metabolic demand.';
  }

  return note;
}

// ============================================================================
// WARMUP & COOLDOWN GENERATION
// ============================================================================

/**
 * Generate warmup exercises
 */
export function generateWarmup(
  workoutType: string,
  durationMinutes: number = 5
): WorkoutExercise[] {

  const warmup: WorkoutExercise[] = [];

  // General mobility (always include)
  warmup.push({
    exerciseId: 'warmup_001',
    name: 'General Cardio (Light)',
    sets: 1,
    reps: `${durationMinutes} minutes`,
    restSeconds: 0,
    notes: 'Treadmill, bike, or jumping jacks - get heart rate up',
  });

  // Specific warmup based on workout type
  if (workoutType.toLowerCase().includes('upper') || workoutType.toLowerCase().includes('push')) {
    warmup.push({
      exerciseId: 'warmup_002',
      name: 'Arm Circles & Shoulder Rolls',
      sets: 2,
      reps: '10',
      restSeconds: 0,
      notes: 'Prepare shoulder joint for pressing movements',
    });
  }

  if (workoutType.toLowerCase().includes('lower') || workoutType.toLowerCase().includes('legs')) {
    warmup.push({
      exerciseId: 'warmup_003',
      name: 'Bodyweight Squats',
      sets: 2,
      reps: '10-15',
      restSeconds: 30,
      notes: 'Activate glutes and quads, practice squat pattern',
    });
  }

  if (workoutType.toLowerCase().includes('pull') || workoutType.toLowerCase().includes('back')) {
    warmup.push({
      exerciseId: 'warmup_004',
      name: 'Band Pull-Aparts',
      sets: 2,
      reps: '15',
      restSeconds: 30,
      notes: 'Activate upper back and rear delts',
    });
  }

  return warmup;
}

/**
 * Generate cooldown exercises
 */
export function generateCooldown(
  workoutType: string,
  durationMinutes: number = 5
): WorkoutExercise[] {

  const cooldown: WorkoutExercise[] = [];

  cooldown.push({
    exerciseId: 'cooldown_001',
    name: 'Light Cardio (Cool Down)',
    sets: 1,
    reps: '3 minutes',
    restSeconds: 0,
    notes: 'Walk or easy bike to bring heart rate down',
  });

  cooldown.push({
    exerciseId: 'cooldown_002',
    name: 'Static Stretching (Full Body)',
    sets: 1,
    reps: '5-10 minutes',
    restSeconds: 0,
    notes: 'Hold each stretch 20-30 seconds, focus on trained muscles',
  });

  return cooldown;
}

// ============================================================================
// CALORIE ESTIMATION
// ============================================================================

/**
 * Estimate calories burned during workout
 */
export function estimateCalories(
  totalExercises: number,
  durationMinutes: number,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  userWeight: number, // kg
  fitnessGoal: string
): number {

  // Base metabolic rate during exercise (calories per minute)
  const baseCaloriesPerMinute = {
    beginner: 5,
    intermediate: 6,
    advanced: 7,
  };

  let caloriesPerMinute = baseCaloriesPerMinute[experienceLevel];

  // Adjust for body weight (heavier = more calories)
  const weightMultiplier = userWeight / 70; // Normalize to 70kg
  caloriesPerMinute *= weightMultiplier;

  // Adjust for goal (higher intensity = more calories)
  if (fitnessGoal === 'weight_loss' || fitnessGoal === 'endurance') {
    caloriesPerMinute *= 1.2; // Higher intensity
  } else if (fitnessGoal === 'strength') {
    caloriesPerMinute *= 0.9; // Lower intensity (longer rest)
  }

  const totalCalories = Math.round(caloriesPerMinute * durationMinutes);

  return totalCalories;
}
