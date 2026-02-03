export type {
  ValidationResult,
  ValidationResults,
  RiskLevel,
  SmartAlternative,
  SmartAlternativesResult,
} from "./types";

export { ValidationEngine } from "./core";

export {
  validateMinimumBodyFat,
  validateMinimumBMI,
  validateBMRSafety,
  validateAbsoluteMinimum,
  validateTimeline,
  validatePregnancyBreastfeeding,
  validateGoalConflict,
  validateMealsEnabled,
  validateSleepAggressiveCombo,
  validateTrainingVolume,
  validateInsufficientExercise,
} from "./blockingValidations";

export {
  warnAggressiveTimeline,
  warnElderlyUser,
  warnTeenAthlete,
  warnZeroExercise,
  warnHighTrainingVolume,
  warnMenopause,
  warnLowSleep,
  warnMedicalConditions,
  warnBodyRecomp,
  warnSubstanceImpact,
  warnHeartDisease,
  warnConcurrentTrainingInterference,
  warnObesitySpecialGuidance,
  warnEquipmentLimitations,
  warnPhysicalLimitationsVsIntensity,
  warnLowDietReadiness,
  warnVeganProteinLimitations,
  warnMedicationEffects,
  warnExcessiveWeightGain,
  warnMultipleBadHabits,
} from "./warningValidations";

export { calculateSmartAlternatives } from "./smartAlternatives";
