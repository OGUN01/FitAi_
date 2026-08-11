/**
 * Builder Validation Service — client-side validation wrapper for the workout
 * builder (Phase 6.1).
 *
 * Combines four signal sources into a single `ValidationWarning[]`:
 *   a. Muscle-balance warnings — delegated to `workoutInsightsService.computeWeeklyInsights`
 *      (which already produces `balanceWarnings` for missing legs, insufficient
 *      pull, under-hit groups, missing warmups).
 *   b. Safety validation — `ExerciseValidationService.validateExerciseSafety`
 *      for pregnancy / injury / medical-condition constraints. Produces a
 *      `replace_exercise` fixAction when a violation is found.
 *   c. Volume overload — single-exercise >6 sets/day, or weekly per-muscle
 *      sets >1.5× max-recoverable-volume.
 *   d. Compound clustering — 4+ compound lifts (squat/deadlift/bench/row/
 *      pull-up/overhead-press) on a single day.
 *
 * Pure function — no side effects, no DB calls. Profile param is optional;
 * safety validation is skipped when absent (per spec).
 *
 * NOTE: `MAX_RECOVERABLE_SETS` is re-derived locally rather than imported
 * because the Phase 0 `workoutInsightsService` does not export it, and Phase 6
 * must not modify Phase 0 files. The values mirror that service exactly; if
 * they drift, both should be updated. (See deviation note in Phase 6 summary.)
 */
import type { WeeklyWorkoutPlan } from "../types/ai";
import type { PlannedExercise, ValidationWarning } from "../types/workout";
import { computeWeeklyInsights } from "./workoutInsightsService";
import { validateExerciseSafety } from "../ai/exerciseValidationService";
import { CURATED_EXERCISES } from "../data/curatedExercises";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

/**
 * Safety-relevant profile slice. Maps 1:1 to the fields on
 * `BodyAnalysisData` (src/types/onboarding/body-analysis.ts) that drive
 * `validateExerciseSafety`. Kept minimal + structural so the caller can pass
 * a subset without coupling to the full onboarding type.
 */
export interface ValidationProfile {
  pregnancyStatus?: boolean;
  pregnancyTrimester?: 1 | 2 | 3;
  injuries?: string[];
  medicalConditions?: string[];
}

export interface ValidatePlanOptions {
  /** Safety constraints. When omitted, safety validation is skipped. */
  profile?: ValidationProfile | null;
}

// ----------------------------------------------------------------------------
// CONSTANTS — mirror workoutInsightsService.MAX_RECOVERABLE_SETS (Phase 0)
// ----------------------------------------------------------------------------

/**
 * Max recoverable weekly sets per muscle group. Re-derived locally because the
 * Phase 0 service does not export this map and Phase 6 must not edit Phase 0
 * files. Keep in sync with `workoutInsightsService.MAX_RECOVERABLE_SETS`.
 */
const MAX_RECOVERABLE_SETS: Record<string, number> = {
  chest: 20,
  back: 22,
  shoulders: 16,
  biceps: 14,
  triceps: 14,
  quadriceps: 24,
  hamstrings: 18,
  glutes: 20,
  calves: 16,
  core: 18,
};

/** Single-exercise set count above which a day is considered overloaded. */
const MAX_SETS_PER_EXERCISE_PER_DAY = 6;

/** Multiplier on max-recoverable sets before flagging over-volume. */
const OVERLOAD_MULTIPLIER = 1.5;

/** Compound-lift count in one day above which we warn. */
const COMPOUND_CLUSTER_THRESHOLD = 4;

/**
 * Name keywords identifying compound lifts. Matched case-insensitively
 * against the exercise name (curated `name` field).
 */
const COMPOUND_KEYWORDS = [
  "squat",
  "deadlift",
  "bench",
  "row",
  "pull-up",
  "pullup",
  "pull up",
  "overhead press",
  "military press",
  "ohp",
];

// ----------------------------------------------------------------------------
// PUBLIC API
// ----------------------------------------------------------------------------

/**
 * Validate a weekly workout plan and return a de-duplicated list of warnings.
 *
 * @param plan   - The draft plan being edited.
 * @param opts   - Optional profile for safety validation.
 * @returns ValidationWarning[] (empty when the plan is balanced + safe).
 */
export function validatePlan(
  plan: WeeklyWorkoutPlan | null,
  opts: ValidatePlanOptions = {},
): ValidationWarning[] {
  if (!plan) return [];

  const warnings: ValidationWarning[] = [];

  // (a) Muscle-balance warnings — delegate to the Phase 0 insights service.
  //     computeWeeklyInsights is pure and cheap; calling it here gives us the
  //     exact same balance signal the insights panel renders (single source
  //     of truth — CLAUDE.md §1).
  const insights = computeWeeklyInsights(plan, { userWeightKg: null });
  warnings.push(...insights.balanceWarnings);

  // (b) Safety validation (pregnancy / injury / medical conditions).
  if (opts.profile) {
    warnings.push(...validateSafety(plan, opts.profile));
  }

  // (c) Volume overload.
  warnings.push(...validateVolumeOverload(plan));

  // (d) Compound clustering.
  warnings.push(...validateCompoundClustering(plan));

  // De-duplicate by id (balance warnings + volume warnings could overlap on
  // the same muscle group; keep first occurrence, which is the balance one —
  // it carries the more actionable fixAction).
  const seen = new Set<string>();
  return warnings.filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
}

// ----------------------------------------------------------------------------
// (b) SAFETY VALIDATION
// ----------------------------------------------------------------------------

/**
 * Run `validateExerciseSafety` across every planned exercise, mapping each
 * violation to a `safety_constraint` warning with a `replace_exercise`
 * fixAction. The suggested replacement is the first curated exercise in the
 * same primary muscle group that itself passes safety validation.
 */
function validateSafety(
  plan: WeeklyWorkoutPlan,
  profile: ValidationProfile,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Flatten planned exercises into the shape validateExerciseSafety expects.
  const exercises = collectAllExercises(plan);

  const violations = validateExerciseSafety(exercises, {
    pregnancyStatus: profile.pregnancyStatus,
    pregnancyTrimester: profile.pregnancyTrimester,
    injuries: profile.injuries,
    medicalConditions: profile.medicalConditions,
  });

  for (const violation of violations) {
    const curated = CURATED_EXERCISES.find((c) => c.id === violation.exerciseId);
    const muscleGroup = curated?.muscleGroups[0] ?? "full_body";
    const replacement = findSafeReplacement(muscleGroup, profile);

    warnings.push({
      id: `safety_${violation.exerciseId}`,
      type: "safety_constraint",
      severity: "error",
      message: violation.reason,
      exerciseId: violation.exerciseId,
      fixAction: replacement
        ? {
            label: `Replace with ${replacement.name}`,
            type: "replace_exercise",
            payload: {
              exerciseId: violation.exerciseId,
              suggestedReplacementId: replacement.id,
            },
          }
        : {
            label: "Remove exercise",
            type: "remove_exercise",
            payload: { exerciseId: violation.exerciseId },
          },
    });
  }

  return warnings;
}

/** Collect all planned exercises across the week into the safety-validator shape. */
function collectAllExercises(
  plan: WeeklyWorkoutPlan,
): Array<{ id: string; name: string; category?: string; tags?: string[]; muscleGroups?: string[] }> {
  const out: Array<{ id: string; name: string; category?: string; tags?: string[]; muscleGroups?: string[] }> = [];
  for (const day of plan.workouts) {
    for (const ex of day.plannedExercises ?? []) {
      const curated = CURATED_EXERCISES.find((c) => c.id === ex.exerciseId);
      out.push({
        id: ex.exerciseId,
        name: ex.name,
        category: curated?.category,
        tags: [], // CuratedExercises have no tags field; safety matcher keys off name.
        muscleGroups: curated?.muscleGroups,
      });
    }
  }
  return out;
}

/**
 * Find the first curated exercise targeting `muscleGroup` that does NOT itself
 * violate the user's safety constraints. Returns null if none found.
 */
function findSafeReplacement(
  muscleGroup: string,
  profile: ValidationProfile,
): { id: string; name: string } | null {
  for (const candidate of CURATED_EXERCISES) {
    if (!candidate.muscleGroups.includes(muscleGroup)) continue;
    const violations = validateExerciseSafety(
      [{ id: candidate.id, name: candidate.name, tags: [], muscleGroups: candidate.muscleGroups }],
      {
        pregnancyStatus: profile.pregnancyStatus,
        pregnancyTrimester: profile.pregnancyTrimester,
        injuries: profile.injuries,
        medicalConditions: profile.medicalConditions,
      },
    );
    if (violations.length === 0) {
      return { id: candidate.id, name: candidate.name };
    }
  }
  return null;
}

// ----------------------------------------------------------------------------
// (c) VOLUME OVERLOAD
// ----------------------------------------------------------------------------

/**
 * Detect volume overload at two granularities:
 *   1. Single exercise with > MAX_SETS_PER_EXERCISE_PER_DAY sets in one day.
 *   2. Weekly per-muscle-group sets > OVERLOAD_MULTIPLIER × max-recoverable.
 */
function validateVolumeOverload(plan: WeeklyWorkoutPlan): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // 1. Per-exercise per-day overload.
  plan.workouts.forEach((day, dayIndex) => {
    for (const ex of day.plannedExercises ?? []) {
      if (ex.sets.length > MAX_SETS_PER_EXERCISE_PER_DAY) {
        warnings.push({
          id: `excessive_volume_ex_${ex.exerciseId}_day_${dayIndex}`,
          type: "excessive_volume",
          severity: "warning",
          message: `${ex.name} has ${ex.sets.length} sets on ${capitalize(day.dayOfWeek)} — consider splitting across days or reducing to ≤${MAX_SETS_PER_EXERCISE_PER_DAY}.`,
          exerciseId: ex.exerciseId,
          dayIndex,
          fixAction: {
            label: "Reduce sets",
            type: "adjust_volume",
            payload: { dayIndex, exerciseId: ex.exerciseId, targetSets: MAX_SETS_PER_EXERCISE_PER_DAY },
          },
        });
      }
    }
  });

  // 2. Per-muscle weekly overload.
  const weeklyMuscleSets = computeWeeklyMuscleSets(plan);
  for (const [muscle, sets] of Object.entries(weeklyMuscleSets)) {
    const max = MAX_RECOVERABLE_SETS[muscle] ?? 12;
    if (sets > max * OVERLOAD_MULTIPLIER) {
      warnings.push({
        id: `excessive_volume_muscle_${muscle}`,
        type: "excessive_volume",
        severity: "warning",
        message: `${capitalize(muscle)} weekly volume is ${sets} sets (max recoverable ≈${Math.round(max * OVERLOAD_MULTIPLIER)}). Recovery may be compromised.`,
        fixAction: {
          label: `Reduce ${muscle} volume`,
          type: "adjust_volume",
          payload: { muscleGroup: muscle, targetSets: max },
        },
      });
    }
  }

  return warnings;
}

/** Sum set counts per muscle group across all active days. */
function computeWeeklyMuscleSets(plan: WeeklyWorkoutPlan): Record<string, number> {
  const map: Record<string, number> = {};
  for (const day of plan.workouts) {
    for (const ex of day.plannedExercises ?? []) {
      const setCount = ex.sets.length;
      for (const muscle of getMuscleGroupsForExercise(ex.exerciseId)) {
        map[muscle] = (map[muscle] ?? 0) + setCount;
      }
    }
  }
  return map;
}

// ----------------------------------------------------------------------------
// (d) COMPOUND CLUSTERING
// ----------------------------------------------------------------------------

/**
 * Warn when a single day contains COMPOUND_CLUSTER_THRESHOLD or more compound
 * lifts. Compounds are identified by keyword matching against the exercise
 * name (squat / deadlift / bench / row / pull-up / overhead-press).
 */
function validateCompoundClustering(plan: WeeklyWorkoutPlan): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  plan.workouts.forEach((day, dayIndex) => {
    const planned = day.plannedExercises ?? [];
    if (planned.length === 0) return;

    const compoundCount = planned.filter((ex) => isCompound(ex)).length;
    if (compoundCount >= COMPOUND_CLUSTER_THRESHOLD) {
      warnings.push({
        id: `too_many_compounds_day_${dayIndex}`,
        type: "too_many_compounds",
        severity: "info",
        message: `${capitalize(day.dayOfWeek)} has ${compoundCount} compound lifts — CNS fatigue risk. Consider spreading across days or swapping one for an isolation.`,
        dayIndex,
        fixAction: {
          label: "Review day",
          type: "adjust_volume",
          payload: { dayIndex },
        },
      });
    }
  });

  return warnings;
}

/** True when an exercise name contains a compound-lift keyword. */
function isCompound(ex: PlannedExercise): boolean {
  const name = ex.name.toLowerCase();
  return COMPOUND_KEYWORDS.some((kw) => name.includes(kw));
}

// ----------------------------------------------------------------------------
// SHARED HELPERS
// ----------------------------------------------------------------------------

function getMuscleGroupsForExercise(exerciseId: string): string[] {
  const curated = CURATED_EXERCISES.find((c) => c.id === exerciseId);
  return curated?.muscleGroups ?? [];
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Re-exported for consumers (e.g. the insights panel can reuse this map when
// rendering per-muscle coverage bars against max-recoverable thresholds).
export { MAX_RECOVERABLE_SETS };
