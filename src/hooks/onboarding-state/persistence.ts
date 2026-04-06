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
import { getOnboardingDataKey } from "./constants";
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
      console.warn(`⚠️ [SYNC DEBUG] saveToDatabase SKIPPED — auth=${isAuthenticated}, userId=${userId}`);
      return false;
    }

    console.warn(`\n${'='.repeat(60)}`);
    console.warn(`💾 [SYNC DEBUG] saveToDatabase START — userId=${userId}`);
    console.warn(`${'='.repeat(60)}`);

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
          console.warn(`  ✅ PersonalInfo saved`);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save personal info";
          console.error("❌ [SYNC DEBUG] PersonalInfo save FAILED:", error);
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
          console.warn(`  ✅ DietPreferences saved`);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save diet preferences";
          console.error("❌ [SYNC DEBUG] DietPreferences save FAILED:", error);
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
          console.warn(`  ✅ BodyAnalysis saved`);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save body analysis";
          console.error("❌ [SYNC DEBUG] BodyAnalysis save FAILED:", error);
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
          console.warn(`  ✅ WorkoutPreferences saved`);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save workout preferences";
          console.error("❌ [SYNC DEBUG] WorkoutPreferences save FAILED:", error);
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
          console.warn(`  ✅ AdvancedReview saved`);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to save advanced review";
          console.error("❌ [SYNC DEBUG] AdvancedReview save FAILED:", error);
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
        console.warn(`  ✅ OnboardingProgress saved`);
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
      console.warn(`✅ [SYNC DEBUG] saveToDatabase COMPLETE — all tables saved at ${now.toISOString()}`);
      console.warn(`${'='.repeat(60)}\n`);
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
      console.warn(`⚠️ [SYNC DEBUG] loadFromDatabase SKIPPED — auth=${isAuthenticated}, userId=${userId}`);
      return false;
    }

    console.warn(`\n${'='.repeat(60)}`);
    console.warn(`📥 [SYNC DEBUG] loadFromDatabase START — userId=${userId}`);
    console.warn(`${'='.repeat(60)}`);

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const personalInfo = await PersonalInfoService.load(userId);
      console.warn(`  📋 PersonalInfo: ${personalInfo ? `loaded (name=${(personalInfo as any).first_name})` : 'NULL'}`);

      const dietPreferences = await DietPreferencesService.load(userId);
      console.warn(`  📋 DietPreferences: ${dietPreferences ? `loaded (type=${(dietPreferences as any).diet_type})` : 'NULL'}`);

      const bodyAnalysis = await BodyAnalysisService.load(userId);
      console.warn(`  📋 BodyAnalysis: ${bodyAnalysis ? `loaded (h=${(bodyAnalysis as any).height_cm}cm, w=${(bodyAnalysis as any).current_weight_kg}kg)` : 'NULL'}`);

      const workoutPreferences = await WorkoutPreferencesService.load(userId);
      console.warn(`  📋 WorkoutPreferences: ${workoutPreferences ? `loaded (location=${(workoutPreferences as any).location})` : 'NULL'}`);

      const advancedReview = await AdvancedReviewService.load(userId);
      console.warn(`  📋 AdvancedReview: ${advancedReview ? `loaded (tdee=${(advancedReview as any).calculated_tdee}, cal=${(advancedReview as any).daily_calories})` : 'NULL'}`);

      const progress = await OnboardingProgressService.load(userId);
      console.warn(`  📋 Progress: ${progress ? `tab=${progress.current_tab}, completed=[${progress.completed_tabs}], ${progress.total_completion_percentage}%` : 'NULL'}`);
      console.warn(`✅ [SYNC DEBUG] loadFromDatabase COMPLETE`);
      console.warn(`${'='.repeat(60)}\n`);

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
          hasUnsavedChanges: false,
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
    if (!userId) {
      console.warn(`⚠️ [SYNC DEBUG] saveToLocal SKIPPED — userId not available`);
      return;
    }

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

      console.warn(`💾 [SYNC DEBUG] saveToLocal — tab=${dataToSave.currentTab}, completed=[${dataToSave.completedTabs}], has: PI=${!!dataToSave.personalInfo} DP=${!!dataToSave.dietPreferences} BA=${!!dataToSave.bodyAnalysis} WP=${!!dataToSave.workoutPreferences} AR=${!!dataToSave.advancedReview}`);

      await AsyncStorage.setItem(
        getOnboardingDataKey(userId),
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
  }, [stateRef, setState, userId]);

  const loadFromLocal = useCallback(async (): Promise<void> => {
    if (!userId) {
      console.warn(`⚠️ [SYNC DEBUG] loadFromLocal SKIPPED — userId not available`);
      return;
    }

    try {
      const savedData = await AsyncStorage.getItem(
        getOnboardingDataKey(userId),
      );

      if (savedData) {
        const parsedData = JSON.parse(savedData);

        console.warn(`📥 [SYNC DEBUG] loadFromLocal — tab=${parsedData.currentTab}, completed=[${parsedData.completedTabs}], has: PI=${!!parsedData.personalInfo} DP=${!!parsedData.dietPreferences} BA=${!!parsedData.bodyAnalysis} WP=${!!parsedData.workoutPreferences} AR=${!!parsedData.advancedReview}, savedAt=${parsedData.lastSavedAt}`);

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
  }, [setState, stateRef, userId]);

  return {
    saveToDatabase,
    loadFromDatabase,
    saveToLocal,
    loadFromLocal,
  };
};
