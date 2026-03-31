/**
 * FitAI — Calibration Service
 *
 * Detects whether an exercise needs a calibration session (first-ever session)
 * and provides a conservative bodyweight-based starting weight.
 *
 * CALIBRATION SESSION DEFINITION:
 *   A session is a calibration session when there are NO prior working sets
 *   (is_completed=true, is_calibration=false, reps BETWEEN 5 AND 20) for
 *   that user + exercise combination.
 *
 *   During calibration, the user ramps up weight until 8-12 reps feel 🟡 "Just Right".
 *   All sets during calibration are stored with is_calibration=true so they
 *   are excluded from progressionService and deloadService calculations.
 *
 * SSOT: exercise_sets table (via exerciseHistoryService)
 *       This service is READ-ONLY — it never writes.
 */

import { supabase } from './supabase';

export interface CalibrationStatus {
  needsCalibration: boolean;
  /**
   * Conservative starting weight in kg.
   * 0 if needsCalibration is false (use progressionService instead).
   * Based on user bodyweight × exercise-specific percentage.
   */
  estimatedStartKg: number;
  /**
   * Human-readable note shown under the weight input in SetLogModal.
   * e.g. "Based on your body weight — adjust if needed"
   */
  referenceNote: string;
}

// ============================================================================
// BODYWEIGHT START MAP
// % of user bodyweight per experience level, per exercise
// INTENTIONALLY CONSERVATIVE — better to start too light than risk injury
// ============================================================================

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

interface StartWeightEntry {
  beginner: number;
  intermediate: number;
  advanced: number;
  note: string; // "per dumbbell" | "per arm" | "total"
}

const BODYWEIGHT_START_MAP: Record<string, StartWeightEntry> = {
  barbell_bench_press:      { beginner: 0.30, intermediate: 0.50, advanced: 0.70, note: 'total' },
  dumbbell_bench_press:     { beginner: 0.12, intermediate: 0.22, advanced: 0.32, note: 'per dumbbell' },
  incline_bench_press:      { beginner: 0.25, intermediate: 0.42, advanced: 0.60, note: 'total' },
  incline_dumbbell_press:   { beginner: 0.10, intermediate: 0.18, advanced: 0.28, note: 'per dumbbell' },
  barbell_squat:            { beginner: 0.35, intermediate: 0.60, advanced: 0.85, note: 'total' },
  goblet_squat:             { beginner: 0.15, intermediate: 0.25, advanced: 0.35, note: 'total' },
  leg_press:                { beginner: 0.60, intermediate: 1.00, advanced: 1.40, note: 'total' },
  deadlift:                 { beginner: 0.40, intermediate: 0.70, advanced: 1.00, note: 'total' },
  romanian_deadlift:        { beginner: 0.30, intermediate: 0.55, advanced: 0.80, note: 'total' },
  hip_thrust:               { beginner: 0.30, intermediate: 0.55, advanced: 0.80, note: 'total' },
  overhead_press:           { beginner: 0.18, intermediate: 0.32, advanced: 0.50, note: 'total' },
  dumbbell_shoulder_press:  { beginner: 0.10, intermediate: 0.18, advanced: 0.26, note: 'per dumbbell' },
  lat_pulldown:             { beginner: 0.35, intermediate: 0.55, advanced: 0.75, note: 'total' },
  barbell_row:              { beginner: 0.28, intermediate: 0.48, advanced: 0.68, note: 'total' },
  dumbbell_row:             { beginner: 0.15, intermediate: 0.28, advanced: 0.40, note: 'per arm' },
  cable_row:                { beginner: 0.25, intermediate: 0.40, advanced: 0.58, note: 'total' },
  cable_fly:                { beginner: 0.08, intermediate: 0.14, advanced: 0.20, note: 'per side' },
  lateral_raise:            { beginner: 0.04, intermediate: 0.07, advanced: 0.10, note: 'per dumbbell' },
  bicep_curl:               { beginner: 0.08, intermediate: 0.14, advanced: 0.20, note: 'per dumbbell' },
  barbell_curl:             { beginner: 0.18, intermediate: 0.30, advanced: 0.42, note: 'total' },
  tricep_pushdown:          { beginner: 0.15, intermediate: 0.25, advanced: 0.36, note: 'total' },
  leg_curl:                 { beginner: 0.25, intermediate: 0.40, advanced: 0.58, note: 'total' },
  leg_extension:            { beginner: 0.30, intermediate: 0.48, advanced: 0.68, note: 'total' },
  calf_raise:               { beginner: 0.50, intermediate: 0.80, advanced: 1.20, note: 'total' },
};

/** Default percentages when exercise not in map */
const FALLBACK_PERCENTAGES: Record<ExperienceLevel, number> = {
  beginner: 0.20,
  intermediate: 0.35,
  advanced: 0.50,
};

function roundToPlate(kg: number): number {
  return Math.max(2.5, Math.round(kg / 2.5) * 2.5);
}

function computeStartWeight(
  exerciseId: string,
  userWeightKg: number,
  experienceLevel: ExperienceLevel,
): { kg: number; note: string } {
  const entry = BODYWEIGHT_START_MAP[exerciseId];
  if (entry) {
    return {
      kg: roundToPlate(userWeightKg * entry[experienceLevel]),
      note: entry.note,
    };
  }
  // Fallback for exercises not in map
  return {
    kg: roundToPlate(userWeightKg * FALLBACK_PERCENTAGES[experienceLevel]),
    note: 'total',
  };
}

// ============================================================================
// MAIN EXPORT
// ============================================================================

/**
 * Determine if an exercise needs calibration for this user.
 *
 * Logic:
 *   Query exercise_sets for any completed, non-calibration row with reps in [5,20].
 *   If none found → first session → return calibration guidance.
 *   If found → progressionService handles weight suggestion.
 */
export async function getCalibrationStatus(
  exerciseId: string,
  userId: string,
  userWeightKg: number,
  experienceLevel: ExperienceLevel,
): Promise<CalibrationStatus> {
  if (!userId || !exerciseId) {
    return { needsCalibration: false, estimatedStartKg: 0, referenceNote: '' };
  }

  try {
    const { data, error } = await supabase
      .from('exercise_sets')
      .select('id')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('is_completed', true)
      .eq('is_calibration', false)
      .gte('reps', 5)
      .lte('reps', 20)
      .limit(1);

    if (error) {
      console.error('[CaliService] query error:', error);
      // On error, default to no calibration — don't block the user
      return { needsCalibration: false, estimatedStartKg: 0, referenceNote: '' };
    }

    const hasHistory = data && data.length > 0;

    if (hasHistory) {
      return { needsCalibration: false, estimatedStartKg: 0, referenceNote: '' };
    }

    // First time doing this exercise
    const { kg, note } = computeStartWeight(exerciseId, userWeightKg, experienceLevel);
    const noteLabel = note === 'total' ? '' : ` (${note})`;

    return {
      needsCalibration: true,
      estimatedStartKg: kg,
      referenceNote: `Starting at ${kg}kg${noteLabel} — based on your body weight. Ramp up until 8–12 reps feel 🟡 Just Right.`,
    };
  } catch (err) {
    console.error('[CaliService] unexpected error:', err);
    return { needsCalibration: false, estimatedStartKg: 0, referenceNote: '' };
  }
}
