import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, BackHandler, Alert, Text } from 'react-native';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import OnboardingTabBar, { ONBOARDING_TABS, TabConfig } from '../../components/onboarding/OnboardingTabBar';
import OnboardingProgressIndicator from '../../components/onboarding/OnboardingProgressIndicator';
import { AuroraBackground } from '../../components/ui/aurora';

// Import tab components
import PersonalInfoTab from './tabs/PersonalInfoTab';
import DietPreferencesTab from './tabs/DietPreferencesTab';
import BodyAnalysisTab from './tabs/BodyAnalysisTab';
import WorkoutPreferencesTab from './tabs/WorkoutPreferencesTab';
import AdvancedReviewTab from './tabs/AdvancedReviewTab';
import { CustomDialog } from '../../components/ui/CustomDialog';

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingContainerProps {
  onComplete: () => void;
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
    completeOnboarding,
    isOnboardingComplete,
    updatePersonalInfo,
    updateDietPreferences,
    updateBodyAnalysis,
    updateWorkoutPreferences,
    updateAdvancedReview,
  } = useOnboardingState();

  const [showProgressModal, setShowProgressModal] = useState(false);

  // State for completion dialog (web-compatible)
  const [completionDialog, setCompletionDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success',
  });

  // Initialize starting tab - update when initialTab or editMode changes
  useEffect(() => {
    const tabToShow = editMode && initialTab ? initialTab : startingTab;
    console.log('🎭 OnboardingContainer: Initializing with tab:', tabToShow, '(editMode:', editMode, ', initialTab:', initialTab, ')');
    setCurrentTab(tabToShow);
  }, [editMode, initialTab, startingTab]); // Re-run when edit mode or initialTab changes
  
  // Handle hardware back button on Android
  useEffect(() => {
    const backAction = () => {
      handleBackPress();
      return true; // Prevent default behavior
    };
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentTab, hasUnsavedChanges]);
  
  // Auto-save periodically
  useEffect(() => {
    if (hasUnsavedChanges) {
      const saveInterval = setInterval(() => {
        saveToLocal();
      }, 30000); // Auto-save every 30 seconds
      
      return () => clearInterval(saveInterval);
    }
  }, [hasUnsavedChanges, saveToLocal]);
  
  // ============================================================================
  // TAB CONFIGURATION
  // ============================================================================
  
  const getTabConfigs = (): TabConfig[] => {
    return ONBOARDING_TABS.map(tab => ({
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
    return completedTabs.has(tabNumber - 1) || 
           tabNumber === currentTab || 
           completedTabs.has(tabNumber);
  };
  
  // ============================================================================
  // NAVIGATION HANDLERS
  // ============================================================================
  
  const handleTabPress = (tabNumber: number) => {
    const isAccessible = getTabAccessibility(tabNumber);
    
    if (!isAccessible) {
      Alert.alert(
        'Tab Not Available',
        'Please complete the previous tab before accessing this one.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Warn about unsaved changes if switching tabs
    if (hasUnsavedChanges && tabNumber !== currentTab) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Do you want to save before switching tabs?',
        [
          {
            text: 'Don\'t Save',
            style: 'destructive',
            onPress: () => setCurrentTab(tabNumber),
          },
          {
            text: 'Save & Continue',
            onPress: async () => {
              await saveToLocal();
              setCurrentTab(tabNumber);
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      setCurrentTab(tabNumber);
    }
  };
  
  const handleNextTab = async (currentTabData?: any) => {
    console.log('🎭 OnboardingContainer: handleNextTab called, currentTab:', currentTab, 'editMode:', editMode);
    console.log('🎭 OnboardingContainer: currentTabData provided:', currentTabData ? 'Yes' : 'No');

    const validation = validateTab(currentTab, currentTabData);
    console.log('🎭 OnboardingContainer: Validation result:', validation);

    if (!validation.is_valid) {
      console.log('🚫 OnboardingContainer: Validation failed, showing alert');
      Alert.alert(
        'Incomplete Information',
        `Please complete all required fields:\n\n${validation.errors.join('\n')}`,
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('✅ OnboardingContainer: Validation passed');

    // Mark current tab as completed
    markTabCompleted(currentTab);

    // In edit mode, save and call onEditComplete
    if (editMode) {
      console.log('💾 OnboardingContainer: Edit mode - saving and calling onEditComplete');
      await saveToLocal();
      onEditComplete?.();
      return;
    }

    // Normal mode: Move to next tab or complete onboarding
    if (currentTab < 5) {
      const nextTab = currentTab + 1;
      console.log('🎭 OnboardingContainer: Moving to tab:', nextTab);
      setCurrentTab(nextTab);
    } else {
      console.log('🎉 OnboardingContainer: Completing onboarding');
      handleCompleteOnboarding();
    }
  };
  
  const handlePreviousTab = () => {
    // In edit mode, call onEditCancel instead of navigating back
    if (editMode) {
      console.log('🔙 OnboardingContainer: Edit mode - calling onEditCancel');
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
        'Exit Onboarding',
        'You have unsaved changes. Are you sure you want to exit?',
        [
          { text: 'Stay', style: 'cancel' },
          {
            text: 'Save & Exit',
            onPress: async () => {
              await saveToLocal();
              onExit?.();
            },
          },
          {
            text: 'Exit Without Saving',
            style: 'destructive',
            onPress: () => onExit?.(),
          },
        ]
      );
    } else {
      onExit?.();
    }
  };
  
  const handleCompleteOnboarding = async () => {
    console.log('🚀 OnboardingContainer: handleCompleteOnboarding called');
    console.log('📊 OnboardingContainer: Current tab:', currentTab);
    console.log('📊 OnboardingContainer: Calling completeOnboarding()...');

    const success = await completeOnboarding();

    console.log('📊 OnboardingContainer: completeOnboarding() returned:', success);

    if (success) {
      console.log('✅ OnboardingContainer: Success! Showing completion dialog...');
      setCompletionDialog({
        visible: true,
        title: 'Onboarding Complete! 🎉',
        message: 'Your profile has been set up successfully. Welcome to FitAI!',
        type: 'success',
        onConfirm: () => {
          console.log('🎯 OnboardingContainer: User clicked "Get Started", calling onComplete callback...');
          setCompletionDialog(prev => ({ ...prev, visible: false }));

          // Collect all onboarding data to pass to callback
          const completeData = {
            personalInfo,
            dietPreferences,
            bodyAnalysis,
            workoutPreferences,
            advancedReview,
          };
          console.log('📦 OnboardingContainer: Passing complete data to onComplete:', completeData);

          onComplete(completeData as any);
          console.log('✅ OnboardingContainer: onComplete callback called with data - should redirect now');
        },
      });
    } else {
      console.error('❌ OnboardingContainer: Completion failed! Showing error dialog...');
      setCompletionDialog({
        visible: true,
        title: 'Error',
        message: 'There was an issue completing your onboarding. Please try again.',
        type: 'error',
        onConfirm: () => {
          console.log('User dismissed error dialog');
          setCompletionDialog(prev => ({ ...prev, visible: false }));
        },
      });
    }
  };
  
  // ============================================================================
  // TAB CONTENT RENDERER
  // ============================================================================
  
  const renderTabContent = () => {
    console.log('🎭 OnboardingContainer: renderTabContent called, currentTab:', currentTab);
    
    // Only show "Jump to Review" if tab 5 (Advanced Review) has been accessed
    // This prevents users from jumping to review during initial onboarding flow
    const canJumpToReview = completedTabs.has(4) || completedTabs.has(5);
    
    const commonProps = {
      onNext: handleNextTab,
      onBack: handlePreviousTab,
      onNavigateToTab: canJumpToReview ? setCurrentTab : undefined,
      isLoading,
      isAutoSaving,
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
            onNavigateToTab={setCurrentTab}
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
    <AuroraBackground theme="space" animated={true} animationSpeed={1} intensity={0.3}>
      <SafeAreaView style={styles.container}>
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
        <View style={styles.contentContainer}>
          {renderTabContent()}
        </View>

        {/* Progress Modal Toggle (for debugging/testing) */}
        {__DEV__ && !editMode && (
          <View style={styles.debugContainer}>
            <Text
              style={styles.debugText}
              onPress={() => setShowProgressModal(!showProgressModal)}
            >
              {showProgressModal ? 'Hide' : 'Show'} Progress
            </Text>
          </View>
        )}

        {/* Completion Dialog (Web-Compatible) */}
        <CustomDialog
          visible={completionDialog.visible}
          title={completionDialog.title}
          message={completionDialog.message}
          type={completionDialog.type}
          actions={[
            {
              text: completionDialog.type === 'success' ? 'Get Started' : 'OK',
              onPress: completionDialog.onConfirm || (() => setCompletionDialog(prev => ({ ...prev, visible: false }))),
              style: 'default',
            },
          ]}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Let Aurora background show through
  },
  
  contentContainer: {
    flex: 1,
  },
  
  // Placeholder styles (temporary)
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ResponsiveTheme.spacing.xl,
  },
  
  placeholderText: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Debug styles
  debugContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 100,
  },
  
  debugText: {
    color: ResponsiveTheme.colors.white,
    fontSize: 11,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },
});

export default OnboardingContainer;
