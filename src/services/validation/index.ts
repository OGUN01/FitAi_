export type {
  ValidationResult,
  ValidationResults,
  RiskLevel,
  SmartAlternative,
  SmartAlternativesResult,
} from "./types";

export { ValidationEngine } from "./core";

export { calculateSmartAlternatives } from "./smartAlternatives";

export {
  CALORIE_PER_KG,
  MIN_CALORIES_MALE,
  MIN_CALORIES_FEMALE,
  MAX_SURPLUS_FRACTION,
  DEFAULT_EXERCISE_SESSIONS_PER_WEEK,
} from "./constants";
