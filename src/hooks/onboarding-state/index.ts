import { logger } from '../../utils/logger';
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
  } = useActions(stateRef, setState, validateTab, user?.id);

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
      const timer = setTimeout(() => {
        saveToLocalMemo().catch((error) => {
          logger.error('[useOnboardingState] Auto-save failed', { error: String(error) });
        });
      }, 1000);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [state.hasUnsavedChanges, saveToLocalMemo]);

  const loadFromLocalMemo = useCallback(async (): Promise<void> => {
    await loadFromLocal();
  }, [loadFromLocal]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      // Fast path: populate UI immediately from local cache
      try {
        await loadFromLocalMemo();
      } catch (error) {
        if (!mounted) return;
        logger.error('[useOnboardingState] Load from local failed', { error: String(error) });
      }
      if (!mounted) return;
      // Authoritative path: override with fresh server data so DB always wins
      // over stale AsyncStorage (e.g. user edited profile on another device)
      if (isAuthenticated) {
        await loadFromDatabase().catch((error) => {
          if (mounted) logger.error('[useOnboardingState] Load from database failed', { error: String(error) });
        });
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [loadFromLocalMemo, loadFromDatabase, isAuthenticated]);

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
