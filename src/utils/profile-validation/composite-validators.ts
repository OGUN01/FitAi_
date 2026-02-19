import { ValidationResult } from "./types";
import { validatePersonalInfo } from "./personal-info";
import { validateBodyMetrics } from "./body-metrics";
import { validateDietPreferences } from "./diet-preferences";
import { validateWorkoutPreferences } from "./workout-preferences";

export function validateProfileComplete(profile: any): ValidationResult {
  if (!profile) {
    return {
      isValid: false,
      missingFields: ["profile"],
      errors: ["Profile data is completely missing"],
    };
  }

  const validations = [
    validatePersonalInfo(profile.personalInfo),
    validateBodyMetrics(profile.bodyMetrics),
    validateDietPreferences(profile.dietPreferences),
    validateWorkoutPreferences(profile.workoutPreferences),
  ];

  const allMissing = validations.flatMap((r) => r.missingFields);
  const allErrors = validations.flatMap((r) => r.errors);

  return {
    isValid: allMissing.length === 0,
    missingFields: allMissing,
    errors: allErrors,
  };
}

export function validateMinimumProfile(profile: any): ValidationResult {
  if (!profile) {
    return {
      isValid: false,
      missingFields: ["profile"],
      errors: ["Profile data is completely missing"],
    };
  }

  const errors: string[] = [];
  const missing: string[] = [];

  if (!profile.personalInfo?.first_name) {
    errors.push("First name is required");
    missing.push("first_name");
  }

  if (!profile.personalInfo?.age || profile.personalInfo.age < 13) {
    errors.push("Valid age is required (minimum 13)");
    missing.push("age");
  }

  if (!profile.bodyMetrics?.height_cm || profile.bodyMetrics.height_cm < 100) {
    errors.push("Valid height is required");
    missing.push("height_cm");
  }

  if (
    !profile.bodyMetrics?.current_weight_kg ||
    profile.bodyMetrics.current_weight_kg < 30
  ) {
    errors.push("Valid weight is required");
    missing.push("current_weight_kg");
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
    errors,
  };
}
