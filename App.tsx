import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingFlow } from './src/screens/onboarding/OnboardingFlow';
import { MainNavigation } from './src/components/navigation/MainNavigation';
import { PersonalInfo, FitnessGoals } from './src/types/user';
import { OnboardingReviewData } from './src/screens/onboarding/ReviewScreen';
import { THEME } from './src/utils/constants';
import { useResponsiveTheme } from './src/hooks/useResponsiveTheme';
import { rf, rp } from './src/utils/responsive';
import { initializeBackend } from './src/utils/integration';
import { useAuth } from './src/hooks/useAuth';
import { useUser } from './src/hooks/useUser';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { googleAuthService } from './src/services/googleAuth';
import { migrationService } from './src/services/migrationService';

export default function App() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [onboardingStartStep, setOnboardingStartStep] = useState<string>('welcome');
  const [userData, setUserData] = useState<OnboardingReviewData | null>(null);

  const { user, isLoading, isInitialized, isGuestMode } = useAuth();
  const { getCompleteProfile, isProfileComplete } = useUser();
  const responsiveTheme = useResponsiveTheme();

  // Determine which onboarding step to start from based on existing data
  const determineStartingStep = (profile: any) => {
    if (!profile) return 'personal-info';

    const hasPersonalInfo = profile.personalInfo?.name && 
                           profile.personalInfo?.age && 
                           profile.personalInfo?.gender && 
                           profile.personalInfo?.height && 
                           profile.personalInfo?.weight && 
                           profile.personalInfo?.activityLevel;
    
    const hasFitnessGoals = profile.fitnessGoals?.primaryGoals?.length > 0 &&
                           profile.fitnessGoals?.timeCommitment &&
                           profile.fitnessGoals?.experience;

    // Start from the first incomplete step
    if (!hasPersonalInfo) {
      return 'personal-info';
    } else if (!hasFitnessGoals) {
      return 'goals';
    } else {
      // Check for additional preferences (diet, workout, body analysis)
      // For now, if basic info is complete, go to diet preferences
      return 'diet-preferences';
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('🔍 App Debug:', {
      user: user ? 'authenticated' : 'not authenticated',
      isLoading,
      isInitialized,
      isGuestMode,
      isOnboardingComplete
    });
  }, [user, isLoading, isInitialized, isGuestMode, isOnboardingComplete]);

  // Initialize backend on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 FitAI: Starting app initialization...');
        await initializeBackend();
        // Initialize Google Auth
        await googleAuthService.configure();
        // Run data migrations
        await migrationService.runMigrations();
        console.log('✅ FitAI: Backend, Google Auth, and migrations completed');
      } catch (error) {
        console.error('❌ FitAI: App initialization failed:', error);
        // Don't throw here, let the app continue with limited functionality
      }
    };

    initializeApp();
  }, []);

  // Check if user is authenticated and has completed onboarding
  useEffect(() => {
    const checkUserProfile = async () => {
      if (isInitialized && !isLoading) {
        if (user && user.isEmailVerified) {
          console.log('🔐 App: User is authenticated, checking profile completion');
          console.log('👤 App: User email:', user.email);

          // Check if user has completed profile in database
          try {
            const profileResponse = await getCompleteProfile(user.id);
            if (profileResponse.success && profileResponse.data) {
              console.log('📋 App: Profile found, checking completeness');
              // Check if onboarding is complete based on required fields
              const profile = profileResponse.data;
              const hasPersonalInfo = profile.personalInfo?.name && 
                                    profile.personalInfo?.age && 
                                    profile.personalInfo?.gender && 
                                    profile.personalInfo?.height && 
                                    profile.personalInfo?.weight && 
                                    profile.personalInfo?.activityLevel;
              const hasFitnessGoals = profile.fitnessGoals?.primaryGoals?.length > 0 &&
                                    profile.fitnessGoals?.timeCommitment &&
                                    profile.fitnessGoals?.experience;
              
              const isComplete = hasPersonalInfo && hasFitnessGoals;
              console.log('✅ App: Profile completion status:', { hasPersonalInfo, hasFitnessGoals, isComplete });
              
              if (isComplete) {
                setIsOnboardingComplete(true);
              } else {
                // Determine which step to start from
                const startStep = determineStartingStep(profile);
                console.log('🎯 App: Partial profile found, starting from step:', startStep);
                setOnboardingStartStep(startStep);
                setIsOnboardingComplete(false);
              }
            } else {
              console.log('❌ App: No profile found, showing onboarding from personal-info');
              setOnboardingStartStep('personal-info');
              setIsOnboardingComplete(false);
            }
          } catch (error) {
            console.error('❌ App: Error checking profile:', error);
            setIsOnboardingComplete(false);
          }
        } else if (isGuestMode) {
          // Guest user - check if they have completed onboarding data
          if (userData) {
            console.log('👤 App: Guest user with data, showing main app');
            setIsOnboardingComplete(true);
          } else {
            console.log('👤 App: Guest user without data, showing onboarding');
            setIsOnboardingComplete(false);
          }
        } else {
          // User is not authenticated or guest without data, show onboarding (which includes auth)
          console.log('🚪 App: No user or guest without data, showing onboarding');
          setIsOnboardingComplete(false);
        }
      }
    };

    checkUserProfile();
  }, [user, isLoading, isInitialized, isGuestMode, getCompleteProfile]);

  // Separate effect for guest mode userData changes
  useEffect(() => {
    if (isGuestMode && userData && isInitialized) {
      console.log('👤 App: Guest userData updated, showing main app');
      setIsOnboardingComplete(true);
    }
  }, [userData, isGuestMode, isInitialized]);

  const handleOnboardingComplete = (data: OnboardingReviewData) => {
    console.log('🎉 App: Onboarding completed with data:', data);
    setUserData(data);
    setIsOnboardingComplete(true);
    console.log('✅ App: Marking onboarding as complete');
  };

  // Show loading while authentication is initializing
  if (!isInitialized || isLoading) {
    console.log('🔄 App: Showing loading screen', { isInitialized, isLoading });
    return (
      <View style={[styles.loadingContainer, { backgroundColor: THEME.colors.background }]}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} />
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={[styles.loadingText, { 
          color: THEME.colors.text,
          fontSize: rf(16),
          marginTop: rp(16),
          fontWeight: THEME.fontWeight.medium as any
        }]}>Initializing FitAI...</Text>
      </View>
    );
  }

  console.log('🎯 App: Rendering main app', { isOnboardingComplete });

  return (
    // <SafeAreaProvider>
      <ErrorBoundary>
        <View style={[styles.container, { backgroundColor: responsiveTheme.colors.background }]}>
          <StatusBar style="light" backgroundColor={responsiveTheme.colors.background} />

          {isOnboardingComplete ? (
            <MainNavigation />
          ) : (
            <OnboardingFlow 
              onComplete={handleOnboardingComplete} 
              startStep={onboardingStartStep}
            />
          )}
        </View>
      </ErrorBoundary>
    // </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor set dynamically to prevent module-level crash
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor and other responsive styles set dynamically
  },
  loadingText: {
    // All responsive styles set dynamically to prevent module-level crash
  },
});
