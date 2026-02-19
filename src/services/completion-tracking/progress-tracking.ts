import { useFitnessStore } from "../../stores/fitnessStore";
import { useNutritionStore } from "../../stores/nutritionStore";
import { EventEmitter } from "./event-emitter";
import { CompletionEvent } from "./types";
import { completeWorkout } from "./workout-completion";
import { completeMeal } from "./meal-completion";

export async function updateWorkoutProgress(
  emitter: EventEmitter,
  workoutId: string,
  progress: number,
  exerciseData?: any,
  userId?: string,
): Promise<boolean> {
  try {
    const fitnessStore = useFitnessStore.getState();
    fitnessStore.updateWorkoutProgress(workoutId, progress);

    const workout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
      (w) => w.id === workoutId,
    );
    if (workout) {
      const event: CompletionEvent = {
        id: `workout_progress_${workoutId}_${Date.now()}`,
        type: "workout",
        itemId: workoutId,
        completedAt: new Date().toISOString(),
        progress,
        data: {
          workout,
          exerciseData,
          partialCalories: Math.round(
            (workout.estimatedCalories || 0) * (progress / 100),
          ),
        },
      };

      emitter.emit(event);

      if (progress >= 100) {
        return completeWorkout(emitter, workoutId, exerciseData, userId);
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to update workout progress:", error);
    return false;
  }
}

export async function updateMealProgress(
  emitter: EventEmitter,
  mealId: string,
  progress: number,
  ingredientData?: any,
): Promise<boolean> {
  try {
    const nutritionStore = useNutritionStore.getState();
    nutritionStore.updateMealProgress(mealId, progress);

    const meal = nutritionStore.weeklyMealPlan?.meals.find(
      (m) => m.id === mealId,
    );
    if (meal) {
      const event: CompletionEvent = {
        id: `meal_progress_${mealId}_${Date.now()}`,
        type: "meal",
        itemId: mealId,
        completedAt: new Date().toISOString(),
        progress,
        data: {
          meal,
          ingredientData,
          partialCalories: Math.round(
            (meal.totalCalories || 0) * (progress / 100),
          ),
        },
      };

      emitter.emit(event);

      if (progress >= 100) {
        return completeMeal(emitter, mealId, ingredientData, undefined);
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to update meal progress:", error);
    return false;
  }
}
