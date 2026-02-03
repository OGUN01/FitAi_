import { useEffect, useState, useRef } from "react";
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
    console.log(
      "🎭 useOnboardingLogic: Initializing with tab:",
      tabToShow,
      "(editMode:",
      editMode,
      ", initialTab:",
      initialTab,
      ")",
    );
    setCurrentTab(tabToShow);
  }, [editMode, initialTab, startingTab]);

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
  }, [currentTab, hasUnsavedChanges]);

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

  const handleNavigateFromReview = (tabNumber: number) => {
    console.log(
      "🔄 useOnboardingLogic: Navigating from Review to tab:",
      tabNumber,
    );
    setPreviousTab(currentTab);
    setIsEditingFromReview(true);
    setCurrentTab(tabNumber);
  };

  const handleReturnToReview = () => {
    console.log("✅ useOnboardingLogic: Returning to Review tab");
    setIsEditingFromReview(false);
    setPreviousTab(null);
    setCurrentTab(5);
  };

  const getTabConfigs = (): TabConfig[] => {
    return ONBOARDING_TABS.map((tab) => ({
      ...tab,
      isCompleted: completedTabs.has(tab.id),
      isAccessible: getTabAccessibility(tab.id),
      validationResult: tabValidationStatus[tab.id],
    }));
  };

  const getTabAccessibility = (tabNumber: number): boolean => {
    if (tabNumber === 1) return true;
    return (
      completedTabs.has(tabNumber - 1) ||
      tabNumber === currentTab ||
      completedTabs.has(tabNumber)
    );
  };

  const handleTabPress = (tabNumber: number) => {
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
  };

  const handleNextTab = async (currentTabData?: any) => {
    if (isNavigating || isSaving) {
      console.log("🚫 useOnboardingLogic: Navigation blocked");
      return;
    }

    setIsNavigating(true);

    try {
      console.log(
        "🎭 useOnboardingLogic: handleNextTab, currentTab:",
        currentTab,
        "editMode:",
        editMode,
      );

      const validation = validateTab(currentTab, currentTabData);
      console.log("🎭 useOnboardingLogic: Validation result:", validation);

      if (!validation.is_valid) {
        console.log("🚫 useOnboardingLogic: Validation failed");
        Alert.alert(
          "Incomplete Information",
          `Please complete all required fields:\n\n${validation.errors.join("\n")}`,
          [{ text: "OK" }],
        );
        return;
      }

      console.log("✅ useOnboardingLogic: Validation passed");
      markTabCompleted(currentTab);

      if (editMode) {
        console.log("💾 useOnboardingLogic: Edit mode - saving");
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
        console.log("🎭 useOnboardingLogic: Moving to tab:", nextTab);
        setCurrentTab(nextTab);
      } else {
        console.log("🎉 useOnboardingLogic: Completing onboarding");
        handleCompleteOnboarding();
      }
    } finally {
      setIsNavigating(false);
    }
  };

  const handlePreviousTab = () => {
    if (editMode) {
      console.log("🔙 useOnboardingLogic: Edit mode - calling onEditCancel");
      onEditCancel?.();
      return;
    }

    if (currentTab > 1) {
      setCurrentTab(currentTab - 1);
    } else {
      handleBackPress();
    }
  };

  const handleBackPress = () => {
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
  };

  const handleCompleteOnboarding = async () => {
    console.log("🚀 useOnboardingLogic: handleCompleteOnboarding called");

    const success = await completeOnboarding();
    console.log("📊 useOnboardingLogic: completeOnboarding returned:", success);

    if (success) {
      console.log("✅ useOnboardingLogic: Success! Showing modal...");
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
  };

  const handleCompletionGetStarted = () => {
    console.log("🎯 useOnboardingLogic: User clicked Start Your Journey");
    setShowCompletionModal(false);

    // Validate required data
    if (!personalInfo?.age || !personalInfo?.gender) {
      console.error("❌ useOnboardingLogic: Missing required personal info");
      throw new Error("Please complete Personal Info tab with age and gender");
    }
    if (!bodyAnalysis?.height_cm || !bodyAnalysis?.current_weight_kg) {
      console.error("❌ useOnboardingLogic: Missing required body analysis");
      throw new Error(
        "Please complete Body Analysis tab with height and weight",
      );
    }
    if (!advancedReview?.daily_calories) {
      console.error("❌ useOnboardingLogic: Missing calculated calorie target");
      throw new Error(
        "Nutrition calculations not completed. Please wait for calculations to finish.",
      );
    }

    const completeData: OnboardingReviewData = {
      personalInfo: {
        first_name: personalInfo?.first_name || "User",
        last_name: personalInfo?.last_name || "",
        email: personalInfo?.email || "",
        age: personalInfo.age,
        gender: personalInfo.gender,
        height: bodyAnalysis.height_cm,
        weight: bodyAnalysis.current_weight_kg,
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
        calorieTarget: advancedReview.daily_calories,
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

    console.log(
      "📦 useOnboardingLogic: Passing complete data to onComplete:",
      completeData,
    );

    onComplete(completeData);
    console.log("✅ useOnboardingLogic: onComplete callback called");
  };

  // ============================================================================
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
    setShowProgressModal,
    setCompletionDialog,
    setShowCompletionModal,

    // Computed
    getTabConfigs,
    getTabAccessibility,
  };
};
