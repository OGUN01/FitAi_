import { weightTrackingService } from "../WeightTrackingService";
import { DayWorkout } from "../../ai";
import {
  calculateWorkoutCalories,
  ExerciseCalorieInput,
} from "../calorieCalculator";

export function calculateActualCalories(
  workout: DayWorkout,
  sessionData?: any,
): number {
  if (
    sessionData?.stats?.caloriesBurned &&
    sessionData.stats.caloriesBurned > 0
  ) {
    return sessionData.stats.caloriesBurned;
  }

  const userWeight = weightTrackingService.getCurrentWeight();

  if (!userWeight || userWeight <= 0) {
    return 0;
  }

  if (workout.exercises && workout.exercises.length > 0) {
    const exerciseInputs: ExerciseCalorieInput[] = workout.exercises.map(
      (ex) => ({
        exerciseId: ex.exerciseId || ex.id,
        name: ex.exerciseName || ex.name,
        sets: ex.sets,
        reps: ex.reps,
        duration: ex.duration,
        restTime: ex.restTime,
        bodyParts: ex.bodyParts || ex.muscle_groups || ex.targetMuscles || [],
      }),
    );

    const result = calculateWorkoutCalories(exerciseInputs, userWeight);

    if (result.totalCalories > 0) {
      return result.totalCalories;
    }
  }

  return 0;
}
