import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from './src/theme/gluestack-ui.config';
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
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

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
  // Load fonts - critical for icons to display properly on web
  // Use try-catch to prevent font loading from blocking the app
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  // If font loading fails or takes too long, continue anyway
  const [fontTimeout, setFontTimeout] = useState(false);
  
  useEffect(() => {
    // Set a timeout to continue even if fonts don't load
    const timer = setTimeout(() => {
      if (!fontsLoaded) {
        console.warn('⚠️ Font loading timeout - continuing without custom fonts');
        setFontTimeout(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  // Consider fonts ready if loaded, timed out, or errored
  const fontsReady = fontsLoaded || fontTimeout || fontError;

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
    // fitnessGoals is already a separate field in OnboardingReviewData
    const fitnessGoals = data.fitnessGoals || {
      primaryGoals: [],
      timeCommitment: '30 minutes',
      experience: 'beginner' as const,
      experience_level: 'beginner',
    };

    return {
      id: guestId || `guest_${Date.now()}`,
      email: data.personalInfo.email || '',
      personalInfo: data.personalInfo,
      fitnessGoals: fitnessGoals,
      dietPreferences: data.dietPreferences,
      workoutPreferences: data.workoutPreferences || {
        location: 'home' as const,
        equipment: [],
        timePreference: 30,
        intensity: 'beginner' as const,
        workoutTypes: [],
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
          console.log('✅ App: Found existing user profile in store');

          // Validate profile has all required fields
          const { checkProfileComplete } = useUserStore.getState();
          const isValid = checkProfileComplete(profile);

          if (isValid) {
            console.log('✅ App: Profile validation passed - showing MainNavigation');
            setIsOnboardingComplete(true);
          } else {
            console.log('⚠️ App: Profile exists but incomplete - showing onboarding');
            setIsOnboardingComplete(false);
          }

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

              // Validate profile has all required fields
              const { checkProfileComplete } = useUserStore.getState();
              const isValid = checkProfileComplete(profileResponse.data);

              if (isValid) {
                console.log('✅ App: Profile validation passed - showing MainNavigation');
                setIsOnboardingComplete(true);
              } else {
                console.log('⚠️ App: Profile incomplete - showing onboarding');
                setIsOnboardingComplete(false);
              }

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

        // For guest/unauthenticated users, check if onboarding is complete
        const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
        if (onboardingCompleted === 'true') {
          console.log('✅ App: Onboarding marked complete for guest user - validating data...');

          // Load onboarding data from AsyncStorage and convert to profile format
          try {
            const onboardingDataStr = await AsyncStorage.getItem('onboarding_data');
            if (onboardingDataStr) {
              const onboardingData = JSON.parse(onboardingDataStr);
              console.log('📦 App: Found onboarding data in AsyncStorage, converting to profile...');

              // Convert to profile format and load into userStore
              const userProfile = convertOnboardingToProfile(onboardingData);
              setProfile(userProfile);

              // Validate the profile has all required fields
              const { checkProfileComplete } = useUserStore.getState();
              const isValid = checkProfileComplete(userProfile);

              if (isValid) {
                console.log('✅ App: Guest profile validation passed - showing MainNavigation');
                setIsOnboardingComplete(true);
              } else {
                console.log('⚠️ App: Guest profile incomplete - showing onboarding');
                setIsOnboardingComplete(false);
              }

              console.log('✅ App: Guest user profile loaded successfully from AsyncStorage');
            } else {
              console.warn('⚠️ App: Onboarding marked complete but no data found - showing onboarding');
              setIsOnboardingComplete(false);
            }
          } catch (error) {
            console.error('❌ App: Failed to load guest user data - showing onboarding:', error);
            setIsOnboardingComplete(false);
          }
        } else {
          console.log('📝 App: Onboarding not completed - showing onboarding');
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
  }, [isInitialized, user, isGuestMode, guestId]); // Removed 'profile' to prevent infinite loop

  // Initialize backend on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 FitAI: Starting app initialization...');
        
        // Add timeout wrapper for backend initialization (5 seconds max)
        const backendInitPromise = initializeBackend();
        const backendTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Backend init timeout')), 5000)
        );
        
        try {
          await Promise.race([backendInitPromise, backendTimeoutPromise]);
          console.log('✅ FitAI: Backend initialization completed');
        } catch (backendError) {
          console.warn('⚠️ FitAI: Backend initialization timed out or failed, continuing...', backendError);
        }

        // Initialize Google Sign-In with timeout (3 seconds max)
        try {
          console.log('📱 FitAI: Initializing Google Sign-In...');
          const googleInitPromise = googleAuthService.configure();
          const googleTimeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Google init timeout')), 3000)
          );
          await Promise.race([googleInitPromise, googleTimeoutPromise]);
          console.log('✅ FitAI: Google Sign-In initialization completed');
        } catch (error) {
          console.warn('⚠️ FitAI: Google Sign-In initialization failed or timed out:', error);
        }

        // Skip production validation in web/canvas environment to prevent timeout
        // Production validation makes network calls that can hang
        const isWebEnvironment = typeof window !== 'undefined' && window.location?.hostname?.includes('canvases.tempo.build');
        if (!isWebEnvironment && (!__DEV__ || process.env.EXPO_PUBLIC_ENVIRONMENT === 'production')) {
          console.log('🎯 FitAI: Running production environment validation...');
          try {
            const validationPromise = validateProductionEnvironment();
            const validationTimeoutPromise = new Promise<boolean>((resolve) => 
              setTimeout(() => {
                console.warn('⚠️ FitAI: Production validation timed out');
                resolve(false);
              }, 5000)
            );
            const isProductionReady = await Promise.race([validationPromise, validationTimeoutPromise]);
            if (isProductionReady) {
              console.log('🎉 FitAI: Production validation PASSED - AI features should work!');
            } else {
              console.warn('⚠️ FitAI: Production validation FAILED or timed out - AI features may not work!');
            }
          } catch (validationError) {
            console.warn('⚠️ FitAI: Production validation error:', validationError);
          }
        } else {
          console.log('🔧 FitAI: Skipping production validation (dev mode or web environment)');
        }

        // Initialize notifications only if not in Expo Go
        if (!isExpoGo && initializeNotifications && !areNotificationsInitialized) {
          console.log('📱 FitAI: Initializing notifications...');
          try {
            const notifPromise = initializeNotifications();
            const notifTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Notification init timeout')), 3000)
            );
            await Promise.race([notifPromise, notifTimeoutPromise]);
            console.log('✅ FitAI: Notifications initialization completed');
          } catch (notifError) {
            console.warn('⚠️ FitAI: Notifications initialization failed or timed out:', notifError);
          }
        } else if (isExpoGo) {
          console.log('⚠️ FitAI: Running in Expo Go - notifications disabled');
        }
      } catch (error) {
        console.error('❌ FitAI: App initialization failed:', error);
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
      console.log('💾 App: Setting profile in userStore...');
      setProfile(userProfile);

      // ⚠️ CRITICAL: Wait for Zustand persist middleware to finish async save
      // Without this delay, MainNavigation renders before persistence completes,
      // causing ProfileScreen to read from empty userStore
      console.log('⏳ App: Waiting for persist middleware to complete...');
      await new Promise(resolve => setTimeout(resolve, 150));
      console.log('✅ App: Persist middleware should have completed');

      // Store complete data in AsyncStorage with guest ID
      const currentGuestId =
        guestId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(`onboarding_${currentGuestId}`, JSON.stringify(data));

      // Also store in the standard 'onboarding_data' key for consistency
      // This is what loadExistingData reads from on app restart
      await AsyncStorage.setItem('onboarding_data', JSON.stringify(data));
      console.log('✅ App: Onboarding data stored to AsyncStorage');

      // Mark onboarding as complete
      await AsyncStorage.setItem('onboarding_completed', 'true');

      // Remove partial data since onboarding is complete
      await AsyncStorage.removeItem(`onboarding_partial_${currentGuestId}`);

      console.log('✅ App: All onboarding data stored successfully');
      console.log('🎉 App: Now setting isOnboardingComplete=true to show MainNavigation');

      // Set complete flag LAST after all async operations finish
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error('❌ App: Failed to store onboarding data:', error);
      // Still allow onboarding to complete even if storage fails
      setIsOnboardingComplete(true);
    }
  };

  // Show loading while authentication is initializing or loading onboarding data
  if (!isInitialized || isLoading || isLoadingOnboarding || !fontsReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor={THEME.colors.background} />
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>
          {!fontsReady ? 'Loading fonts...' : !isInitialized || isLoading ? 'Initializing FitAI...' : 'Loading your profile...'}
        </Text>
      </View>
    );
  }

  return (
    <GluestackUIProvider config={config}>
      <ErrorBoundary>
        <View style={styles.container}>
          <StatusBar style="light" backgroundColor={THEME.colors.background} />

          {isOnboardingComplete ? (
            <MainNavigation />
          ) : (
            <OnboardingContainer
              onComplete={handleOnboardingComplete}
              showProgressIndicator={true}
            />
          )}
        </View>
      </ErrorBoundary>
    </GluestackUIProvider>
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
