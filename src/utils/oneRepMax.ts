/**
 * FitAI — Estimated 1RM formulas.
 *
 * Submaximal-load estimators (Brzycki, Epley, Lombardi) all diverge sharply
 * above ~12 reps — past that point a set reflects work capacity, not maximal
 * strength, and the formulas can disagree by double digits. estimateOneRepMax
 * returns null above MAX_RELIABLE_REPS for that reason: callers MUST treat
 * null as "no reliable estimate" (skip it), never coerce it to 0 or a PR
 * comparison will silently pass with a fabricated number.
 */

export function brzycki(weightKg: number, reps: number): number {
  if (reps <= 0 || reps >= 37) return weightKg;
  return weightKg / (1.0278 - 0.0278 * reps);
}

export function epley(weightKg: number, reps: number): number {
  if (reps <= 0) return weightKg;
  return weightKg * (1 + reps / 30);
}

export function lombardi(weightKg: number, reps: number): number {
  if (reps <= 0) return weightKg;
  return weightKg * Math.pow(reps, 0.1);
}

/** Reps beyond which submaximal-load 1RM formulas are no longer reliable. */
export const MAX_RELIABLE_REPS = 12;

/**
 * Estimate 1RM from a submaximal set.
 * - 1 rep: identity (the set IS the 1RM).
 * - 2-10 reps: average of Brzycki + Epley.
 * - 11-12 reps: average of Brzycki + Epley + Lombardi (smooths the approach
 *   to the reliability cap rather than jumping formulas at a hard edge).
 * - >12 reps or invalid input: null — no reliable estimate.
 */
export function estimateOneRepMax(weightKg: number, reps: number): number | null {
  if (weightKg <= 0 || reps <= 0) return null;
  if (reps === 1) return weightKg;
  if (reps > MAX_RELIABLE_REPS) return null;
  if (reps <= 10) return (brzycki(weightKg, reps) + epley(weightKg, reps)) / 2;
  return (brzycki(weightKg, reps) + epley(weightKg, reps) + lombardi(weightKg, reps)) / 3;
}
