import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Alert, BackHandler } from "react-native";
import { useOnboardingState } from "./useOnboardingState";
import type { OnboardingReviewData } from "../types/onboarding";
import type { TabConfig } from "../components/onboarding/OnboardingTabBar";
import { ONBOARDING_TABS } from "../components/onboarding/OnboardingTabBar";

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
    if (pendingEditingReset.current && currentTab === 5) {
      pendingEditingReset.current = false;
      setIsEditingFromReview(false);
      setPreviousTab(null);
    }
  }, [currentTab]);

  // Auto-save
  useEffect(() => {
    if (hasUnsavedChanges) {
      const saveInterval = setInterval(() => {
        saveToLocal();
      }, 30000);

      return () => {
        clearInterval(saveInterval);
      };
    }
  }, [hasUnsavedChanges, saveToLocal]);

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
      Alert.alert(
        "Tab Not Available",
        "Please complete the previous tab before accessing this one.",
        [{ text: "OK" }],
      );
      return;
    }

    if (hasUnsavedChanges && tabNumber !== currentTab) {
      Alert.alert(
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
              await saveToLocal();
              setCurrentTab(tabNumber);
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } else {
      setCurrentTab(tabNumber);
    }
  }, [getTabAccessibility, hasUnsavedChanges, currentTab, setCurrentTab, saveToLocal]);

  const handleNextTab = useCallback(async (currentTabData?: any) => {
    if (isNavigating || isSaving) {
      return;
    }

    setIsNavigating(true);

    try {
      const validation = validateTab(currentTab, currentTabData);

      if (!validation.is_valid) {
        Alert.alert(
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
          await saveToLocal();
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
  }, [isNavigating, isSaving, validateTab, currentTab, markTabCompleted, editMode, saveToLocal, onEditComplete, setCurrentTab, completeOnboarding]);

  const handlePreviousTab = useCallback(() => {
    if (editMode) {
      onEditCancel?.();
      return;
    }

    if (currentTab > 1) {
      setCurrentTab(currentTab - 1);
    } else if (hasUnsavedChanges) {
      Alert.alert(
        "Exit Onboarding",
        "You have unsaved changes. Are you sure you want to exit?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Save & Exit",
            onPress: async () => {
              await saveToLocal();
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
  }, [editMode, onEditCancel, currentTab, setCurrentTab, hasUnsavedChanges, saveToLocal, onExit]);

  const handleBackPress = useCallback(() => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Exit Onboarding",
        "You have unsaved changes. Are you sure you want to exit?",
        [
          { text: "Stay", style: "cancel" },
          {
            text: "Save & Exit",
            onPress: async () => {
              await saveToLocal();
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
  }, [hasUnsavedChanges, saveToLocal, onExit]);

  // Handle hardware back button
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

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

    // Validate required data
    if (!personalInfo?.age || !personalInfo?.gender) {
      console.error("❌ useOnboardingLogic: Missing required personal info");
      throw new Error("Please complete Personal Info tab with age and gender");
    }
    // Body analysis is optional — only validate if we have partial data
    const hasBodyData =
      !!bodyAnalysis?.height_cm && !!bodyAnalysis?.current_weight_kg;

    const completeData: OnboardingReviewData = {
      personalInfo: {
        first_name: personalInfo?.first_name || "User",
        last_name: personalInfo?.last_name || "",
        email: personalInfo?.email || "",
        age: personalInfo.age,
        gender: personalInfo.gender,
        height: bodyAnalysis?.height_cm || 0,
        weight: bodyAnalysis?.current_weight_kg || 0,
        occupation_type: personalInfo?.occupation_type || "moderate_active",
        country: personalInfo?.country || "",
        state: personalInfo?.state || "",
      } as any,
      fitnessGoals: {
        primary_goals: workoutPreferences?.primary_goals || [],
        time_commitment: `${workoutPreferences?.session_duration_minutes || 45} minutes`,
        experience:
          workoutPreferences?.intensity === "beginner"
            ? "beginner"
            : workoutPreferences?.intensity === "advanced"
              ? "advanced"
              : "intermediate",
        experience_level:
          workoutPreferences?.intensity === "beginner"
            ? "beginner"
            : workoutPreferences?.intensity === "advanced"
              ? "advanced"
              : "intermediate",
      } as any,
      dietPreferences: {
        dietType: (dietPreferences?.diet_type || "balanced") as
          | "vegetarian"
          | "vegan"
          | "non-veg"
          | "pescatarian",
        allergies: dietPreferences?.allergies || [],
        restrictions: dietPreferences?.cuisine_preferences || [],
        calorieTarget: advancedReview?.daily_calories || 2000,
      } as any,
      workoutPreferences: {
        location: workoutPreferences?.location || "gym",
        equipment: workoutPreferences?.available_equipment || [],
        workoutTypes: workoutPreferences?.workout_types || [],
        timePreference: workoutPreferences?.time_preference || 45,
        intensity: workoutPreferences?.intensity || "intermediate",
      },
      bodyAnalysis: {
        photos: {},
        analysis: bodyAnalysis?.ai_body_type
          ? {
              bodyType: bodyAnalysis.ai_body_type,
              muscleMass: "Unknown",
              bodyFat:
                bodyAnalysis?.body_fat_percentage?.toString() || "Unknown",
              fitnessLevel: "Unknown",
              recommendations: [],
            }
          : undefined,
      },
    };

    onComplete(completeData);
  }, [personalInfo, bodyAnalysis, workoutPreferences, dietPreferences, advancedReview, onComplete]);


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
