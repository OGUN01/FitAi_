import "./global.css";
import { enableScreens } from "react-native-screens";
enableScreens();

import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ActivityIndicator, Text, Platform } from "react-native";

// react-native-reanimated's web renderer injects `transform-origin` (kebab-case)
// as an inline DOM style, which React warns about. React passes the property name
// as a format argument ('%s'), not in the format string itself — check all args.
if (Platform.OS === "web") {
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (args.some((a) => typeof a === "string" && a.includes("transform-origin"))) return;
    originalError(...args);
  };
}

// DEV PERF: Suppress console.log in development mode.
// In React Native, every console.log crosses the native bridge synchronously,
// adding 1-3ms per call. With 200+ log statements firing on renders, state
// updates, and button presses, this accumulates to 200-500ms of JS thread
// blocking per interaction. console.warn and console.error are kept for
// bug tracking. To re-enable verbose logs, set __VERBOSE_LOGS__ = true.
if (__DEV__) {
  const noop = () => {};
  console.log = noop;
}

// Global unhandled error handler — catches both sync and async JS errors
// that escape all try/catch and ErrorBoundary boundaries.
const _originalGlobalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[GlobalError] Unhandled error:', error, 'isFatal:', isFatal);
  _originalGlobalHandler(error, isFatal);
});

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GluestackUIProvider } from "@gluestack-ui/themed";
import { config } from "./src/theme/gluestack-ui.config";
import { OnboardingContainer } from "./src/screens/onboarding/OnboardingContainer";
import { WelcomeScreen } from "./src/screens/onboarding/WelcomeScreen";
import { MainNavigation } from "./src/components/navigation/MainNavigation";
import { OnboardingReviewData } from "./src/types/onboarding";
import { ThemeProvider } from "./src/theme/ThemeProvider";
import { colors, spacing, typography } from "./src/theme/aurora-tokens";
import { initializeBackend } from "./src/utils/integration";
import { offlineService } from "./src/services/offline/OfflineService";
import { useAuth } from "./src/hooks/useAuth";
import { ErrorBoundary } from "./src/components/ErrorBoundary";
import { useUserStore } from "./src/stores/userStore";
import { useAuthStore } from "./src/stores/authStore";
import { useProfileStore } from "./src/stores/profileStore";
import { useSubscriptionStore } from "./src/stores/subscriptionStore";
import { convertOnboardingToProfile } from "./src/utils/profileConversion";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { googleAuthService } from "./src/services/googleAuth";
import { supabase } from "./src/services/supabase";
import {
  PersonalInfoService,
  DietPreferencesService,
  BodyAnalysisService,
  WorkoutPreferencesService,
  AdvancedReviewService,
} from "./src/services/onboardingService";
import { dataBridge } from "./src/services/DataBridge";
import { useAppConfig } from "./src/hooks/useAppConfig";
import { runAfterInteractions } from "./src/utils/performance";
import * as Notifications from "expo-notifications";
// validateProductionEnvironment removed - AI moved to Cloudflare Workers

// Enhanced Expo Go detection with bulletproof methods and debugging
const isExpoGo = (() => {
  const detectionMethods = {
    appOwnership: Constants.appOwnership === "expo",
    executionEnvironment: Constants.executionEnvironment === "storeClient",
    devAndSimulator:
      __DEV__ && !Constants.isDevice && Constants.platform?.web === undefined,
    noEAS:
      !Constants.expoConfig?.extra?.eas &&
      __DEV__ &&
      Constants.platform?.web === undefined,
  };

const isExpoGoDetected = Object.values(detectionMethods).some(Boolean);



  return isExpoGoDetected;
})();

const compareVersions = (a: string, b: string): number => {
  const parse = (version: string) =>
    version
      .split('.')
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isFinite(part) ? part : 0));

  const aParts = parse(a);
  const bParts = parse(b);
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i += 1) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff;
  }

  return 0;
};

// Load notification store with multiple safety nets
let useNotificationStore: any = null;
if (!isExpoGo) {
  try {

    const notificationStore = require("./src/stores/notificationStore");
    useNotificationStore = notificationStore.useNotificationStore;

  } catch (error: any) {
    console.error(
      "⚠️ Failed to load notification modules:",
      error?.message || error,
    );

  }
} else {
}
export default function App() {


  // Default to false - user must complete onboarding unless we find completed data
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [userData, setUserData] = useState<OnboardingReviewData | null>(null);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [subscriptionTimeout, setSubscriptionTimeout] = useState(false);
  const [initialNotificationTab, setInitialNotificationTab] = useState<string | undefined>(undefined);

  const { user, isLoading, isInitialized, isGuestMode, guestId } = useAuth();
  const { config: appConfig, loading: appConfigLoading } = useAppConfig();
  const {
    initializeSubscription,
    clearSubscription,
    isInitialized: isSubscriptionInitialized,
  } = useSubscriptionStore();
  const appVersion = Constants.expoConfig?.version || "1.0.1";
  const updateRequired =
    compareVersions(appVersion, appConfig.forceUpdateVersion) < 0 ||
    compareVersions(appVersion, appConfig.minAppVersion) < 0;


  const setProfile = useUserStore((state) => state.setProfile);
  const profile = useUserStore((state) => state.profile);
  const setGuestModeInStore = useAuthStore((state) => state.setGuestMode);

  // Ref to track whether the safety timeout has fired — prevents late async
  // callbacks from re-showing the loading screen after it was forcibly cleared.
  const loadingAllowed = React.useRef(true);

  // Safety timeout: Force loading to complete after 3 seconds — runs ONCE on mount.
  // Using [] dep so it cannot be reset by re-renders or state changes.
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadingAllowed.current = false;
      setIsLoadingOnboarding(false);
    }, 3000);
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety timeout for auth initialization
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isInitialized) {
        console.error(
          "❌ App: Auth never initialized after 10 seconds - this is a critical bug!",
        );
        console.error("❌ App: Check authStore.initialize() for issues");
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isInitialized]);

  // DBUG-005/016 FIX: Reset to WelcomeScreen on sign-out
  // When user becomes null (signed out) while app was initialized,
  // reset showWelcome to true so returning users see the Sign In option
  useEffect(() => {
    if (!user && isInitialized && !isLoading) {
      setShowWelcome(true);
      setIsOnboardingComplete(false);
    }
  }, [user, isInitialized, isLoading]);

  useEffect(() => {
    if (!isInitialized) return;

    if (user?.id && !isGuestMode) {
      initializeSubscription().catch((error) => {
        console.error("❌ App: Failed to initialize subscription:", error);
      });
      return;
    }

    clearSubscription();
  }, [
    clearSubscription,
    initializeSubscription,
    isGuestMode,
    isInitialized,
    user?.id,
  ]);

  // Safety timeout: if subscription init hangs (e.g. Worker is down), unblock the spinner after 5s
  useEffect(() => {
    if (!user || isGuestMode) return;
    const timer = setTimeout(() => {
      setSubscriptionTimeout(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [user, isGuestMode]);

  // Only use notification store if not in Expo Go
  const notificationStore = useNotificationStore
    ? useNotificationStore()
    : null;
  const initializeNotifications = notificationStore?.initialize;
  const areNotificationsInitialized = notificationStore?.isInitialized;

  // Helper function to migrate existing guest data to current guest ID
  const migrateExistingGuestData = async (
    currentGuestId: string,
  ): Promise<OnboardingReviewData | null> => {
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();

      // Find any onboarding keys (both old and new format)
      const onboardingKeys = allKeys.filter((key) =>
        key.startsWith("onboarding_"),
      );



      // Try to find data with different guest IDs
      for (const key of onboardingKeys) {
        if (key !== `onboarding_${currentGuestId}`) {
          const data = await AsyncStorage.getItem(key);
          if (data) {

            const parsedData: OnboardingReviewData = JSON.parse(data);

            // Migrate to new key
            await AsyncStorage.setItem(`onboarding_${currentGuestId}`, data);

            // Remove old key to prevent conflicts
            await AsyncStorage.removeItem(key);


            return parsedData;
          }
        }
      }


      return null;
    } catch (error) {
      console.error("❌ App: Failed to migrate guest data:", error);
      return null;
    }
  };

  // Verify database has required data for authenticated user
  const verifyDatabaseData = async (
    userId: string,
  ): Promise<{
    hasData: boolean;
    missingTables: string[];
  }> => {
    const missingTables: string[] = [];

    try {
      console.warn(`\n🔍 [SYNC DEBUG] verifyDatabaseData START — userId=${userId}`);


      // Check profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("❌ [DB-VERIFY] Error checking profiles:", profileError);
      }
      if (!profile) missingTables.push("profiles");

      // Check body_analysis table (required for health calculations)
      const { data: bodyAnalysis, error: bodyError } = await supabase
        .from("body_analysis")
        .select("user_id")
        .eq("user_id", userId)
        .single();

      if (bodyError && bodyError.code !== "PGRST116") {
        console.error(
          "❌ [DB-VERIFY] Error checking body_analysis:",
          bodyError,
        );
      }
      if (!bodyAnalysis) missingTables.push("body_analysis");

      // Check workout_preferences table
      const { data: workout, error: workoutError } = await supabase
        .from("workout_preferences")
        .select("user_id")
        .eq("user_id", userId)
        .single();

      if (workoutError && workoutError.code !== "PGRST116") {
        console.error(
          "❌ [DB-VERIFY] Error checking workout_preferences:",
          workoutError,
        );
      }
      if (!workout) missingTables.push("workout_preferences");

      // Check advanced_review table (contains calculated metrics)
      const { data: advancedReview, error: advancedError } = await supabase
        .from("advanced_review")
        .select("user_id")
        .eq("user_id", userId)
        .single();

      if (advancedError && advancedError.code !== "PGRST116") {
        console.error(
          "❌ [DB-VERIFY] Error checking advanced_review:",
          advancedError,
        );
      }
      if (!advancedReview) missingTables.push("advanced_review");

      console.warn(`  🔍 [SYNC DEBUG] verifyDatabaseData RESULT — hasData=${missingTables.length === 0}, missing=[${missingTables.join(', ')}]`);

      return {
        hasData: missingTables.length === 0,
        missingTables,
      };
    } catch (error) {
      console.error("❌ [SYNC DEBUG] verifyDatabaseData FAILED:", error);
      return { hasData: false, missingTables: ["unknown"] };
    }
  };

  // Sync local onboarding data to database
  const syncLocalToDatabase = async (
    userId: string,
  ): Promise<{ success: boolean; errors: string[] }> => {
    const errors: string[] = [];
    const savedTables: string[] = [];

    try {
      console.warn(`\n${'='.repeat(60)}`);
      console.warn(`🔄 [SYNC DEBUG] syncLocalToDatabase START — userId=${userId}`);
      console.warn(`${'='.repeat(60)}`);


      // Load from onboarding_data (primary source used by useOnboardingState)
      const onboardingDataStr = await AsyncStorage.getItem("onboarding_data");
      if (!onboardingDataStr) {

        return { success: false, errors: ["No local data found"] };
      }

      const onboardingData = JSON.parse(onboardingDataStr);

      console.warn(`  📋 Local data found: PI=${!!onboardingData.personalInfo} DP=${!!onboardingData.dietPreferences} BA=${!!onboardingData.bodyAnalysis} WP=${!!onboardingData.workoutPreferences} AR=${!!onboardingData.advancedReview}`);

      // CONFLICT RESOLUTION: Check if database already has data
      const existingProfile = await PersonalInfoService.load(userId);
      const existingDiet = await DietPreferencesService.load(userId);
      const existingBody = await BodyAnalysisService.load(userId);
      const existingWorkout = await WorkoutPreferencesService.load(userId);
      const existingAdvanced = await AdvancedReviewService.load(userId);

      const hasRemoteData = !!(
        existingProfile ||
        existingDiet ||
        existingBody ||
        existingWorkout ||
        existingAdvanced
      );

      console.warn(`  🔍 Remote data exists: Profile=${!!existingProfile} Diet=${!!existingDiet} Body=${!!existingBody} Workout=${!!existingWorkout} Advanced=${!!existingAdvanced}`);

      if (hasRemoteData) {

        // Merge strategy: Local data wins for onboarding (newest)
        // In production, you might want to compare timestamps or ask user
      }

      // SEQUENTIAL WATERFALL PATTERN: Save in dependency order with rollback on failure

      // 1. Save personal info (required for all others)
      if (onboardingData.personalInfo) {
        try {
          const success = await PersonalInfoService.save(
            userId,
            onboardingData.personalInfo,
          );
          if (!success) {
            throw new Error("Failed to save personalInfo");
          }
          savedTables.push("profiles");

        } catch (e) {
          const errorMsg = `Error saving personalInfo: ${e}`;
          errors.push(errorMsg);
          console.error("❌ [SYNC]", errorMsg);
          // CRITICAL FAILURE: Personal info is required - rollback and abort
          await rollbackSync(savedTables, userId);
          return { success: false, errors };
        }
      }

      // 2. Save body analysis (needed for metrics calculations)
      if (onboardingData.bodyAnalysis) {
        try {
          const success = await BodyAnalysisService.save(
            userId,
            onboardingData.bodyAnalysis,
          );
          if (!success) {
            throw new Error("Failed to save bodyAnalysis");
          }
          savedTables.push("body_analysis");

        } catch (e) {
          const errorMsg = `Error saving bodyAnalysis: ${e}`;
          errors.push(errorMsg);
          console.error("❌ [SYNC]", errorMsg);
          // Continue with warnings - not critical
        }
      }

      // 3. Save diet preferences
      if (onboardingData.dietPreferences) {
        try {
          const success = await DietPreferencesService.save(
            userId,
            onboardingData.dietPreferences,
          );
          if (!success) {
            throw new Error("Failed to save dietPreferences");
          }
          savedTables.push("diet_preferences");

        } catch (e) {
          const errorMsg = `Error saving dietPreferences: ${e}`;
          errors.push(errorMsg);
          console.error("❌ [SYNC]", errorMsg);
          // Continue with warnings - not critical
        }
      }

      // 4. Save workout preferences
      if (onboardingData.workoutPreferences) {
        try {
          const success = await WorkoutPreferencesService.save(
            userId,
            onboardingData.workoutPreferences,
          );
          if (!success) {
            throw new Error("Failed to save workoutPreferences");
          }
          savedTables.push("workout_preferences");

        } catch (e) {
          const errorMsg = `Error saving workoutPreferences: ${e}`;
          errors.push(errorMsg);
          console.error("❌ [SYNC]", errorMsg);
          // Continue with warnings - not critical
        }
      }

      // 5. Save advanced review (depends on all previous data)
      if (onboardingData.advancedReview) {
        try {
          const success = await AdvancedReviewService.save(
            userId,
            onboardingData.advancedReview,
          );
          if (!success) {
            throw new Error("Failed to save advancedReview");
          }
          savedTables.push("advanced_review");

        } catch (e) {
          const errorMsg = `Error saving advancedReview: ${e}`;
          errors.push(errorMsg);
          console.error("❌ [SYNC]", errorMsg);
          // Continue with warnings - not critical
        }
      }



      // Success if personal info saved (minimum requirement)
      const hasMinimumData = savedTables.includes("profiles");
      console.warn(`✅ [SYNC DEBUG] syncLocalToDatabase COMPLETE — saved=[${savedTables.join(', ')}], errors=${errors.length}, success=${hasMinimumData}`);
      console.warn(`${'='.repeat(60)}\n`);
      return {
        success: hasMinimumData,
        errors,
      };
    } catch (error) {
      console.error("❌ [SYNC] Sync failed:", error);
      // Attempt rollback on catastrophic failure
      await rollbackSync(savedTables, userId);
      return {
        success: false,
        errors: [
          error instanceof Error ? error.message : "Unknown error",
          ...errors,
        ],
      };
    }
  };

  // Rollback helper function
  const rollbackSync = async (
    savedTables: string[],
    userId: string,
  ): Promise<void> => {


    for (const table of savedTables) {
      try {


        switch (table) {
          case "profiles":
            await PersonalInfoService.delete(userId);
            break;
          // Add other rollback cases if needed
          // For now, we only rollback profiles as it's the critical one
        }


      } catch (rollbackError) {
        console.error(
          `❌ [ROLLBACK] Failed to rollback ${table}:`,
          rollbackError,
        );
      }
    }
  };

  // Load existing onboarding data on app startup
  useEffect(() => {
    let mounted = true;

    const verifyAndSyncProfileInBackground = (userId: string) => {
      void runAfterInteractions(async () => {
        if (!mounted) return;

        const dbVerification = await verifyDatabaseData(userId);
        if (!mounted || dbVerification.hasData) return;

        const syncResult = await syncLocalToDatabase(userId);
        if (!mounted) return;

        if (!syncResult.success) {
          console.warn(
            "⚠️ App: No local data to sync to DB (expected for new users):",
            syncResult.errors,
          );
        }
      });
    };

    const loadExistingData = async () => {
      if (!isInitialized) return;

      console.warn(`\n${'='.repeat(60)}`);
      console.warn(`🚀 [APP DEBUG] loadExistingData START`);
      console.warn(`${'='.repeat(60)}`);
      console.warn(`  👤 user=${user?.id || 'null'} | isGuestMode=${isGuestMode} | guestId=${guestId} | hasProfile=${!!profile}`);

      // 🔍 DEBUG: Check if onboarding_data survives to this point
      try {
        const onboardingDataCheck = await AsyncStorage.getItem('onboarding_data');
        console.warn(`  🔍 [APP DEBUG] onboarding_data at loadExistingData START: ${onboardingDataCheck ? 'EXISTS (' + onboardingDataCheck.length + ' chars)' : 'NULL/MISSING'}`);
      } catch(e) {
        console.warn('  🔍 [APP DEBUG] Could not check onboarding_data:', e);
      }

      // Only show loading spinner for authenticated users who need profile checks.
      // Unauthenticated users resolve quickly — no need to re-show the spinner.
      if (user && loadingAllowed.current) {
        setIsLoadingOnboarding(true);
      }

      try {


        // If user is authenticated, check if profile exists in store
        if (user && profile) {
          if (!mounted) return;



          // Validate profile has all required fields
          const { checkProfileComplete } = useUserStore.getState();
          const isValid = checkProfileComplete(profile);

          if (isValid) {
            setIsOnboardingComplete(true);
            verifyAndSyncProfileInBackground(user.id);
          } else {
            // Local profile is incomplete — try to load fresh from DB before showing onboarding
            try {
              const { getCompleteProfile } = useUserStore.getState();
              const profileResponse = await getCompleteProfile(user.id);

              if (!mounted) return;

              if (profileResponse.success && profileResponse.data) {
                const { checkProfileComplete: checkFresh } = useUserStore.getState();
                const isFreshValid = checkFresh(profileResponse.data);

                if (isFreshValid) {
                  setIsOnboardingComplete(true);
                  setIsLoadingOnboarding(false);
                  return;
                }
              }
            } catch (dbFallbackError) {
              console.error('❌ App: DB fallback for incomplete profile failed:', dbFallbackError);
            }

            setIsOnboardingComplete(false);
          }

          setIsLoadingOnboarding(false);
          return;
        }

        // If user is authenticated but no profile in store, try to load from database
        if (user && !profile) {

          try {
            const { getCompleteProfile } = useUserStore.getState();
            const profileResponse = await getCompleteProfile(user.id);

            if (!mounted) return;

            if (profileResponse.success && profileResponse.data) {


              // Validate profile has all required fields
              const { checkProfileComplete } = useUserStore.getState();
              const isValid = checkProfileComplete(profileResponse.data);

              if (isValid) {

                setIsOnboardingComplete(true);
              } else {

                setIsOnboardingComplete(false);
              }

              setIsLoadingOnboarding(false);
              return;
            } else {

              setIsOnboardingComplete(false);
            }
          } catch (error) {
            if (!mounted) return;
            console.error(
              "❌ App: Failed to load profile from database:",
              error,
            );
            setIsOnboardingComplete(false);
          }
        }

        // For guest/unauthenticated users, check if onboarding is complete
        const onboardingCompleted = await AsyncStorage.getItem(
          "onboarding_completed",
        );

        if (!mounted) return;

        if (onboardingCompleted === "true") {


          // Load onboarding data from AsyncStorage and convert to profile format
          try {
            const onboardingDataStr =
              await AsyncStorage.getItem("onboarding_data");

            if (!mounted) return;

            if (onboardingDataStr) {
              const onboardingData = JSON.parse(onboardingDataStr);


              // Convert to profile format and load into userStore
              const userProfile = convertOnboardingToProfile(onboardingData, guestId);
              setProfile(userProfile);

              // Validate the profile has all required fields
              const { checkProfileComplete } = useUserStore.getState();
              const isValid = checkProfileComplete(userProfile);

              if (isValid) {

                setIsOnboardingComplete(true);
              } else {

                setIsOnboardingComplete(false);
              }


            } else {

              setIsOnboardingComplete(false);
            }
          } catch (error) {
            if (!mounted) return;
            console.error(
              "❌ App: Failed to load guest user data - showing onboarding:",
              error,
            );
            setIsOnboardingComplete(false);
          }
        } else {

          setIsOnboardingComplete(false);
        }

        // Enable guest mode if no user is authenticated
        if (!isGuestMode && !user) {

          setGuestModeInStore(true);
        }
      } catch (error) {
        if (!mounted) return;
        console.error("❌ App: Failed to load onboarding data:", error);
        setIsOnboardingComplete(false);
      } finally {
        if (!mounted) return;
        setIsLoadingOnboarding(false);

      }
    };

    loadExistingData().catch((error) => {
      console.error("[App] Unhandled load error:", error);
    });

    return () => {
      mounted = false;
    };
  }, [isInitialized, user, isGuestMode, guestId]); // Removed 'profile' to prevent infinite loop

  // Initialize backend on app start
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {

        await initializeBackend();

        if (!mounted) return;



        void runAfterInteractions(async () => {
          if (!mounted) return;

          // BUG-001 cleanup: clear stale workout_sessions queue items with old camelCase columns
          try {
            await offlineService.clearFailedActionsForTable("workout_sessions");
          } catch {
          }

          if (!mounted) return;

          // Initialize Google Sign-In after the first interaction frame.
          try {
            await googleAuthService.configure();
          } catch (error) {
            if (!mounted) return;
            console.error(
              "❌ FitAI: Google Sign-In initialization failed:",
              error,
            );
          }

          if (!mounted) return;

          // 🎯 AI BACKEND STATUS - Cloudflare Workers
          // Initialize notifications only if not in Expo Go.
          if (
            !isExpoGo &&
            initializeNotifications &&
            !areNotificationsInitialized
          ) {
            try {
              await initializeNotifications();
            } catch (notifError) {
              if (!mounted) return;
              console.error(
                "❌ FitAI: Notifications initialization failed:",
                notifError,
              );
            }

            if (!mounted) return;

            // Handle cold-start notification tap (app was killed when user tapped notification)
            try {
              const lastResponse = await Notifications.getLastNotificationResponseAsync();
              if (lastResponse) {
                const data = lastResponse.notification.request.content.data;
                if (data?.type === 'water') {
                  setInitialNotificationTab('diet');
                } else if (data?.type === 'workout') {
                  setInitialNotificationTab('fitness');
                } else if (data?.type === 'meal') {
                  setInitialNotificationTab('diet');
                }
              }
            } catch (coldStartError) {
              console.error('[App] Cold-start notification check failed:', coldStartError);
            }

            // Clear badge count when app becomes active
            if (Platform.OS !== 'web') {
              Notifications.setBadgeCountAsync(0).catch(() => {});
            }
          }
        });
      } catch (error) {
        if (!mounted) return;
        console.error("❌ FitAI: Backend initialization failed:", error);
        // Don't throw here, let the app continue with limited functionality
      }
    };

    // Warm-start listener: handle notification taps while app is running/backgrounded
    let notificationResponseSubscription: Notifications.Subscription | null = null;
    if (!isExpoGo) {
      notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        const data = response.notification.request.content.data;
        if (data?.type === 'water') {
          setInitialNotificationTab('diet');
        } else if (data?.type === 'workout') {
          setInitialNotificationTab('fitness');
        } else if (data?.type === 'meal') {
          setInitialNotificationTab('diet');
        }
      });
    }

    initializeApp().catch((error) => {
      console.error("[App] Unhandled initialization error:", error);
    });

    return () => {
      mounted = false;
      notificationResponseSubscription?.remove();
    };
  }, []);

  // This effect is now handled by the loadExistingData effect above

  // Helper function to save partial onboarding data
  const savePartialOnboardingData = async (
    partialData: Partial<OnboardingReviewData>,
  ) => {
    try {
      const currentGuestId =
        guestId ||
        `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Merge with existing data
      const existingData = userData || {};
      const mergedData = { ...existingData, ...partialData };

      await AsyncStorage.setItem(
        `onboarding_partial_${currentGuestId}`,
        JSON.stringify(mergedData),
      );

    } catch (error) {
      console.error("❌ App: Failed to save partial onboarding data:", error);
    }
  };

  const handleOnboardingComplete = async (data: OnboardingReviewData) => {

    console.warn(`\n${'='.repeat(60)}`);
    console.warn(`📱 [APP DEBUG] handleOnboardingComplete called`);
    console.warn(`${'='.repeat(60)}`);
    console.warn(`👤 User: ${user?.id || 'guest'} | GuestMode: ${isGuestMode} | GuestId: ${guestId}`);
    console.warn(`📋 Data received:`, JSON.stringify(data, null, 2));
    console.warn(`${'='.repeat(60)}\n`);

    try {
      // Ensure guest mode is enabled if not authenticated
      if (!user && !isGuestMode) {

        setGuestModeInStore(true);
      }

      // Store in component state
      setUserData(data);

      // Convert to profile format and store in userStore for persistence
      const userProfile = convertOnboardingToProfile(data, guestId);

      console.warn(`\n📱 [APP DEBUG] Profile converted from onboarding:`);
      console.warn(`  Name: ${userProfile.personalInfo?.name}`);
      console.warn(`  Age: ${(userProfile.personalInfo as any)?.age} | Gender: ${(userProfile.personalInfo as any)?.gender}`);
      console.warn(`  Goals: [${(userProfile.fitnessGoals as any)?.primary_goals?.join(', ') || 'none'}]`);
      console.warn(`  Height: ${(userProfile.bodyMetrics as any)?.height_cm}cm | Weight: ${(userProfile.bodyMetrics as any)?.current_weight_kg}kg`);
      console.warn(`  Diet: ${(userProfile.dietPreferences as any)?.diet_type}`);
      console.warn(`  Workout: ${(userProfile.workoutPreferences as any)?.location} | ${(userProfile.workoutPreferences as any)?.intensity}`);

      setProfile(userProfile);

      // Store backup data in AsyncStorage with guest ID (for legacy compatibility)
      const currentGuestId =
        guestId ||
        `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem(
        `onboarding_${currentGuestId}`,
        JSON.stringify(data),
      );

      // NOTE: We do NOT save to 'onboarding_data' here!
      // The complete onboarding data (including advancedReview with water goals, BMI, TDEE, etc.)
      // is already saved by useOnboardingState.saveToLocal() in completeOnboarding().
      // Saving the simplified OnboardingReviewData here would OVERWRITE the complete data
      // and cause calculated metrics (water goal, calories, etc.) to be lost.


      // Mark onboarding as complete
      await AsyncStorage.setItem("onboarding_completed", "true");

      // Remove partial data since onboarding is complete
      await AsyncStorage.removeItem(`onboarding_partial_${currentGuestId}`);



      // Note: invalidateMetricsCache() is already called by completeOnboarding()
      // in completion.ts before onComplete fires — no need to call it again here.

      // Directly seed profileStore with onboarding data for guest users.
      // saveToLocal() skips saving when userId is absent, so dataBridge.loadAllData()
      // finds nothing in AsyncStorage and leaves profileStore.personalInfo = null,
      // causing HomeScreen to show "(unknown)" instead of the user's name.
      // Seeding here ensures the store is populated before MainNavigation renders.
      const profileStoreState = useProfileStore.getState();
      if (data.personalInfo) {
        profileStoreState.updatePersonalInfo(data.personalInfo as any);
      }
      if (data.dietPreferences) {
        profileStoreState.updateDietPreferences(data.dietPreferences as any);
      }
      if (data.workoutPreferences) {
        profileStoreState.updateWorkoutPreferences(data.workoutPreferences as any);
      }
      if (data.bodyAnalysis) {
        profileStoreState.updateBodyAnalysis(data.bodyAnalysis as any);
      }
      if (data.advancedReview) {
        profileStoreState.updateAdvancedReview(data.advancedReview as any);
      }

      // Populate profileStore.advancedReview (and all other profile sections) so
      // useCalculatedMetrics has real data the moment MainNavigation renders.
      // Must be awaited BEFORE setIsOnboardingComplete so the store is fully
      // hydrated before MainNavigation renders — no arbitrary setTimeout needed.
      await dataBridge.loadAllData(user?.id);

      // Set complete flag LAST after all async operations finish
      console.warn(`✅ [APP DEBUG] Onboarding complete — transitioning to MainNavigation`);
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error("❌ App: Failed to store onboarding data:", error);
      // Still allow onboarding to complete even if storage fails
      setIsOnboardingComplete(true);
    }
  };

  // Show loading while authentication, config, or onboarding data are initializing.
  // This keeps maintenance and version gates from flashing open before config loads.
  const isSubscriptionBootstrapping =
    !!user && !isGuestMode && !isSubscriptionInitialized && !subscriptionTimeout;
  const shouldResumeAuthenticatedOnboarding =
    !!user && !isGuestMode && !isOnboardingComplete;

  if (isLoadingOnboarding || appConfigLoading || isSubscriptionBootstrapping) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" translucent />
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>
          {isSubscriptionBootstrapping
            ? "Checking your subscription..."
            : "Loading your profile..."}
        </Text>
      </View>
    );
  }

  if (updateRequired) {
    const requiredVersion =
      compareVersions(appVersion, appConfig.forceUpdateVersion) < 0
        ? appConfig.forceUpdateVersion
        : appConfig.minAppVersion;

    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <View style={styles.maintenanceContainer}>
            <StatusBar style="light" translucent />
            <Text style={styles.maintenanceIcon}>⬆️</Text>
            <Text style={styles.maintenanceTitle}>Update Required</Text>
            <Text style={styles.maintenanceMessage}>
              {`You are using version ${appVersion}. Please update to ${requiredVersion} or newer to continue.`}
            </Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Maintenance mode — block the entire app
  if (appConfig.maintenanceMode) {
    return (
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <View style={styles.maintenanceContainer}>
            <StatusBar style="light" translucent />
            <Text style={styles.maintenanceIcon}>🔧</Text>
            <Text style={styles.maintenanceTitle}>Down for Maintenance</Text>
            <Text style={styles.maintenanceMessage}>{appConfig.maintenanceMessage}</Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <GluestackUIProvider config={config}>
          <ThemeProvider>
          <ErrorBoundary>
            <View style={styles.container}>
              <StatusBar
                style="light"
                translucent
              />

              {isOnboardingComplete ? (
                <MainNavigation initialTab={initialNotificationTab} />
              ) : shouldResumeAuthenticatedOnboarding ? (
                <OnboardingContainer
                  onComplete={handleOnboardingComplete}
                  showProgressIndicator={true}
                />
              ) : showWelcome ? (
                <WelcomeScreen
                  onGetStarted={() => setShowWelcome(false)}
                  onSignInSuccess={() => {

                    setShowWelcome(false);
                    if (loadingAllowed.current) {
                      setIsLoadingOnboarding(true);
                    }
                  }}
                />
              ) : (
                <OnboardingContainer
                  onComplete={handleOnboardingComplete}
                  showProgressIndicator={true}
                />
              )}
            </View>
          </ErrorBoundary>
          </ThemeProvider>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.body,
    marginTop: spacing.md,
    fontWeight: "500" as const,
  },
  maintenanceContainer: {
    flex: 1,
    backgroundColor: colors.background.DEFAULT,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  maintenanceIcon: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  maintenanceTitle: {
    color: colors.text.primary,
    fontSize: typography.fontSize.h1,
    fontWeight: "700" as const,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  maintenanceMessage: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.body,
    textAlign: "center",
    lineHeight: 24,
  },
});
