/**
 * Plan Burn — daily-average calorie burn from the ACTIVE workout plan.
 *
 * Phase A.1 of the goal engine. Reuses `calculateWorkoutCalories`
 * (src/services/calorieCalculator.ts) per workout for strength exercises, and
 * resolves `CardioBlock` entries via MET from `EXERCISE_TYPE_MET_OVERRIDES`
 * × intensity modifier × duration.
 *
 * The weekly total is divided by 7 for the daily average that feeds
 * `effectiveTdee = NEAT_TDEE + planBurnPerDay`. Per-day breakdown is returned
 * so the ledger can reconcile day-by-day.
 */

import type { WeeklyWorkoutPlan } from "../../types/ai";
import type { Workout, CardioBlock } from "../../types/workout";
import {
  calculateWorkoutCalories,
  type ExerciseCalorieInput,
} from "../calorieCalculator";
import { exerciseFilterService } from "../exerciseFilterService";
import {
  EXERCISE_TYPE_MET_OVERRIDES,
  getExerciseTypeOverride,
} from "../../utils/calorieCalculations/metMappings";
import { CARDIO_INTENSITY_MODIFIERS } from "./constants";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export interface PlanBurnResult {
  /** Daily average kcal/day = weeklyKcal / 7. */
  perDayKcal: number;
  /** Per-day burn indexed 0=Monday … 6=Sunday. */
  perDayOfWeek: number[];
  /** Total weekly kcal across all workout days. */
  weeklyKcal: number;
  /** Exercise IDs that could not be priced (no curated match, no MET override).
   *  Surfaced so the UI can warn rather than silently zeroing them. */
  unresolvedExerciseIds: string[];
}

// ----------------------------------------------------------------------------
// DAY-OF-WEEK MAPPING
// ----------------------------------------------------------------------------

const DAY_INDEX: Record<string, number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6,
};

// ----------------------------------------------------------------------------
// CARDIO BURN
// ----------------------------------------------------------------------------

/**
 * Compute calories for a single cardio block:
 *   MET × weightKg × (durationMinutes / 60) × intensityModifier
 *
 * MET is resolved from `EXERCISE_TYPE_MET_OVERRIDES` via name substring match
 * (running 9.8, cycling 7.5, rowing 7.0, jump rope 12.3, walking 3.5). Falls
 * back to a default cardio MET of 6.0 when the name doesn't match a known
 * override.
 */
function computeCardioBlockBurn(
  block: CardioBlock,
  weightKg: number,
): number {
  if (!weightKg || weightKg <= 0 || block.durationMinutes <= 0) return 0;

  const baseMet = getExerciseTypeOverride(block.name) ?? 6.0; // default cardio MET
  const intensityModifier =
    CARDIO_INTENSITY_MODIFIERS[block.intensity] ?? 1.0;
  const met = baseMet * intensityModifier;
  const hours = block.durationMinutes / 60;
  return Math.round(met * weightKg * hours);
}

// ----------------------------------------------------------------------------
// UNRESOLVED EXERCISE DETECTION
// ----------------------------------------------------------------------------

/**
 * An exercise is "unresolved" when we can't price it from either the curated
 * database or a known MET override. `calculateWorkoutCalories` still produces
 * a default-MET estimate, but the ID is flagged so the UI can surface it
 * rather than silently accepting a fallback number.
 */
function isExerciseUnresolved(exerciseId: string, name: string): boolean {
  if (exerciseId) {
    const dbExercise = exerciseFilterService.getExerciseById(exerciseId);
    if (dbExercise) return false;
  }
  // No curated match — check if the name resolves to a known MET override.
  const override = getExerciseTypeOverride(name);
  return override === null;
}

// ----------------------------------------------------------------------------
// DAY BURN
// ----------------------------------------------------------------------------

/**
 * Compute total burn for a single workout day: strength exercises via
 * `calculateWorkoutCalories` + cardio blocks via MET calc.
 */
function computeDayBurn(
  workout: Workout | null,
  weightKg: number,
  unresolved: Set<string>,
): number {
  if (!workout) return 0;

  let dayBurn = 0;

  // Strength exercises — prefer the canonical plannedExercises, fall back to
  // legacy exercises (WorkoutSet[]) for older plans.
  const planned = (workout as Workout & { plannedExercises?: any[] }).plannedExercises;
  if (planned && planned.length > 0) {
    const inputs: ExerciseCalorieInput[] = planned.map((p) => ({
      exerciseId: p.exerciseId,
      name: p.name,
      sets: p.sets?.length,
      reps: p.sets?.[0]?.reps,
      restTime: p.restSeconds,
      duration: p.sets?.[0]?.durationSeconds,
    }));
    const result = calculateWorkoutCalories(inputs, weightKg);
    dayBurn += result.totalCalories;
    // Check for unresolved exercises.
    for (const p of planned) {
      if (isExerciseUnresolved(p.exerciseId, p.name)) {
        unresolved.add(p.exerciseId);
      }
    }
  } else if (workout.exercises && workout.exercises.length > 0) {
    const inputs: ExerciseCalorieInput[] = workout.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name ?? e.exerciseName,
      sets: e.sets,
      reps: e.reps,
      restTime: e.restTime,
      duration: e.duration,
    }));
    const result = calculateWorkoutCalories(inputs, weightKg);
    dayBurn += result.totalCalories;
    for (const e of workout.exercises) {
      if (isExerciseUnresolved(e.exerciseId, e.name ?? e.exerciseName ?? "")) {
        unresolved.add(e.exerciseId);
      }
    }
  }

  // Cardio blocks.
  const cardioBlocks = (workout as Workout & { cardioBlocks?: CardioBlock[] }).cardioBlocks;
  if (cardioBlocks && cardioBlocks.length > 0) {
    for (const block of cardioBlocks) {
      dayBurn += computeCardioBlockBurn(block, weightKg);
    }
  }

  return dayBurn;
}

// ----------------------------------------------------------------------------
// PUBLIC API
// ----------------------------------------------------------------------------

/**
 * Compute the daily-average calorie burn from an active weekly workout plan.
 *
 * @param plan     - The active `WeeklyWorkoutPlan`, or `null` when no custom
 *                   plan is active (rest phase → PLAN_BURN = 0).
 * @param weightKg - User's current weight in kg. Required — no fallback.
 * @returns Per-day average, per-day breakdown, weekly total, and unresolved IDs.
 */
export function computePlanBurnPerDay(
  plan: WeeklyWorkoutPlan | null,
  weightKg: number | undefined | null,
): PlanBurnResult {
  if (!plan || !weightKg || weightKg <= 0) {
    return {
      perDayKcal: 0,
      perDayOfWeek: [0, 0, 0, 0, 0, 0, 0],
      weeklyKcal: 0,
      unresolvedExerciseIds: [],
    };
  }

  const unresolved = new Set<string>();
  const perDayOfWeek = [0, 0, 0, 0, 0, 0, 0];

  for (const day of plan.workouts) {
    // Rest days (isRestDay or no exercises and no cardio) contribute 0.
    const isRestDay =
      (day as Workout).isRestDay === true ||
      ((!day.plannedExercises || day.plannedExercises.length === 0) &&
        !(day as Workout & { cardioBlocks?: CardioBlock[] }).cardioBlocks?.length &&
        (!day.exercises || day.exercises.length === 0));

    if (isRestDay) continue;

    const dayIndex = day.dayOfWeek ? DAY_INDEX[day.dayOfWeek.toLowerCase()] ?? 0 : 0;
    const burn = computeDayBurn(day, weightKg, unresolved);
    perDayOfWeek[dayIndex] += burn;
  }

  const weeklyKcal = perDayOfWeek.reduce((sum, v) => sum + v, 0);
  const perDayKcal = Math.round(weeklyKcal / 7);

  return {
    perDayKcal,
    perDayOfWeek,
    weeklyKcal,
    unresolvedExerciseIds: [...unresolved],
  };
}

// Re-export for callers that need the MET override table (e.g. tests).
export { EXERCISE_TYPE_MET_OVERRIDES };
