/**
 * FitAI — Effort scale (RPE / RIR) conversions.
 *
 * SINGLE SOURCE for RPE-related constants and conversions. Two RPE
 * granularities coexist by design, both stored on exercise_sets:
 *   - `rpe` (1-3): the fast 3-tap session-logging UI (Easy/Just Right/Hard).
 *     progressionService.suggestNextWeight's lastRPE param consumes this.
 *   - `rpe_10` (1-10): industry-standard full-resolution RPE. Already used
 *     by the workout builder's target-RPE slider (PlannedExercise.targetRpe,
 *     see ExerciseEditorSheet.tsx) for PLANNING; this module adds the
 *     session-logging side — every completed set now also writes an rpe_10,
 *     either synthesized from the 3-tap bucket or entered precisely via the
 *     optional advanced slider in SetLogModal.
 *
 * NOTE: rpe_10 stores RPE (Rate of Perceived Exertion, higher = harder),
 * NOT RIR (Reps in Reserve, higher = easier) — matching the column's
 * existing CHECK constraint (1-10) and its prior use by the builder. RIR is
 * offered as a DISPLAY-ONLY alternate label (rpeToRir below) for users who
 * think in reps-in-reserve; nothing is ever stored as RIR.
 */

export type EffortBucket = 1 | 2 | 3;

/** Human labels for the full 1-10 RPE scale — shared by the builder's
 * target-RPE slider and the session's optional precise-RPE slider. */
export const RPE_LABELS: Record<number, string> = {
  1: "Very Easy",
  2: "Easy",
  3: "Moderate",
  4: "Somewhat Hard",
  5: "Hard",
  6: "Hard+",
  7: "Very Hard",
  8: "Extremely Hard",
  9: "Near Max",
  10: "Max Effort",
};

export const RPE_MIN = 1;
export const RPE_MAX = 10;

/** 3-tap bucket -> representative RPE(1-10) midpoint. Used to synthesize an
 * rpe_10 value for the common case (fast 3-tap logging), so every set gets
 * a full-resolution effort value without forcing precise entry. */
export const EFFORT_BUCKET_TO_RPE10: Record<EffortBucket, number> = {
  1: 4, // Easy
  2: 7, // Just Right
  3: 9, // Hard
};

/** RPE(1-10) -> 3-tap bucket, for feeding progressionService's existing
 * 1|2|3 lastRPE contract from a precise RPE entry. Boundaries mirror
 * EFFORT_BUCKET_TO_RPE10's midpoints (4/7/9): <=5 Easy, 6-7 Just Right, >=8 Hard. */
export function rpe10ToBucket(rpe10: number): EffortBucket {
  if (rpe10 <= 5) return 1;
  if (rpe10 <= 7) return 2;
  return 3;
}

/** Display-only conversion: RIR (Reps in Reserve) = 10 - RPE. Never stored —
 * storage stays RPE throughout (see module doc). */
export function rpeToRir(rpe10: number): number {
  return 10 - rpe10;
}

/** A set counts as "hard" at RPE >= 7 (RIR <= 3) — the openGym-derived
 * convention this app's effort analytics use for hard-set % and histograms. */
export const HARD_SET_RPE_THRESHOLD = 7;

export function isHardSet(rpe10: number | null | undefined): boolean {
  return rpe10 != null && rpe10 >= HARD_SET_RPE_THRESHOLD;
}
