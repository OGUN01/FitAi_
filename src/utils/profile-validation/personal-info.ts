import { ValidationResult, FieldValidationRule } from "./types";
import { validateRules } from "./core-helpers";

export function validatePersonalInfo(personalInfo: any): ValidationResult {
  if (!personalInfo) {
    return {
      isValid: false,
      missingFields: ["personalInfo"],
      errors: ["Personal information is completely missing"],
    };
  }

  const rules: FieldValidationRule[] = [
    {
      field: "first_name",
      validator: (v) => typeof v === "string" && v.trim().length > 0,
      errorMessage: "First name is required",
    },
    {
      field: "last_name",
      validator: (v) => typeof v === "string" && v.trim().length > 0,
      errorMessage: "Last name is required",
    },
    {
      field: "age",
      validator: (v) => typeof v === "number" && v >= 13 && v <= 120,
      errorMessage: "Age must be between 13 and 120",
    },
    {
      field: "gender",
      validator: (v) =>
        typeof v === "string" &&
        ["male", "female", "other"].includes(v.toLowerCase()),
      errorMessage: "Gender must be one of: male, female, other",
    },
  ];

  return validateRules(personalInfo, rules, "Personal Info");
}
