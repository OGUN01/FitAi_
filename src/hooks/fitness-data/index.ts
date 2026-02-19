import { useCallback } from "react";
import { useAuth } from "../useAuth";
import { useFitnessDataState } from "./state";
import { useLoaders } from "./loaders";
import { useActions } from "./actions";
import { useUtilities } from "./utilities";
import { useFitnessDataEffects } from "./effects";
import { UseFitnessDataReturn } from "./types";

export const useFitnessData = (): UseFitnessDataReturn => {
  const { user, isAuthenticated } = useAuth();

  const state = useFitnessDataState();

  const loaders = useLoaders(
    {
      setExercises: state.setExercises,
      setExercisesLoading: state.setExercisesLoading,
      setExercisesError: state.setExercisesError,
      setUserWorkouts: state.setUserWorkouts,
      setUserWorkoutsLoading: state.setUserWorkoutsLoading,
      setUserWorkoutsError: state.setUserWorkoutsError,
      setWorkoutPreferences: state.setWorkoutPreferences,
      setPreferencesLoading: state.setPreferencesLoading,
      setPreferencesError: state.setPreferencesError,
      setFitnessGoals: state.setFitnessGoals,
      setGoalsLoading: state.setGoalsLoading,
      setGoalsError: state.setGoalsError,
      setWorkoutStats: state.setWorkoutStats,
      setStatsLoading: state.setStatsLoading,
      setStatsError: state.setStatsError,
    },
    user?.id,
  );

  const refreshAll = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    await Promise.all([
      loaders.loadExercises(),
      loaders.loadUserWorkouts(),
      loaders.loadWorkoutPreferences(),
      loaders.loadFitnessGoals(),
      loaders.loadWorkoutStats("week"),
    ]);
  }, [
    isAuthenticated,
    user?.id,
    loaders.loadExercises,
    loaders.loadUserWorkouts,
    loaders.loadWorkoutPreferences,
    loaders.loadFitnessGoals,
    loaders.loadWorkoutStats,
  ]);

  const actions = useActions(
    {
      setUserWorkoutsError: state.setUserWorkoutsError,
      setExercisesError: state.setExercisesError,
    },
    {
      loadUserWorkouts: loaders.loadUserWorkouts,
      loadWorkoutStats: loaders.loadWorkoutStats,
    },
    user?.id,
  );

  const utilities = useUtilities({
    setExercisesError: state.setExercisesError,
    setUserWorkoutsError: state.setUserWorkoutsError,
    setPreferencesError: state.setPreferencesError,
    setGoalsError: state.setGoalsError,
    setStatsError: state.setStatsError,
  });

  useFitnessDataEffects(isAuthenticated, user?.id, { refreshAll });

  return {
    exercises: state.exercises,
    exercisesLoading: state.exercisesLoading,
    exercisesError: state.exercisesError,
    loadExercises: loaders.loadExercises,

    userWorkouts: state.userWorkouts,
    userWorkoutsLoading: state.userWorkoutsLoading,
    userWorkoutsError: state.userWorkoutsError,
    loadUserWorkouts: loaders.loadUserWorkouts,

    workoutPreferences: state.workoutPreferences,
    preferencesLoading: state.preferencesLoading,
    preferencesError: state.preferencesError,
    loadWorkoutPreferences: loaders.loadWorkoutPreferences,

    fitnessGoals: state.fitnessGoals,
    goalsLoading: state.goalsLoading,
    goalsError: state.goalsError,
    loadFitnessGoals: loaders.loadFitnessGoals,

    workoutStats: state.workoutStats,
    statsLoading: state.statsLoading,
    statsError: state.statsError,
    loadWorkoutStats: loaders.loadWorkoutStats,

    createWorkout: actions.createWorkout,
    completeWorkout: actions.completeWorkout,
    startWorkoutSession: actions.startWorkoutSession,
    getRecommendedExercises: actions.getRecommendedExercises,

    refreshAll,
    clearErrors: utilities.clearErrors,
  };
};

export * from "./types";
