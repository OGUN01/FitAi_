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
      const hasDuration = (typeof data.duration === 'number' && data.duration > 0);
      const hasTotalDuration = (typeof data.total_duration_minutes === 'number' && data.total_duration_minutes > 0);
      if (!hasDuration && !hasTotalDuration) {
        errors.push("Workout session must have a positive duration");
      }
      break;

    case "meal":
      if (!data.id || !data.user_id || !data.logged_at) {
        errors.push("Meal log must have id, user_id, and logged_at timestamp");
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
