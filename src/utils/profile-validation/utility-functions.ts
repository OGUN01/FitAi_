import { ValidationResult } from "./types";

export function combineValidationResults(
  ...results: ValidationResult[]
): ValidationResult {
  const allMissing = results.flatMap((r) => r.missingFields);
  const allErrors = results.flatMap((r) => r.errors);

  return {
    isValid: allMissing.length === 0,
    missingFields: allMissing,
    errors: allErrors,
  };
}

export function hasCriticalErrors(result: ValidationResult): boolean {
  return !result.isValid && result.errors.length > 0;
}

export function formatValidationErrors(result: ValidationResult): string {
  if (result.isValid) {
    return "";
  }

  if (result.errors.length === 1) {
    return result.errors[0];
  }

  return `Please fix the following issues:\n${result.errors.map((e) => `- ${e}`).join("\n")}`;
}
