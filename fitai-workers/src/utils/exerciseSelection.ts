/**
 * FitAI Workers - Exercise Selection & Distribution System
 *
 * Deterministic exercise selection based on:
 * - Safety-filtered exercise pool
 * - Workout split requirements (muscle groups, body parts)
 * - Exercise classification (compound/auxiliary/isolation)
 * - Experience-based distribution ratios
 * - Weekly rotation system (4-week mesocycle)
 * - Balanced muscle group coverage
 *
 * FLOW:
 * 1. Receive safe exercises from safetyFilter
 * 2. Filter by split requirements (body parts, muscle groups)
 * 3. Classify exercises (compound/auxiliary/isolation)
 * 4. Apply experience-based distribution
 * 5. Rotate exercises weekly for variety
 * 6. Ensure balanced coverage across week
 */

import type { Exercise } from './exerciseDatabase';
import type { ExerciseWithMetadata } from './safetyFilter';
import type { WorkoutDay, WorkoutSplit } from './workoutSplits';
import type { UserProfile } from './validation';

// ============================================================================
// TYPES
// ============================================================================

export type ExerciseClassification = 'compound' | 'auxiliary' | 'isolation' | 'cardio';

export interface ClassifiedExercise extends ExerciseWithMetadata {
  classification: ExerciseClassification;
  complexityScore: number; // 1-10, higher = more complex
}

export interface ExerciseDistribution {
  compound: number;
  auxiliary: number;
  isolation: number;
  cardio?: number;
}

export interface WorkoutDayExercises {
  dayName: string;
  workoutType: string;
  exercises: ClassifiedExercise[];
  totalExercises: number;
  distribution: ExerciseDistribution;
}

export interface WeeklyExercisePlan {
  weekNumber: number; // 1-4 (mesocycle rotation)
  workouts: WorkoutDayExercises[];
  totalExercisesPerWeek: number;
}

// ============================================================================
// EXERCISE CLASSIFICATION RULES
// ============================================================================

/**
 * Classify exercise as compound, auxiliary, isolation, or cardio
 *
 * COMPOUND: Multi-joint, 3+ muscle groups, high complexity
 * Examples: Squat, deadlift, bench press, pull-up, row
 *
 * AUXILIARY: Multi-joint, 2 muscle groups, moderate complexity
 * Examples: Dumbbell press, cable row, leg press, lunges
 *
 * ISOLATION: Single-joint, 1 muscle group, low complexity
 * Examples: Bicep curl, tricep extension, lateral raise, leg curl
 *
 * CARDIO: Cardiovascular focus
 * Examples: Treadmill, rowing machine, jump rope, battle ropes
 */
export function classifyExercise(exercise: ExerciseWithMetadata): ClassifiedExercise {
  const nameLower = exercise.name.toLowerCase();
  const equipments = exercise.equipments.map(e => e.toLowerCase());
  const targetMuscles = exercise.targetMuscles.map(m => m.toLowerCase());
  const bodyParts = exercise.bodyParts.map(bp => bp.toLowerCase());
  const secondaryMuscles = exercise.secondaryMuscles.map(m => m.toLowerCase());

  // Total muscle groups involved (primary + secondary)
  const totalMuscles = new Set([...targetMuscles, ...secondaryMuscles]).size;

  let classification: ExerciseClassification = 'isolation';
  let complexityScore = 1;

  // ============================================================================
  // CARDIO CLASSIFICATION (check first)
  // ============================================================================
  if (
    bodyParts.includes('cardio') ||
    targetMuscles.includes('cardiovascular system') ||
    nameLower.includes('treadmill') ||
    nameLower.includes('rowing machine') ||
    nameLower.includes('elliptical') ||
    nameLower.includes('stationary bike') ||
    nameLower.includes('jump rope') ||
    nameLower.includes('battle rope') ||
    nameLower.includes('burpee') ||
    nameLower.includes('mountain climber')
  ) {
    classification = 'cardio';
    complexityScore = exercise.metadata?.isHighImpact ? 7 : 4;
    return { ...exercise, classification, complexityScore };
  }

  // ============================================================================
  // COMPOUND CLASSIFICATION (multi-joint, 3+ muscles, high complexity)
  // ============================================================================

  // Major compound patterns (always compound)
  const compoundPatterns = [
    // Squat variations
    'squat', 'front squat', 'back squat', 'overhead squat',

    // Deadlift variations
    'deadlift', 'romanian deadlift', 'sumo deadlift', 'trap bar deadlift',

    // Pressing movements (barbell)
    'bench press', 'overhead press', 'shoulder press', 'military press',
    'incline press', 'decline press',

    // Pulling movements (barbell/heavy)
    'bent over row', 'pendlay row', 't-bar row', 'barbell row',

    // Olympic lifts
    'clean', 'snatch', 'jerk', 'power clean',

    // Bodyweight compounds
    'pull up', 'pull-up', 'chin up', 'chin-up', 'dip', 'muscle up',

    // Leg compound
    'leg press', 'hack squat', 'lunge',
  ];

  const isCompoundPattern = compoundPatterns.some(pattern => nameLower.includes(pattern));

  if (isCompoundPattern && totalMuscles >= 3) {
    classification = 'compound';

    // Complexity scoring for compounds
    if (nameLower.includes('olympic') || nameLower.includes('clean') || nameLower.includes('snatch')) {
      complexityScore = 10; // Olympic lifts = highest complexity
    } else if (nameLower.includes('deadlift') || nameLower.includes('squat')) {
      complexityScore = 9; // Big 3 = very high complexity
    } else if (equipments.includes('barbell') || equipments.includes('olympic barbell')) {
      complexityScore = 8; // Barbell compounds = high complexity
    } else if (nameLower.includes('pull up') || nameLower.includes('dip')) {
      complexityScore = 7; // Advanced bodyweight = high complexity
    } else {
      complexityScore = 7; // Other compounds
    }

    return { ...exercise, classification, complexityScore };
  }

  // ============================================================================
  // AUXILIARY CLASSIFICATION (multi-joint, 2 muscles, moderate complexity)
  // ============================================================================

  const auxiliaryPatterns = [
    // Dumbbell pressing
    'dumbbell press', 'dumbbell bench', 'dumbbell shoulder',

    // Cable/machine rows
    'cable row', 'seated row', 'cable pull', 'lat pulldown',

    // Dumbbell rows
    'dumbbell row',

    // Step-ups and lunges
    'step up', 'step-up', 'walking lunge', 'reverse lunge',

    // Cable pressing
    'cable press', 'cable fly',

    // Machine presses
    'lever press', 'machine press', 'smith',

    // Incline/decline variations (dumbbells)
    'incline dumbbell', 'decline dumbbell',

    // RDL variations
    'romanian', 'rdl',

    // Hip thrusts
    'hip thrust', 'glute bridge',
  ];

  const isAuxiliaryPattern = auxiliaryPatterns.some(pattern => nameLower.includes(pattern));

  if ((isAuxiliaryPattern || totalMuscles >= 2) && !isCompoundPattern) {
    classification = 'auxiliary';

    // Complexity scoring for auxiliary
    if (equipments.includes('barbell')) {
      complexityScore = 6; // Barbell auxiliary
    } else if (equipments.includes('dumbbell')) {
      complexityScore = 5; // Dumbbell auxiliary
    } else if (equipments.includes('cable') || equipments.includes('machine')) {
      complexityScore = 4; // Machine/cable auxiliary
    } else {
      complexityScore = 5; // Default auxiliary
    }

    return { ...exercise, classification, complexityScore };
  }

  // ============================================================================
  // ISOLATION CLASSIFICATION (single-joint, 1 muscle, low complexity)
  // ============================================================================

  const isolationPatterns = [
    // Biceps
    'curl', 'bicep',

    // Triceps
    'tricep extension', 'tricep pushdown', 'kickback', 'skullcrusher',

    // Shoulders
    'lateral raise', 'front raise', 'rear delt fly', 'face pull',

    // Legs
    'leg extension', 'leg curl', 'calf raise', 'hamstring curl',

    // Chest
    'pec deck', 'cable fly', 'dumbbell fly',

    // Back
    'pullover', 'shrug',

    // Core
    'crunch', 'sit up', 'russian twist', 'leg raise',
  ];

  const isIsolationPattern = isolationPatterns.some(pattern => nameLower.includes(pattern));

  if (isIsolationPattern || totalMuscles === 1) {
    classification = 'isolation';

    // Complexity scoring for isolation
    if (equipments.includes('cable') || equipments.includes('machine')) {
      complexityScore = 2; // Machine isolation = easiest
    } else if (equipments.includes('dumbbell')) {
      complexityScore = 3; // Dumbbell isolation
    } else if (equipments.includes('body weight')) {
      complexityScore = 4; // Bodyweight isolation (harder balance)
    } else {
      complexityScore = 3; // Default isolation
    }

    return { ...exercise, classification, complexityScore };
  }

  // ============================================================================
  // DEFAULT: Use muscle count heuristic
  // ============================================================================

  if (totalMuscles >= 3) {
    classification = 'compound';
    complexityScore = 7;
  } else if (totalMuscles === 2) {
    classification = 'auxiliary';
    complexityScore = 5;
  } else {
    classification = 'isolation';
    complexityScore = 3;
  }

  return { ...exercise, classification, complexityScore };
}

// ============================================================================
// EXPERIENCE-BASED DISTRIBUTION RATIOS
// ============================================================================

/**
 * Get exercise distribution based on experience level and workout focus
 */
export function getExerciseDistribution(
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  compoundFocus: boolean,
  totalExercises: number
): ExerciseDistribution {

  // Beginner: Focus on learning compounds, fewer exercises
  if (experienceLevel === 'beginner') {
    if (compoundFocus) {
      return {
        compound: Math.min(3, Math.ceil(totalExercises * 0.5)), // 2-3 compounds
        auxiliary: Math.min(3, Math.ceil(totalExercises * 0.3)), // 2-3 auxiliary
        isolation: Math.max(1, Math.floor(totalExercises * 0.2)), // 1-2 isolation
      };
    } else {
      return {
        compound: Math.min(2, Math.ceil(totalExercises * 0.3)),
        auxiliary: Math.min(3, Math.ceil(totalExercises * 0.4)),
        isolation: Math.max(2, Math.floor(totalExercises * 0.3)),
      };
    }
  }

  // Intermediate: Balanced approach, more volume
  if (experienceLevel === 'intermediate') {
    if (compoundFocus) {
      return {
        compound: Math.min(4, Math.ceil(totalExercises * 0.5)), // 3-4 compounds
        auxiliary: Math.min(3, Math.ceil(totalExercises * 0.3)), // 2-3 auxiliary
        isolation: Math.max(2, Math.floor(totalExercises * 0.2)), // 2-3 isolation
      };
    } else {
      return {
        compound: Math.min(3, Math.ceil(totalExercises * 0.35)),
        auxiliary: Math.min(3, Math.ceil(totalExercises * 0.35)),
        isolation: Math.max(2, Math.floor(totalExercises * 0.3)),
      };
    }
  }

  // Advanced: High volume, more isolation for detail work
  if (experienceLevel === 'advanced') {
    if (compoundFocus) {
      return {
        compound: Math.min(5, Math.ceil(totalExercises * 0.5)), // 3-5 compounds
        auxiliary: Math.min(4, Math.ceil(totalExercises * 0.3)), // 2-4 auxiliary
        isolation: Math.max(2, Math.floor(totalExercises * 0.2)), // 2-4 isolation
      };
    } else {
      return {
        compound: Math.min(4, Math.ceil(totalExercises * 0.4)),
        auxiliary: Math.min(4, Math.ceil(totalExercises * 0.35)),
        isolation: Math.max(3, Math.floor(totalExercises * 0.25)),
      };
    }
  }

  // Fallback (should never reach)
  return {
    compound: 3,
    auxiliary: 2,
    isolation: 2,
  };
}

// ============================================================================
// EXERCISE SELECTION FOR WORKOUT DAY
// ============================================================================

/**
 * Select exercises for a single workout day
 *
 * Process:
 * 1. Filter exercises by body parts and muscle groups
 * 2. Classify filtered exercises
 * 3. Apply distribution ratios
 * 4. Select exercises with variety (different equipment, different complexity)
 * 5. Apply weekly rotation offset
 */
export function selectExercisesForDay(
  safeExercises: ExerciseWithMetadata[],
  workoutDay: WorkoutDay,
  profile: UserProfile,
  totalExercisesTarget: number,
  weekNumber: number = 1
): WorkoutDayExercises {

  // 1. FILTER BY BODY PARTS AND MUSCLE GROUPS
  const targetBodyParts = new Set(workoutDay.focusAreas.map(bp => bp.toLowerCase()));
  const targetMuscles = new Set(workoutDay.muscleGroups.map(mg => mg.toLowerCase()));

  const relevantExercises = safeExercises.filter(ex => {
    // Check if exercise targets any of the required body parts
    const hasBodyPart = ex.bodyParts.some(bp => targetBodyParts.has(bp.toLowerCase()));

    // Check if exercise targets any of the required muscles
    const hasMuscle =
      ex.targetMuscles.some(m => targetMuscles.has(m.toLowerCase())) ||
      ex.secondaryMuscles.some(m => targetMuscles.has(m.toLowerCase()));

    return hasBodyPart || hasMuscle;
  });

  console.log(`[Exercise Selection] Day: ${workoutDay.dayName}, Relevant: ${relevantExercises.length}/${safeExercises.length}`);

  // 2. CLASSIFY ALL RELEVANT EXERCISES
  const classifiedExercises = relevantExercises.map(ex => classifyExercise(ex));

  // Group by classification
  const compounds = classifiedExercises.filter(ex => ex.classification === 'compound');
  const auxiliaries = classifiedExercises.filter(ex => ex.classification === 'auxiliary');
  const isolations = classifiedExercises.filter(ex => ex.classification === 'isolation');
  const cardio = classifiedExercises.filter(ex => ex.classification === 'cardio');

  console.log(`[Exercise Selection] Classified: C=${compounds.length}, A=${auxiliaries.length}, I=${isolations.length}`);

  // 3. GET DISTRIBUTION RATIOS
  const distribution = getExerciseDistribution(
    profile.experienceLevel,
    workoutDay.compoundFocus,
    totalExercisesTarget
  );

  console.log(`[Exercise Selection] Distribution:`, distribution);

  // 4. SELECT EXERCISES WITH VARIETY
  const selectedExercises: ClassifiedExercise[] = [];

  // Apply weekly rotation offset (0-3 for 4-week mesocycle)
  const rotationOffset = (weekNumber - 1) % 4;

  // Select compounds
  const selectedCompounds = selectWithVariety(
    compounds,
    distribution.compound,
    rotationOffset,
    profile.availableEquipment
  );
  selectedExercises.push(...selectedCompounds);

  // Select auxiliaries
  const selectedAuxiliaries = selectWithVariety(
    auxiliaries,
    distribution.auxiliary,
    rotationOffset,
    profile.availableEquipment
  );
  selectedExercises.push(...selectedAuxiliaries);

  // Select isolations
  const selectedIsolations = selectWithVariety(
    isolations,
    distribution.isolation,
    rotationOffset,
    profile.availableEquipment
  );
  selectedExercises.push(...selectedIsolations);

  // If not enough exercises, try to add more from other categories
  if (selectedExercises.length < totalExercisesTarget) {
    const remaining = totalExercisesTarget - selectedExercises.length;

    // Prioritize adding auxiliaries first
    if (auxiliaries.length > selectedAuxiliaries.length) {
      const moreAuxiliaries = selectWithVariety(
        auxiliaries,
        selectedAuxiliaries.length + remaining,
        rotationOffset,
        profile.availableEquipment
      ).slice(selectedAuxiliaries.length);

      selectedExercises.push(...moreAuxiliaries);
    }
  }

  console.log(`[Exercise Selection] Selected: ${selectedExercises.length} exercises`);

  return {
    dayName: workoutDay.dayName,
    workoutType: workoutDay.workoutType,
    exercises: selectedExercises,
    totalExercises: selectedExercises.length,
    distribution: {
      compound: selectedCompounds.length,
      auxiliary: selectedAuxiliaries.length,
      isolation: selectedIsolations.length,
    },
  };
}

// ============================================================================
// VARIETY SELECTION HELPERS
// ============================================================================

/**
 * Select exercises with variety (different equipment, different muscles)
 * Apply weekly rotation for variety
 */
function selectWithVariety(
  pool: ClassifiedExercise[],
  count: number,
  rotationOffset: number,
  userEquipment: string[]
): ClassifiedExercise[] {
  if (pool.length === 0) return [];
  if (count <= 0) return [];

  // Rotate pool based on week number
  const rotatedPool = [...pool];
  for (let i = 0; i < rotationOffset; i++) {
    const first = rotatedPool.shift();
    if (first) rotatedPool.push(first);
  }

  // Score exercises for variety
  const scoredExercises = rotatedPool.map((ex, index) => {
    let varietyScore = 0;

    // Prefer exercises with user's available equipment
    const hasPreferredEquipment = ex.equipments.some(eq =>
      userEquipment.map(e => e.toLowerCase()).includes(eq.toLowerCase())
    );
    if (hasPreferredEquipment) varietyScore += 10;

    // Prefer higher complexity (more challenging exercises first)
    varietyScore += ex.complexityScore;

    // Add some randomness based on position (for rotation effect)
    varietyScore += (index * 0.1);

    return { exercise: ex, score: varietyScore };
  });

  // Sort by variety score
  scoredExercises.sort((a, b) => b.score - a.score);

  // Select top N with variety (avoid duplicate muscle groups)
  const selected: ClassifiedExercise[] = [];
  const usedMuscles = new Set<string>();
  const usedEquipment = new Set<string>();

  for (const { exercise } of scoredExercises) {
    if (selected.length >= count) break;

    // Check if this adds muscle variety
    const primaryMuscle = exercise.targetMuscles[0]?.toLowerCase();
    const equipment = exercise.equipments[0]?.toLowerCase();

    // Allow if:
    // - First exercise, OR
    // - Different primary muscle, OR
    // - Different equipment with same muscle
    const addsMuscleVariety = !usedMuscles.has(primaryMuscle);
    const addsEquipmentVariety = !usedEquipment.has(equipment);

    if (selected.length === 0 || addsMuscleVariety || addsEquipmentVariety) {
      selected.push(exercise);
      if (primaryMuscle) usedMuscles.add(primaryMuscle);
      if (equipment) usedEquipment.add(equipment);
    }
  }

  // If still not enough, just add remaining from top of list
  if (selected.length < count) {
    for (const { exercise } of scoredExercises) {
      if (selected.length >= count) break;
      if (!selected.includes(exercise)) {
        selected.push(exercise);
      }
    }
  }

  return selected.slice(0, count);
}

// ============================================================================
// WEEKLY PLAN GENERATION
// ============================================================================

/**
 * Generate complete weekly exercise plan for all workout days
 */
export function generateWeeklyExercisePlan(
  safeExercises: ExerciseWithMetadata[],
  split: WorkoutSplit,
  profile: UserProfile,
  weekNumber: number = 1
): WeeklyExercisePlan {

  // Determine exercises per workout based on time and experience
  const exercisesPerWorkout = calculateExercisesPerWorkout(
    profile.workoutDuration || 45,
    profile.experienceLevel,
    split.daysPerWeek
  );

  console.log(`[Weekly Plan] Generating week ${weekNumber}, ${exercisesPerWorkout} exercises/workout`);

  // Generate exercises for each workout day
  const workouts: WorkoutDayExercises[] = split.workoutDays.map((day, index) => {
    return selectExercisesForDay(
      safeExercises,
      day,
      profile,
      exercisesPerWorkout,
      weekNumber
    );
  });

  const totalExercisesPerWeek = workouts.reduce((sum, w) => sum + w.totalExercises, 0);

  return {
    weekNumber,
    workouts,
    totalExercisesPerWeek,
  };
}

/**
 * Calculate number of exercises per workout based on time and experience
 */
function calculateExercisesPerWorkout(
  durationMinutes: number,
  experienceLevel: 'beginner' | 'intermediate' | 'advanced',
  daysPerWeek: number
): number {
  // Time per exercise estimates (including sets, reps, rest)
  const timePerExercise = {
    beginner: 8, // 3 sets x 12 reps, 90s rest = ~8 min
    intermediate: 7, // 3-4 sets x 10 reps, 90s rest = ~7 min
    advanced: 6, // 4-5 sets x 8 reps, 120s rest = ~6 min
  };

  // Reserve time for warm-up and cool-down
  const warmupCooldown = 10; // 5 min warm-up + 5 min cool-down
  const workoutTime = Math.max(15, durationMinutes - warmupCooldown);

  // Calculate exercises that fit
  const avgTimePerExercise = timePerExercise[experienceLevel];
  let exerciseCount = Math.floor(workoutTime / avgTimePerExercise);

  // Experience-based bounds
  const bounds = {
    beginner: { min: 5, max: 8 },
    intermediate: { min: 6, max: 10 },
    advanced: { min: 7, max: 12 },
  };

  exerciseCount = Math.max(bounds[experienceLevel].min, Math.min(bounds[experienceLevel].max, exerciseCount));

  // Adjust for frequency (more days = fewer exercises per day)
  if (daysPerWeek >= 5) {
    exerciseCount = Math.max(bounds[experienceLevel].min, exerciseCount - 1);
  }

  return exerciseCount;
}

// ============================================================================
// MUSCLE GROUP BALANCE VALIDATION
// ============================================================================

/**
 * Validate that weekly plan has balanced muscle group coverage
 * Returns warnings if any major muscle group is undertrained
 */
export function validateMuscleBalance(weeklyPlan: WeeklyExercisePlan): string[] {
  const warnings: string[] = [];

  // Count hits per muscle group across entire week
  const muscleHits = new Map<string, number>();

  for (const workout of weeklyPlan.workouts) {
    for (const exercise of workout.exercises) {
      for (const muscle of [...exercise.targetMuscles, ...exercise.secondaryMuscles]) {
        const muscleLower = muscle.toLowerCase();
        muscleHits.set(muscleLower, (muscleHits.get(muscleLower) || 0) + 1);
      }
    }
  }

  // Major muscle groups that should be hit at least 2x per week
  const majorMuscles = ['pecs', 'lats', 'quads', 'hamstrings', 'delts'];

  for (const muscle of majorMuscles) {
    const hits = muscleHits.get(muscle) || 0;
    if (hits < 2) {
      warnings.push(`${muscle} only trained ${hits}x this week (recommend 2x minimum)`);
    }
  }

  return warnings;
}
