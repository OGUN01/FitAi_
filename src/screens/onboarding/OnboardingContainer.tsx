import React from "react";
import { View, StyleSheet, SafeAreaView, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ResponsiveTheme } from "../../utils/constants";
import { useOnboardingLogic } from "../../hooks/useOnboardingLogic";
import OnboardingProgressIndicator from "../../components/onboarding/OnboardingProgressIndicator";
import { AuroraBackground } from "../../components/ui/aurora";

import PersonalInfoTab from "./tabs/PersonalInfoTab";
import DietPreferencesTab from "./tabs/DietPreferencesTab";
import BodyAnalysisTab from "./tabs/BodyAnalysisTab";
import WorkoutPreferencesTab from "./tabs/WorkoutPreferencesTab";
import AdvancedReviewTab from "./tabs/AdvancedReviewTab";
import { OnboardingHeader } from "../../components/onboarding/OnboardingHeader";
import { OnboardingModals } from "../../components/onboarding/OnboardingModals";
import type { OnboardingReviewData } from "../../types/onboarding";

interface OnboardingContainerProps {
  onComplete: (data: OnboardingReviewData) => void;
  onExit?: () => void;
  startingTab?: number;
  showProgressIndicator?: boolean;
  editMode?: boolean;
  initialTab?: number;
  onEditComplete?: () => void;
  onEditCancel?: () => void;
}

export const OnboardingContainer: React.FC<OnboardingContainerProps> = (
  props,
) => {
  const insets = useSafeAreaInsets();

  const logic = useOnboardingLogic(props);

  const renderTabContent = () => {
    console.log(
      "🎭 OnboardingContainer: renderTabContent, currentTab:",
      logic.currentTab,
      "isEditingFromReview:",
      logic.isEditingFromReview,
    );

    const canJumpToReview =
      logic.completedTabs.has(4) || logic.completedTabs.has(5);

    const commonProps = {
      onNext: logic.handleNextTab,
      onBack: logic.handlePreviousTab,
      onNavigateToTab: canJumpToReview ? logic.setCurrentTab : undefined,
      isLoading: logic.isLoading,
      isAutoSaving: logic.isAutoSaving,
      isNavigating: logic.isNavigating,
      isSaving: logic.isSaving,
      isEditingFromReview: logic.isEditingFromReview,
      onReturnToReview: logic.handleReturnToReview,
    };

    switch (logic.currentTab) {
      case 1:
        return (
          <PersonalInfoTab
            {...commonProps}
            data={logic.personalInfo}
            validationResult={logic.tabValidationStatus[1]}
            onUpdate={logic.updatePersonalInfo}
          />
        );

      case 2:
        return (
          <DietPreferencesTab
            {...commonProps}
            data={logic.dietPreferences}
            validationResult={logic.tabValidationStatus[2]}
            onUpdate={logic.updateDietPreferences}
          />
        );

      case 3:
        return (
          <BodyAnalysisTab
            {...commonProps}
            data={logic.bodyAnalysis}
            personalInfoData={logic.personalInfo}
            validationResult={logic.tabValidationStatus[3]}
            onUpdate={logic.updateBodyAnalysis}
          />
        );

      case 4:
        return (
          <WorkoutPreferencesTab
            {...commonProps}
            data={logic.workoutPreferences}
            validationResult={logic.tabValidationStatus[4]}
            bodyAnalysisData={logic.bodyAnalysis}
            personalInfoData={logic.personalInfo}
            onUpdate={logic.updateWorkoutPreferences}
          />
        );

      case 5:
        if (logic.isEditingFromReview && !logic.pendingEditingReset.current) {
          logic.pendingEditingReset.current = true;
        }
        return (
          <AdvancedReviewTab
            {...commonProps}
            personalInfo={logic.personalInfo}
            dietPreferences={logic.dietPreferences}
            bodyAnalysis={logic.bodyAnalysis}
            workoutPreferences={logic.workoutPreferences}
            advancedReview={logic.advancedReview}
            onComplete={logic.handleCompleteOnboarding}
            onUpdate={logic.updateAdvancedReview}
            onUpdateBodyAnalysis={logic.updateBodyAnalysis}
            onUpdateWorkoutPreferences={logic.updateWorkoutPreferences}
            onSaveToDatabase={logic.saveToDatabase}
            onNavigateToTab={logic.handleNavigateFromReview}
            isComplete={logic.isOnboardingComplete()}
          />
        );

      default:
        return (
          <PersonalInfoTab
            {...commonProps}
            data={logic.personalInfo}
            validationResult={logic.tabValidationStatus[1]}
            onUpdate={logic.updatePersonalInfo}
          />
        );
    }
  };

  if (logic.showProgressModal) {
    return (
      <SafeAreaView style={styles.container}>
        <OnboardingProgressIndicator
          currentTab={logic.currentTab}
          totalTabs={5}
          completedTabs={Array.from(logic.completedTabs)}
          tabValidationStatus={logic.tabValidationStatus}
          overallCompletion={logic.overallCompletion}
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
        <OnboardingHeader
          activeTab={logic.currentTab}
          tabs={logic.getTabConfigs()}
          onTabPress={logic.handleTabPress}
          completionPercentage={logic.overallCompletion}
          editMode={props.editMode}
        />

        <View style={styles.contentContainer}>{renderTabContent()}</View>

        <OnboardingModals
          completionDialog={logic.completionDialog}
          showCompletionModal={logic.showCompletionModal}
          personalInfo={logic.personalInfo}
          workoutPreferences={logic.workoutPreferences}
          advancedReview={logic.advancedReview}
          onCompletionGetStarted={logic.handleCompletionGetStarted}
          onDismissDialog={() =>
            logic.setCompletionDialog((prev) => ({ ...prev, visible: false }))
          }
        />
      </View>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  contentContainer: {
    flex: 1,
  },

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
