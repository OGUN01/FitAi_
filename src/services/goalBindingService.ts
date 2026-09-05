/**
 * FitAI — Goal Binding Service (Workout Engine v2, Phase 5)
 *
 * Maps the onboarding training emphasis (see volumeLandmarksService.
 * resolveTrainingEmphasis — derived from FitnessGoals.primary_goals) to a
 * default rep range, rest-time prescription, and progression scheme.
 *
 * SOURCING: strength/hypertrophy/endurance rep-and-rest prescriptions are
 * standard resistance-training periodization guidance (NSCA Essentials of
 * Strength Training and Conditioning's load/rep/rest tables are the
 * commonly-cited source): strength work lives at 1-6 reps with long
 * (2.5-4 min) rest so near-maximal loads can be recovered between sets;
 * hypertrophy work lives at 6-12 reps with moderate (60-90s) rest, the
 * range that maximizes time under tension without cutting sessions short;
 * muscular-endurance work lives at 15+ reps with short (30-60s) rest, where
 * the adaptation target is fatigue resistance rather than absolute tension.
 * 'general' (the catch-all for weight-loss/general_fitness/flexibility
 * goals — none of which are volume- or intensity-specific the way the other
 * three are) uses a broad, safe middle prescription.
 *
 * These are DEFAULTS, not overrides — a specific exercise's own catalog
 * data (CatalogEntry.defaultRepRange, movement-pattern-aware — see
 * src/data/exerciseCatalog.generated.ts) should win when both are
 * available; this binding exists for exercises/contexts that don't have a
 * more specific answer, and for the progression-scheme default.
 */
import { TrainingEmphasis } from './volumeLandmarksService';
import { ProgressionScheme } from './progression/types';

export interface GoalBinding {
  /** [min, max] reps. */
  repRange: [number, number];
  /** [min, max] rest between working sets, in seconds. */
  restSeconds: [number, number];
  defaultScheme: ProgressionScheme;
}

export const GOAL_BINDINGS: Record<TrainingEmphasis, GoalBinding> = {
  strength: { repRange: [3, 6], restSeconds: [150, 240], defaultScheme: 'linear' },
  hypertrophy: { repRange: [8, 12], restSeconds: [60, 90], defaultScheme: 'double' },
  endurance: { repRange: [15, 20], restSeconds: [30, 60], defaultScheme: 'double' },
  general: { repRange: [10, 15], restSeconds: [60, 90], defaultScheme: 'double' },
};

export function getGoalBinding(emphasis: TrainingEmphasis): GoalBinding {
  return GOAL_BINDINGS[emphasis];
}
