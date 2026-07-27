/**
 * UNIVERSAL HEALTH CALCULATION SYSTEM - MAIN EXPORTS
 * Central export point for all universal health calculation modules
 *
 * Phase 1: Foundation - Auto-Detection & Calculator Factory
 * Phase 2: Core Calculators - BMR, BMI, TDEE, Water, Macros
 * Version: 2.0.0
 * Date: 2025-12-30
 *
 * USAGE:
 * ```typescript
 * import {
 *   HealthCalculatorFactory,
 *   detectClimate,
 *   detectEthnicity,
 *   detectBestBMRFormula,
 *   MifflinStJeorBMRCalculator,
 *   AsianBMICalculator,
 *   tdeeCalculator,
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

// BMR Calculators
export {
  MifflinStJeorBMRCalculator,
  KatchMcArdleBMRCalculator,
  CunninghamBMRCalculator,
  HarrisBenedictBMRCalculator,
  getBMRCalculator,
} from './calculators/bmrCalculators';

// BMI Calculators
export {
  AsianBMICalculator,
  AfricanBMICalculator,
  StandardBMICalculator,
  AthleticBMICalculator,
  HispanicBMICalculator,
  getBMICalculator,
} from './calculators/bmiCalculators';

// TDEE Calculator
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
