import { useCallback } from "react";
import { OnboardingState } from "./types";
import { invalidateMetricsCache } from "../useCalculatedMetrics";
import { OnboardingProgressService } from "../../services/onboardingService";

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

      if (isAuthenticated && userId) {
        let dbSuccess = false;
        try {
          dbSuccess = await saveToDatabase();
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Database save failed";
          console.error(
            "❌ Database save error during onboarding completion:",
            error,
          );
          setState((prev) => ({
            ...prev,
            errors: { ...prev.errors, completeOnboarding: message },
          }));
          return false;
        }

        if (!dbSuccess) {
          console.error(
            "❌ Database save failed during onboarding completion — aborting to prevent incomplete profile",
          );
          setState((prev) => ({
            ...prev,
            errors: {
              ...prev.errors,
              completeOnboarding:
                "Failed to save your profile. Please check your connection and try again.",
            },
          }));
          return false;
        }

        invalidateMetricsCache();
        await OnboardingProgressService.markComplete(userId);
      } else {
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

      setState((prev) => {
        const finalState = {
          ...prev,
          completedTabs: new Set([1, 2, 3, 4, 5]),
          overallCompletion: 100,
          hasUnsavedChanges: false,
          errors: { ...prev.errors, completeOnboarding: "" },
        };
        stateRef.current = finalState;
        return finalState;
      });

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
