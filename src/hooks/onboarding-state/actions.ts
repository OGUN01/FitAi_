import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
} from "../../types/onboarding";
import { OnboardingState } from "./types";
import { getOnboardingDataKey, getOnboardingCompletedKey } from "./constants";
import { createInitialState } from "./state";

export const useActions = (
  stateRef: React.MutableRefObject<OnboardingState>,
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>,
  validateTab: (tabNumber: number, currentData?: any) => any,
  userId: string | undefined,
) => {
  const setCurrentTab = useCallback(
    (tabNumber: number) => {
      setState((prev) => {
        const finalState = { ...prev, currentTab: tabNumber };
        stateRef.current = finalState;
        return finalState;
      });
    },
    [setState, stateRef],
  );

  const markTabCompleted = useCallback(
    (tabNumber: number) => {
      setState((prev) => {
        const newCompletedTabs = new Set(prev.completedTabs);
        newCompletedTabs.add(tabNumber);
        const finalState = { ...prev, completedTabs: newCompletedTabs };
        stateRef.current = finalState;
        return finalState;
      });
    },
    [setState, stateRef],
  );

  const markTabIncomplete = useCallback(
    (tabNumber: number) => {
      setState((prev) => {
        const newCompletedTabs = new Set(prev.completedTabs);
        newCompletedTabs.delete(tabNumber);
        return { ...prev, completedTabs: newCompletedTabs };
      });
    },
    [setState],
  );

  const updatePersonalInfo = useCallback(
    (data: Partial<PersonalInfoData>) => {
      setState((prev) => {
        const newPersonalInfo = prev.personalInfo
          ? { ...prev.personalInfo, ...data }
          : (data as PersonalInfoData);

        const updatedState = {
          ...prev,
          personalInfo: newPersonalInfo,
          hasUnsavedChanges: true,
        };

        const validationResults = {
          1: validateTab(1, newPersonalInfo),
          2: validateTab(2, prev.dietPreferences),
          3: validateTab(3, prev.bodyAnalysis),
          4: validateTab(4, prev.workoutPreferences),
          5: validateTab(5, prev.advancedReview),
        };

        const finalState = {
          ...updatedState,
          tabValidationStatus: validationResults,
        };

        stateRef.current = finalState;

        return finalState;
      });
    },
    [setState, stateRef, validateTab],
  );

  const updateDietPreferences = useCallback(
    (data: Partial<DietPreferencesData>) => {
      setState((prev) => {
        const newDietPreferences = prev.dietPreferences
          ? { ...prev.dietPreferences, ...data }
          : (data as DietPreferencesData);

        const updatedState = {
          ...prev,
          dietPreferences: newDietPreferences,
          hasUnsavedChanges: true,
        };

        const validationResults = {
          1: validateTab(1, updatedState.personalInfo),
          2: validateTab(2, newDietPreferences),
          3: validateTab(3, updatedState.bodyAnalysis),
          4: validateTab(4, updatedState.workoutPreferences),
          5: validateTab(5, updatedState.advancedReview),
        };

        const finalState = {
          ...updatedState,
          tabValidationStatus: validationResults,
        };

        stateRef.current = finalState;

        return finalState;
      });
    },
    [setState, stateRef, validateTab],
  );

  const updateBodyAnalysis = useCallback(
    (data: Partial<BodyAnalysisData>) => {
      setState((prev) => {
        const newBodyAnalysis = prev.bodyAnalysis
          ? { ...prev.bodyAnalysis, ...data }
          : (data as BodyAnalysisData);

        const updatedState = {
          ...prev,
          bodyAnalysis: newBodyAnalysis,
          hasUnsavedChanges: true,
        };

        const validationResults = {
          1: validateTab(1, updatedState.personalInfo),
          2: validateTab(2, updatedState.dietPreferences),
          3: validateTab(3, newBodyAnalysis),
          4: validateTab(4, updatedState.workoutPreferences),
          5: validateTab(5, updatedState.advancedReview),
        };

        const finalState = {
          ...updatedState,
          tabValidationStatus: validationResults,
        };

        stateRef.current = finalState;

        return finalState;
      });
    },
    [setState, stateRef, validateTab],
  );

  const updateWorkoutPreferences = useCallback(
    (data: Partial<WorkoutPreferencesData>) => {
      setState((prev) => {
        const newWorkoutPreferences = prev.workoutPreferences
          ? { ...prev.workoutPreferences, ...data }
          : (data as WorkoutPreferencesData);

        const updatedState = {
          ...prev,
          workoutPreferences: newWorkoutPreferences,
          hasUnsavedChanges: true,
        };

        const validationResults = {
          1: validateTab(1, updatedState.personalInfo),
          2: validateTab(2, updatedState.dietPreferences),
          3: validateTab(3, updatedState.bodyAnalysis),
          4: validateTab(4, newWorkoutPreferences),
          5: validateTab(5, updatedState.advancedReview),
        };

        const finalState = {
          ...updatedState,
          tabValidationStatus: validationResults,
        };

        stateRef.current = finalState;

        return finalState;
      });
    },
    [setState, stateRef, validateTab],
  );

  const updateAdvancedReview = useCallback(
    (data: Partial<AdvancedReviewData>) => {
      setState((prev) => {
        const newAdvancedReview = prev.advancedReview
          ? { ...prev.advancedReview, ...data }
          : (data as AdvancedReviewData);

        const finalState = {
          ...prev,
          advancedReview: newAdvancedReview,
          hasUnsavedChanges: true,
        };

        stateRef.current = finalState;

        return finalState;
      });
    },
    [setState, stateRef],
  );

  const resetOnboarding = useCallback(async () => {
    try {
      if (userId) {
        await AsyncStorage.multiRemove([
          getOnboardingDataKey(userId),
          getOnboardingCompletedKey(userId),
        ]);
      }
    } catch (error) {
      console.error("❌ [ONBOARDING] Failed to clear AsyncStorage:", error);
    }

    const finalState = createInitialState();

    stateRef.current = finalState;

    setState(finalState);
  }, [setState, stateRef, userId]);

  const resetTab = useCallback(
    (tabNumber: number) => {
      switch (tabNumber) {
        case 1:
          setState((prev) => {
            const finalState = { ...prev, personalInfo: null };
            stateRef.current = finalState;
            return finalState;
          });
          break;
        case 2:
          setState((prev) => {
            const finalState = { ...prev, dietPreferences: null };
            stateRef.current = finalState;
            return finalState;
          });
          break;
        case 3:
          setState((prev) => {
            const finalState = { ...prev, bodyAnalysis: null };
            stateRef.current = finalState;
            return finalState;
          });
          break;
        case 4:
          setState((prev) => {
            const finalState = { ...prev, workoutPreferences: null };
            stateRef.current = finalState;
            return finalState;
          });
          break;
        case 5:
          setState((prev) => {
            const finalState = { ...prev, advancedReview: null };
            stateRef.current = finalState;
            return finalState;
          });
          break;
      }
      markTabIncomplete(tabNumber);
    },
    [setState, stateRef, markTabIncomplete],
  );

  const isOnboardingComplete = useCallback((): boolean => {
    const currentState = stateRef.current;
    return (
      currentState.completedTabs.size === 5 &&
      currentState.overallCompletion === 100
    );
  }, [stateRef]);

  return {
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
  };
};
