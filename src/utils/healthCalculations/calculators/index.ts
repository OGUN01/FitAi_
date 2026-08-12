/**
 * Universal Health Calculator System - All Calculators
 * Export all calculator implementations
 *
 * Only lists calculators with a live production consumer (see index.ts at the
 * package root for the full reachability notes). bmrCalculators, bmiCalculators,
 * muscleGainCalculator, fatLossValidator, healthScoreCalculator and
 * vo2MaxCalculator were deleted as dead code — they had zero production
 * importers (verified via repo-wide grep).
 */

// TDEE Calculator (re-export kept for the backward-compat barrel chain in
// src/utils/healthCalculations.ts; tdeeCalculator itself has no direct
// production caller today)
export {
  ClimateAdaptiveTDEECalculator,
  detectClimateSimple,
  tdeeCalculator,
} from './tdeeCalculator';

// Water Calculator — LIVE (useCalculatedMetrics.ts, useReviewValidation.ts)
export {
  ClimateAdaptiveWaterCalculator,
  assessDehydration,
  waterCalculator,
} from './waterCalculator';

// Macro Calculator — LIVE (services/validation/core.ts)
export {
  DietAdaptiveMacroCalculator,
  macroCalculator,
} from './macroCalculator';

// Heart Rate Calculator — properly-cited Karvonen implementation, currently
// unwired into the live cardiovascular.ts path (no resting-HR field is
// collected during onboarding yet). Kept for its dedicated test coverage and
// as the ready-to-wire reference implementation.
export {
  HeartRateCalculator,
  heartRateCalculator,
} from './heartRateCalculator';

// Step Goal Calculator — LIVE (useOnboardingLogic.ts)
export {
  calculatePersonalizedStepGoal,
} from './stepGoalCalculator';
