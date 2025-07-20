import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { WelcomeScreen } from './WelcomeScreen';
import { LoginScreen } from './LoginScreen';
import { PersonalInfoScreen } from './PersonalInfoScreen';
import { GoalsScreen } from './GoalsScreen';
import { PersonalInfo, FitnessGoals, RegisterCredentials } from '../../types/user';
import { THEME } from '../../utils/constants';
import { useOnboardingIntegration } from '../../utils/integration';
import { useAuth } from '../../hooks/useAuth';

interface OnboardingFlowProps {
  onComplete: (userData: {
    personalInfo: PersonalInfo;
    fitnessGoals: FitnessGoals;
  }) => void;
}

type OnboardingStep = 'welcome' | 'login' | 'personal-info' | 'goals';

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo | null>(null);
  const [fitnessGoals, setFitnessGoals] = useState<FitnessGoals | null>(null);
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

    // Skip automatic registration - users can sign up later if they want
    // Just proceed to goals screen to continue onboarding
    console.log('📝 Personal info completed, proceeding to goals screen');
    setCurrentStep('goals');
  };

  const handlePersonalInfoBack = () => {
    setCurrentStep('welcome');
  };

  const handleGoalsNext = async (data: FitnessGoals) => {
    console.log('🎯 Complete Setup button clicked!');
    console.log('📊 Goals data:', data);
    console.log('👤 Personal info exists:', !!personalInfo);
    console.log('👤 Personal info:', personalInfo);

    setFitnessGoals(data);

    if (personalInfo) {
      console.log('✅ Personal info found, proceeding with onboarding completion');
      const onboardingData = {
        personalInfo,
        fitnessGoals: data,
        isComplete: true,
      };

      // Only try to save to backend if user is authenticated
      if (user) {
        try {
          console.log('💾 User is authenticated, saving onboarding data to backend');
          const result = await saveOnboardingData(onboardingData);

          if (!result.success) {
            console.warn('Failed to save onboarding data:', result.error);
            // Continue with onboarding completion even if save fails
          }
        } catch (error) {
          console.warn('Error saving onboarding data:', error);
          // Continue with onboarding completion even if save fails
        }
      } else {
        console.log('👤 User not authenticated, skipping backend save (data will be stored locally)');
      }

      // Always complete onboarding regardless of authentication or save result
      console.log('🚀 Calling onComplete with data:', { personalInfo, fitnessGoals: data });
      onComplete({
        personalInfo,
        fitnessGoals: data,
      });
    } else {
      console.error('❌ Personal info is missing! Cannot complete onboarding.');
      Alert.alert('Error', 'Personal information is missing. Please go back and fill out your personal details.');
    }
  };

  const handleGoalsBack = () => {
    setCurrentStep('personal-info');
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
      
      default:
        return (
          <WelcomeScreen
            onGetStarted={handleWelcomeNext}
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
