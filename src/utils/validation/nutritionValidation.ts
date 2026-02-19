import { ValidationResult, ValidationError, ValidationWarning } from "./types";

export function validateNutritionData(nutritionData: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const requiredArrays = [
    "meals",
    "foods",
    "logs",
    "plans",
    "customFoods",
    "waterLogs",
  ];
  requiredArrays.forEach((arrayName) => {
    if (!Array.isArray(nutritionData[arrayName])) {
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
