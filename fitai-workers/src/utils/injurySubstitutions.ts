/**
 * FitAI Workers — Injury-Based Exercise Substitution Map
 *
 * When a user has a physical limitation, the rule-based engine must NOT simply
 * remove exercises from the plan (leaving muscle groups untrained).
 * Instead, it SUBSTITUTES with a functionally equivalent, injury-safe alternative.
 *
 * SSOT: This file is the single source of truth for all substitution logic.
 *       Input: user's physical_limitations[] from body_analysis (onboarding).
 *       Output: safe replacement exercise IDs, same muscle group.
 *
 * RULES:
 *   1. Substitute must target the same primary muscle group as the excluded exercise.
 *   2. Substitute must respect the same equipment constraints as the original.
 *   3. If no substitute passes equipment check, add an extra set to an existing
 *      safe exercise for that muscle group (handled by caller).
 *   4. Never leave a muscle group completely untrained due to an injury exclusion.
 */

export interface SubstitutionRule {
  /** Matches values in physical_limitations[] from onboarding */
  limitation: string;
  /** Exercise ID substrings to exclude (partial match on exerciseId) */
  excludePatterns: string[];
  /** Ordered priority list of replacement exercise IDs */
  substituteWith: string[];
  /** Muscle group coverage label — for validation */
  muscleGroup: string;
}

export const SUBSTITUTION_RULES: SubstitutionRule[] = [
  {
    limitation: 'knee_pain',
    excludePatterns: [
      'squat', 'lunge', 'leg_press', 'step_up', 'box_jump', 'jump_squat',
      'wall_sit', 'split_squat', 'bulgarian',
    ],
    substituteWith: [
      'hip_thrust', 'romanian_deadlift', 'leg_curl', 'glute_bridge',
      'calf_raise', 'standing_hip_extension',
    ],
    muscleGroup: 'lower_body',
  },
  {
    limitation: 'lower_back_pain',
    excludePatterns: [
      'deadlift', 'good_morning', 'barbell_row', 'hyperextension',
      'jefferson_curl', 'bent_over_row',
    ],
    substituteWith: [
      'hip_thrust', 'cable_pull_through', 'bird_dog', 'glute_bridge',
      'lat_pulldown', 'seated_cable_row', 'chest_supported_row',
    ],
    muscleGroup: 'posterior_chain',
  },
  {
    limitation: 'shoulder_pain',
    excludePatterns: [
      'overhead_press', 'upright_row', 'behind_neck', 'military_press',
      'arnold_press', 'dip', 'incline_bench',
    ],
    substituteWith: [
      'lateral_raise', 'cable_fly', 'face_pull', 'reverse_fly',
      'seated_cable_row', 'band_pull_apart',
    ],
    muscleGroup: 'upper_body',
  },
  {
    limitation: 'wrist_pain',
    excludePatterns: [
      'barbell_bench', 'barbell_curl', 'front_squat', 'wrist_curl',
      'push_up', 'handstand', 'clean',
    ],
    substituteWith: [
      'dumbbell_bench_press', 'hammer_curl', 'goblet_squat',
      'cable_curl', 'neutral_grip_press', 'tricep_kickback',
    ],
    muscleGroup: 'upper_body',
  },
  {
    limitation: 'elbow_pain',
    excludePatterns: [
      'tricep_pushdown', 'skull_crusher', 'close_grip_bench',
      'preacher_curl', 'concentration_curl',
    ],
    substituteWith: [
      'overhead_tricep_cable', 'tricep_kickback', 'band_pushdown',
      'incline_dumbbell_curl', 'cable_curl',
    ],
    muscleGroup: 'arms',
  },
  {
    limitation: 'hip_pain',
    excludePatterns: [
      'hip_thrust', 'sumo_deadlift', 'wide_squat', 'abductor',
      'adductor', 'side_lunge',
    ],
    substituteWith: [
      'leg_extension', 'leg_curl', 'calf_raise',
      'standing_hip_extension', 'step_up',
    ],
    muscleGroup: 'lower_body',
  },
  {
    limitation: 'neck_pain',
    excludePatterns: [
      'behind_neck_press', 'behind_neck_pulldown', 'upright_row',
      'shrug', 'neck_curl',
    ],
    substituteWith: [
      'face_pull', 'lat_pulldown', 'seated_row',
      'overhead_press', 'lateral_raise',
    ],
    muscleGroup: 'upper_body',
  },
];

/**
 * Given a list of user limitations and available exercises,
 * determine if an exercise should be excluded.
 */
export function shouldExcludeExercise(
  exerciseId: string,
  limitations: string[],
): boolean {
  if (!limitations || limitations.length === 0) return false;
  const id = exerciseId.toLowerCase();
  for (const rule of SUBSTITUTION_RULES) {
    if (!limitations.includes(rule.limitation)) continue;
    if (rule.excludePatterns.some((pattern) => id.includes(pattern))) {
      return true;
    }
  }
  return false;
}

/**
 * Find the best available substitute for an excluded exercise.
 *
 * @param excludedExerciseId  - The exercise being replaced
 * @param limitations         - User's physical_limitations[]
 * @param availableExerciseIds - Pool of exercises allowed by equipment filter
 * @returns                   - Best substitute ID, or null if none available
 */
export function findSubstitute(
  excludedExerciseId: string,
  limitations: string[],
  availableExerciseIds: string[],
): string | null {
  const id = excludedExerciseId.toLowerCase();

  for (const rule of SUBSTITUTION_RULES) {
    if (!limitations.includes(rule.limitation)) continue;
    if (!rule.excludePatterns.some((pattern) => id.includes(pattern))) continue;

    // Find the first substitute that's in the available pool
    for (const candidate of rule.substituteWith) {
      const found = availableExerciseIds.find(
        (avail) => avail.toLowerCase().includes(candidate.toLowerCase()) ||
                   candidate.toLowerCase().includes(avail.toLowerCase()),
      );
      if (found) return found;
    }
  }

  return null;
}
