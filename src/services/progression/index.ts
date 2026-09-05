/**
 * FitAI — Progression scheme registry.
 *
 * Replaces the single hardcoded double-progression behavior with a small
 * registry of programming approaches. `double` remains the default for
 * everything that isn't bodyweight/time-based/beginner — it wraps the
 * original progressionService.suggestNextWeight unchanged (schemes/double.ts)
 * so nothing that already worked changes behavior.
 *
 * Usage:
 *   const scheme = selectScheme({ isBodyweight, isTimeBased, trainingAge });
 *   const prescription = suggestNext(scheme, { exerciseId, lastSets, repRange, ... });
 */
import { ProgressionContext, ProgressionPrescription, ProgressionScheme } from './types';
import { linearProgression } from './schemes/linear';
import { doubleProgression } from './schemes/double';
import { greyskullLpProgression } from './schemes/greyskullLp';
import { timeProgression } from './schemes/timeProgression';
import { repOnlyProgression } from './schemes/repOnly';
import { offProgression } from './schemes/off';
// No import cycle: goalBindingService only imports the ProgressionScheme
// TYPE from ./types (not from this index file), so it's safe for this file
// to import goalBindingService's runtime value back.
import { getGoalBinding } from '../goalBindingService';
import type { TrainingEmphasis } from '../volumeLandmarksService';

export * from './types';

export const PROGRESSION_SCHEMES: ProgressionScheme[] = [
  'linear',
  'double',
  'greyskull_lp',
  'time',
  'rep_only',
  'off',
];

export const PROGRESSION_SCHEME_LABELS: Record<ProgressionScheme, string> = {
  linear: 'Linear',
  double: 'Double Progression',
  greyskull_lp: 'Greyskull LP',
  time: 'Time',
  rep_only: 'Rep-Only',
  off: 'Off',
};

const REGISTRY: Record<ProgressionScheme, (ctx: ProgressionContext) => ProgressionPrescription> = {
  linear: linearProgression,
  double: doubleProgression,
  greyskull_lp: greyskullLpProgression,
  time: timeProgression,
  rep_only: repOnlyProgression,
  off: offProgression,
};

/** Dispatch to the given scheme's implementation. */
export function suggestNext(
  scheme: ProgressionScheme,
  ctx: ProgressionContext,
): ProgressionPrescription {
  return REGISTRY[scheme](ctx);
}

export interface SelectSchemeParams {
  isBodyweight: boolean;
  isTimeBased: boolean;
  /** workoutPreferences.intensity — the existing training-age proxy used
   * elsewhere (e.g. calibrationService.getCalibrationStatus). */
  trainingAge?: 'beginner' | 'intermediate' | 'advanced';
  /** Explicit user choice always wins, e.g. a per-exercise scheme picker in
   * ExerciseEditorSheet (not yet wired — this registry is the prerequisite). */
  override?: ProgressionScheme;
  /** Onboarding goal, collapsed via volumeLandmarksService.
   * resolveTrainingEmphasis. Only consulted when trainingAge isn't already
   * 'beginner' (linear wins for beginners regardless of goal — see below).
   * Optional and additive: omitting it preserves the exact scheme selection
   * this function made before goal binding existed. */
  emphasis?: TrainingEmphasis;
}

/**
 * Auto-select the progression scheme for an exercise. Deliberately
 * conservative: only 'time', 'rep_only', 'linear', a goal's bound default,
 * and 'double' are ever auto-selected.
 *   - 'greyskull_lp' requires a specific 2-straight-sets-plus-AMRAP session
 *     structure the builder doesn't prescribe by default — auto-selecting
 *     it would silently misjudge a normal 3x8-12 session as "failed" the
 *     moment set 3 doesn't double the target.
 *   - 'off' is an explicit user opt-out (deload week, injury, a lift they
 *     don't want the engine touching), never an inference.
 * Both remain fully usable via `override`.
 *
 * Priority: override > time-based > bodyweight > beginner (always linear,
 * regardless of goal — novice linear progression outperforms goal-specific
 * schemes for someone new to training) > goal-bound default > double.
 */
export function selectScheme(params: SelectSchemeParams): ProgressionScheme {
  if (params.override) return params.override;
  if (params.isTimeBased) return 'time';
  if (params.isBodyweight) return 'rep_only';
  if (params.trainingAge === 'beginner') return 'linear';
  if (params.emphasis) return getGoalBinding(params.emphasis).defaultScheme;
  return 'double';
}
