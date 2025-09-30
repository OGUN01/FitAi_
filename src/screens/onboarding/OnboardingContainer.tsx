import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, BackHandler, Alert, Text } from 'react-native';
import { rf, rp, rh, rw } from '../../utils/responsive';
import { ResponsiveTheme } from '../../utils/constants';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import OnboardingTabBar, { ONBOARDING_TABS, TabConfig } from '../../components/onboarding/OnboardingTabBar';
import OnboardingProgressIndicator from '../../components/onboarding/OnboardingProgressIndicator';

// Import tab components
import PersonalInfoTab from './tabs/PersonalInfoTab';
import DietPreferencesTab from './tabs/DietPreferencesTab';
import BodyAnalysisTab from './tabs/BodyAnalysisTab';
import WorkoutPreferencesTab from './tabs/WorkoutPreferencesTab';
import AdvancedReviewTab from './tabs/AdvancedReviewTab';

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingContainerProps {
  onComplete: () => void;
  onExit?: () => void;
  startingTab?: number;
  showProgressIndicator?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OnboardingContainer: React.FC<OnboardingContainerProps> = ({
  onComplete,
  onExit,
  startingTab = 1,
  showProgressIndicator = false,
}) => {
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
  } = useOnboardingState();
  
  const [showProgressModal, setShowProgressModal] = useState(false);
  
  // Initialize starting tab (only on first render)
  useEffect(() => {
    console.log('🎭 OnboardingContainer: Initializing with startingTab:', startingTab);
    setCurrentTab(startingTab);
  }, []); // Empty dependency array - only run once on mount
  
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
  
  const handleNextTab = () => {
    console.log('🎭 OnboardingContainer: handleNextTab called, currentTab:', currentTab);
    
    const validation = validateTab(currentTab);
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
    
    console.log('✅ OnboardingContainer: Validation passed, proceeding to next tab');
    
    // Mark current tab as completed
    markTabCompleted(currentTab);
    
    // Move to next tab or complete onboarding
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
    const success = await completeOnboarding();
    
    if (success) {
      Alert.alert(
        'Onboarding Complete! 🎉',
        'Your profile has been set up successfully. Welcome to FitAI!',
        [
          {
            text: 'Get Started',
            onPress: onComplete,
          },
        ]
      );
    } else {
      Alert.alert(
        'Error',
        'There was an issue completing your onboarding. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // ============================================================================
  // TAB CONTENT RENDERER
  // ============================================================================
  
  const renderTabContent = () => {
    console.log('🎭 OnboardingContainer: renderTabContent called, currentTab:', currentTab);
    
    const commonProps = {
      onNext: handleNextTab,
      onBack: handlePreviousTab,
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
          />
        );
        
      case 2:
        return (
          <DietPreferencesTab
            {...commonProps}
            data={dietPreferences}
            validationResult={tabValidationStatus[2]}
          />
        );
        
      case 3:
        return (
          <BodyAnalysisTab
            {...commonProps}
            data={bodyAnalysis}
            validationResult={tabValidationStatus[3]}
          />
        );
        
      case 4:
        return (
          <WorkoutPreferencesTab
            {...commonProps}
            data={workoutPreferences}
            validationResult={tabValidationStatus[4]}
            bodyAnalysisData={bodyAnalysis} // For auto-population
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
            isComplete={isOnboardingComplete()}
          />
        );
        
      default:
        return (
          <PersonalInfoTab
            {...commonProps}
            data={personalInfo}
            validationResult={tabValidationStatus[1]}
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
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation Bar */}
      <OnboardingTabBar
        activeTab={currentTab}
        tabs={getTabConfigs()}
        onTabPress={handleTabPress}
        completionPercentage={overallCompletion}
      />
      
      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>
      
      {/* Progress Modal Toggle (for debugging/testing) */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text 
            style={styles.debugText}
            onPress={() => setShowProgressModal(!showProgressModal)}
          >
            {showProgressModal ? 'Hide' : 'Show'} Progress
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
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
    top: rh(50),
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
