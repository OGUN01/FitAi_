import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { WelcomeScreen } from './WelcomeScreen';
import { LoginScreen } from './LoginScreen';
import { PersonalInfoScreen } from './PersonalInfoScreen';
import { GoalsScreen } from './GoalsScreen';
import { DietPreferencesScreen, DietPreferences } from './DietPreferencesScreen';
import { WorkoutPreferencesScreen, WorkoutPreferences } from './WorkoutPreferencesScreen';
import { BodyAnalysisScreen, BodyAnalysis } from './BodyAnalysisScreen';
import { ReviewScreen, OnboardingReviewData } from './ReviewScreen';
import { PersonalInfo, FitnessGoals, RegisterCredentials } from '../../types/user';
import { THEME } from '../../utils/constants';
import { useOnboardingIntegration } from '../../utils/integration';
import { useAuth } from '../../hooks/useAuth';

interface OnboardingFlowProps {
  onComplete: (userData: OnboardingReviewData) => void;
}

type OnboardingStep =
  | 'welcome'
  | 'login'
  | 'personal-info'
  | 'goals'
  | 'diet-preferences'
  | 'workout-preferences'
  | 'body-analysis'
  | 'review';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [fitnessGoals, setFitnessGoals] = useState<FitnessGoals | null>(null);
  const [dietPreferences, setDietPreferences] = useState<DietPreferences | null>(null);
  const [workoutPreferences, setWorkoutPreferences] = useState<WorkoutPreferences | null>(null);
  const [bodyAnalysis, setBodyAnalysis] = useState<BodyAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { saveOnboardingData } = useOnboardingIntegration();
  const { register, user } = useAuth();

  const handleWelcomeNext = () => {
    setCurrentStep('personal-info');
  };

  const handleWelcomeLogin = () => {
    setCurrentStep('login');
  };

  const handleLoginSuccess = () => {
    // User is now authenticated, complete onboarding
    onComplete({
      personalInfo: {
        name: '',
        email: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        activityLevel: '',
      },
      fitnessGoals: {
        primaryGoal: '',
        targetWeight: '',
        timeCommitment: '',
        fitnessLevel: '',
        preferredWorkouts: [],
      },
    });
  };

  const handleLoginBack = () => {
    setCurrentStep('welcome');
  };

  const handleLoginSignUp = () => {
    setCurrentStep('personal-info');
  };

  const handlePersonalInfoNext = async (data: PersonalInfo) => {
    console.log('📝 Personal info submitted:', data);
    setPersonalInfo(data);
    console.log('✅ Personal info state updated');
    setCurrentStep('goals');
  };

  const handlePersonalInfoBack = () => {
    setCurrentStep('welcome');
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

  return (
    <View style={styles.container}>
      {renderCurrentStep()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
});
