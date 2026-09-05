/**
 * Time progression — for held/timed exercises (planks, dead hangs, wall
 * sits). All sets meeting the target duration adds 5s next session; three
 * consecutive missed sessions triggers a 10% duration deload.
 *
 * This closes a real gap: progressionService.suggestNextWeight's time-based
 * branch only ever held weight and said "progress by adding duration" —
 * duration itself was never actually computed. This scheme is the
 * computation that text promised.
 */
import { ProgressionContext, ProgressionPrescription } from '../types';

const DURATION_INCREMENT_SEC = 5;

export function timeProgression(ctx: ProgressionContext): ProgressionPrescription {
  const lastDuration = ctx.targetDurationSec ?? ctx.lastSets[0]?.reps ?? 0;
  // Weight stays whatever it was — most timed holds are bodyweight (0), but
  // a WEIGHTED hold (farmer's hold, weighted plank) keeps its load steady
  // while duration progresses. Never hardcode 0 here.
  const lastWeight = ctx.lastSets[0]?.weight ?? 0;

  if (ctx.lastSets.length === 0) {
    return {
      scheme: 'time',
      action: 'none',
      suggestedWeightKg: lastWeight,
      suggestedDurationSec: lastDuration,
      reason: 'No previous data — start with your working hold time',
    };
  }

  const consecutiveFailures = ctx.consecutiveFailures ?? 0;
  if (consecutiveFailures >= 3) {
    const deloaded = Math.round(lastDuration * 0.9);
    return {
      scheme: 'time',
      action: 'deload',
      suggestedWeightKg: lastWeight,
      suggestedDurationSec: deloaded,
      reason: `${consecutiveFailures} consecutive missed sessions — deload hold time to ${deloaded}s`,
    };
  }

  // Time-based sets are logged with the held duration in the `reps` field
  // (matches the existing WorkoutSessionScreen time-based logging path —
  // see handleTimeBasedSetComplete / parseTimedExercise).
  const allHitTarget = ctx.lastSets.every((s) => s.completed && s.reps >= lastDuration);

  if (allHitTarget) {
    return {
      scheme: 'time',
      action: 'increase',
      suggestedWeightKg: lastWeight,
      suggestedDurationSec: lastDuration + DURATION_INCREMENT_SEC,
      reason: `Held the full ${lastDuration}s on every set — add ${DURATION_INCREMENT_SEC}s next session`,
    };
  }

  return {
    scheme: 'time',
    action: 'hold',
    suggestedWeightKg: lastWeight,
    suggestedDurationSec: lastDuration,
    reason: `Did not hold ${lastDuration}s on every set — repeat this target next session`,
  };
}
