/**
 * UNIVERSAL HEALTH CALCULATION SYSTEM - MAIN EXPORTS
 * Central export point for all universal health calculation modules
 *
 * NOTE ON REACHABILITY: because `src/utils/healthCalculations.ts` (a sibling
 * FILE, not this directory) exists, TypeScript's module resolution prefers
 * that file over this directory's index.ts for any bare
 * `from ".../utils/healthCalculations"` import — this index.ts is only
 * reached today via that file's own explicit
 * `from "./healthCalculations/index"` re-export. Only export names actually
 * used downstream of that re-export (or imported via an explicit deep path
 * elsewhere) belong here; everything else is unreachable dead weight.
 * See HealthCalculatorFacade.ts's removal (deleted) for the cleanup this
 * barrel previously fronted.
 *
 * Version: 3.0.0
 * Date: 2026-08-12
 *
 * USAGE:
 * ```typescript
 * import {
 *   detectClimate,
 *   detectEthnicity,
 *   detectBestBMRFormula,
 *   waterCalculator,
 *   macroCalculator,
 * } from '@/utils/healthCalculations';
 * ```
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Climate Types
  ClimateType,
  ClimateDetectionResult,

  // Ethnicity Types
  EthnicityType,
  EthnicityDetectionResult,

  // BMR Formula Types
  BMRFormula,
  BMRFormulaSelection,

  // Activity & Diet Types
  ActivityLevel,
  OccupationType,
  DietType,
  BodyFatSource,

  // Health Calculation Profile
  HealthCalcProfile,

  // BMI Types
  BMICutoffs,
  BMIClassification,

  // Detection Context
  DetectionContext,

  // Calculation Results
  BMRResult,
  TDEEResult,
  WaterResult,
  MacroResult,

  // Calculator Interfaces
  BMRCalculator,
  BMICalculator,
  TDEECalculator,
  WaterCalculator,
} from './types';

// ============================================================================
// PHASE 2: CORE CALCULATOR EXPORTS
// ============================================================================

// TDEE Calculator (re-export kept for the backward-compat barrel chain in
// src/utils/healthCalculations.ts; tdeeCalculator itself has no direct
// production caller today — see calculators/index.ts)
export {
  ClimateAdaptiveTDEECalculator,
  tdeeCalculator,
} from './calculators/tdeeCalculator';

// Water Calculator
export {
  ClimateAdaptiveWaterCalculator,
  waterCalculator,
} from './calculators/waterCalculator';

// Macro Calculator
export {
  DietAdaptiveMacroCalculator,
  macroCalculator,
} from './calculators/macroCalculator';

// ============================================================================
// PHASE 1: FUNCTION EXPORTS - AUTO-DETECTION
// ============================================================================

export {
  detectClimate,
  detectEthnicity,
  detectBestBMRFormula,
} from './autoDetection';

// Step Goal Calculator
export { calculatePersonalizedStepGoal } from './calculators/stepGoalCalculator';
