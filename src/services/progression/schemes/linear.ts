/**
 * Linear progression — the classic novice program (Starting Strength /
 * StrongLifts style): add weight every session as long as every set hits
 * its target; three consecutive missed sessions triggers a 10% deload.
 * Simpler and faster-progressing than double progression, appropriate for
 * beginners on the big compound lifts (see selectScheme in ../index.ts).
 */
import { PROGRESSION_INCREMENTS } from '../../progressionService';
import { ProgressionContext, ProgressionPrescription } from '../types';

export function linearProgression(ctx: ProgressionContext): ProgressionPrescription {
  const increment =
    ctx.incrementKg ?? (ctx.isLowerBody ? PROGRESSION_INCREMENTS.lower : PROGRESSION_INCREMENTS.upper);

  if (ctx.lastSets.length === 0) {
    return {
      scheme: 'linear',
      action: 'none',
      suggestedWeightKg: 0,
      reason: 'No previous data — start with your working weight',
    };
  }

  const [, maxReps] = ctx.repRange;
  const lastWeight = ctx.lastSets[0].weight;
  const consecutiveFailures = ctx.consecutiveFailures ?? 0;

  // Deload takes priority over a same-session hit/miss read — three straight
  // missed sessions means the current weight isn't recoverable, regardless
  // of how today's numbers land.
  if (consecutiveFailures >= 3) {
    return {
      scheme: 'linear',
      action: 'deload',
      suggestedWeightKg: Math.round(lastWeight * 0.9 * 10) / 10,
      reason: `${consecutiveFailures} consecutive missed sessions — deload to 90% and rebuild`,
    };
  }

  const allHit = ctx.lastSets.every((s) => s.completed && s.reps >= maxReps);
  if (allHit) {
    return {
      scheme: 'linear',
      action: 'increase',
      suggestedWeightKg: lastWeight + increment,
      reason: `All sets hit ${maxReps} reps — add ${increment}kg next session`,
    };
  }

  return {
    scheme: 'linear',
    action: 'hold',
    suggestedWeightKg: lastWeight,
    reason: 'Did not hit every set — repeat this weight next session',
  };
}
