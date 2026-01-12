/**
 * FitAI Workers - Workout Split Selection System
 *
 * Deterministic split selection based on user profile
 * Scoring algorithm: Frequency match (30pts) + Goal alignment (20pts) +
 * Equipment (15pts) + Experience (15pts) + Recovery (10pts) + Variety (10pts)
 *
 * 6 Standard Splits:
 * 1. Full Body (3x/week) - Beginners, limited time
 * 2. Upper/Lower (4x/week) - Balanced, intermediate
 * 3. Push/Pull/Legs (3x or 6x/week) - Popular, versatile
 * 4. Bro Split (5-6x/week) - Bodybuilding focus
 * 5. HIIT/Circuit (3-4x/week) - Weight loss, endurance
 * 6. Active Recovery (2x/week) - Stress management, seniors
 */

import type { UserProfile } from './validation';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkoutSplit {
  id: string;
  name: string;
  description: string;
  idealFrequency: number[]; // [min, max] days per week
  daysPerWeek: number;
  workoutDays: WorkoutDay[];
  restDays: string[];

  // Target profiles
  experienceLevels: ('beginner' | 'intermediate' | 'advanced')[];
  fitnessGoals: string[];
  minimumEquipment: string[];

  // Characteristics
  volumePerMuscle: 'low' | 'moderate' | 'high';
  recoveryDemand: 'low' | 'moderate' | 'high';
  timePerSession: number; // minutes
}

export interface WorkoutDay {
  dayName: string; // "Day 1", "Day 2", etc.
  suggestedDayOfWeek?: string; // "monday", "wednesday", etc.
  focusAreas: string[]; // Body parts
  workoutType: string; // "Full Body", "Upper Body", "Push", etc.
  muscleGroups: string[]; // Specific muscles to target
  compoundFocus: boolean; // True if day prioritizes compound lifts
}

export interface SplitSelectionResult {
  selectedSplit: WorkoutSplit;
  score: number;
  reasoning: string[];
  alternatives: Array<{
    split: WorkoutSplit;
    score: number;
  }>;
}

// ============================================================================
// SPLIT DEFINITIONS
// ============================================================================

/**
 * 1. FULL BODY SPLIT (3x/week)
 * Best for: Beginners, busy schedules, home workouts
 */
const FULL_BODY_SPLIT: WorkoutSplit = {
  id: 'full_body_3x',
  name: 'Full Body 3x/Week',
  description: 'Train all major muscle groups 3 times per week. Ideal for beginners and those with limited time. Maximum efficiency and recovery.',
  idealFrequency: [3, 3],
  daysPerWeek: 3,
  workoutDays: [
    {
      dayName: 'Day 1',
      suggestedDayOfWeek: 'monday',
      focusAreas: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'],
      workoutType: 'Full Body A',
      muscleGroups: ['pecs', 'lats', 'quads', 'hamstrings', 'delts', 'biceps', 'triceps', 'abs'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 2',
      suggestedDayOfWeek: 'wednesday',
      focusAreas: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'],
      workoutType: 'Full Body B',
      muscleGroups: ['pecs', 'lats', 'quads', 'hamstrings', 'delts', 'biceps', 'triceps', 'abs'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 3',
      suggestedDayOfWeek: 'friday',
      focusAreas: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'],
      workoutType: 'Full Body C',
      muscleGroups: ['pecs', 'lats', 'quads', 'hamstrings', 'delts', 'biceps', 'triceps', 'abs'],
      compoundFocus: true,
    },
  ],
  restDays: ['tuesday', 'thursday', 'saturday', 'sunday'],
  experienceLevels: ['beginner', 'intermediate'],
  fitnessGoals: ['general_fitness', 'strength', 'muscle_gain', 'weight_loss'],
  minimumEquipment: ['body weight', 'dumbbell'],
  volumePerMuscle: 'moderate',
  recoveryDemand: 'low',
  timePerSession: 45,
};

/**
 * 2. UPPER/LOWER SPLIT (4x/week)
 * Best for: Intermediate lifters, balanced development
 */
const UPPER_LOWER_SPLIT: WorkoutSplit = {
  id: 'upper_lower_4x',
  name: 'Upper/Lower 4x/Week',
  description: 'Alternate between upper and lower body days. Great balance of volume, frequency, and recovery. Suitable for most intermediate lifters.',
  idealFrequency: [4, 4],
  daysPerWeek: 4,
  workoutDays: [
    {
      dayName: 'Day 1',
      suggestedDayOfWeek: 'monday',
      focusAreas: ['chest', 'back', 'shoulders', 'arms'],
      workoutType: 'Upper Body A',
      muscleGroups: ['pecs', 'lats', 'delts', 'biceps', 'triceps', 'traps'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 2',
      suggestedDayOfWeek: 'tuesday',
      focusAreas: ['legs', 'core'],
      workoutType: 'Lower Body A',
      muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 3',
      suggestedDayOfWeek: 'thursday',
      focusAreas: ['chest', 'back', 'shoulders', 'arms'],
      workoutType: 'Upper Body B',
      muscleGroups: ['pecs', 'lats', 'delts', 'biceps', 'triceps', 'traps'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 4',
      suggestedDayOfWeek: 'friday',
      focusAreas: ['legs', 'core'],
      workoutType: 'Lower Body B',
      muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
      compoundFocus: true,
    },
  ],
  restDays: ['wednesday', 'saturday', 'sunday'],
  experienceLevels: ['intermediate', 'advanced'],
  fitnessGoals: ['muscle_gain', 'strength', 'athletic_performance'],
  minimumEquipment: ['dumbbell', 'barbell'],
  volumePerMuscle: 'moderate',
  recoveryDemand: 'moderate',
  timePerSession: 50,
};

/**
 * 3A. PUSH/PULL/LEGS (3x/week)
 * Best for: Beginners to intermediate, 3-day schedule
 */
const PPL_3X_SPLIT: WorkoutSplit = {
  id: 'ppl_3x',
  name: 'Push/Pull/Legs 3x/Week',
  description: 'Classic PPL split. Push day (chest, shoulders, triceps), Pull day (back, biceps), Legs day (quads, hamstrings, glutes). Once per week frequency.',
  idealFrequency: [3, 3],
  daysPerWeek: 3,
  workoutDays: [
    {
      dayName: 'Day 1',
      suggestedDayOfWeek: 'monday',
      focusAreas: ['chest', 'shoulders', 'arms'],
      workoutType: 'Push',
      muscleGroups: ['pecs', 'delts', 'triceps'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 2',
      suggestedDayOfWeek: 'wednesday',
      focusAreas: ['back', 'arms'],
      workoutType: 'Pull',
      muscleGroups: ['lats', 'traps', 'biceps', 'forearms'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 3',
      suggestedDayOfWeek: 'friday',
      focusAreas: ['legs', 'core'],
      workoutType: 'Legs',
      muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
      compoundFocus: true,
    },
  ],
  restDays: ['tuesday', 'thursday', 'saturday', 'sunday'],
  experienceLevels: ['beginner', 'intermediate', 'advanced'],
  fitnessGoals: ['muscle_gain', 'strength', 'general_fitness'],
  minimumEquipment: ['dumbbell', 'barbell'],
  volumePerMuscle: 'moderate',
  recoveryDemand: 'moderate',
  timePerSession: 50,
};

/**
 * 3B. PUSH/PULL/LEGS (6x/week)
 * Best for: Advanced lifters, bodybuilding focus
 */
const PPL_6X_SPLIT: WorkoutSplit = {
  id: 'ppl_6x',
  name: 'Push/Pull/Legs 6x/Week',
  description: 'High-frequency PPL. Train each muscle group twice per week. For advanced lifters with good recovery capacity. Maximum muscle growth potential.',
  idealFrequency: [6, 6],
  daysPerWeek: 6,
  workoutDays: [
    {
      dayName: 'Day 1',
      suggestedDayOfWeek: 'monday',
      focusAreas: ['chest', 'shoulders', 'arms'],
      workoutType: 'Push A',
      muscleGroups: ['pecs', 'delts', 'triceps'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 2',
      suggestedDayOfWeek: 'tuesday',
      focusAreas: ['back', 'arms'],
      workoutType: 'Pull A',
      muscleGroups: ['lats', 'traps', 'biceps', 'forearms'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 3',
      suggestedDayOfWeek: 'wednesday',
      focusAreas: ['legs', 'core'],
      workoutType: 'Legs A',
      muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 4',
      suggestedDayOfWeek: 'thursday',
      focusAreas: ['chest', 'shoulders', 'arms'],
      workoutType: 'Push B',
      muscleGroups: ['pecs', 'delts', 'triceps'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 5',
      suggestedDayOfWeek: 'friday',
      focusAreas: ['back', 'arms'],
      workoutType: 'Pull B',
      muscleGroups: ['lats', 'traps', 'biceps', 'forearms'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 6',
      suggestedDayOfWeek: 'saturday',
      focusAreas: ['legs', 'core'],
      workoutType: 'Legs B',
      muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves', 'abs'],
      compoundFocus: true,
    },
  ],
  restDays: ['sunday'],
  experienceLevels: ['advanced'],
  fitnessGoals: ['muscle_gain', 'athletic_performance'],
  minimumEquipment: ['dumbbell', 'barbell'],
  volumePerMuscle: 'high',
  recoveryDemand: 'high',
  timePerSession: 60,
};

/**
 * 4. BRO SPLIT (5x/week)
 * Best for: Bodybuilding, muscle isolation focus
 */
const BRO_SPLIT: WorkoutSplit = {
  id: 'bro_split_5x',
  name: 'Bro Split 5x/Week',
  description: 'Classic bodybuilding split. One major muscle group per day. High volume per muscle, long recovery between sessions. Focus on isolation and pump.',
  idealFrequency: [5, 6],
  daysPerWeek: 5,
  workoutDays: [
    {
      dayName: 'Day 1',
      suggestedDayOfWeek: 'monday',
      focusAreas: ['chest'],
      workoutType: 'Chest',
      muscleGroups: ['pecs'],
      compoundFocus: false,
    },
    {
      dayName: 'Day 2',
      suggestedDayOfWeek: 'tuesday',
      focusAreas: ['back'],
      workoutType: 'Back',
      muscleGroups: ['lats', 'traps'],
      compoundFocus: false,
    },
    {
      dayName: 'Day 3',
      suggestedDayOfWeek: 'wednesday',
      focusAreas: ['shoulders'],
      workoutType: 'Shoulders',
      muscleGroups: ['delts', 'traps'],
      compoundFocus: false,
    },
    {
      dayName: 'Day 4',
      suggestedDayOfWeek: 'thursday',
      focusAreas: ['legs'],
      workoutType: 'Legs',
      muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 5',
      suggestedDayOfWeek: 'friday',
      focusAreas: ['arms', 'core'],
      workoutType: 'Arms & Abs',
      muscleGroups: ['biceps', 'triceps', 'forearms', 'abs'],
      compoundFocus: false,
    },
  ],
  restDays: ['saturday', 'sunday'],
  experienceLevels: ['intermediate', 'advanced'],
  fitnessGoals: ['muscle_gain'],
  minimumEquipment: ['dumbbell', 'barbell', 'cable'],
  volumePerMuscle: 'high',
  recoveryDemand: 'moderate',
  timePerSession: 60,
};

/**
 * 5. HIIT/CIRCUIT SPLIT (3-4x/week)
 * Best for: Weight loss, endurance, conditioning
 */
const HIIT_CIRCUIT_SPLIT: WorkoutSplit = {
  id: 'hiit_circuit_4x',
  name: 'HIIT/Circuit 4x/Week',
  description: 'High-intensity interval training and circuit workouts. Combines strength and cardio. Maximum calorie burn, improved conditioning. Short, intense sessions.',
  idealFrequency: [3, 4],
  daysPerWeek: 4,
  workoutDays: [
    {
      dayName: 'Day 1',
      suggestedDayOfWeek: 'monday',
      focusAreas: ['chest', 'back', 'legs', 'cardio'],
      workoutType: 'Full Body HIIT',
      muscleGroups: ['pecs', 'lats', 'quads', 'hamstrings', 'cardiovascular system'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 2',
      suggestedDayOfWeek: 'tuesday',
      focusAreas: ['legs', 'core', 'cardio'],
      workoutType: 'Lower Body Circuit',
      muscleGroups: ['quads', 'hamstrings', 'glutes', 'abs', 'cardiovascular system'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 3',
      suggestedDayOfWeek: 'thursday',
      focusAreas: ['chest', 'shoulders', 'arms', 'cardio'],
      workoutType: 'Upper Body Circuit',
      muscleGroups: ['pecs', 'delts', 'biceps', 'triceps', 'cardiovascular system'],
      compoundFocus: true,
    },
    {
      dayName: 'Day 4',
      suggestedDayOfWeek: 'saturday',
      focusAreas: ['chest', 'back', 'legs', 'cardio'],
      workoutType: 'Full Body Metabolic',
      muscleGroups: ['pecs', 'lats', 'quads', 'hamstrings', 'cardiovascular system'],
      compoundFocus: true,
    },
  ],
  restDays: ['wednesday', 'friday', 'sunday'],
  experienceLevels: ['intermediate', 'advanced'],
  fitnessGoals: ['weight_loss', 'endurance', 'athletic_performance'],
  minimumEquipment: ['body weight', 'dumbbell'],
  volumePerMuscle: 'moderate',
  recoveryDemand: 'high',
  timePerSession: 35,
};

/**
 * 6. ACTIVE RECOVERY SPLIT (2x/week)
 * Best for: Stress management, seniors, beginners, recovery-focused
 */
const ACTIVE_RECOVERY_SPLIT: WorkoutSplit = {
  id: 'active_recovery_2x',
  name: 'Active Recovery 2x/Week',
  description: 'Low-intensity, recovery-focused workouts. Mobility, flexibility, light resistance. Ideal for high stress, seniors, or those prioritizing recovery.',
  idealFrequency: [2, 3],
  daysPerWeek: 2,
  workoutDays: [
    {
      dayName: 'Day 1',
      suggestedDayOfWeek: 'monday',
      focusAreas: ['chest', 'back', 'legs', 'shoulders'],
      workoutType: 'Full Body Light',
      muscleGroups: ['pecs', 'lats', 'quads', 'hamstrings', 'delts'],
      compoundFocus: false,
    },
    {
      dayName: 'Day 2',
      suggestedDayOfWeek: 'thursday',
      focusAreas: ['legs', 'core', 'flexibility'],
      workoutType: 'Lower Body & Mobility',
      muscleGroups: ['quads', 'hamstrings', 'glutes', 'abs'],
      compoundFocus: false,
    },
  ],
  restDays: ['tuesday', 'wednesday', 'friday', 'saturday', 'sunday'],
  experienceLevels: ['beginner'],
  fitnessGoals: ['general_fitness', 'flexibility', 'maintenance'],
  minimumEquipment: ['body weight', 'band'],
  volumePerMuscle: 'low',
  recoveryDemand: 'low',
  timePerSession: 30,
};

/**
 * All available splits
 */
const ALL_SPLITS: WorkoutSplit[] = [
  FULL_BODY_SPLIT,
  UPPER_LOWER_SPLIT,
  PPL_3X_SPLIT,
  PPL_6X_SPLIT,
  BRO_SPLIT,
  HIIT_CIRCUIT_SPLIT,
  ACTIVE_RECOVERY_SPLIT,
];

// ============================================================================
// SPLIT SELECTION ALGORITHM
// ============================================================================

/**
 * Score a split based on user profile
 * Total: 100 points
 * - Frequency match: 30 points
 * - Goal alignment: 20 points
 * - Equipment availability: 15 points
 * - Experience level: 15 points
 * - Recovery capacity: 10 points
 * - Variety preference: 10 points
 */
function scoreSplit(split: WorkoutSplit, profile: UserProfile): { score: number; breakdown: string[] } {
  let score = 0;
  const breakdown: string[] = [];

  // 1. FREQUENCY MATCH (30 points)
  const userFrequency = profile.workoutsPerWeek;
  const [minFreq, maxFreq] = split.idealFrequency;

  if (userFrequency >= minFreq && userFrequency <= maxFreq) {
    score += 30;
    breakdown.push(`✓ Perfect frequency match (${userFrequency} days/week) [+30]`);
  } else {
    const frequencyDiff = Math.min(Math.abs(userFrequency - minFreq), Math.abs(userFrequency - maxFreq));
    const frequencyScore = Math.max(0, 30 - (frequencyDiff * 7));
    score += frequencyScore;
    breakdown.push(`≈ Frequency close (${userFrequency} vs ${minFreq}-${maxFreq} days) [+${frequencyScore}]`);
  }

  // 2. GOAL ALIGNMENT (20 points)
  const goalMatch = split.fitnessGoals.includes(profile.fitnessGoal);
  if (goalMatch) {
    score += 20;
    breakdown.push(`✓ Goal alignment (${profile.fitnessGoal}) [+20]`);
  } else {
    // Partial credit for compatible goals
    const compatibleGoals: Record<string, string[]> = {
      weight_loss: ['endurance', 'general_fitness'],
      muscle_gain: ['strength', 'athletic_performance'],
      strength: ['muscle_gain', 'athletic_performance'],
      endurance: ['weight_loss', 'athletic_performance'],
      flexibility: ['general_fitness', 'maintenance'],
      maintenance: ['general_fitness', 'flexibility'],
    };

    const userCompatibleGoals = compatibleGoals[profile.fitnessGoal] || [];
    const hasCompatible = split.fitnessGoals.some(g => userCompatibleGoals.includes(g));

    if (hasCompatible) {
      score += 10;
      breakdown.push(`≈ Compatible goal [+10]`);
    } else {
      breakdown.push(`✗ Goal mismatch [+0]`);
    }
  }

  // 3. EQUIPMENT AVAILABILITY (15 points)
  const userEquipment = new Set(profile.availableEquipment.map(e => e.toLowerCase()));
  const requiredEquipment = split.minimumEquipment.map(e => e.toLowerCase());

  const hasAllEquipment = requiredEquipment.every(eq => {
    // Special handling: barbell can substitute for dumbbell in most cases
    if (eq === 'dumbbell' && userEquipment.has('barbell')) return true;
    return userEquipment.has(eq);
  });

  if (hasAllEquipment) {
    score += 15;
    breakdown.push(`✓ All equipment available [+15]`);
  } else {
    const availableCount = requiredEquipment.filter(eq => userEquipment.has(eq)).length;
    const equipmentScore = Math.floor((availableCount / requiredEquipment.length) * 15);
    score += equipmentScore;
    breakdown.push(`≈ Partial equipment (${availableCount}/${requiredEquipment.length}) [+${equipmentScore}]`);
  }

  // 4. EXPERIENCE LEVEL (15 points)
  const experienceMatch = split.experienceLevels.includes(profile.experienceLevel);
  if (experienceMatch) {
    score += 15;
    breakdown.push(`✓ Experience match (${profile.experienceLevel}) [+15]`);
  } else {
    // Beginner can do intermediate splits with modifications
    if (profile.experienceLevel === 'beginner' && split.experienceLevels.includes('intermediate')) {
      score += 7;
      breakdown.push(`≈ Can adapt (beginner → intermediate) [+7]`);
    }
    // Intermediate can do beginner splits (suboptimal but safe)
    else if (profile.experienceLevel === 'intermediate' && split.experienceLevels.includes('beginner')) {
      score += 5;
      breakdown.push(`≈ Can adapt (intermediate → beginner) [+5]`);
    }
    // Advanced can do any split
    else if (profile.experienceLevel === 'advanced') {
      score += 10;
      breakdown.push(`≈ Advanced can adapt [+10]`);
    } else {
      breakdown.push(`✗ Experience mismatch [+0]`);
    }
  }

  // 5. RECOVERY CAPACITY (10 points)
  // High stress → prefer low recovery demand
  // Age 65+ → prefer low recovery demand
  // Active/extreme activity level → can handle high recovery demand

  const stressLevel = 'moderate'; // TODO: Add stress_level to UserProfile
  const age = profile.age;
  const activityLevel = 'moderate'; // TODO: Pass weeklyPlan.activityLevel separately

  let recoveryScore = 0;

  if (stressLevel === 'high' || age >= 65) {
    // Prefer low recovery demand
    if (split.recoveryDemand === 'low') {
      recoveryScore = 10;
      breakdown.push(`✓ Low recovery demand (stress: ${stressLevel}, age: ${age}) [+10]`);
    } else if (split.recoveryDemand === 'moderate') {
      recoveryScore = 5;
      breakdown.push(`≈ Moderate recovery demand [+5]`);
    } else {
      recoveryScore = 0;
      breakdown.push(`✗ High recovery demand [+0]`);
    }
  } else if (activityLevel === 'active' || activityLevel === 'extreme') {
    // Can handle high recovery demand
    if (split.recoveryDemand === 'high') {
      recoveryScore = 10;
      breakdown.push(`✓ High recovery demand matches activity level [+10]`);
    } else {
      recoveryScore = 7;
      breakdown.push(`≈ Lower recovery demand than capable [+7]`);
    }
  } else {
    // Moderate recovery capacity
    if (split.recoveryDemand === 'moderate') {
      recoveryScore = 10;
      breakdown.push(`✓ Moderate recovery demand [+10]`);
    } else {
      recoveryScore = 5;
      breakdown.push(`≈ Recovery demand mismatch [+5]`);
    }
  }

  score += recoveryScore;

  // 6. VARIETY PREFERENCE (10 points)
  const prefersVariety = false; // TODO: Pass weeklyPlan.prefersVariety separately

  if (prefersVariety) {
    // Prefer splits with more workout variations
    if (split.daysPerWeek >= 4) {
      score += 10;
      breakdown.push(`✓ High variety (${split.daysPerWeek} different workouts) [+10]`);
    } else if (split.daysPerWeek === 3) {
      score += 7;
      breakdown.push(`≈ Moderate variety [+7]`);
    } else {
      score += 3;
      breakdown.push(`≈ Lower variety [+3]`);
    }
  } else {
    // Prefer simpler splits
    if (split.daysPerWeek <= 3) {
      score += 10;
      breakdown.push(`✓ Simple structure [+10]`);
    } else {
      score += 5;
      breakdown.push(`≈ More complex structure [+5]`);
    }
  }

  return { score, breakdown };
}

/**
 * Select optimal workout split for user profile
 * Returns selected split + reasoning + top 3 alternatives
 */
export function selectOptimalSplit(profile: UserProfile): SplitSelectionResult {
  // Score all splits
  const scoredSplits = ALL_SPLITS.map(split => {
    const { score, breakdown } = scoreSplit(split, profile);
    return { split, score, breakdown };
  });

  // Sort by score (descending)
  scoredSplits.sort((a, b) => b.score - a.score);

  // Select top split
  const selected = scoredSplits[0];

  // Get top 3 alternatives
  const alternatives = scoredSplits.slice(1, 4).map(({ split, score }) => ({ split, score }));

  console.log('[Split Selection] Selected:', {
    split: selected.split.name,
    score: selected.score,
    userFrequency: profile.workoutsPerWeek,
    userGoal: profile.fitnessGoal,
    userExperience: profile.experienceLevel,
  });

  return {
    selectedSplit: selected.split,
    score: selected.score,
    reasoning: selected.breakdown,
    alternatives,
  };
}

/**
 * Get split by ID (for testing or override scenarios)
 */
export function getSplitById(splitId: string): WorkoutSplit | null {
  return ALL_SPLITS.find(s => s.id === splitId) || null;
}

/**
 * Get all available splits (for UI display)
 */
export function getAllSplits(): WorkoutSplit[] {
  return ALL_SPLITS;
}
