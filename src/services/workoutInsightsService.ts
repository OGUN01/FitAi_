/**
 * Workout Insights Service — client-side computation of weekly plan analytics.
 *
 * Powers the Builder Summary Footer + Weekly Insights Panel (Phase 3 + Phase 6
 * of the workout-builder redesign). All math is pure; no DB calls.
 *
 * Calorie estimate uses the existing `calorieCalculator` (MET × weight × hours)
 * — same SSOT as workout completion (CLAUDE.md §9: calories SSOT).
 *
 * Muscle coverage + push/pull/recovery are computed from planned exercises'
 * `muscleGroups` (resolved via `resolveExerciseMeta` — DB → curated, so AI-plan
 * exercise ids outside the small legacy curated list still contribute muscle
 * coverage instead of silently zeroing).
 */
import type { WeeklyWorkoutPlan, DayWorkout } from "../types/ai";
import type {
  PlannedExercise,
  WeeklyInsights,
  ValidationWarning,
} from "../types/workout";
import { calculateWorkoutCalories } from "./calorieCalculator";
import { resolveExerciseMeta } from "../utils/resolveExerciseMeta";

// ----------------------------------------------------------------------------
// CONSTANTS — muscle group classification for push/pull/recovery
// ----------------------------------------------------------------------------

/** Major muscle groups tracked for weekly coverage (mirrors worker-side list). */
export const MAJOR_MUSCLE_GROUPS = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quadriceps",
  "hamstrings",
  "glutes",
  "calves",
  "core",
] as const;

/** Minimum recommended weekly frequency per muscle group. */
const MIN_WEEKLY_FREQUENCY = 2;

/**
 * Push muscles (chest, triceps, anterior/front delts).
 * Pull muscles (back, biceps, rear delts).
 */
const PUSH_MUSCLES = new Set(["chest", "triceps", "shoulders"]);
const PULL_MUSCLES = new Set(["back", "biceps", "lower_back"]);

/** Max recoverable weekly sets per muscle group (rough heuristic). Exported
 * as the MRV baseline for volumeLandmarksService (Workout Engine v2 Phase 5)
 * — kept as ONE table rather than two so the app's recovery-score math and
 * its volume-landmark guidance always agree on what "max recoverable" means
 * for a given muscle. */
export const MAX_RECOVERABLE_SETS: Record<string, number> = {
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

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export interface ComputeInsightsOptions {
  /** User weight in kg — required for calorie estimate. null = skip calorie calc. */
  userWeightKg?: number | null;
}

// ----------------------------------------------------------------------------
// PUBLIC API
// ----------------------------------------------------------------------------

/**
 * Compute weekly insights for a workout plan.
 *
 * @param plan - The weekly workout plan (with plannedExercises populated).
 * @param opts - Optional user weight for calorie calculation.
 * @returns WeeklyInsights (always non-null; zeroed if plan is empty).
 */
export function computeWeeklyInsights(
  plan: WeeklyWorkoutPlan,
  opts: ComputeInsightsOptions = {},
): WeeklyInsights {
  const userWeightKg = opts.userWeightKg ?? null;
  const activeDays = plan.workouts.filter(
    (d) => (d.plannedExercises?.length ?? 0) > 0,
  );

  // Aggregate per-muscle set counts across the week
  const muscleCoverage: Record<string, number> = {};
  let totalSets = 0;
  let pushSets = 0;
  let pullSets = 0;
  let totalVolume = 0;

  for (const day of activeDays) {
    for (const exercise of day.plannedExercises ?? []) {
      const muscleGroups = getMuscleGroupsForExercise(exercise.exerciseId);
      const setCount = exercise.sets.length;
      totalSets += setCount;
      for (const muscle of muscleGroups) {
        muscleCoverage[muscle] = (muscleCoverage[muscle] ?? 0) + setCount;
        if (PUSH_MUSCLES.has(muscle)) pushSets += setCount;
        if (PULL_MUSCLES.has(muscle)) pullSets += setCount;
      }
      // Volume = sets × reps × weight (per set)
      for (const set of exercise.sets) {
        const reps =
          typeof set.reps === "string"
            ? parseRepAverage(set.reps)
            : set.reps || 0;
        totalVolume += (set.weightKg ?? 0) * reps;
      }
    }
  }

  // Push/pull ratio (1.0 = balanced; >1 = push-heavy; <1 = pull-heavy)
  const pushPullRatio = pullSets > 0 ? pushSets / pullSets : pushSets > 0 ? 2 : 1;

  // Volume score: current total sets vs max-recoverable across all groups
  const maxRecoverable = sumMaxRecoverable(activeDays);
  const volumeScore =
    maxRecoverable > 0
      ? Math.min(100, Math.round((totalSets / maxRecoverable) * 100))
      : 0;

  // Recovery score: penalize consecutive-day same-muscle hits
  const recoveryScore = computeRecoveryScore(plan);

  // Time commitment: sum of day durations
  const timeCommitment = activeDays.reduce(
    (sum, d) => sum + (d.duration ?? 0),
    0,
  );

  // Calorie estimate: MET calc across all days
  const calorieEstimate = userWeightKg
    ? computeCalorieEstimate(plan, userWeightKg)
    : 0;

  // Weekly calories (estimate × workouts per week, capped at 7)
  const weeklyCalories = calorieEstimate * Math.min(activeDays.length, 7);

  // Balance warnings — surfaced inline (not popups)
  const balanceWarnings = computeBalanceWarnings(plan, muscleCoverage);

  return {
    pushPullRatio,
    muscleCoverage,
    recoveryScore,
    totalVolume,
    calorieEstimate,
    timeCommitment,
    weeklyCalories,
    balanceWarnings,
    volumeScore,
  };
}

// ----------------------------------------------------------------------------
// INTERNAL HELPERS
// ----------------------------------------------------------------------------

function getMuscleGroupsForExercise(exerciseId: string): string[] {
  // resolveExerciseMeta checks the real exercise DB first (AI-plan ids like
  // "aXcUyKb"), then falls back to the curated list (legacy builder ids like
  // "push_up"). The previous CURATED_EXERCISES-only lookup silently contributed
  // zero muscle coverage for any AI-plan exercise outside that ~70-entry list.
  return resolveExerciseMeta(exerciseId).muscleGroups;
}

/** Parse reps range "8-12" → average (10). Single value → itself. */
function parseRepAverage(reps: string): number {
  const parts = reps.split("-").map((p) => parseInt(p.trim(), 10));
  if (parts.length === 2 && !parts.some(isNaN)) {
    return Math.round((parts[0] + parts[1]) / 2);
  }
  const n = parseInt(reps, 10);
  return isNaN(n) ? 0 : n;
}

/** Sum of max-recoverable-sets for all muscles hit by the week's exercises. */
function sumMaxRecoverable(activeDays: DayWorkout[]): number {
  const hitMuscles = new Set<string>();
  for (const day of activeDays) {
    for (const exercise of day.plannedExercises ?? []) {
      for (const muscle of getMuscleGroupsForExercise(exercise.exerciseId)) {
        hitMuscles.add(muscle);
      }
    }
  }
  let total = 0;
  for (const muscle of hitMuscles) {
    total += MAX_RECOVERABLE_SETS[muscle] ?? 12;
  }
  return total;
}

/**
 * Recovery score (0-100). Penalizes:
 *  - Same muscle group trained on consecutive days above 6 sets/day
 *  - Total weekly sets exceeding max-recoverable-volume
 * Starts at 100, subtracts penalties, clamped to [0, 100].
 */
function computeRecoveryScore(plan: WeeklyWorkoutPlan): number {
  let score = 100;
  const dayMuscleSets: Array<Record<string, number>> = plan.workouts.map(
    (day) => {
      const map: Record<string, number> = {};
      for (const exercise of day.plannedExercises ?? []) {
        const sets = exercise.sets.length;
        for (const muscle of getMuscleGroupsForExercise(exercise.exerciseId)) {
          map[muscle] = (map[muscle] ?? 0) + sets;
        }
      }
      return map;
    },
  );

  // Consecutive-day same-muscle penalty (skip rest days between)
  const activeDayIndices = dayMuscleSets
    .map((m, i) => (Object.keys(m).length > 0 ? i : -1))
    .filter((i) => i >= 0);

  for (let i = 1; i < activeDayIndices.length; i++) {
    const prev = dayMuscleSets[activeDayIndices[i - 1]];
    const curr = dayMuscleSets[activeDayIndices[i]];
    for (const muscle of Object.keys(curr)) {
      if ((prev[muscle] ?? 0) >= 6 && (curr[muscle] ?? 0) >= 6) {
        score -= 8; // heavy consecutive penalty
      }
    }
  }

  // Over-volume penalty
  const totalWeeklySets = Object.values(
    dayMuscleSets.reduce<Record<string, number>>((acc, m) => {
      for (const [muscle, sets] of Object.entries(m)) {
        acc[muscle] = (acc[muscle] ?? 0) + sets;
      }
      return acc;
    }, {}),
  ).reduce((a, b) => a + b, 0);

  const totalMax = MAJOR_MUSCLE_GROUPS.reduce(
    (sum, m) => sum + (MAX_RECOVERABLE_SETS[m] ?? 12),
    0,
  );
  if (totalWeeklySets > totalMax) {
    score -= Math.min(30, Math.round(((totalWeeklySets - totalMax) / totalMax) * 100));
  }

  return Math.max(0, Math.min(100, score));
}

/** Compute calorie estimate using the existing calorieCalculator. */
function computeCalorieEstimate(
  plan: WeeklyWorkoutPlan,
  userWeightKg: number,
): number {
  let total = 0;
  for (const day of plan.workouts) {
    const planned = day.plannedExercises ?? [];
    if (planned.length === 0) continue;
    const exercises = planned.map((ex) => ({
      exerciseId: ex.exerciseId,
      name: ex.name,
      sets: ex.sets.length,
      reps: ex.sets[0]?.reps ?? 8,
      weight: ex.sets[0]?.weightKg,
      duration: ex.sets[0]?.durationSeconds,
      restTime: ex.restSeconds,
    }));
    const result = calculateWorkoutCalories(exercises, userWeightKg);
    total += result.totalCalories;
  }
  return total;
}

/** Build inline validation warnings from muscle coverage. */
function computeBalanceWarnings(
  plan: WeeklyWorkoutPlan,
  muscleCoverage: Record<string, number>,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  // Missing legs
  const legHits =
    (muscleCoverage["quadriceps"] ?? 0) +
    (muscleCoverage["hamstrings"] ?? 0) +
    (muscleCoverage["glutes"] ?? 0);
  if (legHits === 0) {
    warnings.push({
      id: "missing_legs",
      type: "missing_legs",
      severity: "warning",
      message: "No leg exercises this week — add a lower-body day for balance.",
      fixAction: {
        label: "Add leg day",
        type: "add_exercise",
        payload: { muscleGroup: "legs" },
      },
    });
  }

  // Insufficient pulling (back/biceps)
  const pullHits =
    (muscleCoverage["back"] ?? 0) + (muscleCoverage["biceps"] ?? 0);
  const pushHits =
    (muscleCoverage["chest"] ?? 0) + (muscleCoverage["triceps"] ?? 0);
  if (pushHits > 0 && pullHits === 0) {
    warnings.push({
      id: "insufficient_pull",
      type: "insufficient_pull",
      severity: "warning",
      message: "Push-heavy week with no pulling — add rows or pull-ups for joint health.",
      fixAction: {
        label: "Add pulling exercise",
        type: "add_exercise",
        payload: { muscleGroup: "back" },
      },
    });
  }

  // Under-hit major groups
  for (const muscle of MAJOR_MUSCLE_GROUPS) {
    const hits = muscleCoverage[muscle] ?? 0;
    if (hits > 0 && hits < MIN_WEEKLY_FREQUENCY) {
      warnings.push({
        id: `under_hit_${muscle}`,
        type: "muscle_imbalance",
        severity: "info",
        message: `${muscle} only trained ${hits}x this week (recommend ${MIN_WEEKLY_FREQUENCY}x minimum).`,
        fixAction: {
          label: `Add ${muscle} exercise`,
          type: "add_exercise",
          payload: { muscleGroup: muscle },
        },
      });
    }
  }

  // Missing warmup (check first exercise of each active day)
  for (let i = 0; i < plan.workouts.length; i++) {
    const day = plan.workouts[i];
    const planned = day.plannedExercises ?? [];
    if (planned.length === 0) continue;
    const hasWarmup = planned.some((ex) =>
      ex.sets.some((s) => s.setType === "warmup"),
    );
    if (!hasWarmup && planned.length >= 3) {
      warnings.push({
        id: `missing_warmup_day_${i}`,
        type: "missing_warmup",
        severity: "info",
        message: `${capitalize(day.dayOfWeek)} has no warmup sets — consider adding 1-2 light sets.`,
        dayIndex: i,
        fixAction: {
          label: "Add warmup",
          type: "adjust_volume",
          payload: { dayIndex: i },
        },
      });
    }
  }

  return warnings;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
