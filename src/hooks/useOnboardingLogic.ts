import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { BackHandler } from "react-native";
import { useOnboardingState } from "./useOnboardingState";
import type { OnboardingReviewData } from "../types/onboarding";
import type { TabConfig } from "../components/onboarding/OnboardingTabBar";
import { ONBOARDING_TABS } from "../components/onboarding/OnboardingTabBar";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingLogicProps {
  onComplete: (data: OnboardingReviewData) => void;
  onExit?: () => void;
  startingTab?: number;
  editMode?: boolean;
  initialTab?: number;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

// ============================================================================
// CUSTOM HOOK
// ============================================================================

export const useOnboardingLogic = ({
  onComplete,
  onExit,
  startingTab = 1,
  editMode = false,
  initialTab,
  onEditComplete,
  onEditCancel,
}: OnboardingLogicProps) => {
  // ============================================================================
  // STATE FROM useOnboardingState
  // ============================================================================
  const {
    // State
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    advancedReview,
    currentTab,
    completedTabs,
    tabValidationStatus,
    overallCompletion,
    isLoading,
    isAutoSaving,
    hasUnsavedChanges,

    // Actions
    setCurrentTab,
    markTabCompleted,
    markTabIncomplete,
    validateTab,
    saveToLocal,
    saveToDatabase,
    completeOnboarding,
    isOnboardingComplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,
  } = useOnboardingState();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);
  const [previousTab, setPreviousTab] = useState<number | null>(null);
  const [completionDialog, setCompletionDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: "success" | "error";
    onConfirm?: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "success",
  });
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const pendingEditingReset = useRef(false);

  // Refs to stabilize data values in callbacks without causing re-creation
  const personalInfoRef = useRef(personalInfo);
  useEffect(() => { personalInfoRef.current = personalInfo; }, [personalInfo]);
  const dietPreferencesRef = useRef(dietPreferences);
  useEffect(() => { dietPreferencesRef.current = dietPreferences; }, [dietPreferences]);
  const bodyAnalysisRef = useRef(bodyAnalysis);
  useEffect(() => { bodyAnalysisRef.current = bodyAnalysis; }, [bodyAnalysis]);
  const workoutPreferencesRef = useRef(workoutPreferences);
  useEffect(() => { workoutPreferencesRef.current = workoutPreferences; }, [workoutPreferences]);
  const advancedReviewRef = useRef(advancedReview);
  useEffect(() => { advancedReviewRef.current = advancedReview; }, [advancedReview]);

  // Stable ref for saveToLocal so auto-save interval doesn't restart on identity change
  const saveToLocalRef = useRef(saveToLocal);
  useEffect(() => { saveToLocalRef.current = saveToLocal; }, [saveToLocal]);

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Initialize starting tab
  useEffect(() => {
    const tabToShow = editMode && initialTab ? initialTab : startingTab;
    setCurrentTab(tabToShow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, initialTab, startingTab, setCurrentTab]);


  // Reset editing state
  useEffect(() => {
    let isMounted = true;
    if (pendingEditingReset.current && currentTab === 5) {
      if (isMounted) {
        pendingEditingReset.current = false;
        setIsEditingFromReview(false);
        setPreviousTab(null);
      }
    }
    return () => { isMounted = false; };
  }, [currentTab]);

  // Auto-save — saveToLocalRef prevents interval from restarting on saveToLocal identity change
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const saveInterval = setInterval(() => {
      saveToLocalRef.current();
    }, 30000);
    return () => {
      clearInterval(saveInterval);
    };
  }, [hasUnsavedChanges]);

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

  const handleNavigateFromReview = useCallback((tabNumber: number) => {
    setPreviousTab(currentTab);
    setIsEditingFromReview(true);
    setCurrentTab(tabNumber);
  }, [currentTab, setCurrentTab]);

  const handleReturnToReview = useCallback(() => {
    setIsEditingFromReview(false);
    setPreviousTab(null);
    setCurrentTab(5);
  }, [setCurrentTab]);

  const getTabAccessibility = useCallback((tabNumber: number): boolean => {
    if (tabNumber === 1) return true;
    return (
      completedTabs.has(tabNumber - 1) ||
      tabNumber === currentTab ||
      completedTabs.has(tabNumber)
    );
  }, [completedTabs, currentTab]);

  const tabConfigs = useMemo((): TabConfig[] => {
    return ONBOARDING_TABS.map((tab) => ({
      ...tab,
      isCompleted: completedTabs.has(tab.id),
      isAccessible: getTabAccessibility(tab.id),
      validationResult: tabValidationStatus[tab.id],
    }));
  }, [completedTabs, tabValidationStatus, getTabAccessibility]);

  const handleTabPress = useCallback((tabNumber: number) => {
    const isAccessible = getTabAccessibility(tabNumber);

    if (!isAccessible) {
      crossPlatformAlert(
        "Tab Not Available",
        "Please complete the previous tab before accessing this one.",
        [{ text: "OK" }],
      );
      return;
    }

    if (hasUnsavedChanges && tabNumber !== currentTab) {
      crossPlatformAlert(
        "Unsaved Changes",
        "You have unsaved changes. Do you want to save before switching tabs?",
        [
          {
            text: "Don't Save",
            style: "destructive",
            onPress: () => setCurrentTab(tabNumber),
          },
          {
            text: "Save & Continue",
            onPress: async () => {
              await saveToLocalRef.current();
              setCurrentTab(tabNumber);
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } else {
      setCurrentTab(tabNumber);
    }
  }, [getTabAccessibility, hasUnsavedChanges, currentTab, setCurrentTab]);

  const handleNextTab = useCallback(async (currentTabData?: any) => {
    if (isNavigating || isSaving) {
      return;
    }

    setIsNavigating(true);

    try {
      const validation = validateTab(currentTab, currentTabData);

      if (!validation.is_valid) {
        crossPlatformAlert(
          "Incomplete Information",
          `Please complete all required fields:\n\n${validation.errors.join("\n")}`,
          [{ text: "OK" }],
        );
        return;
      }

      markTabCompleted(currentTab);

      if (editMode) {
        setIsSaving(true);
        try {
          await saveToLocalRef.current();
        } finally {
          setIsSaving(false);
        }
        onEditComplete?.();
        return;
      }

      if (currentTab < 5) {
        const nextTab = currentTab + 1;
        setCurrentTab(nextTab);
      } else {
        // Complete onboarding when on last tab
        const completionSuccess = await completeOnboarding();
        if (completionSuccess) {
          setShowCompletionModal(true);
        } else {
          console.error("❌ useOnboardingLogic: Completion failed!");
          setCompletionDialog({
            visible: true,
            title: "Error",
            message: "There was an issue completing your onboarding. Please try again.",
            type: "error",
            onConfirm: () => {
              setCompletionDialog((prev) => ({ ...prev, visible: false }));
            },
          });
        }
      }
    } finally {
      setIsNavigating(false);
    }
  }, [isNavigating, isSaving, validateTab, currentTab, markTabCompleted, editMode, onEditComplete, setCurrentTab, completeOnboarding]);

  const handlePreviousTab = useCallback(() => {
    if (editMode) {
      onEditCancel?.();
      return;
    }

    if (currentTab > 1) {
      setCurrentTab(currentTab - 1);
    } else if (hasUnsavedChanges) {
      crossPlatformAlert(
        "Exit Onboarding",
        "You have unsaved changes. Are you sure you want to exit?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Save & Exit",
            onPress: async () => {
              await saveToLocalRef.current();
              onExit?.();
            },
          },
          {
            text: "Exit Without Saving",
            style: "destructive",
            onPress: () => onExit?.(),
          },
        ],
      );
    } else {
      onExit?.();
    }
  }, [editMode, onEditCancel, currentTab, setCurrentTab, hasUnsavedChanges, onExit]);

  const handleBackPress = useCallback(() => {
    if (hasUnsavedChanges) {
      crossPlatformAlert(
        "Exit Onboarding",
        "You have unsaved changes. Are you sure you want to exit?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Save & Exit",
            onPress: async () => {
              await saveToLocalRef.current();
              onExit?.();
            },
          },
          {
            text: "Exit Without Saving",
            style: "destructive",
            onPress: () => onExit?.(),
          },
        ],
      );
    } else {
      onExit?.();
    }
  }, [hasUnsavedChanges, onExit]);

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      handlePreviousTab();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, [handlePreviousTab]);

  const handleCompleteOnboarding = useCallback(async () => {
    const success = await completeOnboarding();

    if (success) {
      setShowCompletionModal(true);
    } else {
      console.error("❌ useOnboardingLogic: Completion failed!");
      setCompletionDialog({
        visible: true,
        title: "Error",
        message:
          "There was an issue completing your onboarding. Please try again.",
        type: "error",
        onConfirm: () => {
          setCompletionDialog((prev) => ({ ...prev, visible: false }));
        },
      });
    }
  }, [completeOnboarding]);

  const handleCompletionGetStarted = useCallback(() => {
    setShowCompletionModal(false);

    const pi = personalInfoRef.current;
    const ba = bodyAnalysisRef.current;
    const wp = workoutPreferencesRef.current;
    const dp = dietPreferencesRef.current;
    const ar = advancedReviewRef.current;

    // Validate required data — surface error via dialog instead of throwing
    if (!pi?.age || !pi?.gender) {
      console.error("❌ useOnboardingLogic: Missing required personal info");
      setCompletionDialog({
        visible: true,
        title: "Incomplete Information",
        message: "Please complete Personal Info tab with age and gender.",
        type: "error",
        onConfirm: () => {
          setCompletionDialog((prev) => ({ ...prev, visible: false }));
        },
      });
      return;
    }

    const completeData: OnboardingReviewData = {
      personalInfo: {
        first_name: pi?.first_name || "User",
        last_name: pi?.last_name || "",
        email: pi?.email || "",
        age: pi.age,
        gender: pi.gender,
        height: ba?.height_cm || 0,
        weight: ba?.current_weight_kg || 0,
        occupation_type: pi?.occupation_type || "moderate_active",
        country: pi?.country || "",
        state: pi?.state || "",
      } as any,
      fitnessGoals: {
        primary_goals: wp?.primary_goals || [],
        time_commitment: `${wp?.session_duration_minutes || 45} minutes`,
        experience:
          wp?.intensity === "beginner"
            ? "beginner"
            : wp?.intensity === "advanced"
              ? "advanced"
              : "intermediate",
        experience_level:
          wp?.intensity === "beginner"
            ? "beginner"
            : wp?.intensity === "advanced"
              ? "advanced"
              : "intermediate",
      } as any,
      dietPreferences: {
        dietType: (dp?.diet_type || "balanced") as
          | "vegetarian"
          | "vegan"
          | "non-veg"
          | "pescatarian",
        allergies: dp?.allergies || [],
        restrictions: dp?.cuisine_preferences || [],
        calorieTarget: ar?.daily_calories || 2000,
      } as any,
      workoutPreferences: {
        location: wp?.location || "gym",
        equipment: wp?.available_equipment || [],
        workoutTypes: wp?.workout_types || [],
        timePreference: wp?.time_preference || 45,
        intensity: wp?.intensity || "intermediate",
      },
      bodyAnalysis: {
        photos: {},
        analysis: ba?.ai_body_type
          ? {
              bodyType: ba.ai_body_type,
              muscleMass: "Unknown",
              bodyFat:
                ba?.body_fat_percentage?.toString() || "Unknown",
              fitnessLevel: "Unknown",
              recommendations: [],
            }
          : undefined,
      },
    };

    onComplete(completeData);
  }, [onComplete]);


  const handleDismissDialog = useCallback(() => {
    setCompletionDialog((prev) => ({ ...prev, visible: false }));
  }, []);

  // ============================================================================
  // RETURN
  // RETURN
  // ============================================================================

  return {
    // State
    personalInfo,
    dietPreferences,
    bodyAnalysis,
    workoutPreferences,
    advancedReview,
    currentTab,
    completedTabs,
    tabValidationStatus,
    overallCompletion,
    isLoading,
    isAutoSaving,
    hasUnsavedChanges,
    showProgressModal,
    isEditingFromReview,
    previousTab,
    completionDialog,
    showCompletionModal,
    isNavigating,
    isSaving,
    pendingEditingReset,

    // Actions
    setCurrentTab,
    markTabCompleted,
    markTabIncomplete,
    validateTab,
    saveToLocal,
    saveToDatabase,
    completeOnboarding,
    isOnboardingComplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,

    // Handlers
    handleNavigateFromReview,
    handleReturnToReview,
    handleTabPress,
    handleNextTab,
    handlePreviousTab,
    handleBackPress,
    handleCompleteOnboarding,
    handleCompletionGetStarted,
    handleDismissDialog,
    setShowProgressModal,
    setCompletionDialog,
    setShowCompletionModal,

    // Computed
    tabConfigs,
    getTabAccessibility,
  };
};
