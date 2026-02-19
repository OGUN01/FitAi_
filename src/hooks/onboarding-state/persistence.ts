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
      console.log(
        "💾 [ONBOARDING] saveToDatabase - User not authenticated, skipping",
      );
      return false;
    }

    console.log(
      "💾 [ONBOARDING] saveToDatabase - Starting database save for user:",
      userId,
    );
    setState((prev) => ({ ...prev, isAutoSaving: true }));

    const currentState = stateRef.current;

    try {
      console.log("💾 [ONBOARDING] Database save started");

      if (currentState.personalInfo) {
        console.log(
          "💾 [ONBOARDING] Saving PersonalInfo:",
          currentState.personalInfo,
        );
        try {
          const success = await PersonalInfoService.save(
            userId,
            currentState.personalInfo,
          );
          if (!success) {
            throw new Error("PersonalInfoService.save returned false");
          }
          console.log("✅ [ONBOARDING] PersonalInfo saved successfully");
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
      } else {
        console.log("⏭️ [ONBOARDING] Skipping PersonalInfo (null)");
      }

      if (currentState.dietPreferences) {
        console.log(
          "💾 [ONBOARDING] Saving DietPreferences:",
          currentState.dietPreferences,
        );
        try {
          const success = await DietPreferencesService.save(
            userId,
            currentState.dietPreferences,
          );
          if (!success) {
            throw new Error("DietPreferencesService.save returned false");
          }
          console.log("✅ [ONBOARDING] DietPreferences saved successfully");
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
      } else {
        console.log("⏭️ [ONBOARDING] Skipping DietPreferences (null)");
      }

      if (currentState.bodyAnalysis) {
        console.log(
          "💾 [ONBOARDING] Saving BodyAnalysis:",
          currentState.bodyAnalysis,
        );
        try {
          const success = await BodyAnalysisService.save(
            userId,
            currentState.bodyAnalysis,
          );
          if (!success) {
            throw new Error("BodyAnalysisService.save returned false");
          }
          console.log("✅ [ONBOARDING] BodyAnalysis saved successfully");
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
      } else {
        console.log("⏭️ [ONBOARDING] Skipping BodyAnalysis (null)");
      }

      if (currentState.workoutPreferences) {
        console.log(
          "💾 [ONBOARDING] Saving WorkoutPreferences:",
          currentState.workoutPreferences,
        );
        try {
          const success = await WorkoutPreferencesService.save(
            userId,
            currentState.workoutPreferences,
          );
          if (!success) {
            throw new Error("WorkoutPreferencesService.save returned false");
          }
          console.log("✅ [ONBOARDING] WorkoutPreferences saved successfully");
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
      } else {
        console.log("⏭️ [ONBOARDING] Skipping WorkoutPreferences (null)");
      }

      if (currentState.advancedReview) {
        console.log(
          "💾 [ONBOARDING] Saving AdvancedReview:",
          currentState.advancedReview,
        );
        try {
          const success = await AdvancedReviewService.save(
            userId,
            currentState.advancedReview,
          );
          if (!success) {
            throw new Error("AdvancedReviewService.save returned false");
          }
          console.log("✅ [ONBOARDING] AdvancedReview saved successfully");
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
      } else {
        console.log("⏭️ [ONBOARDING] Skipping AdvancedReview (null)");
      }

      const progressData: OnboardingProgressData = {
        current_tab: currentState.currentTab,
        completed_tabs: Array.from(currentState.completedTabs),
        tab_validation_status: currentState.tabValidationStatus,
        total_completion_percentage: currentState.overallCompletion,
      };
      console.log("💾 [ONBOARDING] Saving OnboardingProgress:", progressData);

      try {
        const progressSuccess = await OnboardingProgressService.save(
          userId,
          progressData,
        );
        if (!progressSuccess) {
          throw new Error("OnboardingProgressService.save returned false");
        }
        console.log("✅ [ONBOARDING] OnboardingProgress saved successfully");
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

      console.log(
        "✅ [ONBOARDING] All onboarding data saved to database at",
        now.toISOString(),
      );
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
      console.log(
        "📥 [ONBOARDING] loadFromDatabase - User not authenticated, skipping",
      );
      return false;
    }

    console.log(
      "📥 [ONBOARDING] loadFromDatabase - Starting database load for user:",
      userId,
    );
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      console.log("📥 [ONBOARDING] Database load started");

      console.log("📥 [ONBOARDING] Loading PersonalInfo...");
      const personalInfo = await PersonalInfoService.load(userId);
      console.log("📥 [ONBOARDING] PersonalInfo loaded:", personalInfo);

      console.log("📥 [ONBOARDING] Loading DietPreferences...");
      const dietPreferences = await DietPreferencesService.load(userId);
      console.log("📥 [ONBOARDING] DietPreferences loaded:", dietPreferences);

      console.log("📥 [ONBOARDING] Loading BodyAnalysis...");
      const bodyAnalysis = await BodyAnalysisService.load(userId);
      console.log("📥 [ONBOARDING] BodyAnalysis loaded:", bodyAnalysis);

      console.log("📥 [ONBOARDING] Loading WorkoutPreferences...");
      const workoutPreferences = await WorkoutPreferencesService.load(userId);
      console.log(
        "📥 [ONBOARDING] WorkoutPreferences loaded:",
        workoutPreferences,
      );

      console.log("📥 [ONBOARDING] Loading AdvancedReview...");
      const advancedReview = await AdvancedReviewService.load(userId);
      console.log("📥 [ONBOARDING] AdvancedReview loaded:", advancedReview);

      console.log("📥 [ONBOARDING] Loading OnboardingProgress...");
      const progress = await OnboardingProgressService.load(userId);
      console.log("📥 [ONBOARDING] OnboardingProgress loaded:", progress);

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

        console.log("📥 [ONBOARDING] Final merged state:", finalState);

        stateRef.current = finalState;

        return finalState;
      });

      console.log("✅ [ONBOARDING] All onboarding data loaded from database");
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

      console.log(
        "💾 [ONBOARDING] saveToLocal - advancedReview present:",
        !!currentState.advancedReview,
      );
      console.log(
        "💾 [ONBOARDING] saveToLocal - advancedReview.daily_water_ml:",
        currentState.advancedReview?.daily_water_ml,
      );
      console.log(
        "💾 [ONBOARDING] saveToLocal - Full data:",
        JSON.stringify(dataToSave, null, 2).substring(0, 500),
      );

      await AsyncStorage.setItem(
        STORAGE_KEYS.ONBOARDING_DATA,
        JSON.stringify(dataToSave),
      );
      console.log(
        "✅ [ONBOARDING] Onboarding data saved to local storage (AsyncStorage)",
      );

      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, saveLocal: "" },
      }));
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
      console.log(
        "📥 [ONBOARDING] loadFromLocal - Loading from AsyncStorage...",
      );
      const savedData = await AsyncStorage.getItem(
        STORAGE_KEYS.ONBOARDING_DATA,
      );

      if (savedData) {
        console.log(
          "📥 [ONBOARDING] Found saved data in AsyncStorage, parsing...",
        );
        const parsedData = JSON.parse(savedData);
        console.log(
          "📥 [ONBOARDING] Parsed data from AsyncStorage:",
          parsedData,
        );

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

          console.log(
            "📥 [ONBOARDING] State updated from AsyncStorage:",
            finalState,
          );

          stateRef.current = finalState;

          return finalState;
        });
        console.log(
          "✅ [ONBOARDING] Onboarding data loaded from local storage",
        );
      } else {
        console.log("ℹ️ [ONBOARDING] No saved data found in AsyncStorage");
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
