/**
 * Rep-only progression — for bodyweight exercises with no external load.
 * Climb reps toward the top of the range; once every set clears it, the
 * target range itself steps up. Weight always stays 0 (matches the app's
 * existing bodyweight convention — see progressionService's own bodyweight
 * branch and warmupService, which skip warm-ups for zero-load exercises).
 *
 * "Add load → harder variation" (a weighted vest, then progressing to e.g.
 * archer push-ups) is real bodyweight-progression practice but is NOT
 * implemented here — FitAI has no exercise-substitution catalog wired to
 * runtime yet (PlannedExercise.alternativeExerciseId has no producer; see
 * Workout Engine v2 Phase 4). Once a rep target gets unreasonably high this
 * scheme surfaces that as a text hint only, not an actual substitution.
 */
import { ProgressionContext, ProgressionPrescription } from '../types';

/** Above this rep count on the TOP of the range, plain rep-adding stops
 * being a sensible strength stimulus — hint at a harder variation or added
 * load instead of silently prescribing ever-higher reps forever. */
const HIGH_REP_CEILING = 20;

export function repOnlyProgression(ctx: ProgressionContext): ProgressionPrescription {
  const [, maxReps] = ctx.repRange;

  if (ctx.lastSets.length === 0) {
    return {
      scheme: 'rep_only',
      action: 'none',
      suggestedWeightKg: 0,
      suggestedReps: maxReps,
      reason: 'No previous data — start with your working reps',
    };
  }

  const allHit = ctx.lastSets.every((s) => s.completed && s.reps >= maxReps);

  if (allHit) {
    const nextTarget = maxReps + 1;
    if (maxReps >= HIGH_REP_CEILING) {
      return {
        scheme: 'rep_only',
        action: 'increase',
        suggestedWeightKg: 0,
        suggestedReps: nextTarget,
        reason: `All sets hit ${maxReps} reps — consider added load or a harder variation instead of climbing reps further`,
      };
    }
    return {
      scheme: 'rep_only',
      action: 'increase',
      suggestedWeightKg: 0,
      suggestedReps: nextTarget,
      reason: `All sets hit ${maxReps} reps — target ${nextTarget} next session`,
    };
  }

  return {
    scheme: 'rep_only',
    action: 'hold',
    suggestedWeightKg: 0,
    suggestedReps: maxReps,
    reason: `Working towards ${maxReps} reps — repeat this target next session`,
  };
}
