import { useCallback } from "react";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  TabValidationResult,
} from "../../types/onboarding";
import { OnboardingState } from "./types";
import { OnboardingUtils } from "../../services/onboardingService";

const validatePersonalInfo = (
  data: PersonalInfoData | null,
): TabValidationResult => {
  return OnboardingUtils.validatePersonalInfo(data);
};

const validateDietPreferences = (
  data: DietPreferencesData | null,
): TabValidationResult => {
  return OnboardingUtils.validateDietPreferences(data);
};

const validateBodyAnalysis = (
  data: BodyAnalysisData | null,
): TabValidationResult => {
  return OnboardingUtils.validateBodyAnalysis(data);
};

const validateWorkoutPreferences = (
  data: WorkoutPreferencesData | null,
): TabValidationResult => {
  return OnboardingUtils.validateWorkoutPreferences(data);
};

const validateAdvancedReview = (
  data: AdvancedReviewData | null,
): TabValidationResult => {
  return OnboardingUtils.validateAdvancedReview(data);
};

export const calculateOverallCompletion = (
  personalInfo: PersonalInfoData | null,
  dietPreferences: DietPreferencesData | null,
  bodyAnalysis: BodyAnalysisData | null,
  workoutPreferences: WorkoutPreferencesData | null,
  advancedReview: AdvancedReviewData | null,
): number => {
  const validations = [
    validatePersonalInfo(personalInfo),
    validateDietPreferences(dietPreferences),
    validateBodyAnalysis(bodyAnalysis),
    validateWorkoutPreferences(workoutPreferences),
    validateAdvancedReview(advancedReview),
  ];

  const totalCompletion = validations.reduce(
    (sum, validation) => sum + validation.completion_percentage,
    0,
  );

  return Math.round(totalCompletion / validations.length);
};

export const useValidation = (
  stateRef: React.MutableRefObject<OnboardingState>,
  setState: React.Dispatch<React.SetStateAction<OnboardingState>>,
) => {
  const validateTab = useCallback(
    (tabNumber: number, currentData?: any): TabValidationResult => {
      const currentState = stateRef.current;
      let result: TabValidationResult;

      switch (tabNumber) {
        case 1:
          const personalInfoToValidate =
            currentData !== undefined ? currentData : currentState.personalInfo;
          result = validatePersonalInfo(personalInfoToValidate);
          return result;
        case 2:
          const dietPrefsToValidate =
            currentData !== undefined
              ? currentData
              : currentState.dietPreferences;
          result = validateDietPreferences(dietPrefsToValidate);
          return result;
        case 3:
          const bodyAnalysisToValidate =
            currentData !== undefined ? currentData : currentState.bodyAnalysis;
          return validateBodyAnalysis(bodyAnalysisToValidate);
        case 4:
          const workoutPrefsToValidate =
            currentData !== undefined
              ? currentData
              : currentState.workoutPreferences;
          result = validateWorkoutPreferences(workoutPrefsToValidate);
          return result;
        case 5:
          const advancedReviewToValidate =
            currentData !== undefined
              ? currentData
              : currentState.advancedReview;
          return validateAdvancedReview(advancedReviewToValidate);
        default:
          return {
            is_valid: false,
            errors: ["Invalid tab number"],
            warnings: [],
            completion_percentage: 0,
          };
      }
    },
    [stateRef],
  );

  const validateAllTabs = useCallback((): Record<
    number,
    TabValidationResult
  > => {
    const currentState = stateRef.current;

    const results = {
      1: validatePersonalInfo(currentState.personalInfo),
      2: validateDietPreferences(currentState.dietPreferences),
      3: validateBodyAnalysis(currentState.bodyAnalysis),
      4: validateWorkoutPreferences(currentState.workoutPreferences),
      5: validateAdvancedReview(currentState.advancedReview),
    };

    return results;
  }, [stateRef]);

  const updateValidationStatus = useCallback(() => {
    const validationResults = validateAllTabs();
    setState((prev) => ({ ...prev, tabValidationStatus: validationResults }));
    return validationResults;
  }, [validateAllTabs, setState]);

  return {
    validateTab,
    validateAllTabs,
    updateValidationStatus,
  };
};
