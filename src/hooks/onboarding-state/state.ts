import { useState, useRef } from "react";
import { OnboardingState } from "./types";

export const createInitialState = (): OnboardingState => ({
  personalInfo: null,
  dietPreferences: null,
  bodyAnalysis: null,
  workoutPreferences: null,
  advancedReview: null,
  currentTab: 1,
  completedTabs: new Set<number>(),
  tabValidationStatus: {},
  overallCompletion: 0,
  isLoading: false,
  isAutoSaving: false,
  hasUnsavedChanges: false,
  lastSavedAt: null,
  errors: {},
  warnings: {},
});

export const useOnboardingStateManager = () => {
  const [state, setState] = useState<OnboardingState>(createInitialState());
  const stateRef = useRef(state);

  return {
    state,
    setState,
    stateRef,
  };
};
