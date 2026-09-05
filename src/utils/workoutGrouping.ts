/**
 * FitAI — Superset/circuit grouping and rest-mode traversal for the live
 * workout session (Workout Engine v2, Phase 4B.1).
 *
 * Grouping is CONTIGUITY-based, mirroring the builder's own approach
 * (DayBlock.tsx's isFirstInSuperset/isLastInSuperset: adjacent array entries
 * sharing the same supersetId/circuitId belong to one group) — not derived
 * from SupersetGroup/CircuitGroup objects, which no builder UI ever
 * populates (confirmed: ExerciseEditorSheet only stamps per-exercise
 * supersetId/circuitId, never writes a group object with exerciseIds[]/
 * rounds/restBetweenExercises/restAfterGroup).
 *
 * Superset and circuit are mutually exclusive per exercise (the builder
 * enforces this — handleGroupMode clears the other field), so every
 * exercise has at most one group membership.
 *
 * Round count has no producer either — CircuitGroup.rounds is never
 * written. Derived here from the grouped exercises' own sets.length
 * (already the per-exercise round count for that exercise). When exercises
 * in one group disagree on set count, the group's round count is the
 * MAXIMUM across members; a shorter exercise's missing rounds are treated
 * as already-complete for it (skipped during traversal) rather than
 * crashing or blocking the group.
 */
import type { WorkoutSet } from '../types/workout';

export type GroupType = 'none' | 'superset' | 'circuit';

export interface ExerciseGroupInfo {
  exerciseIndex: number;
  groupType: GroupType;
  /** supersetId or circuitId — null when groupType is 'none'. */
  groupId: string | null;
  /** Index (into workout.exercises) of the first exercise in this group. */
  groupStartIndex: number;
  /** Index (into workout.exercises) of the last exercise in this group. */
  groupEndIndex: number;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  /** Max sets.length across every exercise in this group — the group's
   * round count. Equal to this exercise's own set count when ungrouped. */
  roundCount: number;
}

/**
 * Computes group membership for every exercise in the plan, via contiguous
 * runs of equal supersetId/circuitId — same rule as
 * DayBlock.tsx's isFirstInSuperset/isLastInSuperset, extended to circuits
 * (which had no equivalent anywhere in the app before this).
 */
export function computeExerciseGroups(exercises: WorkoutSet[]): ExerciseGroupInfo[] {
  const n = exercises.length;
  const result: ExerciseGroupInfo[] = new Array(n);

  let i = 0;
  while (i < n) {
    const ex = exercises[i];
    const groupId = ex.supersetId || ex.circuitId || null;
    const groupType: GroupType = ex.supersetId ? 'superset' : ex.circuitId ? 'circuit' : 'none';

    if (!groupId) {
      result[i] = {
        exerciseIndex: i,
        groupType: 'none',
        groupId: null,
        groupStartIndex: i,
        groupEndIndex: i,
        isFirstInGroup: true,
        isLastInGroup: true,
        roundCount: Math.max(1, ex.sets ?? 1),
      };
      i += 1;
      continue;
    }

    // Extend the contiguous run while the SAME group id continues.
    let j = i;
    let roundCount = Math.max(1, exercises[i].sets ?? 1);
    while (
      j + 1 < n &&
      (exercises[j + 1].supersetId === groupId || exercises[j + 1].circuitId === groupId)
    ) {
      j += 1;
      roundCount = Math.max(roundCount, Math.max(1, exercises[j].sets ?? 1));
    }

    for (let k = i; k <= j; k++) {
      result[k] = {
        exerciseIndex: k,
        groupType,
        groupId,
        groupStartIndex: i,
        groupEndIndex: j,
        isFirstInGroup: k === i,
        isLastInGroup: k === j,
        roundCount,
      };
    }
    i = j + 1;
  }

  return result;
}

export type RestMode = 'intra_set' | 'intra_group' | 'post_group' | 'inter_exercise';

export interface NextStep {
  restMode: RestMode;
  /** New currentExerciseIndex. */
  nextExerciseIndex: number;
  /** New currentSetIndex — a plain set index when ungrouped, a ROUND index
   * when inside a group (advances only once every member has done that
   * round). */
  nextSetIndex: number;
  /** True when this was the final round of the final exercise in the group
   * (or the only exercise, if ungrouped) — the workout-complete check
   * (currentExerciseIndex >= totalExercises - 1) still applies on top. */
  exerciseFullyComplete: boolean;
}

/**
 * Pure decision function: given the group membership of the exercise just
 * logged, whether ALL its sets for the current round are done, and the
 * current position, decide the rest mode and where to go next.
 *
 * `setsCompletedForCurrentExercise` — true once the currently-active
 * exercise instance has logged its set (mirrors handleSaveSetData's
 * `wasAllSetsCompleted`, but scoped to "this one set just logged", since
 * inside a group each hop logs exactly one set of one exercise before
 * moving to the next member).
 */
export function getNextStep(
  group: ExerciseGroupInfo,
  currentSetIndex: number,
  setsCompletedForCurrentExercise: boolean,
): NextStep {
  if (group.groupType === 'none') {
    // Unchanged pre-4B.1 behavior: exhausted current exercise's sets → move
    // on (inter_exercise rest); otherwise hold position, next set (intra_set).
    if (setsCompletedForCurrentExercise) {
      return {
        restMode: 'inter_exercise',
        nextExerciseIndex: group.exerciseIndex + 1,
        nextSetIndex: 0,
        exerciseFullyComplete: true,
      };
    }
    return {
      restMode: 'intra_set',
      nextExerciseIndex: group.exerciseIndex,
      nextSetIndex: currentSetIndex + 1,
      exerciseFullyComplete: false,
    };
  }

  // Inside a superset/circuit: one set of one exercise was just logged.
  if (!group.isLastInGroup) {
    // Hop to the next exercise IN the group, same round — minimal rest.
    return {
      restMode: 'intra_group',
      nextExerciseIndex: group.exerciseIndex + 1,
      nextSetIndex: currentSetIndex,
      exerciseFullyComplete: false,
    };
  }

  // Last exercise in the group for this round.
  const nextRound = currentSetIndex + 1;
  if (nextRound < group.roundCount) {
    // More rounds remain — full group rest, loop back to the first member.
    return {
      restMode: 'post_group',
      nextExerciseIndex: group.groupStartIndex,
      nextSetIndex: nextRound,
      exerciseFullyComplete: false,
    };
  }

  // Final round of the final exercise — the whole group is done, behaves
  // like finishing a normal exercise: full inter-exercise rest, advance
  // past the group entirely.
  return {
    restMode: 'inter_exercise',
    nextExerciseIndex: group.groupEndIndex + 1,
    nextSetIndex: 0,
    exerciseFullyComplete: true,
  };
}

/**
 * A grouped exercise instance's set at a given ROUND may not exist (a
 * shorter exercise inside a circuit whose members have unequal set
 * counts) — treat it as already-complete for that instance rather than
 * blocking the group or crashing. Ungrouped exercises always have a real
 * set at every index up to their own count.
 */
export function isRoundSkippedForExercise(exercise: WorkoutSet, roundIndex: number): boolean {
  return roundIndex >= Math.max(1, exercise.sets ?? 1);
}
