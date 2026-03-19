import { TransformationType, ValidationResult } from "./types";

export function validateTransformationData(
  data: any,
  type: TransformationType,
): ValidationResult {
  const errors: string[] = [];

  switch (type) {
    case "profile":
      if (!data.id || !data.email || !data.name) {
        errors.push("Profile must have id, email, and name");
      }
      break;

    case "workout":
      if (!data.id || !data.user_id || !data.workout_id) {
        errors.push("Workout session must have id, user_id, and workout_id");
      }
      if (
        (typeof data.duration !== "number" || data.duration <= 0) &&
        (typeof data.total_duration_minutes !== "number" ||
          data.total_duration_minutes <= 0)
      ) {
        errors.push("Workout session must have valid duration");
      }
      break;

    case "meal":
      if (!data.id || !data.user_id || !data.date) {
        errors.push("Meal log must have id, user_id, and date");
      }
      if (
        !data.meal_type ||
        !["breakfast", "lunch", "dinner", "snack"].includes(data.meal_type)
      ) {
        errors.push("Meal log must have valid meal_type");
      }
      break;

    case "progress":
      if (!data.id || !data.user_id || !data.date) {
        errors.push("Progress entry must have id, user_id, and date");
      }
      if (typeof data.weight_kg !== "number" || data.weight_kg <= 0) {
        errors.push("Progress entry must have valid weight");
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
