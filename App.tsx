import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { OnboardingFlow } from './src/screens/onboarding/OnboardingFlow';
import { MainNavigation } from './src/components/navigation/MainNavigation';
import { OnboardingReviewData } from './src/screens/onboarding/ReviewScreen';
import { THEME } from './src/utils/constants';
import { initializeBackend } from './src/utils/integration';
import { useAuth } from './src/hooks/useAuth';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import Constants from 'expo-constants';

// Enhanced Expo Go detection with bulletproof methods and debugging
const isExpoGo = (() => {
  const detectionMethods = {
    appOwnership: Constants.appOwnership === 'expo',
    executionEnvironment: Constants.executionEnvironment === 'storeClient',
    devAndSimulator: __DEV__ && !Constants.isDevice && Constants.platform?.web === undefined,
    noEAS: !Constants.expoConfig?.extra?.eas && __DEV__ && Constants.platform?.web === undefined,
  };

  const isExpoGoDetected = Object.values(detectionMethods).some(Boolean);

  console.log('🔍 Environment Detection:', {
    ...detectionMethods,
    result: isExpoGoDetected,
    appOwnership: Constants.appOwnership,
    executionEnvironment: Constants.executionEnvironment,
    isDevice: Constants.isDevice,
    __DEV__,
  });

  return isExpoGoDetected;
})();

// Load notification store with multiple safety nets
let useNotificationStore: any = null;
if (!isExpoGo) {
  try {
    console.log('📱 Attempting to load notification modules...');
    const notificationStore = require('./src/stores/notificationStore');
    useNotificationStore = notificationStore.useNotificationStore;
    console.log('✅ Notification modules loaded successfully');
  } catch (error: any) {
    console.error('⚠️ Failed to load notification modules:', error?.message || error);
    console.log('🛡️ Continuing without notifications - app will still work');
  }
} else {
  console.log('🚫 Expo Go detected - notifications disabled to prevent ExpoPushTokenManager error');
}

export default function App() {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [userData, setUserData] = useState<OnboardingReviewData | null>(null);

  const { user, isLoading, isInitialized, isGuestMode } = useAuth();

  // Only use notification store if not in Expo Go
  const notificationStore = useNotificationStore ? useNotificationStore() : null;
  const initializeNotifications = notificationStore?.initialize;
  const areNotificationsInitialized = notificationStore?.isInitialized;

  // Initialize backend on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 FitAI: Starting app initialization...');
        await initializeBackend();
        console.log('✅ FitAI: Backend initialization completed');

        // Initialize notifications only if not in Expo Go
        if (!isExpoGo && initializeNotifications && !areNotificationsInitialized) {
          console.log('📱 FitAI: Initializing notifications...');
          await initializeNotifications();
          console.log('✅ FitAI: Notifications initialization completed');
        } else if (isExpoGo) {
          console.log('⚠️ FitAI: Running in Expo Go - notifications disabled');
          console.log('ℹ️ FitAI: Build a development build to enable notifications');
        }
      } catch (error) {
        console.error('❌ FitAI: Backend initialization failed:', error);
        // Don't throw here, let the app continue with limited functionality
      }
    };

    initializeApp();
  }, []);

  // Check if user is authenticated OR guest has completed onboarding
  useEffect(() => {
    if (isInitialized && user && !isLoading) {
      // User is authenticated, they've completed onboarding
      setIsOnboardingComplete(true);
    } else if (isInitialized && !user && !isLoading) {
      // Check if guest user and if they have completed onboarding
      if (isGuestMode && userData) {
        console.log('🎭 App: Guest user has completed onboarding, proceeding to main app');
        setIsOnboardingComplete(true);
      } else {
        // No user and either not guest mode or no onboarding data
        setIsOnboardingComplete(false);
      }
    }
  }, [user, isLoading, isInitialized, isGuestMode, userData]);

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
    fontWeight: '500' as const,
  },
});
