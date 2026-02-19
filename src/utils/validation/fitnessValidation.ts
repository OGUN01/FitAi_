import { WorkoutSession } from "../../types/workout";
import { ValidationResult, ValidationError, ValidationWarning } from "./types";
import { VALIDATION_RULES } from "./constants";
import { isValidISODate } from "./utils";

export function validateFitnessData(fitnessData: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const requiredArrays = [
    "workouts",
    "exercises",
    "sessions",
    "plans",
    "customExercises",
  ];
  requiredArrays.forEach((arrayName) => {
    if (!Array.isArray(fitnessData[arrayName])) {
      errors.push({
        field: arrayName,
        message: `${arrayName} must be an array`,
        code: "INVALID_ARRAY",
        severity: "error",
      });
    }
  });

  if (Array.isArray(fitnessData.sessions)) {
    fitnessData.sessions.forEach((session: any, index: number) => {
      const sessionValidation = validateWorkoutSession(session);
      sessionValidation.errors.forEach((error) => {
        errors.push({
          ...error,
          field: `sessions[${index}].${error.field}`,
        });
      });
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}

export function validateWorkoutSession(
  session: WorkoutSession,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (!session.id || typeof session.id !== "string") {
    errors.push({
      field: "id",
      message: "Session ID is required",
      code: "MISSING_ID",
      severity: "error",
    });
  }

  if (!session.workoutId || typeof session.workoutId !== "string") {
    errors.push({
      field: "workoutId",
      message: "Workout ID is required",
      code: "MISSING_WORKOUT_ID",
      severity: "error",
    });
  }

  if (!isValidISODate(session.startedAt)) {
    errors.push({
      field: "startedAt",
      message: "Invalid start timestamp",
      code: "INVALID_TIMESTAMP",
      severity: "error",
    });
  }

  if (session.completedAt && !isValidISODate(session.completedAt)) {
    errors.push({
      field: "completedAt",
      message: "Invalid completion timestamp",
      code: "INVALID_TIMESTAMP",
      severity: "error",
    });
  }

  if (
    typeof session.duration !== "number" ||
    session.duration < VALIDATION_RULES.WORKOUT_DURATION.min ||
    session.duration > VALIDATION_RULES.WORKOUT_DURATION.max
  ) {
    errors.push({
      field: "duration",
      message: `Duration must be between ${VALIDATION_RULES.WORKOUT_DURATION.min} and ${VALIDATION_RULES.WORKOUT_DURATION.max} minutes`,
      code: "INVALID_DURATION",
      severity: "error",
    });
  }

  if (
    typeof session.caloriesBurned !== "number" ||
    session.caloriesBurned < VALIDATION_RULES.CALORIES.min ||
    session.caloriesBurned > VALIDATION_RULES.CALORIES.max
  ) {
    errors.push({
      field: "caloriesBurned",
      message: `Calories must be between ${VALIDATION_RULES.CALORIES.min} and ${VALIDATION_RULES.CALORIES.max}`,
      code: "INVALID_CALORIES",
      severity: "error",
    });
  }

  return { isValid: errors.length === 0, errors, warnings };
}
