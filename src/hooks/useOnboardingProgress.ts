import { useMemo, useCallback } from "react";
import { TabValidationResult } from "../types/onboarding";

export const TAB_TITLES: Record<number, string> = {
  1: "Personal Info",
  2: "Diet Preferences",
  3: "Body Analysis",
  4: "Workout Preferences",
  5: "Advanced Review",
};

interface UseOnboardingProgressProps {
  currentTab: number;
  totalTabs: number;
  completedTabs: number[];
  tabValidationStatus: Record<number, TabValidationResult>;
}

export const useOnboardingProgress = ({
  currentTab,
  totalTabs,
  completedTabs,
  tabValidationStatus,
}: UseOnboardingProgressProps) => {
  const getTabAccessibility = useCallback((tabNumber: number): boolean => {
    if (tabNumber === 1) return true;
    return completedTabs.includes(tabNumber - 1) || tabNumber === currentTab;
  }, [completedTabs, currentTab]);

  const calculateTabCompletion = useCallback((tabNumber: number): number => {
    if (completedTabs.includes(tabNumber)) return 100;
    if (tabNumber === currentTab) {
      return tabValidationStatus[tabNumber]?.completion_percentage || 0;
    }
    return 0;
  }, [completedTabs, currentTab, tabValidationStatus]);

  const totalErrors = useMemo(
    () =>
      Object.values(tabValidationStatus).reduce(
        (total, result) => total + (result.errors?.length || 0),
        0,
      ),
    [tabValidationStatus],
  );

  const remainingTabs = totalTabs - completedTabs.length;

  return {
    getTabAccessibility,
    calculateTabCompletion,
    totalErrors,
    remainingTabs,
  };
};
