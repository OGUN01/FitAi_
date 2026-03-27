export interface LastSet {
  reps: number;
  weight: number;
  setType: string;
  completed: boolean;
}

export interface ProgressionResult {
  suggestedWeightKg: number;
  action: "increase" | "hold" | "deload";
  reason: string;
}

export interface FailureEvaluation {
  action: "deload" | "hold" | "none";
  suggestedWeightKg?: number;
  consecutiveFailures: number;
  reason: string;
}

const BODYWEIGHT_EXERCISES = new Set([
  "push_up",
  "pull_up",
  "bodyweight_squat",
  "plank",
  "mountain_climbers",
  "jumping_jacks",
  "burpee",
  "dip",
  "chin_up",
  "pike_push_up",
  "glute_bridge",
  "leg_raise",
  "crunch",
  "sit_up",
  "hollow_body",
  "superman",
  "wall_sit",
]);

const TIME_BASED_EXERCISES = new Set([
  "plank",
  "wall_sit",
  "dead_hang",
  "hollow_body",
  "l_sit",
  "superman",
]);

const LOWER_BODY_EXERCISES = new Set([
  "squat",
  "deadlift",
  "leg_press",
  "lunge",
  "leg_curl",
  "leg_extension",
  "calf_raise",
  "hip_thrust",
  "romanian_deadlift",
  "sumo_deadlift",
  "goblet_squat",
  "step_up",
  "bodyweight_squat",
  "glute_bridge",
  "reverse_lunge",
  "split_squat",
  "bulgarian_split_squat",
  "step_up_weighted",
  "box_jump",
]);

const CORE_EXERCISES = new Set([
  "plank",
  "crunch",
  "sit_up",
  "ab_rollout",
  "cable_crunch",
  "russian_twist",
  "leg_raise",
  "hollow_body",
  "bicycle_crunch",
  "mountain_climbers",
]);

const UPPER_BODY_INCREMENT = 2.5;
const LOWER_BODY_INCREMENT = 5;

class ProgressionService {
  suggestNextWeight(
    exerciseId: string,
    lastSets: LastSet[],
    repRange: [number, number],
    isBodyweight?: boolean,
    isMuscleGroupLower?: boolean,
  ): ProgressionResult {
    if (lastSets.length === 0) {
      return {
        suggestedWeightKg: 0,
        action: "hold",
        reason: "No previous data — start with your working weight",
      };
    }

    const bw = isBodyweight ?? this.isBodyweightExercise(exerciseId);
    if (bw) {
      return {
        suggestedWeightKg: 0,
        action: "hold",
        reason: "Bodyweight exercise — progress by adding reps",
      };
    }

    if (this.isTimeBased(exerciseId)) {
      return {
        suggestedWeightKg: lastSets[0].weight,
        action: "hold",
        reason: "Time-based exercise — progress by adding duration",
      };
    }

    const topOfRange = repRange[1];
    const lastWeight = lastSets[0].weight;
    const allCompleted = lastSets.every((s) => s.completed);
    const allAtTop = lastSets.every((s) => s.reps >= topOfRange);

    if (allCompleted && allAtTop) {
      const isLower =
        isMuscleGroupLower ?? this.getMuscleGroup(exerciseId) === "lower";
      const increment = isLower ? LOWER_BODY_INCREMENT : UPPER_BODY_INCREMENT;
      return {
        suggestedWeightKg: lastWeight + increment,
        action: "increase",
        reason: `All sets at ${topOfRange} reps — increase by ${increment}kg`,
      };
    }

    return {
      suggestedWeightKg: lastWeight,
      action: "hold",
      reason: "Not all sets at top of rep range — maintain current weight",
    };
  }

  evaluateFailure(
    _exerciseId: string,
    recentSessions: Array<{ sets: LastSet[]; repRange: [number, number] }>,
    failureThreshold: number = 2,
  ): FailureEvaluation {
    if (recentSessions.length === 0) {
      return {
        action: "none",
        consecutiveFailures: 0,
        reason: "No session data",
      };
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
        action: "deload",
        suggestedWeightKg: Math.round(lastWeight * 0.9 * 10) / 10,
        consecutiveFailures,
        reason: `${consecutiveFailures} consecutive failures — deload to 90% of current weight`,
      };
    }

    if (consecutiveFailures > 0) {
      return {
        action: "hold",
        consecutiveFailures,
        reason:
          consecutiveFailures === 1
            ? "One failure — maintain current weight"
            : `${consecutiveFailures} failures — maintain current weight`,
      };
    }

    return {
      action: "none",
      consecutiveFailures: 0,
      reason: "No failures detected",
    };
  }

  isBodyweightExercise(exerciseId: string): boolean {
    return BODYWEIGHT_EXERCISES.has(exerciseId);
  }

  isTimeBased(exerciseId: string): boolean {
    return TIME_BASED_EXERCISES.has(exerciseId);
  }

  getMuscleGroup(exerciseId: string): "lower" | "upper" | "core" {
    if (CORE_EXERCISES.has(exerciseId)) return "core";
    if (LOWER_BODY_EXERCISES.has(exerciseId)) return "lower";
    return "upper";
  }
}

export const progressionService = new ProgressionService();
