import { useCallback } from "react";
import { fitnessDataService } from "../../services/fitnessData";
import { ExerciseFilters } from "./types";

interface LoaderState {
  setExercises: (exercises: any[]) => void;
  setExercisesLoading: (loading: boolean) => void;
  setExercisesError: (error: string | null) => void;
  setUserWorkouts: (workouts: any[]) => void;
  setUserWorkoutsLoading: (loading: boolean) => void;
  setUserWorkoutsError: (error: string | null) => void;
  setWorkoutPreferences: (preferences: any) => void;
  setPreferencesLoading: (loading: boolean) => void;
  setPreferencesError: (error: string | null) => void;
  setFitnessGoals: (goals: any) => void;
  setGoalsLoading: (loading: boolean) => void;
  setGoalsError: (error: string | null) => void;
  setWorkoutStats: (stats: any) => void;
  setStatsLoading: (loading: boolean) => void;
  setStatsError: (error: string | null) => void;
}

export const useLoaders = (state: LoaderState, userId: string | undefined) => {
  const loadExercises = useCallback(async (filters?: ExerciseFilters) => {
    state.setExercisesLoading(true);
    state.setExercisesError(null);

    try {
      const response = await fitnessDataService.getExercises(filters);

      if (response.success && response.data) {
        state.setExercises(response.data);
      } else {
        state.setExercisesError(response.error || "Failed to load exercises");
      }
    } catch (error) {
      state.setExercisesError(
        error instanceof Error ? error.message : "Failed to load exercises",
      );
    } finally {
      state.setExercisesLoading(false);
    }
  }, []);

  const loadUserWorkouts = useCallback(
    async (limit?: number) => {
      if (!userId) return;

      state.setUserWorkoutsLoading(true);
      state.setUserWorkoutsError(null);

      try {
        const response = await fitnessDataService.getUserWorkouts(
          userId,
          limit,
        );

        if (response.success && response.data) {
          state.setUserWorkouts(response.data);
        } else {
          state.setUserWorkoutsError(
            response.error || "Failed to load workouts",
          );
        }
      } catch (error) {
        state.setUserWorkoutsError(
          error instanceof Error ? error.message : "Failed to load workouts",
        );
      } finally {
        state.setUserWorkoutsLoading(false);
      }
    },
    [userId],
  );

  const loadWorkoutPreferences = useCallback(async () => {
    if (!userId) return;

    state.setPreferencesLoading(true);
    state.setPreferencesError(null);

    try {
      const response =
        await fitnessDataService.getUserWorkoutPreferences(userId);

      if (response.success && response.data) {
        state.setWorkoutPreferences(response.data);
      } else {
        state.setPreferencesError(
          response.error || "Failed to load preferences",
        );
      }
    } catch (error) {
      state.setPreferencesError(
        error instanceof Error ? error.message : "Failed to load preferences",
      );
    } finally {
      state.setPreferencesLoading(false);
    }
  }, [userId]);

  const loadFitnessGoals = useCallback(async () => {
    if (!userId) return;

    state.setGoalsLoading(true);
    state.setGoalsError(null);

    try {
      const response = await fitnessDataService.getUserFitnessGoals(userId);

      if (response.success && response.data) {
        state.setFitnessGoals(response.data);
      } else {
        state.setGoalsError(response.error || "Failed to load fitness goals");
      }
    } catch (error) {
      state.setGoalsError(
        error instanceof Error ? error.message : "Failed to load fitness goals",
      );
    } finally {
      state.setGoalsLoading(false);
    }
  }, [userId]);

  const loadWorkoutStats = useCallback(
    async (timeRange?: "week" | "month" | "year") => {
      if (!userId) return;

      state.setStatsLoading(true);
      state.setStatsError(null);

      try {
        const response = await fitnessDataService.getWorkoutStats(
          userId,
          timeRange,
        );

        if (response.success && response.data) {
          state.setWorkoutStats(response.data);
        } else {
          state.setStatsError(response.error || "Failed to load stats");
        }
      } catch (error) {
        state.setStatsError(
          error instanceof Error ? error.message : "Failed to load stats",
        );
      } finally {
        state.setStatsLoading(false);
      }
    },
    [userId],
  );

  return {
    loadExercises,
    loadUserWorkouts,
    loadWorkoutPreferences,
    loadFitnessGoals,
    loadWorkoutStats,
  };
};
