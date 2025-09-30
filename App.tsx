import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { OnboardingContainer } from './src/screens/onboarding/OnboardingContainer';
import { MainNavigation } from './src/components/navigation/MainNavigation';
import { OnboardingReviewData } from './src/screens/onboarding/ReviewScreen';
import { THEME } from './src/utils/constants';
import { initializeBackend } from './src/utils/integration';
import { useAuth } from './src/hooks/useAuth';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useUserStore } from './src/stores/userStore';
import { useAuthStore } from './src/stores/authStore';
import { UserProfile } from './src/types/user';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { googleAuthService } from './src/services/googleAuth';
import { validateProductionEnvironment } from './src/ai/gemini';

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
  // Default to false - user must complete onboarding unless we find completed data
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [userData, setUserData] = useState<OnboardingReviewData | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);

  const { user, isLoading, isInitialized, isGuestMode, guestId } = useAuth();
  const { setProfile, profile } = useUserStore();
  const { setGuestMode: setGuestModeInStore } = useAuthStore();

  // Only use notification store if not in Expo Go
  const notificationStore = useNotificationStore ? useNotificationStore() : null;
  const initializeNotifications = notificationStore?.initialize;
  const areNotificationsInitialized = notificationStore?.isInitialized;

  // Helper function to convert OnboardingReviewData to UserProfile
  const convertOnboardingToProfile = (data: OnboardingReviewData): UserProfile => {
    return {
      id: guestId || `guest_${Date.now()}`,
      email: data.personalInfo.email || '',
      personalInfo: data.personalInfo,
      fitnessGoals: data.fitnessGoals,
      dietPreferences: data.dietPreferences,
      workoutPreferences: data.workoutPreferences || {
        location: 'home' as const,
        equipment: [],
        timePreference: 30,
        intensity: 'beginner' as const,
        workoutTypes: [],
        workoutType: 'strength' as const,
        timeSlots: [],
        duration: 30,
        frequency: 3,
        restDays: [],
        trainingStyle: 'balanced' as const,
        goals: [],
        injuries: [],
        experience: 'beginner' as const,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        units: 'metric' as const,
        notifications: true,
        darkMode: false,
      },
      stats: {
        totalWorkouts: 0,
        totalCaloriesBurned: 0,
        currentStreak: 0,
        longestStreak: 0,
      },
    };
  };

  // Helper function to migrate existing guest data to current guest ID
  const migrateExistingGuestData = async (
    currentGuestId: string
  ): Promise<OnboardingReviewData | null> => {
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();

      // Find any onboarding keys (both old and new format)
      const onboardingKeys = allKeys.filter((key) => key.startsWith('onboarding_'));

      console.log(`🔍 App: Found ${onboardingKeys.length} potential onboarding data keys`);

      // Try to find data with different guest IDs
      for (const key of onboardingKeys) {
        if (key !== `onboarding_${currentGuestId}`) {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            console.log(`📦 App: Found legacy onboarding data at key: ${key}`);
            const parsedData: OnboardingReviewData = JSON.parse(data);

            // Migrate to new key
            await AsyncStorage.setItem(`onboarding_${currentGuestId}`, data);

            // Remove old key to prevent conflicts
            await AsyncStorage.removeItem(key);

            console.log(`✅ App: Migrated data from ${key} to onboarding_${currentGuestId}`);
            return parsedData;
          }
        }
      }

      console.log('📭 App: No legacy onboarding data found to migrate');
      return null;
    } catch (error) {
      console.error('❌ App: Failed to migrate guest data:', error);
      return null;
    }
  };

  // Load existing onboarding data on app startup
  useEffect(() => {
    const loadExistingData = async () => {
      if (!isInitialized) return;

      setIsLoadingOnboarding(true);

      try {
        console.log('📱 App: Loading existing onboarding data...');

        // If user is authenticated, check if profile exists in store
        if (user && profile) {
          console.log('✅ App: Found existing user profile');
          setIsOnboardingComplete(true);
          setIsLoadingOnboarding(false);
          return;
        }

        // If user is authenticated but no profile in store, try to load from database
        if (user && !profile) {
          console.log('🔄 App: User authenticated but no profile in store, loading from database...');
          try {
            const { getProfile } = useUserStore.getState();
            const profileResponse = await getProfile(user.id);
            
            if (profileResponse.success && profileResponse.data) {
              console.log('✅ App: Profile loaded from database successfully');
              setIsOnboardingComplete(true);
              setIsLoadingOnboarding(false);
              return;
            } else {
              console.log('📝 App: No profile found in database for authenticated user - needs onboarding');
              setIsOnboardingComplete(false);
            }
          } catch (error) {
            console.error('❌ App: Failed to load profile from database:', error);
            setIsOnboardingComplete(false);
          }
        }

        // For guest/unauthenticated users, check if onboarding data exists
        // useOnboardingState hook (used by OnboardingContainer) uses 'onboarding_data' key
        const onboardingData = await AsyncStorage.getItem('onboarding_data');
        if (onboardingData) {
          try {
            const parsedData = JSON.parse(onboardingData);
            // Check if all required sections are complete
            const hasAllSections = parsedData.personalInfo && 
                                   parsedData.bodyAnalysis && 
                                   parsedData.dietPreferences && 
                                   parsedData.workoutPreferences;
            
            if (hasAllSections) {
              console.log('✅ App: Found complete onboarding data');
              setIsOnboardingComplete(true);
            } else {
              console.log('📝 App: Found partial onboarding data - continuing onboarding');
              setIsOnboardingComplete(false);
            }
          } catch (error) {
            console.error('❌ App: Error parsing onboarding data:', error);
            setIsOnboardingComplete(false);
          }
        } else {
          console.log('📝 App: No onboarding data found - new user');
          setIsOnboardingComplete(false);
        }

        // Enable guest mode if no user is authenticated
        if (!isGuestMode && !user) {
          console.log('👤 App: Enabling guest mode...');
          setGuestModeInStore(true);
        }
      } catch (error) {
        console.error('❌ App: Failed to load onboarding data:', error);
        setIsOnboardingComplete(false);
      } finally {
        setIsLoadingOnboarding(false);
        console.log(`🏁 App: Loading complete. Onboarding status: ${isOnboardingComplete ? 'COMPLETE' : 'INCOMPLETE'}`);
      }
    };

    loadExistingData();
  }, [isInitialized, user, isGuestMode, guestId, profile]);

  // Initialize backend on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 FitAI: Starting app initialization...');
        await initializeBackend();
        console.log('✅ FitAI: Backend initialization completed');

        // Initialize Google Sign-In
        try {
          console.log('📱 FitAI: Initializing Google Sign-In...');
          await googleAuthService.configure();
          console.log('✅ FitAI: Google Sign-In initialization completed');
        } catch (error) {
          console.error('❌ FitAI: Google Sign-In initialization failed:', error);
        }

        // 🎯 PRODUCTION VALIDATION - Run comprehensive tests
        if (!__DEV__ || process.env.EXPO_PUBLIC_ENVIRONMENT === 'production') {
          console.log('🎯 FitAI: Running production environment validation...');
          try {
            const isProductionReady = await validateProductionEnvironment();
            if (isProductionReady) {
              console.log('🎉 FitAI: Production validation PASSED - AI features should work!');
            } else {
              console.error('❌ FitAI: Production validation FAILED - AI features may not work!');
              console.error('⚠️ FitAI: Check the logs above for specific issues');
            }
          } catch (validationError) {
            console.error('❌ FitAI: Production validation error:', validationError);
          }
        } else {
          console.log('🔧 FitAI: Development mode - skipping production validation');
        }

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

  // This effect is now handled by the loadExistingData effect above

  // Helper function to save partial onboarding data
  const savePartialOnboardingData = async (partialData: Partial<OnboardingReviewData>) => {
    try {
      const currentGuestId =
        guestId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Merge with existing data
      const existingData = userData || {};
      const mergedData = { ...existingData, ...partialData };

      await AsyncStorage.setItem(
        `onboarding_partial_${currentGuestId}`,
        JSON.stringify(mergedData)
      );
      console.log('💾 App: Partial onboarding data saved');
    } catch (error) {
      console.error('❌ App: Failed to save partial onboarding data:', error);
    }
  };

  const handleOnboardingComplete = async (data: OnboardingReviewData) => {
    console.log('🎉 App: Onboarding completed with data:', data);

    try {
      // Ensure guest mode is enabled if not authenticated
      if (!user && !isGuestMode) {
        console.log('👤 App: Enabling guest mode for onboarding completion');
        setGuestModeInStore(true);
      }

      // Store in component state
      setUserData(data);

      // Convert to profile format and store in userStore for persistence
      const userProfile = convertOnboardingToProfile(data);
      setProfile(userProfile);

      // Store complete data in AsyncStorage with guest ID
      const currentGuestId =
        guestId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(`onboarding_${currentGuestId}`, JSON.stringify(data));

      // Remove partial data since onboarding is complete
      await AsyncStorage.removeItem(`onboarding_partial_${currentGuestId}`);

      console.log('✅ App: Onboarding data stored successfully');
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('❌ App: Failed to store onboarding data:', error);
      // Still allow onboarding to complete even if storage fails
      setIsOnboardingComplete(true);
    }
  };

  // Show loading while authentication is initializing or loading onboarding data
  if (!isInitialized || isLoading || isLoadingOnboarding) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} />
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>
          {!isInitialized || isLoading ? 'Initializing FitAI...' : 'Loading your profile...'}
        </Text>
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
          <OnboardingContainer
            onComplete={() => {
              console.log('🎉 App: Onboarding completed via OnboardingContainer');
              setIsOnboardingComplete(true);
            }}
            showProgressIndicator={true}
          />
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
