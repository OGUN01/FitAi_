import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { OnboardingFlow } from './src/screens/onboarding/OnboardingFlow';
import { MainNavigation } from './src/components/navigation/MainNavigation';
import { PersonalInfo, FitnessGoals } from './src/types/user';
import { OnboardingReviewData } from './src/screens/onboarding/ReviewScreen';
import { THEME } from './src/utils/constants';
import { initializeBackend } from './src/utils/integration';
import { useAuth } from './src/hooks/useAuth';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [userData, setUserData] = useState<OnboardingReviewData | null>(null);

  const { user, isLoading, isInitialized } = useAuth();

  // Initialize backend on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 FitAI: Starting app initialization...');
        await initializeBackend();
        console.log('✅ FitAI: Backend initialization completed');
      } catch (error) {
        console.error('❌ FitAI: Backend initialization failed:', error);
        // Don't throw here, let the app continue with limited functionality
      }
    };

    initializeApp();
  }, []);

  // Check if user is authenticated and has completed onboarding
  useEffect(() => {
    if (isInitialized && user && !isLoading) {
      // User is authenticated, check if they've completed onboarding
      // For now, we'll assume if they're authenticated, they've completed onboarding
      setIsOnboardingComplete(true);
    } else if (isInitialized && !user) {
      // User is not authenticated, show onboarding
      setIsOnboardingComplete(false);
    }
  }, [user, isLoading, isInitialized]);

  const handleOnboardingComplete = (data: OnboardingReviewData) => {
    console.log('🎉 App: Onboarding completed with data:', data);
    setUserData(data);
    setIsOnboardingComplete(true);
  };

  // Show loading while authentication is initializing
  if (!isInitialized || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} />
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Initializing FitAI...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={styles.container}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} />

        {isOnboardingComplete ? (
          <MainNavigation />
        ) : (
          <OnboardingFlow onComplete={handleOnboardingComplete} />
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: THEME.colors.text,
    fontSize: THEME.fontSize.md,
    marginTop: THEME.spacing.md,
    fontWeight: THEME.fontWeight.medium,
  },
});
