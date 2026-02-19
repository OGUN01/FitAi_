import { useCallback } from "react";
import { fitnessDataService } from "../../services/fitnessData";
import {
  Exercise,
  WorkoutData,
  CompletionData,
  WorkoutSessionData,
} from "./types";

interface ActionState {
  setUserWorkoutsError: (error: string | null) => void;
  setExercisesError: (error: string | null) => void;
}

interface ActionCallbacks {
  loadUserWorkouts: (limit?: number) => Promise<void>;
  loadWorkoutStats: (timeRange?: "week" | "month" | "year") => Promise<void>;
}

export const useActions = (
  state: ActionState,
  callbacks: ActionCallbacks,
  userId: string | undefined,
) => {
  const createWorkout = useCallback(
    async (workoutData: WorkoutData): Promise<boolean> => {
      if (!userId) return false;

      try {
        const response = await fitnessDataService.createWorkout({
          ...workoutData,
          user_id: userId,
        });

        if (response.success) {
          await callbacks.loadUserWorkouts();
          return true;
        } else {
          state.setUserWorkoutsError(
            response.error || "Failed to create workout",
          );
          return false;
        }
      } catch (error) {
        state.setUserWorkoutsError(
          error instanceof Error ? error.message : "Failed to create workout",
        );
        return false;
      }
    },
    [userId, callbacks.loadUserWorkouts],
  );

  const completeWorkout = useCallback(
    async (
      workoutId: string,
      completionData: CompletionData,
    ): Promise<boolean> => {
      try {
        const response = await fitnessDataService.completeWorkout(
          workoutId,
          completionData,
        );

        if (response.success) {
          await Promise.all([
            callbacks.loadUserWorkouts(),
            callbacks.loadWorkoutStats("week"),
          ]);
          return true;
        } else {
          state.setUserWorkoutsError(
            response.error || "Failed to complete workout",
          );
          return false;
        }
      } catch (error) {
        state.setUserWorkoutsError(
          error instanceof Error ? error.message : "Failed to complete workout",
        );
        return false;
      }
    },
    [callbacks.loadUserWorkouts, callbacks.loadWorkoutStats],
  );

  const startWorkoutSession = useCallback(
    async (workoutData: WorkoutSessionData): Promise<boolean> => {
      if (!userId) {
        console.log(
          "🏃 Guest user - skipping database workout session, using local store only",
        );
        return true;
      }

      try {
        const response = await fitnessDataService.startWorkoutSession(
          userId,
          workoutData,
        );

        if (response.success) {
          await callbacks.loadUserWorkouts();
          return true;
        } else {
          state.setUserWorkoutsError(
            response.error || "Failed to start workout session",
          );
          return false;
        }
      } catch (error) {
        state.setUserWorkoutsError(
          error instanceof Error
            ? error.message
            : "Failed to start workout session",
        );
        return false;
      }
    },
    [userId, callbacks.loadUserWorkouts],
  );

  const getRecommendedExercises = useCallback(
    async (workoutType?: string, limit: number = 5): Promise<Exercise[]> => {
      if (!userId) {
        console.log("No user ID available for recommended exercises");
        return [];
      }

      try {
        const response = await fitnessDataService.getRecommendedExercises(
          userId,
          workoutType,
          limit,
        );

        if (response.success && response.data) {
          return response.data;
        } else {
          const errorMsg =
            response.error || "Failed to get recommended exercises";
          console.error("Failed to get recommended exercises:", errorMsg);
          state.setExercisesError(errorMsg);
          return [];
        }
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Error getting recommended exercises";
        console.error("Error getting recommended exercises:", errorMsg);
        state.setExercisesError(errorMsg);
        return [];
      }
    },
    [userId],
  );

  return {
    createWorkout,
    completeWorkout,
    startWorkoutSession,
    getRecommendedExercises,
  };
};
