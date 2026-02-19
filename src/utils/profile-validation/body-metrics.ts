import { ValidationResult, FieldValidationRule } from "./types";
import { validateRules } from "./core-helpers";

export function validateBodyMetrics(bodyMetrics: any): ValidationResult {
  if (!bodyMetrics) {
    return {
      isValid: false,
      missingFields: ["bodyMetrics"],
      errors: ["Body metrics are completely missing"],
    };
  }

  const rules: FieldValidationRule[] = [
    {
      field: "height_cm",
      validator: (v) => typeof v === "number" && v >= 100 && v <= 250,
      errorMessage: "Height must be between 100 and 250 cm",
    },
    {
      field: "current_weight_kg",
      validator: (v) => typeof v === "number" && v >= 30 && v <= 300,
      errorMessage: "Weight must be between 30 and 300 kg",
    },
  ];

  const result = validateRules(bodyMetrics, rules, "Body Metrics");

  const warnings: string[] = [];
  if (!bodyMetrics.target_weight_kg) {
    warnings.push("Target weight not set - weight goals may be limited");
  }
  if (!bodyMetrics.activity_level) {
    warnings.push(
      "Activity level not set - calorie calculations may be less accurate",
    );
  }

  if (warnings.length > 0 && result.isValid) {
    console.warn("Body Metrics Warnings:", warnings);
  }

  return result;
}
