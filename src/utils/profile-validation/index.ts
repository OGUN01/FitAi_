export type { ValidationResult, FieldValidationRule } from "./types";

export {
  getRequiredField,
  getRequiredNumericField,
  getRequiredArrayField,
  validateRules,
} from "./core-helpers";

export { validatePersonalInfo } from "./personal-info";

export { validateBodyMetrics } from "./body-metrics";

export { validateDietPreferences } from "./diet-preferences";

export { validateWorkoutPreferences } from "./workout-preferences";

export {
  validateProfileComplete,
  validateMinimumProfile,
} from "./composite-validators";

export {
  validateEmail,
  validatePassword,
  validateDateOfBirth,
} from "./field-validators";

export {
  combineValidationResults,
  hasCriticalErrors,
  formatValidationErrors,
} from "./utility-functions";
