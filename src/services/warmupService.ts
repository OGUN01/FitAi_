/**
 * FitAI — Warm-up Set Generation Service
 *
 * Derives science-based warm-up sets from a user's estimated 1RM.
 * This is the SINGLE SOURCE OF TRUTH for warm-up weight calculation.
 * No other file should compute warm-up weights.
 *
 * Protocol (standard sports-science ramp):
 *   Upper body: 2 sets  (40% × 10, 60% × 5)
 *   Lower body: 3 sets  (40% × 10, 60% × 5, 75% × 2)
 *
 * If 1RM is 0 (no history), returns [] — no warm-up shown on Session 1.
 * Bodyweight and time-based exercises return [] — no load to ramp.
 */

import { deriveExerciseClassification } from '../utils/resolveExerciseMeta';

export type ExerciseKind = 'upper' | 'lower' | 'bodyweight' | 'time_based';

export interface WarmupSet {
  /** Negative index so they sort BEFORE working sets in the UI (-2, -1) */
  setNumber: number;
  weightKg: number;
  targetReps: number;
  setType: 'warmup';
  /**
   * Human-readable context shown in the UI.
   * e.g. "40% of your estimated max"
   */
  percentLabel: string;
}

/**
 * Round to nearest 2.5 kg increment (smallest common weight plate).
 * Never returns 0 unless input is 0.
 */
function roundToPlate(kg: number): number {
  const rounded = Math.round(kg / 2.5) * 2.5;
  return Math.max(2.5, rounded);
}

/**
 * Generate warm-up sets for an exercise given its estimated 1RM.
 *
 * @param estimated1RM  - Estimated one-rep max in kg (0 if no history)
 * @param exerciseKind  - Classification of the exercise
 * @returns             - Ordered warm-up sets (empty if not applicable)
 */
export function generateWarmupSets(
  estimated1RM: number,
  exerciseKind: ExerciseKind,
): WarmupSet[] {
  if (estimated1RM <= 0) return [];
  if (exerciseKind === 'bodyweight' || exerciseKind === 'time_based') return [];

  const sets: WarmupSet[] = [];

  // Set 1 — 40% × 10 reps (movement prep, technique reinforcement)
  sets.push({
    setNumber: exerciseKind === 'lower' ? -2 : -1,
    weightKg: roundToPlate(estimated1RM * 0.4),
    targetReps: 10,
    setType: 'warmup',
    percentLabel: '40% of your estimated max',
  });

  // Set 2 — 60% × 5 reps (neural activation, approaching working load)
  sets.push({
    setNumber: exerciseKind === 'lower' ? -1 : 0,
    weightKg: roundToPlate(estimated1RM * 0.6),
    targetReps: 5,
    setType: 'warmup',
    percentLabel: '60% of your estimated max',
  });

  // Set 3 (lower body only) — 75% × 2 reps (CNS prime for heavy compound lifts)
  if (exerciseKind === 'lower') {
    sets.push({
      setNumber: 0,
      weightKg: roundToPlate(estimated1RM * 0.75),
      targetReps: 2,
      setType: 'warmup',
      percentLabel: '75% of your estimated max',
    });
  }

  return sets;
}

/**
 * Classify an exercise as upper/lower/bodyweight/time_based for warm-up
 * protocol selection.
 *
 * Delegates to deriveExerciseClassification (resolveExerciseMeta.ts), the
 * single source for this classification — it resolves both ExerciseDB hash
 * IDs (AI-plan exercises) and legacy curated snake_case IDs correctly.
 * Precedence: time_based > bodyweight > lower > upper, matching the previous
 * keyword-based behavior (a bodyweight time-based hold like a plank warms up
 * as time_based, not bodyweight).
 */
export function classifyExercise(exerciseId: string): ExerciseKind {
  const c = deriveExerciseClassification(exerciseId);
  if (c.isTimeBased) return 'time_based';
  if (c.isBodyweight) return 'bodyweight';
  if (c.isLowerBody) return 'lower';
  return 'upper';
}
