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
  warnAlcoholImpact,
  warnTobaccoImpact,
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

export {
  CALORIE_PER_KG,
  MIN_CALORIES_MALE,
  MIN_CALORIES_FEMALE,
  DAYS_PER_WEEK,
  MAX_SURPLUS_FRACTION,
  DEFAULT_EXERCISE_SESSIONS_PER_WEEK,
} from "./constants";
