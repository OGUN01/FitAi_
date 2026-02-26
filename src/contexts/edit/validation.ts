import { profileValidator } from "../../services/profileValidator";
import { ValidationResult } from "./types";

export function validateEditData(
  editSection: string | null,
  data: any,
): ValidationResult {
  if (!editSection) {
    return { isValid: true, errors: [], warnings: [] };
  }

  if (!data || Object.keys(data).length === 0) {
    return { isValid: true, errors: [], warnings: [] };
  }

  try {
    switch (editSection) {
      case "personalInfo":
        return profileValidator.validatePersonalInfo(data);
      case "fitnessGoals":
        return profileValidator.validateFitnessGoals(data);
      case "dietPreferences":
        return profileValidator.validateDietPreferences(data);
      case "workoutPreferences":
        return profileValidator.validateWorkoutPreferences(data);
      default:
        return { isValid: true, errors: [], warnings: [] };
    }
  } catch (error) {
    // Validation failed, return safe default
    return { isValid: true, errors: [], warnings: [] };
  }
}
