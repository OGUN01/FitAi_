import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  OnboardingProgressData,
} from "../../types/onboarding";
import { OnboardingState } from "./types";
import { STORAGE_KEYS } from "./constants";
import {
  PersonalInfoService,
  DietPreferencesService,
  BodyAnalysisService,
  WorkoutPreferencesService,
  AdvancedReviewService,
  OnboardingProgressService,
} from "../../services/onboardingService";

export const usePersistence = (
  stateRef: React.MutableRefObject<OnboardingState>,
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>,
  isAuthenticated: boolean,
  userId: string | undefined,
) => {
  const saveToDatabase = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !userId) {
      return false;
    }

    setState((prev) => ({ ...prev, isAutoSaving: true }));

    const currentState = stateRef.current;

    try {
      if (currentState.personalInfo) {
        try {
          const success = await PersonalInfoService.save(
            userId,
            currentState.personalInfo,
          );
          if (!success) {
            throw new Error("PersonalInfoService.save returned false");
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save personal info";
          console.error("❌ [ONBOARDING] PersonalInfo save error:", error);
          setState((prev) => ({
            ...prev,
            isAutoSaving: false,
            errors: { ...prev.errors, saveDatabase: message },
          }));
          return false;
        }
      }

      if (currentState.dietPreferences) {
        try {
          const success = await DietPreferencesService.save(
            userId,
            currentState.dietPreferences,
          );
          if (!success) {
            throw new Error("DietPreferencesService.save returned false");
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save diet preferences";
          console.error("❌ [ONBOARDING] DietPreferences save error:", error);
          setState((prev) => ({
            ...prev,
            isAutoSaving: false,
            errors: { ...prev.errors, saveDatabase: message },
          }));
          return false;
        }
      }

      if (currentState.bodyAnalysis) {
        try {
          const success = await BodyAnalysisService.save(
            userId,
            currentState.bodyAnalysis,
          );
          if (!success) {
            throw new Error("BodyAnalysisService.save returned false");
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save body analysis";
          console.error("❌ [ONBOARDING] BodyAnalysis save error:", error);
          setState((prev) => ({
            ...prev,
            isAutoSaving: false,
            errors: { ...prev.errors, saveDatabase: message },
          }));
          return false;
        }
      }

      if (currentState.workoutPreferences) {
        try {
          const success = await WorkoutPreferencesService.save(
            userId,
            currentState.workoutPreferences,
          );
          if (!success) {
            throw new Error("WorkoutPreferencesService.save returned false");
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save workout preferences";
          console.error(
            "❌ [ONBOARDING] WorkoutPreferences save error:",
            error,
          );
          setState((prev) => ({
            ...prev,
            isAutoSaving: false,
            errors: { ...prev.errors, saveDatabase: message },
          }));
          return false;
        }
      }

      if (currentState.advancedReview) {
        try {
          const success = await AdvancedReviewService.save(
            userId,
            currentState.advancedReview,
          );
          if (!success) {
            throw new Error("AdvancedReviewService.save returned false");
          }
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save advanced review";
          console.error("❌ [ONBOARDING] AdvancedReview save error:", error);
          setState((prev) => ({
            ...prev,
            isAutoSaving: false,
            errors: { ...prev.errors, saveDatabase: message },
          }));
          return false;
        }
      }

      const progressData: OnboardingProgressData = {
        current_tab: currentState.currentTab,
        completed_tabs: Array.from(currentState.completedTabs),
        tab_validation_status: currentState.tabValidationStatus,
        total_completion_percentage: currentState.overallCompletion,
      };

      try {
        const progressSuccess = await OnboardingProgressService.save(
          userId,
          progressData,
        );
        if (!progressSuccess) {
          throw new Error("OnboardingProgressService.save returned false");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to save onboarding progress";
        console.error("❌ [ONBOARDING] OnboardingProgress save error:", error);
        setState((prev) => ({
          ...prev,
          isAutoSaving: false,
          errors: { ...prev.errors, saveDatabase: message },
        }));
        return false;
      }

      const now = new Date();
      setState((prev) => ({
        ...prev,
        isAutoSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: now,
        errors: { ...prev.errors, saveDatabase: "" },
      }));

      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving to database";
      console.error("❌ [ONBOARDING] Critical database save error:", error);
      setState((prev) => ({
        ...prev,
        isAutoSaving: false,
        errors: { ...prev.errors, saveDatabase: message },
      }));
      return false;
    }
  }, [isAuthenticated, userId, setState, stateRef]);

  const loadFromDatabase = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !userId) {
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const personalInfo = await PersonalInfoService.load(userId);

      const dietPreferences = await DietPreferencesService.load(userId);

      const bodyAnalysis = await BodyAnalysisService.load(userId);

      const workoutPreferences = await WorkoutPreferencesService.load(userId);

      const advancedReview = await AdvancedReviewService.load(userId);

      const progress = await OnboardingProgressService.load(userId);

      setState((prev) => {
        const finalState = {
          ...prev,
          personalInfo,
          dietPreferences,
          bodyAnalysis,
          workoutPreferences,
          advancedReview,
          currentTab: progress?.current_tab || 1,
          completedTabs: new Set(progress?.completed_tabs || []),
          tabValidationStatus: progress?.tab_validation_status || {},
          overallCompletion: progress?.total_completion_percentage || 0,
          isLoading: false,
          errors: { ...prev.errors, loadDatabase: "" },
        };

        stateRef.current = finalState;

        return finalState;
      });

      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load onboarding data from database";
      console.error("❌ [ONBOARDING] Database load error:", error);
      setState((prev) => {
        const finalState = {
          ...prev,
          isLoading: false,
          errors: { ...prev.errors, loadDatabase: message },
        };
        stateRef.current = finalState;
        return finalState;
      });
      return false;
    }
  }, [isAuthenticated, userId, setState, stateRef]);

  const saveToLocal = useCallback(async (): Promise<void> => {
    const currentState = stateRef.current;

    try {
      const dataToSave = {
        personalInfo: currentState.personalInfo,
        dietPreferences: currentState.dietPreferences,
        bodyAnalysis: currentState.bodyAnalysis,
        workoutPreferences: currentState.workoutPreferences,
        advancedReview: currentState.advancedReview,
        currentTab: currentState.currentTab,
        completedTabs: Array.from(currentState.completedTabs),
        lastSavedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.ONBOARDING_DATA,
        JSON.stringify(dataToSave),
      );

      setState((prev) => {
        // Only update state if error was previously set, to avoid unnecessary re-renders
        if (prev.errors?.saveLocal) {
          return { ...prev, errors: { ...prev.errors, saveLocal: "" } };
        }
        return prev;
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save to local storage";
      console.error("❌ [ONBOARDING] Local storage save error:", error);
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, saveLocal: message },
      }));
    }
  }, [stateRef, setState]);

  const loadFromLocal = useCallback(async (): Promise<void> => {
    try {
      const savedData = await AsyncStorage.getItem(
        STORAGE_KEYS.ONBOARDING_DATA,
      );

      if (savedData) {
        const parsedData = JSON.parse(savedData);

        setState((prev) => {
          const finalState: OnboardingState = {
            ...prev,
            personalInfo: parsedData.personalInfo,
            dietPreferences: parsedData.dietPreferences,
            bodyAnalysis: parsedData.bodyAnalysis,
            workoutPreferences: parsedData.workoutPreferences,
            advancedReview: parsedData.advancedReview,
            currentTab: parsedData.currentTab || 1,
            completedTabs: new Set<number>(parsedData.completedTabs || []),
            lastSavedAt: parsedData.lastSavedAt
              ? new Date(parsedData.lastSavedAt)
              : null,
            errors: { ...prev.errors, loadLocal: "" },
          };

          stateRef.current = finalState;

          return finalState;
        });
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load from local storage";
      console.error("❌ [ONBOARDING] Local storage load error:", error);
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, loadLocal: message },
      }));
    }
  }, [setState, stateRef]);

  return {
    saveToDatabase,
    loadFromDatabase,
    saveToLocal,
    loadFromLocal,
  };
};
