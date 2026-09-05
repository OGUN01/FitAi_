/**
 * Goal Projection — range-based ETA with a confidence ladder.
 *
 * Phase A.1. The rate is an OUTPUT (never a limit):
 *
 *   RATE = (effectiveTdee − plannedIntake) × 7 / CALORIE_PER_KG
 *
 * Confidence ladder (narrowed by real weigh-ins):
 *   0–2 weigh-ins → 'plan_math'  (safe band: range from 0.75–1.00 realization factor;
 *                                 aggressive/unpredictable: NO date)
 *   3–5          → 'blended'     (~±4 days)
 *   6+           → 'observed'    (least-squares slope over last 28 days of
 *                                 mergeWeightSeries output, ~±2 days; never the
 *                                 last raw reading)
 *
 * Maintenance / recomp goals get no weight-loss ETA — body-comp messaging, not
 * a blank card.
 */

import { mergeWeightSeries } from "../../components/progress/goalProgressUtils";
import {
  CALORIE_PER_KG,
  REALIZATION_FACTORS,
  LEDGER_WINDOWS,
  MIN_MEANINGFUL_WEEKLY_RATE_KG,
  MAX_PROJECTION_WEEKS,
  type RateBand,
} from "./constants";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export type GoalDirection = "loss" | "gain" | "maintain";

export type ProjectionConfidence = "plan_math" | "blended" | "observed";

export interface ProjectGoalInput {
  /** Effective TDEE = NEAT_TDEE + PLAN_BURN (the live number). */
  effectiveTdee: number;
  /** Planned daily intake in kcal. */
  plannedIntake: number;
  /** Current body weight in kg. */
  currentWeightKg: number;
  /** Target body weight in kg. */
  targetWeightKg: number;
  /** Goal direction: loss | gain | maintain. */
  goalDirection: GoalDirection;
  /** Rate band from the safety gate (determines whether a date is shown). */
  rateBand: RateBand;
  /** Weight history from mergeWeightSeries (authed users) — used for the
   *  confidence ladder. */
  weightHistory?: Array<{ date: string; weight: number }>;
  /** Progress entries (guest / Supabase) — merged with weightHistory. */
  progressEntries?: Array<{ entry_date: string; weight_kg: number | null }>;
}

export interface ProjectGoalResult {
  /** Computed weekly rate in kg/week (signed: + = loss, − = gain). */
  weeklyRateKg: number;
  /** Rate band (passed through from input). */
  band: RateBand;
  /** Confidence tier based on weigh-in count. */
  confidence: ProjectionConfidence;
  /** Earliest ETA (optimistic / 1.00 realization). null when no date is shown. */
  etaEarliest: Date | null;
  /** Latest ETA (conservative / 0.75 realization, or observed ± margin). null when no date. */
  etaLatest: Date | null;
  /** Human-readable label for the projection. */
  label: string;
  /** Number of weigh-ins used to determine the confidence tier. */
  weighInsUsed: number;
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

/** Hermes-safe month names (no Intl dependency). */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, Math.round(weeks * 7));
}

// ----------------------------------------------------------------------------
// LEAST-SQUARES SLOPE (observed confidence)
// ----------------------------------------------------------------------------

/**
 * Simple linear regression slope (kg/day) over the last N weigh-ins.
 * Returns the rate of weight change per day; multiply by 7 for kg/week.
 *
 * Never uses the last raw reading alone — fits a line over the window so
 * week-1 water loss doesn't dominate.
 */
function leastSquaresSlopePerDay(
  points: Array<{ date: string; weight: number }>,
): number {
  if (points.length < 2) return 0;

  // Convert dates to day-offsets from the first point.
  const first = new Date(points[0].date).getTime();
  const xs = points.map((p) => (new Date(p.date).getTime() - first) / (1000 * 60 * 60 * 24));
  const ys = points.map((p) => p.weight);

  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
  const sumXX = xs.reduce((acc, x) => acc + x * x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (Math.abs(denominator) < 1e-9) return 0;

  return (n * sumXY - sumX * sumY) / denominator; // kg per day
}

// ----------------------------------------------------------------------------
// PUBLIC API
// ----------------------------------------------------------------------------

/**
 * Project the user's goal: weekly rate, confidence tier, and ETA range.
 *
 * RATE is always computed (it's an output). The ETA is only shown when:
 *   - The rate is meaningful (≥ MIN_MEANINGFUL_WEEKLY_RATE_KG).
 *   - The rate band is 'safe' (for plan_math) or any band (for blended/observed
 *     with real weigh-ins — the data speaks for itself).
 *   - The goal direction is loss or gain (maintain → body-comp messaging).
 *
 * For 'plan_math' + safe band: the range comes from the 0.75–1.00 realization
 * factor (etaEarliest at 1.00, etaLatest at 0.75).
 * For 'blended': ~±4 days around the central estimate.
 * For 'observed': ~±2 days around the least-squares-derived estimate.
 */
export function projectGoal(input: ProjectGoalInput): ProjectGoalResult {
  const {
    effectiveTdee,
    plannedIntake,
    currentWeightKg,
    targetWeightKg,
    goalDirection,
    rateBand,
    weightHistory,
    progressEntries,
  } = input;

  // ── Rate (always computed — it's an output) ──
  const dailyDelta = effectiveTdee - plannedIntake; // + = deficit (loss), − = surplus (gain)
  const weeklyRateKg = (dailyDelta * 7) / CALORIE_PER_KG;

  // ── Maintenance / recomp: no weight-loss ETA ──
  if (goalDirection === "maintain") {
    return {
      weeklyRateKg,
      band: rateBand,
      confidence: "plan_math",
      etaEarliest: null,
      etaLatest: null,
      label:
        "Recomposition, not a race to a date — focus on body composition and consistency.",
      weighInsUsed: 0,
    };
  }

  // ── Confidence ladder ──
  const merged = mergeWeightSeries(weightHistory, progressEntries ?? []);
  const weighInsUsed = merged.length;

  let confidence: ProjectionConfidence;
  if (weighInsUsed >= LEDGER_WINDOWS.observedMinWeighIns) {
    confidence = "observed";
  } else if (weighInsUsed >= LEDGER_WINDOWS.blendedMinWeighIns) {
    confidence = "blended";
  } else {
    confidence = "plan_math";
  }

  // ── Direction guard: don't project when the plan moves the wrong way ──
  // Strict inequality: rate === 0 is "no progress" (calorie-neutral), NOT a
  // direction conflict. Only a rate moving AWAY from the goal conflicts.
  const directionConflict =
    (goalDirection === "loss" && weeklyRateKg < 0) ||
    (goalDirection === "gain" && weeklyRateKg > 0);

  const hasMeaningfulRate =
    Math.abs(weeklyRateKg) >= MIN_MEANINGFUL_WEEKLY_RATE_KG;

  // ── Determine whether to show a date ──
  //
  // plan_math + aggressive/unpredictable → NO date (per the decision).
  // plan_math + safe → range from 0.75–1.00 realization factor.
  // blended / observed → show with margin (data-backed).
  const showDate =
    hasMeaningfulRate &&
    !directionConflict &&
    (confidence !== "plan_math" || rateBand === "safe");

  if (!showDate) {
    // No date — provide an honest label.
    if (directionConflict) {
      return {
        weeklyRateKg,
        band: rateBand,
        confidence,
        etaEarliest: null,
        etaLatest: null,
        label:
          goalDirection === "loss"
            ? "This plan moves you away from your weight-loss goal — adjust intake or add burn."
            : "This plan moves you away from your weight-gain goal — increase intake.",
        weighInsUsed,
      };
    }

    if (!hasMeaningfulRate) {
      return {
        weeklyRateKg,
        band: rateBand,
        confidence,
        etaEarliest: null,
        etaLatest: null,
        label: "Near-zero rate — the plan is roughly calorie-neutral.",
        weighInsUsed,
      };
    }

    // Aggressive / unpredictable with insufficient weigh-ins → no date.
    return {
      weeklyRateKg,
      band: rateBand,
      confidence,
      etaEarliest: null,
      etaLatest: null,
      label:
        "Aggressive rate — no projected date until 3+ weigh-ins confirm the trend.",
      weighInsUsed,
    };
  }

  // ── Compute ETA ──
  const weightDeltaKg = Math.abs(currentWeightKg - targetWeightKg);
  const absRate = Math.abs(weeklyRateKg);

  let etaEarliest: Date | null = null;
  let etaLatest: Date | null = null;
  let label = "";

  if (confidence === "plan_math") {
    // Safe band: range from optimistic (1.00) to conservative (0.75) realization.
    const optimisticRate = absRate * REALIZATION_FACTORS.optimistic;
    const conservativeRate = absRate * REALIZATION_FACTORS.conservative;

    const weeksEarliest = weightDeltaKg / optimisticRate;
    const weeksLatest = weightDeltaKg / conservativeRate;

    if (
      Number.isFinite(weeksEarliest) &&
      weeksEarliest > 0 &&
      weeksLatest <= MAX_PROJECTION_WEEKS
    ) {
      const base = new Date();
      etaEarliest = addWeeks(base, weeksEarliest);
      etaLatest = addWeeks(base, weeksLatest);
      label = `On track: ${formatMonthYear(etaEarliest)} – ${formatMonthYear(etaLatest)} (plan estimate, confirm with weigh-ins).`;
    } else {
      label = "Goal horizon exceeds 5 years — consider an intermediate milestone.";
    }
  } else if (confidence === "blended") {
    // Blended: central estimate ± 4 days.
    const weeksCentral = weightDeltaKg / absRate;
    if (Number.isFinite(weeksCentral) && weeksCentral > 0 && weeksCentral <= MAX_PROJECTION_WEEKS) {
      const central = addWeeks(new Date(), weeksCentral);
      etaEarliest = addDays(central, -LEDGER_WINDOWS.blendedMarginDays);
      etaLatest = addDays(central, LEDGER_WINDOWS.blendedMarginDays);
      label = `Blended estimate: ${formatMonthYear(etaEarliest)} – ${formatMonthYear(etaLatest)} (±${LEDGER_WINDOWS.blendedMarginDays} days, refining with weigh-ins).`;
    } else {
      label = "Goal horizon exceeds 5 years — consider an intermediate milestone.";
    }
  } else {
    // Observed: least-squares slope over last 28 days, ± 2 days.
    const recent = merged.slice(-LEDGER_WINDOWS.observedLookbackDays);
    const slopePerDay = leastSquaresSlopePerDay(recent);
    const observedWeeklyRate = Math.abs(slopePerDay * 7);

    if (
      observedWeeklyRate >= MIN_MEANINGFUL_WEEKLY_RATE_KG &&
      Number.isFinite(weightDeltaKg / observedWeeklyRate) &&
      weightDeltaKg / observedWeeklyRate <= MAX_PROJECTION_WEEKS
    ) {
      const weeksCentral = weightDeltaKg / observedWeeklyRate;
      const central = addWeeks(new Date(), weeksCentral);
      etaEarliest = addDays(central, -LEDGER_WINDOWS.observedMarginDays);
      etaLatest = addDays(central, LEDGER_WINDOWS.observedMarginDays);
      label = `Observed trend: ${formatMonthYear(etaEarliest)} – ${formatMonthYear(etaLatest)} (±${LEDGER_WINDOWS.observedMarginDays} days, from ${weighInsUsed} weigh-ins).`;
    } else {
      // Observed rate too low or unavailable — fall back to plan_math.
      const weeksCentral = weightDeltaKg / absRate;
      if (Number.isFinite(weeksCentral) && weeksCentral > 0 && weeksCentral <= MAX_PROJECTION_WEEKS) {
        const central = addWeeks(new Date(), weeksCentral);
        etaEarliest = addDays(central, -LEDGER_WINDOWS.observedMarginDays);
        etaLatest = addDays(central, LEDGER_WINDOWS.observedMarginDays);
        label = `Trend estimate: ${formatMonthYear(etaEarliest)} – ${formatMonthYear(etaLatest)} (insufficient observed slope, using plan rate).`;
      } else {
        label = "Goal horizon exceeds 5 years — consider an intermediate milestone.";
      }
    }
  }

  return {
    weeklyRateKg,
    band: rateBand,
    confidence,
    etaEarliest,
    etaLatest,
    label,
    weighInsUsed,
  };
}

// Re-export for callers.
export { CALORIE_PER_KG };
