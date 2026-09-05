/**
 * Double progression — wraps progressionService.suggestNextWeight unchanged.
 *
 * This is the ORIGINAL (and until now, only) scheme FitAI implemented:
 * climb the rep range at fixed weight; once every set hits the top of the
 * range, weight goes up and reps effectively "reset" (the user is back to
 * chasing the top of the range at the new weight). Kept as a thin adapter
 * rather than reimplemented so its existing test suite
 * (src/__tests__/services/progressionService.test.ts) continues to
 * guarantee this scheme's behavior exactly — the registry adds new schemes
 * around it, it does not touch this one.
 */
import { progressionService } from '../../progressionService';
import { ProgressionContext, ProgressionPrescription } from '../types';

export function doubleProgression(ctx: ProgressionContext): ProgressionPrescription {
  const result = progressionService.suggestNextWeight(
    ctx.exerciseId,
    ctx.lastSets,
    ctx.repRange,
    ctx.isBodyweight,
    ctx.isLowerBody,
    ctx.lastRPE,
    ctx.isTimeBased,
  );

  return {
    scheme: 'double',
    action: result.action,
    suggestedWeightKg: result.suggestedWeightKg,
    doubleJump: result.doubleJump,
    reason: result.reason,
  };
}
