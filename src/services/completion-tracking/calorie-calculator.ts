import { useUserStore } from "../../stores/userStore";
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
    console.log(
      `[completionTracking] Using session stats calories: ${sessionData.stats.caloriesBurned} kcal`,
    );
    return sessionData.stats.caloriesBurned;
  }

  const userStore = useUserStore.getState();
  const userWeight = userStore.profile?.bodyMetrics?.current_weight_kg;

  if (!userWeight || userWeight <= 0) {
    console.warn(
      "[completionTracking] Cannot calculate calories: user weight not set in profile",
    );
    console.warn(
      "[completionTracking] User should complete onboarding with body metrics",
    );
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
      }),
    );

    const result = calculateWorkoutCalories(exerciseInputs, userWeight);

    if (result.totalCalories > 0) {
      console.log(
        `[completionTracking] MET-based calories (weight: ${userWeight}kg): ${result.totalCalories} kcal`,
      );
      return result.totalCalories;
    }
  }

  console.warn(
    "[completionTracking] No exercises available for MET calculation",
  );
  return 0;
}
