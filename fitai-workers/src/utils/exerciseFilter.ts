/**
 * FitAI Workers - Exercise Filtering Logic
 *
 * Multi-layer filtering system that reduces 1500 exercises to 30-50
 * highly relevant exercises based on user profile and workout requirements
 *
 * Filtering Strategy:
 * 1. Equipment Filter: 1500 → ~400 exercises
 * 2. Body Parts Filter: ~400 → ~150 exercises
 * 3. Experience Level Filter: ~150 → ~100 exercises
 * 4. Smart Scoring & Ranking: ~100 → 30-50 exercises
 */

import { Exercise, loadExerciseDatabase } from './exerciseDatabase';
import { WorkoutGenerationRequest } from './validation';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Scored exercise for ranking
 */
interface ScoredExercise {
  exercise: Exercise;
  score: number;
  reasons: string[]; // Why this exercise scored high
}

/**
 * Filter result with metadata
 */
export interface FilterResult {
  exercises: Exercise[];
  stats: {
    total: number;
    afterEquipment: number;
    afterBodyParts: number;
    afterExperience: number;
    final: number;
  };
}

// ============================================================================
// EXPERIENCE LEVEL MAPPING
// ============================================================================

/**
 * Map exercises to difficulty levels based on movement complexity
 * This is a heuristic - in production you'd want this in the database
 */
const ADVANCED_EXERCISES = new Set([
  'muscle up',
  'planche',
  'front lever',
  'pistol squat',
  'dragon flag',
  'one arm pull up',
  'handstand push up',
  'snatch',
  'clean and jerk',
  'turkish get up',
]);

const INTERMEDIATE_EXERCISES = new Set([
  'pull up',
  'dip',
  'bulgarian split squat',
  'overhead press',
  'deadlift',
  'barbell squat',
  'bench press',
  'chin up',
]);

/**
 * Determine exercise difficulty based on name and equipment
 */
function getExerciseDifficulty(exercise: Exercise): 'beginner' | 'intermediate' | 'advanced' {
  const nameLower = exercise.name.toLowerCase();

  // Check for advanced movements
  if (ADVANCED_EXERCISES.has(nameLower) || nameLower.includes('olympic')) {
    return 'advanced';
  }

  // Check for intermediate movements
  if (INTERMEDIATE_EXERCISES.has(nameLower)) {
    return 'intermediate';
  }

  // Machine and cable exercises are typically beginner-friendly
  if (
    exercise.equipments.includes('machine') ||
    exercise.equipments.includes('cable') ||
    exercise.equipments.includes('assisted')
  ) {
    return 'beginner';
  }

  // Body weight compound movements are intermediate
  if (
    exercise.equipments.includes('body weight') &&
    (nameLower.includes('pull') || nameLower.includes('push') || nameLower.includes('squat'))
  ) {
    return 'intermediate';
  }

  // Default to beginner
  return 'beginner';
}

// ============================================================================
// LAYER 1: EQUIPMENT FILTER
// ============================================================================

/**
 * Filter exercises by available equipment
 * Keeps exercises that can be performed with user's available equipment
 */
function filterByEquipment(exercises: Exercise[], availableEquipment: string[]): Exercise[] {
  const equipmentSet = new Set(availableEquipment.map((e) => e.toLowerCase()));

  return exercises.filter((exercise) =>
    exercise.equipments.some((eq) => equipmentSet.has(eq.toLowerCase()))
  );
}

// ============================================================================
// LAYER 2: BODY PARTS FILTER
// ============================================================================

/**
 * Filter exercises by target body parts
 * If no target body parts specified, keeps all exercises
 */
function filterByBodyParts(
  exercises: Exercise[],
  targetBodyParts?: string[],
  workoutType?: string
): Exercise[] {
  // If no specific target, use workout type to determine body parts
  let bodyPartsToTarget: string[] = [];

  if (targetBodyParts && targetBodyParts.length > 0) {
    bodyPartsToTarget = targetBodyParts;
  } else if (workoutType) {
    // Map workout type to body parts
    const workoutTypeMap: Record<string, string[]> = {
      full_body: ['back', 'chest', 'legs', 'shoulders', 'arms', 'core'],
      upper_body: ['back', 'chest', 'shoulders', 'arms'],
      lower_body: ['legs', 'upper legs', 'lower legs'],
      push: ['chest', 'shoulders', 'arms'],
      pull: ['back', 'arms'],
      legs: ['legs', 'upper legs', 'lower legs'],
      chest: ['chest'],
      back: ['back'],
      shoulders: ['shoulders'],
      arms: ['arms', 'upper arms', 'lower arms'],
      core: ['core', 'waist'],
      cardio: ['cardio'],
    };

    bodyPartsToTarget = workoutTypeMap[workoutType] || [];
  }

  // If still no target body parts, return all exercises
  if (bodyPartsToTarget.length === 0) {
    return exercises;
  }

  const bodyPartSet = new Set(bodyPartsToTarget.map((bp) => bp.toLowerCase()));

  return exercises.filter((exercise) =>
    exercise.bodyParts.some((bp) => bodyPartSet.has(bp.toLowerCase()))
  );
}

// ============================================================================
// LAYER 3: EXPERIENCE LEVEL FILTER
// ============================================================================

/**
 * Filter exercises by experience level
 * Beginners: Only beginner exercises
 * Intermediate: Beginner + intermediate exercises
 * Advanced: All exercises
 */
function filterByExperienceLevel(
  exercises: Exercise[],
  experienceLevel: 'beginner' | 'intermediate' | 'advanced'
): Exercise[] {
  if (experienceLevel === 'advanced') {
    return exercises; // Advanced users can do everything
  }

  return exercises.filter((exercise) => {
    const difficulty = getExerciseDifficulty(exercise);

    if (experienceLevel === 'beginner') {
      return difficulty === 'beginner';
    } else {
      // Intermediate
      return difficulty === 'beginner' || difficulty === 'intermediate';
    }
  });
}

// ============================================================================
// LAYER 4: SMART SCORING & RANKING
// ============================================================================

/**
 * Score exercises based on relevance to user's goals and preferences
 */
function scoreExercise(
  exercise: Exercise,
  request: WorkoutGenerationRequest
): ScoredExercise {
  let score = 0;
  const reasons: string[] = [];

  // 1. Equipment preference (higher score for more accessible equipment)
  if (exercise.equipments.includes('body weight')) {
    score += 10;
    reasons.push('Body weight exercise (no equipment needed)');
  } else if (exercise.equipments.includes('dumbbell')) {
    score += 8;
    reasons.push('Dumbbell exercise (common equipment)');
  } else if (exercise.equipments.includes('barbell')) {
    score += 6;
    reasons.push('Barbell exercise');
  }

  // 2. Compound vs Isolation (compound movements score higher)
  const compoundIndicators = ['squat', 'deadlift', 'press', 'pull', 'row', 'lunge'];
  if (compoundIndicators.some((indicator) => exercise.name.toLowerCase().includes(indicator))) {
    score += 15;
    reasons.push('Compound movement (works multiple muscle groups)');
  }

  // 3. Muscle group relevance
  if (request.focusMuscles && request.focusMuscles.length > 0) {
    const focusMuscleSet = new Set(request.focusMuscles.map((m) => m.toLowerCase()));
    const matchingMuscles = exercise.targetMuscles.filter((m) => focusMuscleSet.has(m.toLowerCase()));

    if (matchingMuscles.length > 0) {
      score += matchingMuscles.length * 10;
      reasons.push(`Targets focus muscles: ${matchingMuscles.join(', ')}`);
    }
  }

  // 4. Fitness goal alignment
  if (request.profile.fitnessGoal === 'muscle_gain') {
    // Favor hypertrophy-friendly exercises
    if (
      exercise.equipments.includes('dumbbell') ||
      exercise.equipments.includes('barbell') ||
      exercise.equipments.includes('cable')
    ) {
      score += 5;
      reasons.push('Good for muscle building');
    }
  } else if (request.profile.fitnessGoal === 'weight_loss' || request.profile.fitnessGoal === 'endurance') {
    // Favor high-rep, metabolic exercises
    if (
      exercise.equipments.includes('body weight') ||
      exercise.bodyParts.includes('cardio')
    ) {
      score += 5;
      reasons.push('Good for weight loss/endurance');
    }
  } else if (request.profile.fitnessGoal === 'strength') {
    // Favor heavy compound lifts
    if (
      exercise.equipments.includes('barbell') ||
      ['squat', 'deadlift', 'press', 'bench'].some((term) =>
        exercise.name.toLowerCase().includes(term)
      )
    ) {
      score += 5;
      reasons.push('Good for strength building');
    }
  }

  // 5. Experience level appropriateness
  const difficulty = getExerciseDifficulty(exercise);
  const userLevel = request.difficultyOverride || request.profile.experienceLevel;

  if (difficulty === userLevel) {
    score += 5;
    reasons.push(`Appropriate for ${userLevel} level`);
  }

  // 6. Safety and injury considerations
  if (request.profile.injuries && request.profile.injuries.length > 0) {
    // Simple heuristic: penalize exercises that might aggravate common injuries
    const injuryLower = request.profile.injuries.map((i) => i.toLowerCase());

    if (injuryLower.some((i) => i.includes('back')) && exercise.name.toLowerCase().includes('deadlift')) {
      score -= 20;
      reasons.push('May aggravate back injury - use caution');
    }

    if (injuryLower.some((i) => i.includes('knee')) && exercise.name.toLowerCase().includes('squat')) {
      score -= 15;
      reasons.push('May aggravate knee injury - use caution');
    }

    if (injuryLower.some((i) => i.includes('shoulder')) && exercise.name.toLowerCase().includes('press')) {
      score -= 15;
      reasons.push('May aggravate shoulder injury - use caution');
    }
  }

  return {
    exercise,
    score,
    reasons,
  };
}

/**
 * Rank and select top N exercises
 */
function selectTopExercises(
  scoredExercises: ScoredExercise[],
  targetCount: number = 40
): Exercise[] {
  // Sort by score (highest first)
  const sorted = scoredExercises.sort((a, b) => b.score - a.score);

  // Select top N
  const selected = sorted.slice(0, targetCount);

  // Log top exercises for debugging
  console.log('[Exercise Filter] Top 5 exercises:');
  selected.slice(0, 5).forEach((se, idx) => {
    console.log(`  ${idx + 1}. ${se.exercise.name} (score: ${se.score})`);
    console.log(`     Reasons: ${se.reasons.join(', ')}`);
  });

  return selected.map((se) => se.exercise);
}

// ============================================================================
// MAIN FILTERING FUNCTION
// ============================================================================

/**
 * Multi-layer filtering: 1500 → 30-50 exercises
 */
export async function filterExercisesForWorkout(
  request: WorkoutGenerationRequest,
  targetCount: number = 40
): Promise<FilterResult> {
  // Load full database
  const db = await loadExerciseDatabase();
  let exercises = db.exercises;

  const stats = {
    total: exercises.length,
    afterEquipment: 0,
    afterBodyParts: 0,
    afterExperience: 0,
    final: 0,
  };

  // Layer 1: Equipment filter
  exercises = filterByEquipment(exercises, request.profile.availableEquipment);
  stats.afterEquipment = exercises.length;
  console.log(`[Filter Layer 1] Equipment: ${stats.total} → ${stats.afterEquipment} exercises`);

  // Layer 2: Body parts filter
  exercises = filterByBodyParts(
    exercises,
    request.profile.targetBodyParts,
    request.workoutType
  );
  stats.afterBodyParts = exercises.length;
  console.log(`[Filter Layer 2] Body parts: ${stats.afterEquipment} → ${stats.afterBodyParts} exercises`);

  // Layer 3: Experience level filter
  const experienceLevel = request.difficultyOverride || request.profile.experienceLevel;
  exercises = filterByExperienceLevel(exercises, experienceLevel);
  stats.afterExperience = exercises.length;
  console.log(`[Filter Layer 3] Experience: ${stats.afterBodyParts} → ${stats.afterExperience} exercises`);

  // Layer 4: Smart scoring and ranking
  const scoredExercises = exercises.map((ex) => scoreExercise(ex, request));
  const finalExercises = selectTopExercises(scoredExercises, targetCount);
  stats.final = finalExercises.length;
  console.log(`[Filter Layer 4] Ranking: ${stats.afterExperience} → ${stats.final} exercises`);

  // Exclude specific exercises if requested
  let filteredFinal = finalExercises;
  if (request.excludeExercises && request.excludeExercises.length > 0) {
    const excludeSet = new Set(request.excludeExercises);
    filteredFinal = finalExercises.filter((ex) => !excludeSet.has(ex.exerciseId));
    console.log(`[Filter] Excluded ${finalExercises.length - filteredFinal.length} user-specified exercises`);
    stats.final = filteredFinal.length;
  }

  return {
    exercises: filteredFinal,
    stats,
  };
}

/**
 * Estimate token count for filtered exercises
 * Used to ensure we stay under token limits
 */
export function estimateTokenCount(exercises: Exercise[]): number {
  // Rough estimate: each exercise = ~15 tokens (ID + name + equipment + body parts)
  // Example: { "id": "VPPtusI", "name": "inverted row", "equipment": ["body weight"], "bodyParts": ["back"] }
  const tokensPerExercise = 15;
  const basePromptTokens = 200; // System prompt + instructions
  const totalTokens = basePromptTokens + exercises.length * tokensPerExercise;

  return totalTokens;
}
