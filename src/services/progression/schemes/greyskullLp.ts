/**
 * Greyskull LP — two straight sets at the target rep count, then a final
 * AMRAP (as-many-reps-as-possible) set. Hitting the target on all three
 * sets increases weight next session; doubling the target on the AMRAP set
 * (a clear sign the weight is too light) doubles the jump. Any failure —
 * missing the target on any of the three sets — triggers an immediate 10%
 * deload (no failure-streak grace, unlike linear/time: Greyskull's whole
 * design is fast, aggressive iteration since a miss is caught in one
 * session, not three).
 *
 * repRange[0] (the range's floor) is read as the fixed target rep count for
 * all three sets — Greyskull prescribes a single number, not a range, but
 * FitAI's plan data is always a [min, max] pair, so the floor is the
 * intended per-set target and the ceiling doubling it is what triggers the
 * double jump.
 */
import { PROGRESSION_INCREMENTS } from '../../progressionService';
import { ProgressionContext, ProgressionPrescription } from '../types';

export function greyskullLpProgression(ctx: ProgressionContext): ProgressionPrescription {
  const increment =
    ctx.incrementKg ?? (ctx.isLowerBody ? PROGRESSION_INCREMENTS.lower : PROGRESSION_INCREMENTS.upper);
  const [target] = ctx.repRange;

  if (ctx.lastSets.length < 3) {
    return {
      scheme: 'greyskull_lp',
      action: 'none',
      suggestedWeightKg: ctx.lastSets[0]?.weight ?? 0,
      reason:
        ctx.lastSets.length === 0
          ? 'No previous data — start with your working weight'
          : 'Greyskull LP needs 2 straight sets + a final AMRAP set to evaluate',
    };
  }

  const lastWeight = ctx.lastSets[0].weight;
  const straightSets = ctx.lastSets.slice(0, -1);
  const amrapSet = ctx.lastSets[ctx.lastSets.length - 1];

  const straightSetsHit = straightSets.every((s) => s.completed && s.reps >= target);
  const amrapHit = amrapSet.completed && amrapSet.reps >= target;

  if (!straightSetsHit || !amrapHit) {
    return {
      scheme: 'greyskull_lp',
      action: 'deload',
      suggestedWeightKg: Math.round(lastWeight * 0.9 * 10) / 10,
      reason: `Missed the ${target}-rep target — deload to 90% and reset`,
    };
  }

  if (amrapSet.reps >= target * 2) {
    return {
      scheme: 'greyskull_lp',
      action: 'increase',
      suggestedWeightKg: lastWeight + increment * 2,
      doubleJump: true,
      reason: `AMRAP set hit ${amrapSet.reps} reps (2x target) — jumping ${increment * 2}kg`,
    };
  }

  return {
    scheme: 'greyskull_lp',
    action: 'increase',
    suggestedWeightKg: lastWeight + increment,
    reason: `All sets hit ${target} reps — add ${increment}kg next session`,
  };
}
