import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./useAuth";
import {
  PersonalInfoData,
  DietPreferencesData,
  BodyAnalysisData,
  WorkoutPreferencesData,
  AdvancedReviewData,
  OnboardingProgressData,
  TabValidationResult,
} from "../types/onboarding";
import {
  PersonalInfoService,
  DietPreferencesService,
  BodyAnalysisService,
  WorkoutPreferencesService,
  AdvancedReviewService,
  OnboardingProgressService,
  OnboardingUtils,
} from "../services/onboardingService";
import { invalidateMetricsCache } from "./useCalculatedMetrics";

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingState {
  // Tab data
  personalInfo: PersonalInfoData | null;
  dietPreferences: DietPreferencesData | null;
  bodyAnalysis: BodyAnalysisData | null;
  workoutPreferences: WorkoutPreferencesData | null;
  advancedReview: AdvancedReviewData | null;

  // Progress tracking
  currentTab: number;
  completedTabs: Set<number>;
  tabValidationStatus: Record<number, TabValidationResult>;
  overallCompletion: number;

  // State flags
  isLoading: boolean;
  isAutoSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;

  // Error handling
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

interface OnboardingActions {
  // Tab navigation
  setCurrentTab: (tabNumber: number) => void;
  markTabCompleted: (tabNumber: number) => void;
  markTabIncomplete: (tabNumber: number) => void;

  // Data updates
  updatePersonalInfo: (data: Partial<PersonalInfoData>) => void;
  updateDietPreferences: (data: Partial<DietPreferencesData>) => void;
  updateBodyAnalysis: (data: Partial<BodyAnalysisData>) => void;
  updateWorkoutPreferences: (data: Partial<WorkoutPreferencesData>) => void;
  updateAdvancedReview: (data: Partial<AdvancedReviewData>) => void;

  // Validation
  validateTab: (tabNumber: number, currentData?: any) => TabValidationResult;
  validateAllTabs: () => Record<number, TabValidationResult>;

  // Persistence
  saveToDatabase: () => Promise<boolean>;
  loadFromDatabase: () => Promise<boolean>;
  saveToLocal: () => Promise<void>;
  loadFromLocal: () => Promise<void>;

  // Reset
  resetOnboarding: () => void;
  resetTab: (tabNumber: number) => void;

  // Completion
  completeOnboarding: () => Promise<boolean>;
  isOnboardingComplete: () => boolean;

  // Validation updates
  updateValidationStatus: () => Record<number, TabValidationResult>;
}

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  ONBOARDING_DATA: "onboarding_data",
  ONBOARDING_PROGRESS: "onboarding_progress",
  PERSONAL_INFO: "onboarding_personal_info",
  DIET_PREFERENCES: "onboarding_diet_preferences",
  BODY_ANALYSIS: "onboarding_body_analysis",
  WORKOUT_PREFERENCES: "onboarding_workout_preferences",
  ADVANCED_REVIEW: "onboarding_advanced_review",
} as const;

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

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

// ============================================================================
// MAIN HOOK
// ============================================================================

export const useOnboardingState = (): OnboardingState & OnboardingActions => {
  const { user, isAuthenticated } = useAuth();

  // State
  const [state, setState] = useState<OnboardingState>({
    personalInfo: null,
    dietPreferences: null,
    bodyAnalysis: null,
    workoutPreferences: null,
    advancedReview: null,
    currentTab: 1,
    completedTabs: new Set<number>(),
    // Computed eagerly (not left as {}) so the Next button's disabled state
    // is correct from the very first render — previously tabValidationStatus
    // only got populated as a side effect of the user's first onUpdate call
    // on a given tab, so a pristine/untouched tab's Next button rendered as
    // fully enabled (no aria-disabled/disabled attribute at all) despite the
    // form being empty and genuinely invalid. handleNextTab's own validateTab
    // gate always blocked real navigation (confirmed live — a jarring native
    // alert() fires and the tab correctly does not advance), so this was not
    // a data-integrity bug, but the Next button visually looked pressable
    // when it should have shown the scaffold's documented disabled state
    // (hairline background, ink3 label) from the start.
    tabValidationStatus: {
      1: validatePersonalInfo(null),
      2: validateDietPreferences(null),
      3: validateBodyAnalysis(null),
      4: validateWorkoutPreferences(null),
      5: validateAdvancedReview(null),
    },
    overallCompletion: 0,
    isLoading: false,
    isAutoSaving: false,
    hasUnsavedChanges: false,
    lastSavedAt: null,
    errors: {},
    warnings: {},
  });

  // Use a ref to track the latest state synchronously
  // CRITICAL: This ref MUST be updated inside setState callbacks, NOT in useEffect
  // useEffect runs asynchronously after render, causing race conditions when
  // completeOnboarding() is called immediately after state updates
  const stateRef = useRef(state);

  // Calculate overall completion percentage
  const calculateOverallCompletion = useCallback(
    (
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
    },
    [],
  );

  // Update completion when data changes
  useEffect(() => {
    const completion = calculateOverallCompletion(
      state.personalInfo,
      state.dietPreferences,
      state.bodyAnalysis,
      state.workoutPreferences,
      state.advancedReview,
    );

    // Use functional setState to avoid including state.overallCompletion in deps
    setState((prev) => {
      if (completion !== prev.overallCompletion) {
        return { ...prev, overallCompletion: completion };
      }
      return prev; // Don't create new object if no change
    });
  }, [
    state.personalInfo,
    state.dietPreferences,
    state.bodyAnalysis,
    state.workoutPreferences,
    state.advancedReview,
    calculateOverallCompletion,
    // Removed state.overallCompletion from deps to prevent infinite loop
  ]);

  // Actions
  const setCurrentTab = useCallback((tabNumber: number) => {
    setState((prev) => ({ ...prev, currentTab: tabNumber }));
  }, []);

  const markTabCompleted = useCallback((tabNumber: number) => {
    setState((prev) => {
      const newCompletedTabs = new Set(prev.completedTabs);
      newCompletedTabs.add(tabNumber);
      return { ...prev, completedTabs: newCompletedTabs };
    });
  }, []);

  const markTabIncomplete = useCallback((tabNumber: number) => {
    setState((prev) => {
      const newCompletedTabs = new Set(prev.completedTabs);
      newCompletedTabs.delete(tabNumber);
      return { ...prev, completedTabs: newCompletedTabs };
    });
  }, []);

  const updatePersonalInfo = useCallback((data: Partial<PersonalInfoData>) => {
    setState((prev) => {
      // Always merge onto whatever exists (even nothing) instead of a
      // null-check ternary that wholesale-REPLACES the slice with `data` when
      // `prev.personalInfo` is null — see the identical, confirmed-live fix
      // in updateWorkoutPreferences below for the full root-cause writeup.
      const newPersonalInfo = {
        ...(prev.personalInfo ?? {}),
        ...data,
      } as PersonalInfoData;

      // Update validation immediately with the new data
      const updatedState = {
        ...prev,
        personalInfo: newPersonalInfo,
        hasUnsavedChanges: true,
      };

      // Calculate validation with the new state
      const validationResults = {
        1: validatePersonalInfo(newPersonalInfo),
        2: validateDietPreferences(prev.dietPreferences),
        3: validateBodyAnalysis(prev.bodyAnalysis),
        4: validateWorkoutPreferences(prev.workoutPreferences),
        5: validateAdvancedReview(prev.advancedReview),
      };

      const finalState = {
        ...updatedState,
        tabValidationStatus: validationResults,
      };

      // Update ref synchronously so validation can read the latest data immediately
      stateRef.current = finalState;

      return finalState;
    });
  }, []);

  const updateDietPreferences = useCallback(
    (data: Partial<DietPreferencesData>) => {
      setState((prev) => {
        const newDietPreferences = {
          ...(prev.dietPreferences ?? {}),
          ...data,
        } as DietPreferencesData;

        const updatedState = {
          ...prev,
          dietPreferences: newDietPreferences,
          hasUnsavedChanges: true,
        };

        // Calculate validation with the new state
        const validationResults = {
          1: validatePersonalInfo(updatedState.personalInfo),
          2: validateDietPreferences(newDietPreferences),
          3: validateBodyAnalysis(updatedState.bodyAnalysis),
          4: validateWorkoutPreferences(updatedState.workoutPreferences),
          5: validateAdvancedReview(updatedState.advancedReview),
        };

        const finalState = {
          ...updatedState,
          tabValidationStatus: validationResults,
        };

        // Update ref synchronously
        stateRef.current = finalState;

        return finalState;
      });
    },
    [],
  );

  const updateBodyAnalysis = useCallback((data: Partial<BodyAnalysisData>) => {
    setState((prev) => {
      const newBodyAnalysis = {
        ...(prev.bodyAnalysis ?? {}),
        ...data,
      } as BodyAnalysisData;

      const updatedState = {
        ...prev,
        bodyAnalysis: newBodyAnalysis,
        hasUnsavedChanges: true,
      };

      const validationResults = {
        1: validatePersonalInfo(updatedState.personalInfo),
        2: validateDietPreferences(updatedState.dietPreferences),
        3: validateBodyAnalysis(newBodyAnalysis),
        4: validateWorkoutPreferences(updatedState.workoutPreferences),
        5: validateAdvancedReview(updatedState.advancedReview),
      };

      const finalState = {
        ...updatedState,
        tabValidationStatus: validationResults,
      };

      stateRef.current = finalState;

      return finalState;
    });
  }, []);

  const updateWorkoutPreferences = useCallback(
    (data: Partial<WorkoutPreferencesData>) => {
      setState((prev) => {
        // ROOT-CAUSE FIX (confirmed live via temporary instrumentation):
        // the previous `prev.workoutPreferences ? merge : data` ternary
        // wholesale-REPLACED the entire slice with whatever partial `data`
        // object happened to arrive FIRST while workoutPreferences was still
        // null — e.g. a background effect in useWorkoutPreferences.ts
        // calling onUpdate({ weekly_weight_loss_goal }) before the user ever
        // touched the tab. That partial object then became the ENTIRE
        // parent-side workoutPreferences (missing location/equipment/
        // primary_goals/etc. entirely), which round-tripped back down into
        // useWorkoutPreferences' "sync formData from props" effect and wiped
        // any field the user had already set locally back to its hook
        // default. Always merging onto whatever exists (even nothing, via
        // `?? {}`) means a partial update can never truncate the object —
        // it only ever adds/overwrites the fields it actually names. This
        // is one half of the real fix; the other half (making every
        // internal onUpdate call in useWorkoutPreferences.ts carry the full
        // current formData instead of a bare partial) is in that file.
        const newWorkoutPreferences = {
          ...(prev.workoutPreferences ?? {}),
          ...data,
        } as WorkoutPreferencesData;

        const updatedState = {
          ...prev,
          workoutPreferences: newWorkoutPreferences,
          hasUnsavedChanges: true,
        };

        // Calculate validation with the new state
        const validationResults = {
          1: validatePersonalInfo(updatedState.personalInfo),
          2: validateDietPreferences(updatedState.dietPreferences),
          3: validateBodyAnalysis(updatedState.bodyAnalysis),
          4: validateWorkoutPreferences(newWorkoutPreferences),
          5: validateAdvancedReview(updatedState.advancedReview),
        };

        const finalState = {
          ...updatedState,
          tabValidationStatus: validationResults,
        };

        // Update ref synchronously
        stateRef.current = finalState;

        return finalState;
      });
    },
    [],
  );

  const updateAdvancedReview = useCallback(
    (data: Partial<AdvancedReviewData>) => {
      setState((prev) => {
        const newAdvancedReview = {
          ...(prev.advancedReview ?? {}),
          ...data,
        } as AdvancedReviewData;

        const finalState = {
          ...prev,
          advancedReview: newAdvancedReview,
          hasUnsavedChanges: true,
        };

        // CRITICAL: Update ref synchronously to prevent race condition with completeOnboarding
        stateRef.current = finalState;

        return finalState;
      });
    },
    [],
  );

  const validateTab = useCallback(
    (tabNumber: number, currentData?: any): TabValidationResult => {
      // Read from ref to get the latest state (even if setState updates are pending)
      const currentState = stateRef.current;
      let result: TabValidationResult;

      switch (tabNumber) {
        case 1: {
          // Use provided currentData if available, otherwise fall back to state
          const personalInfoToValidate =
            currentData !== undefined ? currentData : currentState.personalInfo;
          result = validatePersonalInfo(personalInfoToValidate);
          return result;
        }
        case 2: {
          const dietPrefsToValidate =
            currentData !== undefined
              ? currentData
              : currentState.dietPreferences;
          result = validateDietPreferences(dietPrefsToValidate);
          return result;
        }
        case 3: {
          const bodyAnalysisToValidate =
            currentData !== undefined ? currentData : currentState.bodyAnalysis;
          return validateBodyAnalysis(bodyAnalysisToValidate);
        }
        case 4: {
          const workoutPrefsToValidate =
            currentData !== undefined
              ? currentData
              : currentState.workoutPreferences;
          result = validateWorkoutPreferences(workoutPrefsToValidate);
          return result;
        }
        case 5: {
          const advancedReviewToValidate =
            currentData !== undefined
              ? currentData
              : currentState.advancedReview;
          return validateAdvancedReview(advancedReviewToValidate);
        }
        default:
          return {
            is_valid: false,
            errors: ["Invalid tab number"],
            warnings: [],
            completion_percentage: 0,
          };
      }
    },
    [],
  );

  const validateAllTabs = useCallback((): Record<
    number,
    TabValidationResult
  > => {
    // Read from ref to get the latest state
    const currentState = stateRef.current;

    const results = {
      1: validatePersonalInfo(currentState.personalInfo),
      2: validateDietPreferences(currentState.dietPreferences),
      3: validateBodyAnalysis(currentState.bodyAnalysis),
      4: validateWorkoutPreferences(currentState.workoutPreferences),
      5: validateAdvancedReview(currentState.advancedReview),
    };

    return results;
  }, []);

  const saveToDatabase = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      return false;
    }

    setState((prev) => ({ ...prev, isAutoSaving: true }));

    // Use ref to get latest state values
    const currentState = stateRef.current;

    // BUG FIX: each section below used to `return false` on its own failure,
    // which aborted every LATER section's save too (e.g. a body-analysis
    // constraint violation silently prevented workout preferences and
    // advanced review from ever being attempted, even though they were
    // valid and ready). Each section is now independent — a failure in one
    // is recorded but never blocks the next section from saving. This
    // matches `completeOnboarding()`'s own "continue anyway" philosophy one
    // level up, just applied within the database-save step itself.
    const failedSections: string[] = [];
    let lastErrorMessage = "";

    const attemptSave = async (
      sectionName: string,
      hasData: boolean,
      save: () => Promise<boolean>,
    ) => {
      if (!hasData) return;
      try {
        const success = await save();
        if (!success) {
          throw new Error(`${sectionName} save returned false`);
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : `Failed to save ${sectionName}`;
        console.error(`❌ [ONBOARDING] ${sectionName} save error:`, error);
        failedSections.push(sectionName);
        lastErrorMessage = message;
      }
    };

    try {
      await attemptSave("personalInfo", !!currentState.personalInfo, () =>
        PersonalInfoService.save(user.id, currentState.personalInfo!),
      );

      await attemptSave("dietPreferences", !!currentState.dietPreferences, () =>
        DietPreferencesService.save(user.id, currentState.dietPreferences!),
      );

      await attemptSave("bodyAnalysis", !!currentState.bodyAnalysis, () =>
        BodyAnalysisService.save(user.id, currentState.bodyAnalysis!),
      );

      await attemptSave(
        "workoutPreferences",
        !!currentState.workoutPreferences,
        () =>
          WorkoutPreferencesService.save(
            user.id,
            currentState.workoutPreferences!,
          ),
      );

      await attemptSave("advancedReview", !!currentState.advancedReview, () =>
        AdvancedReviewService.save(user.id, currentState.advancedReview!),
      );

      // Save onboarding progress
      const progressData: OnboardingProgressData = {
        current_tab: currentState.currentTab,
        completed_tabs: Array.from(currentState.completedTabs),
        tab_validation_status: currentState.tabValidationStatus,
        total_completion_percentage: currentState.overallCompletion,
      };
      await attemptSave("onboardingProgress", true, () =>
        OnboardingProgressService.save(user.id, progressData),
      );

      if (failedSections.length > 0) {
        setState((prev) => ({
          ...prev,
          isAutoSaving: false,
          errors: {
            ...prev.errors,
            saveDatabase: `Failed to save: ${failedSections.join(", ")} (${lastErrorMessage})`,
          },
        }));
        return false;
      }

      const now = new Date();
      setState((prev) => ({
        ...prev,
        isAutoSaving: false,
        hasUnsavedChanges: false,
        lastSavedAt: now,
        errors: { ...prev.errors, saveDatabase: "" }, // Clear error on success
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
  }, [isAuthenticated, user]); // Removed state dependencies - using ref instead

  const loadFromDatabase = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      return false;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Load personal info
      const personalInfo = await PersonalInfoService.load(user.id);

      // Load diet preferences
      const dietPreferences = await DietPreferencesService.load(user.id);

      // Load body analysis
      const bodyAnalysis = await BodyAnalysisService.load(user.id);

      // Load workout preferences
      const workoutPreferences = await WorkoutPreferencesService.load(user.id);

      // Load advanced review
      const advancedReview = await AdvancedReviewService.load(user.id);

      // Load onboarding progress
      const progress = await OnboardingProgressService.load(user.id);

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
          errors: { ...prev.errors, loadDatabase: "" }, // Clear error on success
        };

        // Update ref synchronously
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
  }, [isAuthenticated, user]);

  const saveToLocal = useCallback(async (): Promise<void> => {
    // Use ref to get latest state values
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

      const serialized = JSON.stringify(dataToSave);

      await AsyncStorage.setItem(
        STORAGE_KEYS.ONBOARDING_DATA,
        serialized,
      );

      setState((prev) => {
        // A newer edit may have landed while the async write was in flight;
        // keep the dirty flag in that case so it auto-saves again.
        const stale =
          prev.personalInfo !== currentState.personalInfo ||
          prev.dietPreferences !== currentState.dietPreferences ||
          prev.bodyAnalysis !== currentState.bodyAnalysis ||
          prev.workoutPreferences !== currentState.workoutPreferences ||
          prev.advancedReview !== currentState.advancedReview;

        const finalState: OnboardingState = {
          ...prev,
          hasUnsavedChanges: stale ? prev.hasUnsavedChanges : false,
          errors: { ...prev.errors, saveLocal: "" },
        };

        stateRef.current = finalState;
        return finalState;
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
  }, []); // No dependencies - using ref instead

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
            // Recompute from the just-restored data, not left stale — same
            // root cause as the initial-state fix above: without this, a
            // resumed tab's Next button reflected whatever validation ran
            // before the reload (usually the pristine {} default) instead of
            // the actual validity of the data that was just loaded back in.
            tabValidationStatus: {
              1: validatePersonalInfo(parsedData.personalInfo ?? null),
              2: validateDietPreferences(parsedData.dietPreferences ?? null),
              3: validateBodyAnalysis(parsedData.bodyAnalysis ?? null),
              4: validateWorkoutPreferences(
                parsedData.workoutPreferences ?? null,
              ),
              5: validateAdvancedReview(parsedData.advancedReview ?? null),
            },
            lastSavedAt: parsedData.lastSavedAt
              ? new Date(parsedData.lastSavedAt)
              : null,
            errors: { ...prev.errors, loadLocal: "" }, // Clear error on success
          };

          // Update ref synchronously
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
  }, []);

  /**
   * Reset onboarding and clear all AsyncStorage data
   * Use this to recover from corrupted state (e.g., missing advancedReview)
   */
  const resetOnboarding = useCallback(async () => {
    // Clear AsyncStorage first
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_DATA);
      await AsyncStorage.removeItem("onboarding_completed");
    } catch (error) {
      console.error("❌ [ONBOARDING] Failed to clear AsyncStorage:", error);
    }

    const finalState = {
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
    };

    // Update ref synchronously
    stateRef.current = finalState;

    setState(finalState);
  }, []);

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
    [markTabIncomplete],
  );

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

      // Try to save to database if authenticated
      if (isAuthenticated && user) {
        try {
          const dbSuccess = await saveToDatabase();
          if (dbSuccess) {
            // CRITICAL: Invalidate metrics cache so screens load fresh calculated values
            invalidateMetricsCache();
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
          // Continue anyway - local save will still work
        }
      } else {
        // Also invalidate cache for guest users after local save
        invalidateMetricsCache();
      }

      // Always save to local storage for both guest and authenticated users
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
        // Continue anyway if we have user authenticated (database save succeeded)
      }

      // Mark onboarding as complete in state and AsyncStorage
      setState((prev) => ({
        ...prev,
        completedTabs: new Set([1, 2, 3, 4, 5]),
        overallCompletion: 100,
        errors: { ...prev.errors, completeOnboarding: "" }, // Clear error on success
      }));

      return true; // Always return true if validation passed
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
  }, [validateAllTabs, saveToDatabase, saveToLocal, isAuthenticated, user]);

  const isOnboardingComplete = useCallback((): boolean => {
    return state.completedTabs.size === 5 && state.overallCompletion === 100;
  }, [state.completedTabs.size, state.overallCompletion]);

  // Memoize saveToLocal for use in useEffect
  const saveToLocalMemo = useCallback(async (): Promise<void> => {
    await saveToLocal();
  }, [saveToLocal]);

  // Auto-save to local storage when data changes
  useEffect(() => {
    if (state.hasUnsavedChanges) {
      const timer = setTimeout(() => {
        saveToLocalMemo().catch((error) => {
          console.error("[useOnboardingState] Auto-save failed:", error);
        });
      }, 200); // Debounce auto-save (reduced from 1000ms so field edits survive reload)

      return () => {
        clearTimeout(timer);
      };
    }
  }, [state.hasUnsavedChanges, saveToLocalMemo]);

  // Memoize loadFromLocal for use in useEffect
  const loadFromLocalMemo = useCallback(async (): Promise<void> => {
    await loadFromLocal();
  }, [loadFromLocal]);

  // Load data on mount
  useEffect(() => {
    let mounted = true;

    loadFromLocalMemo().catch((error) => {
      if (!mounted) return;
      console.error("[useOnboardingState] Load from local failed:", error);
    });

    return () => {
      mounted = false;
    };
  }, [loadFromLocalMemo]);

  // Validate tabs on demand rather than on every data change
  const updateValidationStatus = useCallback(() => {
    const validationResults = validateAllTabs();
    setState((prev) => ({ ...prev, tabValidationStatus: validationResults }));
    return validationResults;
  }, [validateAllTabs]);

  return {
    // State
    ...state,

    // Actions
    setCurrentTab,
    markTabCompleted,
    markTabIncomplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,
    validateTab,
    validateAllTabs,
    saveToDatabase,
    loadFromDatabase,
    saveToLocal,
    loadFromLocal,
    resetOnboarding,
    resetTab,
    completeOnboarding,
    isOnboardingComplete,
    updateValidationStatus,
  };
};
