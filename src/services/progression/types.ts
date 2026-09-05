/**
 * FitAI — Progression scheme registry types.
 *
 * Five programming approaches an exercise can progress under, plus 'off'.
 * The original single-scheme implementation (double progression) lives on
 * unchanged as progressionService.suggestNextWeight — schemes/double.ts
 * wraps it rather than reimplementing it, so its existing test coverage and
 * behavior guarantee are preserved exactly. The other four are new.
 */
export type ProgressionScheme =
  | 'linear'
  | 'double'
  | 'greyskull_lp'
  | 'time'
  | 'rep_only'
  | 'off';

export interface ProgressionSet {
  reps: number;
  weight: number;
  setType: string;
  completed: boolean;
  rpe?: 1 | 2 | 3 | null;
}

export interface ProgressionContext {
  exerciseId: string;
  /** Working sets from the last non-calibration session. Empty = no history. */
  lastSets: ProgressionSet[];
  repRange: [number, number];
  lastRPE?: 1 | 2 | 3 | null;
  isBodyweight?: boolean;
  isLowerBody?: boolean;
  isTimeBased?: boolean;
  /**
   * Consecutive prior sessions counted as a FAILURE by
   * progressionService.evaluateFailure (>=half the sets below the rep floor).
   * CALLER RESPONSIBILITY, same contract as evaluateFailure itself: an
   * unlogged or incomplete session must never be counted here — only a
   * session that was actually attempted and fell short. Passing a naive
   * "sessions since last success" count instead will trigger phantom
   * deloads on a week the user simply didn't train.
   */
  consecutiveFailures?: number;
  /** Current time-based target, for the 'time' scheme. */
  targetDurationSec?: number;
  /** Weight/duration increment step (kg). Defaults from PROGRESSION_INCREMENTS
   * (upper/lower) when omitted — see progressionService.ts. */
  incrementKg?: number;
}

export interface ProgressionPrescription {
  scheme: ProgressionScheme;
  action: 'increase' | 'hold' | 'deload' | 'none';
  suggestedWeightKg: number;
  suggestedReps?: number;
  suggestedDurationSec?: number;
  /** True when the suggested increase is a double step (exceptional performance). */
  doubleJump?: boolean;
  reason: string;
}
