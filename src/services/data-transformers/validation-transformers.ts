import { generateUUID } from "../../utils/uuid";
import { ValidationWarning, UserFriendlyError } from "./types";

export function transformValidationErrors(
  errors: ValidationWarning[] | any[],
): UserFriendlyError[] {
  if (!errors || errors.length === 0) {
    return [];
  }

  return errors.map((error): UserFriendlyError => {
    if (
      typeof error === "object" &&
      error !== null &&
      "severity" in error &&
      "code" in error
    ) {
      return {
        title: formatErrorTitle(error.code),
        message: error.message,
        severity: error.severity === "WARNING" ? "warning" : "info",
        code: error.code,
        suggestions: error.action ? [error.action] : [],
        metadata: error,
      };
    }

    return {
      title: "Validation Error",
      message:
        typeof error === "string" ? error : error?.message || "Unknown error",
      severity: "error",
      suggestions: ["Please try again or contact support"],
    };
  });
}

function formatErrorTitle(code: string): string {
  const titles: Record<string, string> = {
    ALLERGEN_DETECTED: "Allergen Detected",
    DIET_TYPE_VIOLATION: "Diet Restriction Violated",
    EXTREME_CALORIE_DRIFT: "Calorie Target Missed",
    MODERATE_CALORIE_DRIFT: "Calorie Adjustment Applied",
    LOW_PROTEIN: "Low Protein Warning",
    LOW_VARIETY: "Limited Food Variety",
    MISSING_REQUIRED_FIELDS: "Missing Information",
    INCOMPLETE_FOOD_DATA: "Incomplete Nutrition Data",
  };

  return titles[code] || "Validation Issue";
}

export function transformExerciseWarnings(
  warnings: ValidationWarning[],
): UserFriendlyError[] {
  return transformValidationErrors(warnings);
}

export function extractErrorMessage(errorResponse: any): string {
  if (typeof errorResponse === "string") {
    return errorResponse;
  }

  if (errorResponse?.message) {
    return errorResponse.message;
  }

  if (errorResponse?.error) {
    return typeof errorResponse.error === "string"
      ? errorResponse.error
      : errorResponse.error.message || "Unknown error";
  }

  return "An unexpected error occurred";
}

export function generatePlanId(): string {
  return `plan_${generateUUID()}`;
}
