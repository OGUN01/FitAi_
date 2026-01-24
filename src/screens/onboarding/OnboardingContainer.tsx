import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  BackHandler,
  Alert,
  Text,
  StatusBar,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { rf, rp, rh, rw } from "../../utils/responsive";
import { ResponsiveTheme } from "../../utils/constants";
import { useOnboardingState } from "../../hooks/useOnboardingState";
import OnboardingTabBar, {
  ONBOARDING_TABS,
  TabConfig,
} from "../../components/onboarding/OnboardingTabBar";
import OnboardingProgressIndicator from "../../components/onboarding/OnboardingProgressIndicator";
import { AuroraBackground } from "../../components/ui/aurora";

// Import tab components
import PersonalInfoTab from "./tabs/PersonalInfoTab";
import DietPreferencesTab from "./tabs/DietPreferencesTab";
import BodyAnalysisTab from "./tabs/BodyAnalysisTab";
import WorkoutPreferencesTab from "./tabs/WorkoutPreferencesTab";
import AdvancedReviewTab from "./tabs/AdvancedReviewTab";
import { CustomDialog } from "../../components/ui/CustomDialog";
import { OnboardingCompleteModal } from "../../components/ui/OnboardingCompleteModal";
import type { OnboardingReviewData } from "./ReviewScreen";

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingContainerProps {
  onComplete: (data: OnboardingReviewData) => void;
  onExit?: () => void;
  startingTab?: number;
  showProgressIndicator?: boolean;

  // NEW: Edit mode props for Settings integration
  editMode?: boolean;
  initialTab?: number; // Which tab to show in edit mode (1-5)
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OnboardingContainer: React.FC<OnboardingContainerProps> = ({
  onComplete,
  onExit,
  startingTab = 1,
  showProgressIndicator = false,
  editMode = false,
  initialTab,
  onEditComplete,
  onEditCancel,
}) => {
  // ============================================================================
  // STATE MANAGEMENT - SINGLE SOURCE OF TRUTH
  // ============================================================================
  // All state is managed here in OnboardingContainer and passed down as props
  // This ensures ONE source of truth with no conflicting state instances
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
    saveToDatabase, // NEW: For immediate database persistence
    completeOnboarding,
    isOnboardingComplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,
  } = useOnboardingState();

  // Get safe area insets for proper status bar handling
  const insets = useSafeAreaInsets();

  const [showProgressModal, setShowProgressModal] = useState(false);

  // Track if user is editing from Review tab (to show "Review" button instead of "Next")
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);
  const [previousTab, setPreviousTab] = useState<number | null>(null);

  // State for completion dialog (web-compatible - used for errors)
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

  // State for premium completion modal (used for success)
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // OB-UX-001: Double-tap prevention state
  const [isNavigating, setIsNavigating] = useState(false);

  // OB-UX-002: Saving state for button disabled state during save operations
  const [isSaving, setIsSaving] = useState(false);

  // OB-UX-003: Ref to track editing state to avoid state updates during render
  const pendingEditingReset = useRef(false);

  // Initialize starting tab - update when initialTab or editMode changes
  useEffect(() => {
    const tabToShow = editMode && initialTab ? initialTab : startingTab;
    console.log(
      "🎭 OnboardingContainer: Initializing with tab:",
      tabToShow,
      "(editMode:",
      editMode,
      ", initialTab:",
      initialTab,
      ")",
    );
    setCurrentTab(tabToShow);
  }, [editMode, initialTab, startingTab]); // Re-run when edit mode or initialTab changes

  // Handle hardware back button on Android
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction,
    );
    return () => backHandler.remove();
  }, [currentTab, hasUnsavedChanges]);

  // OB-UX-003: Reset editing state in useEffect instead of during render
  useEffect(() => {
    if (pendingEditingReset.current && currentTab === 5) {
      pendingEditingReset.current = false;
      setIsEditingFromReview(false);
      setPreviousTab(null);
    }
  }, [currentTab]);

  // Auto-save periodically
  useEffect(() => {
    if (hasUnsavedChanges) {
      const saveInterval = setInterval(() => {
        saveToLocal();
      }, 30000); // Auto-save every 30 seconds

      return () => {
        clearInterval(saveInterval);
      };
    }
  }, [hasUnsavedChanges, saveToLocal]);

  // ============================================================================
  // NAVIGATION FROM REVIEW TAB
  // ============================================================================

  // Custom handler for when user navigates from Review tab to edit a specific tab
  const handleNavigateFromReview = (tabNumber: number) => {
    console.log(
      "🔄 OnboardingContainer: Navigating from Review (tab 5) to edit tab:",
      tabNumber,
    );
    setPreviousTab(currentTab); // Remember we came from Review
    setIsEditingFromReview(true);
    setCurrentTab(tabNumber);
  };

  // Handler to return to Review tab after editing
  const handleReturnToReview = () => {
    console.log(
      "✅ OnboardingContainer: Returning to Review tab after editing",
    );
    setIsEditingFromReview(false);
    setPreviousTab(null);
    setCurrentTab(5); // Go back to Review tab
  };

  // ============================================================================
  // TAB CONFIGURATION
  // ============================================================================

  const getTabConfigs = (): TabConfig[] => {
    return ONBOARDING_TABS.map((tab) => ({
      ...tab,
      isCompleted: completedTabs.has(tab.id),
      isAccessible: getTabAccessibility(tab.id),
      validationResult: tabValidationStatus[tab.id],
    }));
  };

  const getTabAccessibility = (tabNumber: number): boolean => {
    // Tab 1 is always accessible
    if (tabNumber === 1) return true;

    // Other tabs are accessible if:
    // 1. Previous tab is completed, OR
    // 2. It's the current tab, OR
    // 3. User has previously accessed it (for editing)
    return (
      completedTabs.has(tabNumber - 1) ||
      tabNumber === currentTab ||
      completedTabs.has(tabNumber)
    );
  };

  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================

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

    // Warn about unsaved changes if switching tabs
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
    // OB-UX-001: Prevent double-tap during navigation
    if (isNavigating || isSaving) {
      console.log(
        "🚫 OnboardingContainer: Navigation blocked - already in progress",
      );
      return;
    }

    setIsNavigating(true);

    try {
      console.log(
        "🎭 OnboardingContainer: handleNextTab called, currentTab:",
        currentTab,
        "editMode:",
        editMode,
      );
      console.log(
        "🎭 OnboardingContainer: currentTabData provided:",
        currentTabData ? "Yes" : "No",
      );

      const validation = validateTab(currentTab, currentTabData);
      console.log("🎭 OnboardingContainer: Validation result:", validation);

      if (!validation.is_valid) {
        console.log("🚫 OnboardingContainer: Validation failed, showing alert");
        Alert.alert(
          "Incomplete Information",
          `Please complete all required fields:\n\n${validation.errors.join("\n")}`,
          [{ text: "OK" }],
        );
        return;
      }

      console.log("✅ OnboardingContainer: Validation passed");

      // Mark current tab as completed
      markTabCompleted(currentTab);

      // In edit mode, save and call onEditComplete
      if (editMode) {
        console.log(
          "💾 OnboardingContainer: Edit mode - saving and calling onEditComplete",
        );
        setIsSaving(true);
        try {
          await saveToLocal();
        } finally {
          setIsSaving(false);
        }
        onEditComplete?.();
        return;
      }

      // Normal mode: Move to next tab or complete onboarding
      if (currentTab < 5) {
        const nextTab = currentTab + 1;
        console.log("🎭 OnboardingContainer: Moving to tab:", nextTab);
        setCurrentTab(nextTab);
      } else {
        console.log("🎉 OnboardingContainer: Completing onboarding");
        handleCompleteOnboarding();
      }
    } finally {
      setIsNavigating(false);
    }
  };

  const handlePreviousTab = () => {
    // In edit mode, call onEditCancel instead of navigating back
    if (editMode) {
      console.log("🔙 OnboardingContainer: Edit mode - calling onEditCancel");
      onEditCancel?.();
      return;
    }

    // Normal mode: Navigate to previous tab or exit
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
    console.log("🚀 OnboardingContainer: handleCompleteOnboarding called");
    console.log("📊 OnboardingContainer: Current tab:", currentTab);
    console.log("📊 OnboardingContainer: Calling completeOnboarding()...");

    const success = await completeOnboarding();

    console.log(
      "📊 OnboardingContainer: completeOnboarding() returned:",
      success,
    );

    if (success) {
      console.log(
        "✅ OnboardingContainer: Success! Showing premium completion modal...",
      );
      setShowCompletionModal(true);
    } else {
      console.error(
        "❌ OnboardingContainer: Completion failed! Showing error dialog...",
      );
      setCompletionDialog({
        visible: true,
        title: "Error",
        message:
          "There was an issue completing your onboarding. Please try again.",
        type: "error",
        onConfirm: () => {
          console.log("User dismissed error dialog");
          setCompletionDialog((prev) => ({ ...prev, visible: false }));
        },
      });
    }
  };

  // Handler for premium completion modal
  const handleCompletionGetStarted = () => {
    console.log(
      '🎯 OnboardingContainer: User clicked "Start Your Journey", calling onComplete callback...',
    );
    setShowCompletionModal(false);

    // Collect all onboarding data to pass to callback
    // Map the new tab-based data structure to the expected OnboardingReviewData format
    // CRITICAL: Validate required data before completing onboarding
    // NO HARDCODED FALLBACKS - if data is missing, user must complete that step
    if (!personalInfo?.age || !personalInfo?.gender) {
      console.error("❌ OnboardingContainer: Missing required personal info");
      throw new Error("Please complete Personal Info tab with age and gender");
    }
    if (!bodyAnalysis?.height_cm || !bodyAnalysis?.current_weight_kg) {
      console.error(
        "❌ OnboardingContainer: Missing required body analysis data",
      );
      throw new Error(
        "Please complete Body Analysis tab with height and weight",
      );
    }
    if (!advancedReview?.daily_calories) {
      console.error(
        "❌ OnboardingContainer: Missing calculated calorie target",
      );
      throw new Error(
        "Nutrition calculations not completed. Please wait for calculations to finish.",
      );
    }

    const completeData: OnboardingReviewData = {
      personalInfo: {
        first_name: personalInfo?.first_name || "User",
        last_name: personalInfo?.last_name || "",
        email: personalInfo?.email || "",
        age: personalInfo.age, // NO FALLBACK - validated above
        gender: personalInfo.gender, // NO FALLBACK - validated above
        height: bodyAnalysis.height_cm, // NO FALLBACK - validated above
        weight: bodyAnalysis.current_weight_kg, // NO FALLBACK - validated above
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
        calorieTarget: advancedReview.daily_calories, // NO FALLBACK - validated above
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
      "📦 OnboardingContainer: Passing complete data to onComplete:",
      completeData,
    );

    onComplete(completeData);
    console.log(
      "✅ OnboardingContainer: onComplete callback called with data - should redirect now",
    );
  };

  // ============================================================================
  // TAB CONTENT RENDERER
  // ============================================================================

  const renderTabContent = () => {
    console.log(
      "🎭 OnboardingContainer: renderTabContent called, currentTab:",
      currentTab,
      "isEditingFromReview:",
      isEditingFromReview,
    );

    // Only show "Jump to Review" if tab 5 (Advanced Review) has been accessed
    // This prevents users from jumping to review during initial onboarding flow
    const canJumpToReview = completedTabs.has(4) || completedTabs.has(5);

    const commonProps = {
      onNext: handleNextTab,
      onBack: handlePreviousTab,
      onNavigateToTab: canJumpToReview ? setCurrentTab : undefined,
      isLoading,
      isAutoSaving,
      // OB-UX-001/002: Pass navigation and saving states to tabs
      isNavigating,
      isSaving,
      // Pass editing from review state for button text change
      isEditingFromReview,
      onReturnToReview: handleReturnToReview,
    };

    switch (currentTab) {
      case 1:
        return (
          <PersonalInfoTab
            {...commonProps}
            data={personalInfo}
            validationResult={tabValidationStatus[1]}
            onUpdate={updatePersonalInfo}
          />
        );

      case 2:
        return (
          <DietPreferencesTab
            {...commonProps}
            data={dietPreferences}
            validationResult={tabValidationStatus[2]}
            onUpdate={updateDietPreferences}
          />
        );

      case 3:
        return (
          <BodyAnalysisTab
            {...commonProps}
            data={bodyAnalysis}
            personalInfoData={personalInfo}
            validationResult={tabValidationStatus[3]}
            onUpdate={updateBodyAnalysis}
          />
        );

      case 4:
        return (
          <WorkoutPreferencesTab
            {...commonProps}
            data={workoutPreferences}
            validationResult={tabValidationStatus[4]}
            bodyAnalysisData={bodyAnalysis} // For auto-population
            personalInfoData={personalInfo} // For intensity calculation
            onUpdate={updateWorkoutPreferences}
          />
        );

      case 5:
        // OB-UX-003: Schedule editing state reset for next render cycle instead of during render
        if (isEditingFromReview && !pendingEditingReset.current) {
          pendingEditingReset.current = true;
        }
        return (
          <AdvancedReviewTab
            {...commonProps}
            personalInfo={personalInfo}
            dietPreferences={dietPreferences}
            bodyAnalysis={bodyAnalysis}
            workoutPreferences={workoutPreferences}
            advancedReview={advancedReview}
            onComplete={handleCompleteOnboarding}
            onUpdate={updateAdvancedReview}
            onUpdateBodyAnalysis={updateBodyAnalysis}
            onUpdateWorkoutPreferences={updateWorkoutPreferences}
            onSaveToDatabase={saveToDatabase} // NEW: For immediate database persistence
            onNavigateToTab={handleNavigateFromReview}
            isComplete={isOnboardingComplete()}
          />
        );

      default:
        return (
          <PersonalInfoTab
            {...commonProps}
            data={personalInfo}
            validationResult={tabValidationStatus[1]}
            onUpdate={updatePersonalInfo}
          />
        );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (showProgressModal) {
    return (
      <SafeAreaView style={styles.container}>
        <OnboardingProgressIndicator
          currentTab={currentTab}
          totalTabs={5}
          completedTabs={Array.from(completedTabs)}
          tabValidationStatus={tabValidationStatus}
          overallCompletion={overallCompletion}
          showDetails={true}
        />
      </SafeAreaView>
    );
  }

  return (
    <AuroraBackground
      theme="space"
      animated={true}
      animationSpeed={1}
      intensity={0.3}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Tab Navigation Bar - Hidden in edit mode */}
        {!editMode && (
          <OnboardingTabBar
            activeTab={currentTab}
            tabs={getTabConfigs()}
            onTabPress={handleTabPress}
            completionPercentage={overallCompletion}
          />
        )}

        {/* Tab Content */}
        <View style={styles.contentContainer}>{renderTabContent()}</View>

        {/* Debug button removed for cleaner UI */}

        {/* Premium Completion Modal */}
        <OnboardingCompleteModal
          visible={showCompletionModal}
          userName={personalInfo?.first_name || "Champion"}
          onGetStarted={handleCompletionGetStarted}
          stats={{
            goal: (workoutPreferences?.primary_goals || [])[0] || "Get Fit",
            workoutsPerWeek:
              workoutPreferences?.workout_frequency_per_week || 3,
            // Use calculated calorie target - NO HARDCODED FALLBACK
            // If null, show 'calculating...' in the UI
            calorieTarget: advancedReview?.daily_calories ?? (null as any),
          }}
        />

        {/* Error Dialog (kept for error states) */}
        <CustomDialog
          visible={
            completionDialog.visible && completionDialog.type === "error"
          }
          title={completionDialog.title}
          message={completionDialog.message}
          type={completionDialog.type}
          actions={[
            {
              text: "OK",
              onPress:
                completionDialog.onConfirm ||
                (() =>
                  setCompletionDialog((prev) => ({ ...prev, visible: false }))),
              style: "default",
            },
          ]}
        />
      </View>
    </AuroraBackground>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent", // Let Aurora background show through
  },

  contentContainer: {
    flex: 1,
  },

  // Placeholder styles (temporary)
  placeholder: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: ResponsiveTheme.spacing.xl,
  },

  placeholderText: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
  },

  // Debug styles
  debugContainer: {
    position: "absolute",
    top: "6%",
    right: ResponsiveTheme.spacing.md,
    backgroundColor: ResponsiveTheme.colors.primary,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  debugText: {
    color: ResponsiveTheme.colors.white,
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});

export default OnboardingContainer;
