/**
 * FitAI — Volume Landmarks Service (Workout Engine v2, Phase 5)
 *
 * Per-muscle-group weekly set-count training landmarks: MEV (Minimum
 * Effective Volume — the least work that still drives adaptation), MAV
 * (Maximum Adaptive Volume — the "sweet spot" most weekly training should
 * live in), and MRV (Maximum Recoverable Volume — the ceiling beyond which
 * more sets stop helping and start digging a recovery hole).
 *
 * SOURCING: this is Dr. Mike Israetel / Renaissance Periodization's landmark
 * framework (MEV/MAV/MRV), the standard reference for volume periodization
 * in resistance training — see RP's published hypertrophy training guides.
 * The framework's own position is that these are individualized STARTING
 * POINTS to autoregulate from, not fixed universal constants — exact
 * absolute numbers vary by source/edition. Rather than inventing a second,
 * possibly-conflicting absolute table, this service DERIVES MEV/MAV as
 * ratios of the MRV baseline FitAI already ships and shows users today
 * (workoutInsightsService.MAX_RECOVERABLE_SETS) — those ratios (MEV ~40-50%
 * of MRV, MAV ~65-85%) are the stable, broadly-agreed-upon part of the
 * framework regardless of exactly which absolute MRV numbers a given source
 * prints. This keeps FitAI's volume guidance internally consistent instead
 * of showing two different opinions about the same muscle's ceiling.
 *
 * Training-age and goal scaling are separately well-established:
 *   - Beginners adapt to almost any stimulus and have lower work capacity —
 *     both landmarks and the ceiling shift down.
 *   - Advanced trainees have a higher ceiling and need more volume to keep
 *     progressing (diminishing per-set returns, but a higher MRV) — shift up.
 *   - Strength-focused training uses fewer, heavier sets than hypertrophy
 *     training at the same intensity — the whole curve shifts down.
 *   - Goals not centered on muscle growth (endurance, weight-loss, general
 *     fitness, flexibility) aren't chasing hypertrophy volume the same way —
 *     a smaller downward shift on MAV/MRV; MEV is left alone since "the
 *     least work that still does something" doesn't really change by goal.
 */
import { MAX_RECOVERABLE_SETS, MAJOR_MUSCLE_GROUPS } from './workoutInsightsService';
import type { CatalogEntry } from '../data/exerciseCatalog.generated';
import { getCatalogEntry } from '../data/exerciseCatalog.generated';
import { resolveExerciseMeta } from '../utils/resolveExerciseMeta';

export type MajorMuscleGroup = (typeof MAJOR_MUSCLE_GROUPS)[number];
export type TrainingAge = 'beginner' | 'intermediate' | 'advanced';

/**
 * The 7 onboarding goal ids (src/screens/onboarding/tabs/
 * WorkoutPreferencesConstants.ts FITNESS_GOALS) collapsed into the training
 * emphasis that actually changes volume/rep/rest/scheme prescription.
 * 'weight-gain' maps to 'hypertrophy' — "gain healthy weight (muscle and
 * mass)" is a hypertrophy-oriented goal, not a distinct volume profile.
 */
export type TrainingEmphasis =
  | 'strength'
  | 'hypertrophy'
  | 'endurance'
  | 'general';

const GOAL_ID_TO_EMPHASIS: Record<string, TrainingEmphasis> = {
  strength: 'strength',
  'muscle-gain': 'hypertrophy',
  'weight-gain': 'hypertrophy',
  endurance: 'endurance',
  'weight-loss': 'general',
  general_fitness: 'general',
  flexibility: 'general',
};

/**
 * A user's onboarding primary_goals is a multi-select array — volume
 * scaling needs one dominant lens, so pick by priority. Strength first
 * (most restrictive/specific — a strength-focused lifter training volume
 * like a bodybuilder would be overreaching), then hypertrophy (the
 * framework's native context), then endurance, else general.
 */
const EMPHASIS_PRIORITY: TrainingEmphasis[] = ['strength', 'hypertrophy', 'endurance', 'general'];

export function resolveTrainingEmphasis(primaryGoals: string[] | undefined): TrainingEmphasis {
  if (!primaryGoals || primaryGoals.length === 0) return 'general';
  const emphases = new Set(
    primaryGoals.map((g) => GOAL_ID_TO_EMPHASIS[g]).filter((e): e is TrainingEmphasis => !!e),
  );
  for (const candidate of EMPHASIS_PRIORITY) {
    if (emphases.has(candidate)) return candidate;
  }
  return 'general';
}

// ── Scaling factors ─────────────────────────────────────────────────────────
// Applied multiplicatively to the MRV baseline. MEV factor is expressed as a
// fraction OF that scaled MRV (not of the unscaled baseline) — see
// computeVolumeLandmarks. mavFactor stays a middle point between the two.

const TRAINING_AGE_MRV_SCALE: Record<TrainingAge, number> = {
  beginner: 0.75,
  intermediate: 1.0,
  advanced: 1.2,
};

const EMPHASIS_MRV_SCALE: Record<TrainingEmphasis, number> = {
  strength: 0.8,
  hypertrophy: 1.0,
  endurance: 0.85,
  general: 0.9,
};

/** MEV as a fraction of the (already age/goal-scaled) MRV. */
const MEV_RATIO = 0.45;
/** MAV as a fraction of the (already age/goal-scaled) MRV — the midpoint of
 * RP's commonly cited ~65-85% range. */
const MAV_RATIO = 0.75;

export interface VolumeLandmarks {
  mev: number;
  mav: number;
  mrv: number;
}

/**
 * Weekly set-count landmarks for one muscle group, scaled by training age
 * and goal. Falls back to a generic 12-set MRV (matching
 * workoutInsightsService's own unknown-muscle fallback) for a muscle group
 * outside MAX_RECOVERABLE_SETS.
 */
export function computeVolumeLandmarks(
  muscle: string,
  trainingAge: TrainingAge,
  emphasis: TrainingEmphasis,
): VolumeLandmarks {
  const baseline = MAX_RECOVERABLE_SETS[muscle] ?? 12;
  const mrv = Math.round(baseline * TRAINING_AGE_MRV_SCALE[trainingAge] * EMPHASIS_MRV_SCALE[emphasis]);
  const mav = Math.round(mrv * MAV_RATIO);
  const mev = Math.round(mrv * MEV_RATIO);
  return { mev, mav, mrv };
}

/** All 10 major muscle groups' landmarks for a given training age + emphasis. */
export function computeAllVolumeLandmarks(
  trainingAge: TrainingAge,
  emphasis: TrainingEmphasis,
): Record<MajorMuscleGroup, VolumeLandmarks> {
  const result = {} as Record<MajorMuscleGroup, VolumeLandmarks>;
  for (const muscle of MAJOR_MUSCLE_GROUPS) {
    result[muscle] = computeVolumeLandmarks(muscle, trainingAge, emphasis);
  }
  return result;
}

// ── Set counting ─────────────────────────────────────────────────────────

export interface PlannedExerciseLike {
  exerciseId: string;
  /** Number of sets this exercise contributes (e.g. PlannedExercise.sets.length). */
  setCount: number;
}

/**
 * Tally weekly sets per muscle group across a week's exercises. Primary
 * muscles get full credit per set; secondary muscles get HALF credit — an
 * exercise's secondary musculature is stimulated, but not to the same
 * degree as the muscle it's actually targeting (standard practice in
 * volume-landmark tracking, matching how RP's own set-counting guidance
 * treats indirect/secondary work).
 *
 * Resolves muscles via resolveExerciseMeta (catalog-first, see
 * src/utils/resolveExerciseMeta.ts) rather than ad hoc string matching, so
 * this works for both ExerciseDB hash IDs and legacy curated IDs. NOTE:
 * resolveExerciseMeta.muscleGroups merges primary+secondary into one flat
 * list with no way to tell which is which — for full-credit primary /
 * half-credit secondary this function reads the catalog entry directly
 * (getCatalogEntry) and only falls back to resolveExerciseMeta's flat list
 * (full credit only) for an exerciseId the catalog doesn't resolve.
 */
export function countWeeklySetsByMuscle(
  exercises: PlannedExerciseLike[],
  getCatalogEntry: (exerciseId: string) => CatalogEntry | null,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const ex of exercises) {
    const entry = getCatalogEntry(ex.exerciseId);
    if (entry) {
      for (const muscle of entry.primaryMuscles) {
        counts[muscle] = (counts[muscle] ?? 0) + ex.setCount;
      }
      for (const muscle of entry.secondaryMuscles) {
        counts[muscle] = (counts[muscle] ?? 0) + ex.setCount * 0.5;
      }
      continue;
    }
    // Catalog miss (shouldn't happen post-Phase-1, but resolveExerciseMeta's
    // dual-lookup fallback still covers a legacy/unresolved id) — full
    // credit only, no primary/secondary distinction available.
    const meta = resolveExerciseMeta(ex.exerciseId);
    for (const muscle of meta.muscleGroups) {
      counts[muscle] = (counts[muscle] ?? 0) + ex.setCount;
    }
  }

  return counts;
}

/** Convenience wrapper for real call sites — uses the real catalog resolver
 * (src/data/exerciseCatalog.generated.ts) instead of requiring callers to
 * inject one. countWeeklySetsByMuscle takes the resolver as a param so tests
 * can pass a small synthetic fixture instead of depending on the full
 * 1,552-row generated catalog. */
export function countWeeklySetsByMuscleFromCatalog(
  exercises: PlannedExerciseLike[],
): Record<string, number> {
  return countWeeklySetsByMuscle(exercises, getCatalogEntry);
}

export type LandmarkZone = 'under_mev' | 'mev_to_mav' | 'mav_to_mrv' | 'over_mrv';

/** Which zone a muscle's weekly set count falls in, relative to its landmarks. */
export function classifyVolumeZone(sets: number, landmarks: VolumeLandmarks): LandmarkZone {
  if (sets < landmarks.mev) return 'under_mev';
  if (sets < landmarks.mav) return 'mev_to_mav';
  if (sets <= landmarks.mrv) return 'mav_to_mrv';
  return 'over_mrv';
}
