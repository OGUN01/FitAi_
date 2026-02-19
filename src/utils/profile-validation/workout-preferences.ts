import { ValidationResult, FieldValidationRule } from "./types";
import { validateRules } from "./core-helpers";

export function validateWorkoutPreferences(
  workoutPrefs: any,
): ValidationResult {
  if (!workoutPrefs) {
    return {
      isValid: false,
      missingFields: ["workoutPreferences"],
      errors: ["Workout preferences are completely missing"],
    };
  }

  const rules: FieldValidationRule[] = [
    {
      field: "fitness_level",
      validator: (v) =>
        typeof v === "string" &&
        ["beginner", "intermediate", "advanced"].includes(v.toLowerCase()),
      errorMessage:
        "Fitness level must be one of: beginner, intermediate, advanced",
    },
    {
      field: "workout_days_per_week",
      validator: (v) => typeof v === "number" && v >= 1 && v <= 7,
      errorMessage: "Workout days per week must be between 1 and 7",
    },
  ];

  const result = validateRules(workoutPrefs, rules, "Workout Preferences");

  if (
    workoutPrefs.preferred_workout_types &&
    !Array.isArray(workoutPrefs.preferred_workout_types)
  ) {
    return {
      isValid: false,
      missingFields: [...result.missingFields, "preferred_workout_types"],
      errors: [...result.errors, "Preferred workout types must be an array"],
    };
  }

  if (
    workoutPrefs.available_equipment &&
    !Array.isArray(workoutPrefs.available_equipment)
  ) {
    return {
      isValid: false,
      missingFields: [...result.missingFields, "available_equipment"],
      errors: [...result.errors, "Available equipment must be an array"],
    };
  }

  return result;
}
