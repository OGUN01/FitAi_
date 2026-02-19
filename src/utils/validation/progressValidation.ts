import { ValidationResult, ValidationError, ValidationWarning } from "./types";

export function validateProgressData(progressData: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const requiredArrays = [
    "measurements",
    "photos",
    "achievements",
    "analytics",
    "goals",
  ];
  requiredArrays.forEach((arrayName) => {
    if (!Array.isArray(progressData[arrayName])) {
      errors.push({
        field: arrayName,
        message: `${arrayName} must be an array`,
        code: "INVALID_ARRAY",
        severity: "error",
      });
    }
  });

  return { isValid: errors.length === 0, errors, warnings };
}
