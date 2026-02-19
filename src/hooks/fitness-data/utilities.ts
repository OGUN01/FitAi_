import { useCallback } from "react";

interface ErrorState {
  setExercisesError: (error: string | null) => void;
  setUserWorkoutsError: (error: string | null) => void;
  setPreferencesError: (error: string | null) => void;
  setGoalsError: (error: string | null) => void;
  setStatsError: (error: string | null) => void;
}

export const useUtilities = (state: ErrorState) => {
  const clearErrors = useCallback(() => {
    state.setExercisesError(null);
    state.setUserWorkoutsError(null);
    state.setPreferencesError(null);
    state.setGoalsError(null);
    state.setStatsError(null);
  }, []);

  return {
    clearErrors,
  };
};
