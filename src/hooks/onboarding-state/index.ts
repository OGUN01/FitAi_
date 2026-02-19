import { useEffect, useCallback } from "react";
import { useAuth } from "../useAuth";
import { OnboardingStateWithActions } from "./types";
import { useOnboardingStateManager } from "./state";
import { usePersistence } from "./persistence";
import { useValidation, calculateOverallCompletion } from "./validation";
import { useActions } from "./actions";
import { useCompletion } from "./completion";

export const useOnboardingState = (): OnboardingStateWithActions => {
  const { user, isAuthenticated } = useAuth();

  const { state, setState, stateRef } = useOnboardingStateManager();

  const { saveToDatabase, loadFromDatabase, saveToLocal, loadFromLocal } =
    usePersistence(stateRef, setState, isAuthenticated, user?.id);

  const { validateTab, validateAllTabs, updateValidationStatus } =
    useValidation(stateRef, setState);

  const {
    setCurrentTab,
    markTabCompleted,
    markTabIncomplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,
    resetOnboarding,
    resetTab,
    isOnboardingComplete,
  } = useActions(stateRef, setState, validateTab);

  const { completeOnboarding } = useCompletion(
    stateRef,
    setState,
    validateAllTabs,
    saveToDatabase,
    saveToLocal,
    isAuthenticated,
    user?.id,
  );

  useEffect(() => {
    const completion = calculateOverallCompletion(
      state.personalInfo,
      state.dietPreferences,
      state.bodyAnalysis,
      state.workoutPreferences,
      state.advancedReview,
    );

    setState((prev) => {
      if (completion !== prev.overallCompletion) {
        return { ...prev, overallCompletion: completion };
      }
      return prev;
    });
  }, [
    state.personalInfo,
    state.dietPreferences,
    state.bodyAnalysis,
    state.workoutPreferences,
    state.advancedReview,
    setState,
  ]);

  const saveToLocalMemo = useCallback(async (): Promise<void> => {
    await saveToLocal();
  }, [saveToLocal]);

  useEffect(() => {
    if (state.hasUnsavedChanges) {
      console.log("⏱️ [ONBOARDING] Auto-save timer started (1s debounce)");
      const timer = setTimeout(() => {
        console.log(
          "⏱️ [ONBOARDING] Auto-save timer fired - triggering saveToLocal",
        );
        saveToLocalMemo().catch((error) => {
          console.error("[useOnboardingState] Auto-save failed:", error);
        });
      }, 1000);

      return () => {
        console.log("⏱️ [ONBOARDING] Auto-save timer cleared");
        clearTimeout(timer);
      };
    }
  }, [state.hasUnsavedChanges, saveToLocalMemo]);

  const loadFromLocalMemo = useCallback(async (): Promise<void> => {
    await loadFromLocal();
  }, [loadFromLocal]);

  useEffect(() => {
    let mounted = true;

    console.log(
      "🚀 [ONBOARDING] Hook mounted - loading data from local storage",
    );
    loadFromLocalMemo().catch((error) => {
      if (!mounted) return;
      console.error("[useOnboardingState] Load from local failed:", error);
    });

    return () => {
      mounted = false;
    };
  }, [loadFromLocalMemo]);

  return {
    ...state,
    setCurrentTab,
    markTabCompleted,
    markTabIncomplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,
    validateTab,
    validateAllTabs,
    saveToDatabase,
    loadFromDatabase,
    saveToLocal,
    loadFromLocal,
    resetOnboarding,
    resetTab,
    completeOnboarding,
    isOnboardingComplete,
    updateValidationStatus,
  };
};

export * from "./types";
export * from "./constants";
