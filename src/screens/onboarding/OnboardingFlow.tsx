import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { rf, rp, rh, rw, rs } from '../../utils/responsive';
import { WelcomeScreen } from './WelcomeScreen';
import { LoginScreen } from './LoginScreen';
import { SignUpScreen } from './SignUpScreen';
import { PersonalInfoScreen } from './PersonalInfoScreen';
import { GoalsScreen } from './GoalsScreen';
import { DietPreferencesScreen, DietPreferences } from './DietPreferencesScreen';
import { WorkoutPreferencesScreen, WorkoutPreferences } from './WorkoutPreferencesScreen';
import { BodyAnalysisScreen, BodyAnalysis } from './BodyAnalysisScreen';
import { ReviewScreen, OnboardingReviewData } from './ReviewScreen';
import { PersonalInfo, FitnessGoals, RegisterCredentials } from '../../types/user';
import { THEME } from '../../utils/constants';
import { ResponsiveTheme } from '../../utils/responsiveTheme';
import { useOnboardingIntegration } from '../../utils/integration';
import { useAuth } from '../../hooks/useAuth';
import { useUserStore } from '../../stores/userStore';

interface OnboardingFlowProps {
  onComplete: (userData: OnboardingReviewData) => void;
  startStep?: string;
}

type OnboardingStep =
  | 'welcome'
  | 'signup'
  | 'login'
  | 'personal-info'
  | 'goals'
  | 'diet-preferences'
  | 'workout-preferences'
  | 'body-analysis'
  | 'review';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
  startStep = 'welcome',
}) => {
  const { user, isInitialized, isAuthenticated } = useAuth();
  const { getCompleteProfile } = useUserStore();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(startStep as OnboardingStep);
  const [hasAutoRedirected, setHasAutoRedirected] = useState(false);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [fitnessGoals, setFitnessGoals] = useState<FitnessGoals | null>(null);
  const [dietPreferences, setDietPreferences] = useState<DietPreferences | null>(null);
  const [workoutPreferences, setWorkoutPreferences] = useState<WorkoutPreferences | null>(null);
  const [bodyAnalysis, setBodyAnalysis] = useState<BodyAnalysis | null>(null);

  // Check if user is authenticated and skip to profile setup
  // Only auto-redirect from welcome screen, not from signup/login flow
  useEffect(() => {
    console.log('🎭 OnboardingFlow: Auth state check', {
      isInitialized,
      isAuthenticated,
      user: user ? `${user.email} (verified: ${user.isEmailVerified})` : 'null',
      currentStep
    });

    // Only auto-redirect if user is fully authenticated (email verified) and on welcome screen
    // and we haven't already redirected them (to prevent redirect loops)
    if (isInitialized && isAuthenticated && currentStep === 'welcome' && !hasAutoRedirected && startStep === 'welcome') {
      console.log('🎭 OnboardingFlow: User is authenticated and verified, skipping to personal info');
      setCurrentStep('personal-info');
      setHasAutoRedirected(true);
    }
  }, [isAuthenticated, isInitialized, currentStep, hasAutoRedirected]);
  
  // Handle startStep initialization (only run once)
  useEffect(() => {
    if (isInitialized && startStep !== 'welcome' && startStep !== currentStep && !hasAutoRedirected) {
      console.log('🎭 OnboardingFlow: Initializing with start step:', startStep);
      setCurrentStep(startStep as OnboardingStep);
      setHasAutoRedirected(true);
    }
  }, [isInitialized, startStep]);
  
  // Load existing data when resuming onboarding
  useEffect(() => {
    const loadExistingData = async () => {
      if (isInitialized && user && isAuthenticated && startStep !== 'welcome') {
        console.log('🔄 OnboardingFlow: Loading existing data for resume');
        try {
          const profileResponse = await getCompleteProfile(user.id);
          if (profileResponse.success && profileResponse.data) {
            const profile = profileResponse.data;
            
            // Load personal info if exists
            if (profile.personalInfo) {
              console.log('📋 OnboardingFlow: Loading existing personal info');
              setPersonalInfo(profile.personalInfo);
            }
            
            // Load fitness goals if exists
            if (profile.fitnessGoals && profile.fitnessGoals.primaryGoals?.length > 0) {
              console.log('🎯 OnboardingFlow: Loading existing fitness goals');
              setFitnessGoals(profile.fitnessGoals);
            }
          }
        } catch (error) {
          console.error('❌ OnboardingFlow: Error loading existing data:', error);
        }
      }
    };

    loadExistingData();
  }, [isInitialized, user, isAuthenticated, startStep, getCompleteProfile]);

  const [isLoading, setIsLoading] = useState(false);

  const { saveOnboardingData } = useOnboardingIntegration();
  const { setGuestMode, register, logout } = useAuth();

  const handleWelcomeNext = () => {
    // Enable guest mode and skip signup - go directly to onboarding
    setGuestMode(true);
    console.log('🎭 OnboardingFlow: Starting guest mode onboarding');
    setCurrentStep('personal-info');
  };

  const handleWelcomeLogin = () => {
    setCurrentStep('login');
  };

  const handleLoginSuccess = async () => {
    // User is now authenticated, App.tsx will now handle determining
    // the correct starting step and loading existing data
    console.log('✅ Login successful, letting App.tsx handle resume logic');
    // The onboarding flow will be restarted by App.tsx with the correct step
  };

  const handleLoginBack = () => {
    setCurrentStep('welcome');
  };

  const handleLoginSignUp = () => {
    setCurrentStep('signup');
  };

  // Sign Up handlers
  const handleSignUpSuccess = () => {
    // After successful signup, redirect to login page
    setCurrentStep('login');
  };

  const handleSignUpBack = () => {
    setCurrentStep('welcome');
  };

  const handleSignUpLogin = () => {
    setCurrentStep('login');
  };

  const handlePersonalInfoNext = async (data: PersonalInfo) => {
    console.log('📝 Personal info submitted:', data);
    setPersonalInfo(data);
    console.log('✅ Personal info state updated');
    setCurrentStep('goals');
  };

  const handlePersonalInfoBack = async () => {
    // For authenticated users, we need to allow them to logout and return to welcome
    if (user && isAuthenticated) {
      console.log('🔙 PersonalInfo back: Authenticated user wants to go back, logging out');
      await logout();
      setHasAutoRedirected(false); // Reset auto-redirect flag
      setCurrentStep('welcome');
    } else if (user && !isAuthenticated) {
      console.log('🔙 PersonalInfo back: Clearing unverified user session');
      await logout();
      setHasAutoRedirected(false); // Reset auto-redirect flag
      setCurrentStep('welcome');
    } else {
      // Guest user can go back normally
      console.log('🔙 PersonalInfo back: Guest user going back to welcome');
      setCurrentStep('welcome');
    }
  };

  const handleGoalsNext = async (data: FitnessGoals) => {
    console.log('🎯 Goals completed, proceeding to diet preferences');
    setFitnessGoals(data);
    setCurrentStep('diet-preferences');
  };

  const handleGoalsBack = () => {
    setCurrentStep('personal-info');
  };

  // Diet Preferences handlers
  const handleDietPreferencesNext = (data: DietPreferences) => {
    console.log('🍽️ Diet preferences completed');
    setDietPreferences(data);
    setCurrentStep('workout-preferences');
  };

  const handleDietPreferencesBack = () => {
    setCurrentStep('goals');
  };

  // Workout Preferences handlers
  const handleWorkoutPreferencesNext = (data: WorkoutPreferences) => {
    console.log('💪 Workout preferences completed');
    setWorkoutPreferences(data);
    setCurrentStep('body-analysis');
  };

  const handleWorkoutPreferencesBack = () => {
    setCurrentStep('diet-preferences');
  };

  // Body Analysis handlers
  const handleBodyAnalysisNext = (data: BodyAnalysis) => {
    console.log('📸 Body analysis completed');
    setBodyAnalysis(data);
    setCurrentStep('review');
  };

  const handleBodyAnalysisBack = () => {
    setCurrentStep('workout-preferences');
  };

  const handleBodyAnalysisSkip = () => {
    console.log('📸 Body analysis skipped');
    setBodyAnalysis({ photos: {} });
    setCurrentStep('review');
  };

  // Review handlers
  const handleReviewComplete = async () => {
    console.log('🎉 Onboarding completion started');

    if (!personalInfo || !fitnessGoals || !dietPreferences || !workoutPreferences) {
      Alert.alert('Error', 'Some required information is missing. Please complete all sections.');
      return;
    }

    const completeData: OnboardingReviewData = {
      personalInfo,
      fitnessGoals,
      dietPreferences,
      workoutPreferences,
      bodyAnalysis: bodyAnalysis || { photos: {} },
    };

    // Save to backend if user is authenticated
    if (user) {
      try {
        console.log('💾 Saving complete onboarding data to backend');
        const result = await saveOnboardingData({
          ...completeData,
          isComplete: true,
        });

        if (!result.success) {
          console.warn('Failed to save onboarding data:', result.error);
        }
      } catch (error) {
        console.warn('Error saving onboarding data:', error);
      }
    }

    console.log('🚀 Calling onComplete with complete data');
    onComplete(completeData);
  };

  const handleReviewBack = () => {
    setCurrentStep('body-analysis');
  };

  const handleReviewEditSection = (section: keyof OnboardingReviewData) => {
    console.log(`✏️ Editing section: ${section}`);

    switch (section) {
      case 'personalInfo':
        setCurrentStep('personal-info');
        break;
      case 'fitnessGoals':
        setCurrentStep('goals');
        break;
      case 'dietPreferences':
        setCurrentStep('diet-preferences');
        break;
      case 'workoutPreferences':
        setCurrentStep('workout-preferences');
        break;
      case 'bodyAnalysis':
        setCurrentStep('body-analysis');
        break;
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <WelcomeScreen
            onGetStarted={handleWelcomeNext}
            onLogin={handleWelcomeLogin}
          />
        );

      case 'signup':
        return (
          <SignUpScreen
            onSignUpSuccess={handleSignUpSuccess}
            onBack={handleSignUpBack}
            onLogin={handleSignUpLogin}
          />
        );

      case 'login':
        return (
          <LoginScreen
            onLoginSuccess={handleLoginSuccess}
            onBack={handleLoginBack}
            onSignUp={handleLoginSignUp}
          />
        );

      case 'personal-info':
        return (
          <PersonalInfoScreen
            onNext={handlePersonalInfoNext}
            onBack={handlePersonalInfoBack}
            initialData={personalInfo || undefined}
          />
        );

      case 'goals':
        return (
          <GoalsScreen
            onNext={handleGoalsNext}
            onBack={handleGoalsBack}
            initialData={fitnessGoals || undefined}
          />
        );

      case 'diet-preferences':
        return (
          <DietPreferencesScreen
            onNext={handleDietPreferencesNext}
            onBack={handleDietPreferencesBack}
            initialData={dietPreferences || undefined}
          />
        );

      case 'workout-preferences':
        return (
          <WorkoutPreferencesScreen
            onNext={handleWorkoutPreferencesNext}
            onBack={handleWorkoutPreferencesBack}
            initialData={workoutPreferences || undefined}
          />
        );

      case 'body-analysis':
        return (
          <BodyAnalysisScreen
            onNext={handleBodyAnalysisNext}
            onBack={handleBodyAnalysisBack}
            onSkip={handleBodyAnalysisSkip}
            initialData={bodyAnalysis || undefined}
          />
        );

      case 'review':
        if (!personalInfo || !fitnessGoals || !dietPreferences || !workoutPreferences) {
          // If required data is missing, go back to the first incomplete step
          console.warn('Missing required data for review screen');
          setCurrentStep('personal-info');
          return null;
        }

        return (
          <ReviewScreen
            data={{
              personalInfo,
              fitnessGoals,
              dietPreferences,
              workoutPreferences,
              bodyAnalysis: bodyAnalysis || { photos: {} },
            }}
            onComplete={handleReviewComplete}
            onBack={handleReviewBack}
            onEditSection={handleReviewEditSection}
          />
        );

      default:
        return (
          <WelcomeScreen
            onGetStarted={handleWelcomeNext}
            onLogin={handleWelcomeLogin}
          />
        );
    }
  };

  console.log('🎭 OnboardingFlow: Rendering step:', currentStep);

  return (
    <View style={styles.container}>
      {renderCurrentStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
});
