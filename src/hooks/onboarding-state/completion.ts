import { useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingState } from "./types";
import { invalidateMetricsCache } from "../useCalculatedMetrics";

export const useCompletion = (
  stateRef: React.MutableRefObject<OnboardingState>,
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>,
  validateAllTabs: () => Record<number, any>,
  saveToDatabase: () => Promise<boolean>,
  saveToLocal: () => Promise<void>,
  isAuthenticated: boolean,
  userId: string | undefined,
) => {
  const completeOnboarding = useCallback(async (): Promise<boolean> => {
    try {
      console.log("🎯 completeOnboarding called");
      console.log(
        "👤 User authenticated:",
        isAuthenticated,
        "User ID:",
        userId,
      );

      const validationResults = validateAllTabs();
      const allValid = Object.values(validationResults).every(
        (result) => result.is_valid,
      );

      if (!allValid) {
        console.warn("⚠️ Cannot complete onboarding - validation errors exist");
        const invalidTabs = Object.entries(validationResults)
          .filter(([_, result]) => !result.is_valid)
          .map(([tab, result]) => `Tab ${tab}: ${result.errors.join(", ")}`);
        console.warn("Invalid tabs:", invalidTabs);
        return false;
      }

      console.log("✅ All tabs validated successfully");

      if (isAuthenticated && userId) {
        console.log("💾 Attempting to save to database...");
        try {
          const dbSuccess = await saveToDatabase();
          if (dbSuccess) {
            console.log("✅ Database save successful");
            invalidateMetricsCache();
            console.log(
              "🔄 Metrics cache invalidated - screens will load fresh data",
            );
          } else {
            console.warn(
              "⚠️ Database save failed, continuing with local save for guest mode",
            );
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Database save failed";
          console.error(
            "❌ Database save error during onboarding completion:",
            error,
          );
          setState((prev) => ({
            ...prev,
            warnings: { ...prev.warnings, completeOnboarding: message },
          }));
        }
      } else {
        console.log("👤 Guest user - skipping database save");
        invalidateMetricsCache();
      }

      try {
        await saveToLocal();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Local save failed";
        console.error(
          "❌ Local save error during onboarding completion:",
          error,
        );
        setState((prev) => ({
          ...prev,
          warnings: { ...prev.warnings, completeOnboarding: message },
        }));
      }

      setState((prev) => ({
        ...prev,
        completedTabs: new Set([1, 2, 3, 4, 5]),
        overallCompletion: 100,
        errors: { ...prev.errors, completeOnboarding: "" },
      }));

      try {
        await AsyncStorage.setItem("onboarding_completed", "true");
        console.log("✅ Onboarding marked as complete in AsyncStorage");
      } catch (error) {
        console.error(
          "❌ Failed to mark onboarding complete in AsyncStorage:",
          error,
        );
      }

      console.log("🎉 Onboarding completion successful - returning true");
      return true;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to complete onboarding";
      console.error("❌ Critical error during onboarding completion:", error);
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, completeOnboarding: message },
      }));
      return false;
    }
  }, [
    validateAllTabs,
    saveToDatabase,
    saveToLocal,
    isAuthenticated,
    userId,
    setState,
  ]);

  return {
    completeOnboarding,
  };
};
