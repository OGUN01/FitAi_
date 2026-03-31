/**
 * FitAI — Progression Service
 *
 * Implements science-based Double Progression:
 *   - Work within a rep range (e.g. 8-12)
 *   - When all sets hit the top of the range → increase weight
 *   - RPE signal modulates speed: 🟢 Easy = jump faster, 🔴 Hard = hold even if reps hit top
 *   - Two consecutive failed sessions → deload to 90%
 *
 * SSOT: All progression decisions originate here.
 *       Input data comes from exerciseHistoryService (exercise_sets table).
 *       is_calibration sets must be filtered OUT by the caller before being passed in.
 */

export interface LastSet {
  reps: number;
  weight: number;
  setType: string;
  completed: boolean;
  /** RPE captured at save time. null = not captured (treated as 2 / neutral). */
  rpe?: 1 | 2 | 3 | null;
}

export interface ProgressionResult {
  suggestedWeightKg: number;
  action: 'increase' | 'hold' | 'deload';
  reason: string;
  /** When true, the suggested increase is 2× the standard increment */
  doubleJump?: boolean;
}

export interface FailureEvaluation {
  action: 'deload' | 'hold' | 'none';
  suggestedWeightKg?: number;
  consecutiveFailures: number;
  reason: string;
}

// ============================================================================
// EXERCISE CLASSIFICATION SETS
// ============================================================================

const BODYWEIGHT_EXERCISES = new Set([
  'push_up', 'pull_up', 'bodyweight_squat', 'plank', 'mountain_climbers',
  'jumping_jacks', 'burpee', 'dip', 'chin_up', 'pike_push_up', 'glute_bridge',
  'leg_raise', 'crunch', 'sit_up', 'hollow_body', 'superman', 'wall_sit',
]);

const TIME_BASED_EXERCISES = new Set([
  'plank', 'wall_sit', 'dead_hang', 'hollow_body', 'l_sit', 'superman',
]);

const LOWER_BODY_EXERCISES = new Set([
  'squat', 'deadlift', 'leg_press', 'lunge', 'leg_curl', 'leg_extension',
  'calf_raise', 'hip_thrust', 'romanian_deadlift', 'sumo_deadlift',
  'goblet_squat', 'step_up', 'bodyweight_squat', 'glute_bridge',
  'reverse_lunge', 'split_squat', 'bulgarian_split_squat', 'step_up_weighted',
  'box_jump',
]);

const CORE_EXERCISES = new Set([
  'plank', 'crunch', 'sit_up', 'ab_rollout', 'cable_crunch', 'russian_twist',
  'leg_raise', 'hollow_body', 'bicycle_crunch', 'mountain_climbers',
]);

// Weight increments per muscle group (standard barbell plate sizes)
const UPPER_BODY_INCREMENT = 2.5;
const LOWER_BODY_INCREMENT = 5.0;

class ProgressionService {
  /**
   * Suggest next session's working weight based on last session performance.
   *
   * CALLER RESPONSIBILITY: Filter out is_calibration=true sets before passing lastSets.
   *
   * @param exerciseId         - Exercise identifier
   * @param lastSets           - Working sets from the last non-calibration session
   * @param repRange           - [min, max] target rep range (e.g. [8, 12])
   * @param isBodyweight       - Override bodyweight detection
   * @param isMuscleGroupLower - Override lower body detection
   * @param lastRPE            - RPE of last set of last session (null = treat as 2)
   */
  suggestNextWeight(
    exerciseId: string,
    lastSets: LastSet[],
    repRange: [number, number],
    isBodyweight?: boolean,
    isMuscleGroupLower?: boolean,
    lastRPE?: 1 | 2 | 3 | null,
  ): ProgressionResult {
    if (lastSets.length === 0) {
      return {
        suggestedWeightKg: 0,
        action: 'hold',
        reason: 'No previous data — start with your working weight',
      };
    }

    const bw = isBodyweight ?? this.isBodyweightExercise(exerciseId);
    if (bw) {
      return {
        suggestedWeightKg: 0,
        action: 'hold',
        reason: 'Bodyweight exercise — progress by adding reps',
      };
    }

    if (this.isTimeBased(exerciseId)) {
      return {
        suggestedWeightKg: lastSets[0].weight,
        action: 'hold',
        reason: 'Time-based exercise — progress by adding duration',
      };
    }

    const [minReps, maxReps] = repRange;
    const lastWeight = lastSets[0].weight;
    const resolvedRPE = lastRPE ?? 2; // null/undefined → neutral

    const isLower = isMuscleGroupLower ?? this.getMuscleGroup(exerciseId) === 'lower';
    const increment = isLower ? LOWER_BODY_INCREMENT : UPPER_BODY_INCREMENT;

    // ── Case 7: All sets completed, but last RPE was 3 (hard) ─────────────
    // Even if reps hit the top, don't increase — body was near limit.
    // Consolidate at current weight first.
    const allCompleted = lastSets.every((s) => s.completed);
    const allAtTop = lastSets.every((s) => s.reps >= maxReps);

    if (allCompleted && allAtTop && resolvedRPE === 3) {
      return {
        suggestedWeightKg: lastWeight,
        action: 'hold',
        reason: `Hit ${maxReps} reps but felt very hard — consolidating before increasing`,
      };
    }

    // ── Case 3: Any set exceeded rep range by 2+ (weight was too light) ───
    // Treat as implicit warm-up weight — jump by standard increment.
    const anyExceeded = lastSets.some((s) => s.reps > maxReps + 1);
    if (anyExceeded) {
      return {
        suggestedWeightKg: lastWeight + increment,
        action: 'increase',
        reason: `Exceeded ${maxReps} reps — weight was too light, increasing`,
      };
    }

    // ── Case 1: All sets at top AND RPE was easy (1) ──────────────────────
    // Double jump: user clearly handled it, accelerate progression.
    if (allCompleted && allAtTop && resolvedRPE === 1) {
      return {
        suggestedWeightKg: lastWeight + increment * 2,
        action: 'increase',
        reason: `All sets at ${maxReps} reps and felt easy — jumping ${increment * 2}kg`,
        doubleJump: true,
      };
    }

    // ── Case 2: All sets at top AND RPE neutral (2 or no RPE) ────────────
    if (allCompleted && allAtTop) {
      return {
        suggestedWeightKg: lastWeight + increment,
        action: 'increase',
        reason: `All sets at ${maxReps} reps — increase by ${increment}kg`,
      };
    }

    // ── Cases 4–6: Not all sets at top ────────────────────────────────────
    // Hold weight. deloadService handles consecutive failures separately.
    const allInRange = lastSets.every((s) => s.reps >= minReps);
    if (allInRange) {
      return {
        suggestedWeightKg: lastWeight,
        action: 'hold',
        reason: 'Working towards top of rep range — maintain current weight',
      };
    }

    // At least one set below floor (failure) — hold for now; deloadService
    // will trigger a deload recommendation after 2 consecutive sessions.
    return {
      suggestedWeightKg: lastWeight,
      action: 'hold',
      reason: 'One or more sets below target — maintain weight, focus on form',
    };
  }

  /**
   * Evaluate whether consecutive failures warrant a deload.
   * CALLER RESPONSIBILITY: Pass only non-calibration sessions.
   */
  evaluateFailure(
    _exerciseId: string,
    recentSessions: Array<{ sets: LastSet[]; repRange: [number, number] }>,
    failureThreshold: number = 2,
  ): FailureEvaluation {
    if (recentSessions.length === 0) {
      return { action: 'none', consecutiveFailures: 0, reason: 'No session data' };
    }

    let consecutiveFailures = 0;
    for (const session of recentSessions) {
      const completedSets = session.sets.filter((s) => s.completed);
      if (completedSets.length === 0) break;

      const floor = session.repRange[0];
      const failedSets = completedSets.filter((s) => s.reps < floor);
      const isFailed = failedSets.length > completedSets.length / 2;

      if (isFailed) {
        consecutiveFailures++;
      } else {
        break;
      }
    }

    if (consecutiveFailures >= failureThreshold) {
      const lastWeight = recentSessions[0].sets[0]?.weight ?? 0;
      return {
        action: 'deload',
        suggestedWeightKg: Math.round(lastWeight * 0.9 * 10) / 10,
        consecutiveFailures,
        reason: `${consecutiveFailures} consecutive failures — deload to 90% of current weight`,
      };
    }

    if (consecutiveFailures > 0) {
      return {
        action: 'hold',
        consecutiveFailures,
        reason: consecutiveFailures === 1
          ? 'One failure — maintain current weight'
          : `${consecutiveFailures} failures — maintain current weight`,
      };
    }

    return { action: 'none', consecutiveFailures: 0, reason: 'No failures detected' };
  }

  isBodyweightExercise(exerciseId: string): boolean {
    return BODYWEIGHT_EXERCISES.has(exerciseId);
  }

  isTimeBased(exerciseId: string): boolean {
    return TIME_BASED_EXERCISES.has(exerciseId);
  }

  getMuscleGroup(exerciseId: string): 'lower' | 'upper' | 'core' {
    if (CORE_EXERCISES.has(exerciseId)) return 'core';
    if (LOWER_BODY_EXERCISES.has(exerciseId)) return 'lower';
    return 'upper';
  }
}

export const progressionService = new ProgressionService();
