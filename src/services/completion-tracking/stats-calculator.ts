import { useFitnessStore } from "../../stores/fitnessStore";
import { useNutritionStore } from "../../stores/nutritionStore";
import { CompletionStats, TodaysCompletions } from "./types";
import { calculateActualCalories } from "./calorie-calculator";
import { completeWorkout } from "./workout-completion";
import { completeMeal } from "./meal-completion";
import { EventEmitter } from "./event-emitter";

export function getCompletionStats(): CompletionStats {
  const fitnessStore = useFitnessStore.getState();
  const nutritionStore = useNutritionStore.getState();

  const totalWorkouts = fitnessStore.weeklyWorkoutPlan?.workouts.length || 0;
  const currentPlanIds = new Set(
    fitnessStore.weeklyWorkoutPlan?.workouts?.map((w) => w.id) || [],
  );
  const completedWorkouts = Object.values(fitnessStore.workoutProgress).filter(
    (p) => p.progress === 100 && currentPlanIds.has(p.workoutId),
  ).length;

  const totalMeals = nutritionStore.weeklyMealPlan?.meals.length || 0;
  const completedMeals = Object.values(nutritionStore.mealProgress).filter(
    (p) => p.progress === 100,
  ).length;

  const caloriesBurned = Object.values(fitnessStore.workoutProgress)
    .filter((p) => p.progress === 100)
    .reduce((total, progress) => {
      const workout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
        (w) => w.id === progress.workoutId,
      );
      if (!workout) return total;
      return total + calculateActualCalories(workout as any);
    }, 0);

  const caloriesConsumed = Object.values(nutritionStore.mealProgress)
    .filter((p) => p.progress === 100)
    .reduce((total, progress) => {
      const meal = nutritionStore.weeklyMealPlan?.meals.find(
        (m) => m.id === progress.mealId,
      );
      return total + (meal?.totalCalories || 0);
    }, 0);

  return {
    workouts: {
      completed: completedWorkouts,
      total: totalWorkouts,
      completionRate:
        totalWorkouts > 0
          ? Math.round((completedWorkouts / totalWorkouts) * 100)
          : 0,
    },
    meals: {
      completed: completedMeals,
      total: totalMeals,
      completionRate:
        totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0,
    },
    totalCaloriesBurned: caloriesBurned,
    totalCaloriesConsumed: caloriesConsumed,
  };
}

export function getTodaysCompletions(): TodaysCompletions {
  const today = new Date();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const todayName = dayNames[today.getDay()];

  const fitnessStore = useFitnessStore.getState();
  const nutritionStore = useNutritionStore.getState();

  const todaysWorkout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
    (w) => w.dayOfWeek === todayName,
  );
  const workoutProgress = todaysWorkout
    ? fitnessStore.getWorkoutProgress(todaysWorkout.id)
    : null;

  const todaysMeals =
    nutritionStore.weeklyMealPlan?.meals.filter(
      (m) => m.dayOfWeek === todayName,
    ) || [];
  const completedMeals = todaysMeals.filter((meal) => {
    const progress = nutritionStore.getMealProgress(meal.id);
    return progress?.progress === 100;
  }).length;

  return {
    workout: todaysWorkout
      ? {
          completed: workoutProgress?.progress === 100,
          progress: workoutProgress?.progress || 0,
        }
      : null,
    meals: {
      completed: completedMeals,
      total: todaysMeals.length,
      progress:
        todaysMeals.length > 0
          ? Math.round((completedMeals / todaysMeals.length) * 100)
          : 0,
    },
  };
}

export async function completeAllToday(emitter: EventEmitter): Promise<void> {
  const today = new Date();
  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const todayName = dayNames[today.getDay()];

  const fitnessStore = useFitnessStore.getState();
  const nutritionStore = useNutritionStore.getState();

  const todaysWorkout = fitnessStore.weeklyWorkoutPlan?.workouts.find(
    (w) => w.dayOfWeek === todayName,
  );
  if (todaysWorkout) {
    await completeWorkout(emitter, todaysWorkout.id);
  }

  const todaysMeals =
    nutritionStore.weeklyMealPlan?.meals.filter(
      (m) => m.dayOfWeek === todayName,
    ) || [];
  for (const meal of todaysMeals) {
    await completeMeal(emitter, meal.id, undefined, undefined);
  }
}
