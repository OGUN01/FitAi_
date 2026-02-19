import { FitnessState, CompletedWorkoutStats } from "./types";

export const createSelectors = (get: () => FitnessState) => ({
  getCompletedWorkoutStats: (): CompletedWorkoutStats => {
    const state = get();

    const completedWorkouts = Object.values(state.workoutProgress).filter(
      (p) => p.progress === 100,
    );

    return {
      count: completedWorkouts.length,
      totalCalories: completedWorkouts.reduce((sum, p) => {
        const workout = state.weeklyWorkoutPlan?.workouts.find(
          (w) => w.id === p.workoutId,
        );
        return sum + (workout?.estimatedCalories || 0);
      }, 0),
      totalDuration: completedWorkouts.reduce((sum, p) => {
        const workout = state.weeklyWorkoutPlan?.workouts.find(
          (w) => w.id === p.workoutId,
        );
        return sum + (workout?.duration || 0);
      }, 0),
    };
  },

  getTodaysCompletedWorkoutStats: (): CompletedWorkoutStats => {
    const state = get();
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

    const completedWorkoutIds = Object.values(state.workoutProgress)
      .filter((p) => p.progress === 100)
      .map((p) => p.workoutId);

    const todaysCompletedWorkouts =
      state.weeklyWorkoutPlan?.workouts.filter(
        (workout) =>
          completedWorkoutIds.includes(workout.id) &&
          workout.dayOfWeek === todayName,
      ) || [];

    return {
      count: todaysCompletedWorkouts.length,
      totalCalories: todaysCompletedWorkouts.reduce(
        (sum, w) => sum + (w.estimatedCalories || 0),
        0,
      ),
      totalDuration: todaysCompletedWorkouts.reduce(
        (sum, w) => sum + (w.duration || 0),
        0,
      ),
    };
  },
});
