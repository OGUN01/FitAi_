import type { LocalStorageSchema } from "../../types/localData";
import { ValidationResult, ValidationError, ValidationWarning } from "./types";
import { isValidISODate } from "./utils";
import { validateUserData } from "./userValidation";
import { validateFitnessData } from "./fitnessValidation";
import { validateNutritionData } from "./nutritionValidation";
import { validateProgressData } from "./progressValidation";

export function validateLocalStorageSchema(
  schema: LocalStorageSchema,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!schema.version || typeof schema.version !== "string") {
    errors.push({
      field: "version",
      message: "Schema version is required and must be a string",
      code: "INVALID_VERSION",
      severity: "error",
    });
  }

  if (!isValidISODate(schema.createdAt)) {
    errors.push({
      field: "createdAt",
      message: "Invalid createdAt timestamp",
      code: "INVALID_TIMESTAMP",
      severity: "error",
    });
  }

  if (!isValidISODate(schema.updatedAt)) {
    errors.push({
      field: "updatedAt",
      message: "Invalid updatedAt timestamp",
      code: "INVALID_TIMESTAMP",
      severity: "error",
    });
  }

  const userValidation = validateUserData(schema.user);
  errors.push(...userValidation.errors);
  warnings.push(...userValidation.warnings);

  const fitnessValidation = validateFitnessData(schema.fitness);
  errors.push(...fitnessValidation.errors);
  warnings.push(...fitnessValidation.warnings);

  const nutritionValidation = validateNutritionData(schema.nutrition);
  errors.push(...nutritionValidation.errors);
  warnings.push(...nutritionValidation.warnings);

  const progressValidation = validateProgressData(schema.progress);
  errors.push(...progressValidation.errors);
  warnings.push(...progressValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
