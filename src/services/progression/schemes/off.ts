/**
 * Off — no automatic progression. Targets stay static session to session.
 * For exercises the user wants to hold steady (deload week, injury
 * management, or simply a lift they don't want the engine touching).
 */
import { ProgressionContext, ProgressionPrescription } from '../types';

export function offProgression(ctx: ProgressionContext): ProgressionPrescription {
  const lastWeight = ctx.lastSets[0]?.weight ?? 0;
  return {
    scheme: 'off',
    action: 'hold',
    suggestedWeightKg: lastWeight,
    suggestedDurationSec: ctx.isTimeBased ? ctx.targetDurationSec : undefined,
    suggestedReps: !ctx.isTimeBased ? ctx.repRange[1] : undefined,
    reason: 'Progression off — targets stay the same',
  };
}
