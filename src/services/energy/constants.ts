/**
 * Energy Model Constants — Phase A.1
 *
 * Scientific constants for the unified energy engine (NEAT-based TDEE,
 * plan burn, food floor, rate bands, projection realization factors).
 *
 * RULE (per CLAUDE.md): Do NOT add hardcoded user-data-dependent values here.
 *       Only scientifically fixed constants.
 *
 * Re-exports CALORIE_PER_KG from the validation constants (single source of
 * truth) rather than duplicating it.
 */

// Re-export the canonical calorie-per-kg constant so energy-module callers
// import from one place without reaching into the validation package.
export { CALORIE_PER_KG } from "../validation/constants";

// ============================================================================
// NEAT ACTIVITY MULTIPLIERS
// ============================================================================
//
// These EXCLUDE planned exercise — they describe only the non-exercise
// activity thermogenesis (NEAT) component of daily energy expenditure.
// This is the core fix for the TDEE double-count documented in the goal-engine
// plan: the existing `ACTIVITY_MULTIPLIERS` (1.2–1.9) already bake in planned
// exercise, so adding `calculateDailyExerciseBurn` on top overstates TDEE.
//
// Keyed off the health-calc activity level (after `mapActivityLevelForHealthCalc`
// maps onboarding's "extreme" → "very_active"). The onboarding enum is
// `sedentary | light | moderate | active | extreme`; the boundary mapper
// converts "extreme" to "very_active" before lookup.
//
// Values are calibrated to the NEAT-only portion of the WHO/FAO multipliers:
//   sedentary  1.20  — desk job, minimal movement
//   light      1.30  — light daily movement, no structured exercise
//   moderate   1.40  — on feet regularly during the day
//   active     1.50  — physical job or constant daily movement
//   very_active 1.60 — intense daily physical labor
export const NEAT_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.20,
  light: 1.30,
  moderate: 1.40,
  active: 1.50,
  very_active: 1.60,
  // onboarding "extreme" alias — same as very_active (mapActivityLevelForHealthCalc
  // converts before lookup, but we include it for defensive direct-lookup safety).
  extreme: 1.60,
};

// ============================================================================
// REALIZATION FACTORS
// ============================================================================
//
// People don't lose/gain exactly as the math predicts — adaptive thermogenesis,
// water retention, and adherence gaps mean the realized rate is a fraction of
// the plan-math rate. These factors bracket the projection range in the
// `plan_math` confidence tier (0–2 weigh-ins).
//
//   optimistic    1.00 — the plan works exactly as written
//   moderate      0.85 — typical real-world adherence
//   conservative  0.75 — worst-case realistic expectation
export const REALIZATION_FACTORS = {
  optimistic: 1.0,
  moderate: 0.85,
  conservative: 0.75,
} as const;

// ============================================================================
// RATE BANDS
// ============================================================================
//
// Rate is an OUTPUT, never a limit (per the goal-engine decision). Past the
// safe band the app downgrades its *promise* (no projected date) instead of
// blocking the plan.
//
//   safe         ≤ 0.75% body weight per week
//   aggressive   > 0.75% and ≤ 1.5% body weight per week
//   unpredictable > 1.5% body weight per week
export const RATE_BAND_THRESHOLDS = {
  /** Fraction of body weight per week below which a rate is "safe". */
  safe: 0.0075,
  /** Fraction of body weight per week above which a rate is "unpredictable". */
  unpredictable: 0.015,
} as const;

export type RateBand = "safe" | "aggressive" | "unpredictable";

// ============================================================================
// LEDGER WINDOWS
// ============================================================================
//
// Lookback windows for the daily energy ledger and projection confidence.
export const LEDGER_WINDOWS = {
  /** Days of weigh-in data used for the observed-confidence least-squares fit. */
  observedLookbackDays: 28,
  /** Minimum weigh-in count for the observed confidence tier. */
  observedMinWeighIns: 6,
  /** Minimum weigh-in count for the blended confidence tier. */
  blendedMinWeighIns: 3,
  /** Days of margin for the blended-confidence ETA range. */
  blendedMarginDays: 4,
  /** Days of margin for the observed-confidence ETA range. */
  observedMarginDays: 2,
  /** Days at which under-performance is evaluated (Phase E). */
  adherenceCheckDays: 14,
  /** Consecutive logged days below this intake triggers a safety check-in. */
  lowIntakeThresholdKcal: 1000,
  lowIntakeConsecutiveDays: 3,
} as const;

// ============================================================================
// CARDIO INTENSITY MODIFIERS
// ============================================================================
//
// Applied to the base MET of a cardio block. The base MET comes from
// `EXERCISE_TYPE_MET_OVERRIDES` (running 9.8, cycling 7.5, etc.); the intensity
// modifier scales it for the user's stated effort level.
export const CARDIO_INTENSITY_MODIFIERS: Record<string, number> = {
  low: 0.8,
  moderate: 1.0,
  high: 1.2,
  // Aliases for onboarding intensity labels
  beginner: 0.8,
  intermediate: 1.0,
  advanced: 1.2,
};

// ============================================================================
// MEDICAL CONDITIONS — CARDIAC / RESPIRATORY
// ============================================================================
//
// Conditions that warrant a training-load WARN (not BLOCK) when paired with a
// high-intensity cardio plan. The hard-block list stays narrow (pregnancy /
// injury / under-18) per the goal-engine decision; these get a warning only.
export const CARDIAC_RESPITORY_CONDITIONS: ReadonlySet<string> = new Set([
  "heart-disease",
  "hypertension",
  "asthma",
  "sleep-apnea",
]);

// ============================================================================
// PROJECTION GUARDS
// ============================================================================
//
// Below this magnitude a weekly rate is treated as "no meaningful trajectory"
// rather than projected to an absurd number of weeks.
export const MIN_MEANINGFUL_WEEKLY_RATE_KG = 0.01;

/** Guard against a technically-finite but meaningless projection. */
export const MAX_PROJECTION_WEEKS = 260; // 5 years
