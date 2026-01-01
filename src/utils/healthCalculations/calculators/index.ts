/**
 * Universal Health Calculator System - All Calculators
 * Export all calculator implementations
 */

// BMR Calculators
export {
  MifflinStJeorBMRCalculator,
  KatchMcArdleBMRCalculator,
  CunninghamBMRCalculator,
  HarrisBenedictBMRCalculator,
  getBMRCalculator,
} from './bmrCalculators';

// BMI Calculators
export {
  AsianBMICalculator,
  AfricanBMICalculator,
  StandardBMICalculator,
  AthleticBMICalculator,
  HispanicBMICalculator,
  getBMICalculator,
} from './bmiCalculators';

// TDEE Calculator
export {
  ClimateAdaptiveTDEECalculator,
  detectClimateSimple,
  tdeeCalculator,
} from './tdeeCalculator';

// Water Calculator
export {
  ClimateAdaptiveWaterCalculator,
  assessDehydration,
  waterCalculator,
} from './waterCalculator';

// Macro Calculator
export {
  DietAdaptiveMacroCalculator,
  getMinimumProtein,
  getOptimalProteinForMuscleGain,
  macroCalculator,
} from './macroCalculator';

// ============================================================================
// PHASE 3: ADVANCED HEALTH FEATURES
// ============================================================================

// Muscle Gain Calculator
export {
  MuscleGainCalculator,
  muscleGainCalculator,
} from './muscleGainCalculator';

// Fat Loss Validator
export {
  FatLossValidator,
  fatLossValidator,
} from './fatLossValidator';

// Heart Rate Calculator
export {
  HeartRateCalculator,
  heartRateCalculator,
} from './heartRateCalculator';

// VO2 Max Calculator
export {
  VO2MaxCalculator,
  vo2MaxCalculator,
} from './vo2MaxCalculator';

// Health Score Calculator
export {
  HealthScoreCalculator,
  healthScoreCalculator,
} from './healthScoreCalculator';
