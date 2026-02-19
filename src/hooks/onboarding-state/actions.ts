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
import { STORAGE_KEYS } from "./constants";
import { createInitialState } from "./state";

export const useActions = (
  stateRef: React.MutableRefObject<OnboardingState>,
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>,
  validateTab: (tabNumber: number, currentData?: any) => any,
) => {
  const setCurrentTab = useCallback(
    (tabNumber: number) => {
      setState((prev) => ({ ...prev, currentTab: tabNumber }));
    },
    [setState],
  );

  const markTabCompleted = useCallback(
    (tabNumber: number) => {
      setState((prev) => {
        const newCompletedTabs = new Set(prev.completedTabs);
        newCompletedTabs.add(tabNumber);
        return { ...prev, completedTabs: newCompletedTabs };
      });
    },
    [setState],
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
      console.log("📝 [ONBOARDING] updatePersonalInfo called with data:", data);
      setState((prev) => {
        console.log(
          "📝 [ONBOARDING] Previous personalInfo:",
          prev.personalInfo,
        );
        const newPersonalInfo = prev.personalInfo
          ? { ...prev.personalInfo, ...data }
          : (data as PersonalInfoData);
        console.log("📝 [ONBOARDING] Merged personalInfo:", newPersonalInfo);

        const updatedState = {
          ...prev,
          personalInfo: newPersonalInfo,
          hasUnsavedChanges: true,
        };
        console.log("📝 [ONBOARDING] hasUnsavedChanges set to true");

        const validationResults = {
          1: validateTab(1, newPersonalInfo),
          2: validateTab(2, prev.dietPreferences),
          3: validateTab(3, prev.bodyAnalysis),
          4: validateTab(4, prev.workoutPreferences),
          5: validateTab(5, prev.advancedReview),
        };
        console.log(
          "📝 [ONBOARDING] Tab 1 validation result:",
          validationResults[1],
        );

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
      console.log(
        "📝 [ONBOARDING] updateDietPreferences called with data:",
        data,
      );
      setState((prev) => {
        console.log(
          "📝 [ONBOARDING] Previous dietPreferences:",
          prev.dietPreferences,
        );
        const newDietPreferences = prev.dietPreferences
          ? { ...prev.dietPreferences, ...data }
          : (data as DietPreferencesData);
        console.log(
          "📝 [ONBOARDING] Merged dietPreferences:",
          newDietPreferences,
        );

        const updatedState = {
          ...prev,
          dietPreferences: newDietPreferences,
          hasUnsavedChanges: true,
        };
        console.log("📝 [ONBOARDING] hasUnsavedChanges set to true");

        const validationResults = {
          1: validateTab(1, updatedState.personalInfo),
          2: validateTab(2, newDietPreferences),
          3: validateTab(3, updatedState.bodyAnalysis),
          4: validateTab(4, updatedState.workoutPreferences),
          5: validateTab(5, updatedState.advancedReview),
        };
        console.log(
          "📝 [ONBOARDING] Tab 2 validation result:",
          validationResults[2],
        );

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
      console.log("📝 [ONBOARDING] updateBodyAnalysis called with data:", data);
      setState((prev) => {
        console.log(
          "📝 [ONBOARDING] Previous bodyAnalysis:",
          prev.bodyAnalysis,
        );
        const newBodyAnalysis = prev.bodyAnalysis
          ? { ...prev.bodyAnalysis, ...data }
          : (data as BodyAnalysisData);
        console.log("📝 [ONBOARDING] Merged bodyAnalysis:", newBodyAnalysis);

        const updatedState = {
          ...prev,
          bodyAnalysis: newBodyAnalysis,
          hasUnsavedChanges: true,
        };
        console.log("📝 [ONBOARDING] hasUnsavedChanges set to true");

        const validationResults = {
          1: validateTab(1, updatedState.personalInfo),
          2: validateTab(2, updatedState.dietPreferences),
          3: validateTab(3, newBodyAnalysis),
          4: validateTab(4, updatedState.workoutPreferences),
          5: validateTab(5, updatedState.advancedReview),
        };
        console.log(
          "📝 [ONBOARDING] Tab 3 validation result:",
          validationResults[3],
        );

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
      console.log(
        "📝 [ONBOARDING] updateWorkoutPreferences called with data:",
        data,
      );
      setState((prev) => {
        console.log(
          "📝 [ONBOARDING] Previous workoutPreferences:",
          prev.workoutPreferences,
        );
        const newWorkoutPreferences = prev.workoutPreferences
          ? { ...prev.workoutPreferences, ...data }
          : (data as WorkoutPreferencesData);
        console.log(
          "📝 [ONBOARDING] Merged workoutPreferences:",
          newWorkoutPreferences,
        );

        const updatedState = {
          ...prev,
          workoutPreferences: newWorkoutPreferences,
          hasUnsavedChanges: true,
        };
        console.log("📝 [ONBOARDING] hasUnsavedChanges set to true");

        const validationResults = {
          1: validateTab(1, updatedState.personalInfo),
          2: validateTab(2, updatedState.dietPreferences),
          3: validateTab(3, updatedState.bodyAnalysis),
          4: validateTab(4, newWorkoutPreferences),
          5: validateTab(5, updatedState.advancedReview),
        };
        console.log(
          "📝 [ONBOARDING] Tab 4 validation result:",
          validationResults[4],
        );

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
      console.log(
        "📝 [ONBOARDING] updateAdvancedReview called with data:",
        data,
      );
      setState((prev) => {
        console.log(
          "📝 [ONBOARDING] Previous advancedReview:",
          prev.advancedReview,
        );
        const newAdvancedReview = prev.advancedReview
          ? { ...prev.advancedReview, ...data }
          : (data as AdvancedReviewData);
        console.log(
          "📝 [ONBOARDING] Merged advancedReview:",
          newAdvancedReview,
        );

        const finalState = {
          ...prev,
          advancedReview: newAdvancedReview,
          hasUnsavedChanges: true,
        };

        stateRef.current = finalState;
        console.log(
          "📝 [ONBOARDING] advancedReview saved to stateRef, hasUnsavedChanges set to true",
        );

        return finalState;
      });
    },
    [setState, stateRef],
  );

  const resetOnboarding = useCallback(async () => {
    console.log("🔄 [ONBOARDING] resetOnboarding called - clearing all data");

    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_DATA);
      await AsyncStorage.removeItem("onboarding_completed");
      console.log("✅ [ONBOARDING] AsyncStorage cleared");
    } catch (error) {
      console.error("❌ [ONBOARDING] Failed to clear AsyncStorage:", error);
    }

    const finalState = createInitialState();

    stateRef.current = finalState;

    setState(finalState);
  }, [setState, stateRef]);

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
