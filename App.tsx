import "./global.css";
import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, ActivityIndicator, Text } from "react-native";
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
import { UserProfile, PersonalInfo, FitnessGoals } from "./src/types/user";
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
import { invalidateMetricsCache } from "./src/hooks/useCalculatedMetrics";
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

  const { user, isLoading, isInitialized, isGuestMode, guestId } = useAuth();


  const { setProfile, profile } = useUserStore();
  const { setGuestMode: setGuestModeInStore } = useAuthStore();

  // Safety timeout: Force loading to complete after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoadingOnboarding) {

        setIsLoadingOnboarding(false);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [isLoadingOnboarding]);

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

  // Only use notification store if not in Expo Go
  const notificationStore = useNotificationStore
    ? useNotificationStore()
    : null;
  const initializeNotifications = notificationStore?.initialize;
  const areNotificationsInitialized = notificationStore?.isInitialized;

  // Helper function to convert OnboardingReviewData to UserProfile
  const convertOnboardingToProfile = (
    data: OnboardingReviewData,
  ): UserProfile => {
    // ✅ FIX: Create fitnessGoals from workoutPreferences data
    // The onboarding saves goals data in workoutPreferences, not in a separate fitnessGoals field
    const wp = data.workoutPreferences;

    // Convert goals from hyphen format to underscore format for edit modals
    // e.g., 'weight-loss' -> 'weight_loss', 'muscle-gain' -> 'muscle_gain'
    const rawGoals =
      (wp as any)?.primary_goals || (wp as any)?.primaryGoals || [];
    const normalizedGoals = rawGoals.map((goal: string) =>
      goal.replace(/-/g, "_"),
    );

    // Convert time_preference (number in minutes) to time range string
    // Onboarding stores: 15, 30, 45, 60, 75, 90, 120
    // Modal expects: '15-30', '30-45', '45-60', '60+'
    const timeMinutes =
      (wp as any)?.time_preference || (wp as any)?.timePreference || 30;
    const getTimeRange = (minutes: number): string => {
      if (minutes <= 30) return "15-30";
      if (minutes <= 45) return "30-45";
      if (minutes <= 60) return "45-60";
      return "60+";
    };
    const timeRange = getTimeRange(timeMinutes);

    // ALWAYS build fitnessGoals from workoutPreferences data (the source of truth)
    // Don't use data.fitnessGoals directly as it may have incorrect format
    const fitnessGoals = {
      // Pull from workoutPreferences which is where onboarding stores this data
      primary_goals:
        normalizedGoals.length > 0
          ? normalizedGoals
          : (data.fitnessGoals as any)?.primary_goals || [],
      primaryGoals:
        normalizedGoals.length > 0
          ? normalizedGoals
          : (data.fitnessGoals as any)?.primaryGoals || [], // Legacy alias for edit modals
      time_commitment: timeRange,
      timeCommitment: timeRange, // Legacy alias for edit modals
      experience: wp?.intensity || data.fitnessGoals?.experience || "beginner",
      experience_level:
        wp?.intensity || data.fitnessGoals?.experience_level || "beginner", // Legacy alias
      // Preserve other optional fields from data.fitnessGoals if they exist
      preferred_equipment: data.fitnessGoals?.preferred_equipment,
      target_areas: data.fitnessGoals?.target_areas,
    };

    // ✅ FIX: Compute name from first_name + last_name if not present
    const computedName =
      data.personalInfo.name ||
      `${data.personalInfo.first_name || ""} ${data.personalInfo.last_name || ""}`.trim() ||
      "User";

    return {
      id: guestId || `guest_${Date.now()}`,
      email: data.personalInfo.email || "",
      personalInfo: {
        ...data.personalInfo,
        name: computedName, // Ensure name is always computed
        // Provide defaults for required fields
        country: data.personalInfo.country || "",
        state: data.personalInfo.state || "",
        wake_time: data.personalInfo.wake_time || "07:00",
        sleep_time: data.personalInfo.sleep_time || "23:00",
        occupation_type:
          (data.personalInfo.occupation_type as any) || "moderate_active",
      } as PersonalInfo,
      fitnessGoals: fitnessGoals as FitnessGoals,
      dietPreferences: data.dietPreferences
        ? {
            // Basic diet info
            diet_type:
              (data.dietPreferences as any).diet_type ||
              (data.dietPreferences as any).dietType ||
              "non-veg",
            allergies: data.dietPreferences.allergies || [],
            restrictions: data.dietPreferences.restrictions || [],

            // Diet readiness toggles (6) - defaults for backward compatibility
            keto_ready: (data.dietPreferences as any).keto_ready || false,
            intermittent_fasting_ready:
              (data.dietPreferences as any).intermittent_fasting_ready || false,
            paleo_ready: (data.dietPreferences as any).paleo_ready || false,
            mediterranean_ready:
              (data.dietPreferences as any).mediterranean_ready || false,
            low_carb_ready:
              (data.dietPreferences as any).low_carb_ready || false,
            high_protein_ready:
              (data.dietPreferences as any).high_protein_ready || false,

            // Meal preferences (4)
            breakfast_enabled:
              (data.dietPreferences as any).breakfast_enabled !== false,
            lunch_enabled:
              (data.dietPreferences as any).lunch_enabled !== false,
            dinner_enabled:
              (data.dietPreferences as any).dinner_enabled !== false,
            snacks_enabled:
              (data.dietPreferences as any).snacks_enabled !== false,

            // Cooking preferences (3)
            cooking_skill_level:
              (data.dietPreferences as any).cooking_skill_level ||
              (data.dietPreferences as any).cookingSkill ||
              "beginner",
            max_prep_time_minutes:
              (data.dietPreferences as any).max_prep_time_minutes || null,
            budget_level:
              (data.dietPreferences as any).budget_level || "medium",

            // Health habits (14)
            drinks_enough_water:
              (data.dietPreferences as any).drinks_enough_water || false,
            limits_sugary_drinks:
              (data.dietPreferences as any).limits_sugary_drinks || false,
            eats_regular_meals:
              (data.dietPreferences as any).eats_regular_meals || false,
            avoids_late_night_eating:
              (data.dietPreferences as any).avoids_late_night_eating || false,
            controls_portion_sizes:
              (data.dietPreferences as any).controls_portion_sizes || false,
            reads_nutrition_labels:
              (data.dietPreferences as any).reads_nutrition_labels || false,
            eats_processed_foods:
              (data.dietPreferences as any).eats_processed_foods !== false,
            eats_5_servings_fruits_veggies:
              (data.dietPreferences as any).eats_5_servings_fruits_veggies ||
              false,
            limits_refined_sugar:
              (data.dietPreferences as any).limits_refined_sugar || false,
            includes_healthy_fats:
              (data.dietPreferences as any).includes_healthy_fats || false,
            drinks_alcohol:
              (data.dietPreferences as any).drinks_alcohol || false,
            smokes_tobacco:
              (data.dietPreferences as any).smokes_tobacco || false,
            drinks_coffee: (data.dietPreferences as any).drinks_coffee || false,
            takes_supplements:
              (data.dietPreferences as any).takes_supplements || false,
          }
        : undefined,
      workoutPreferences: (() => {
        const wp = data.workoutPreferences;
        return wp
          ? {
              location: wp.location || "home",
              equipment: wp.equipment || [],
              time_preference:
                (wp as any).time_preference || (wp as any).timePreference || 30,
              intensity: wp.intensity || "beginner",
              workout_types:
                (wp as any).workout_types || (wp as any).workoutTypes || [],
              primary_goals:
                (wp as any).primary_goals || (wp as any).primaryGoals || [],
              activity_level:
                (wp as any).activity_level ||
                (wp as any).activityLevel ||
                "moderate",
              // Backward compatibility
              timePreference:
                (wp as any).time_preference || (wp as any).timePreference || 30,
              workoutTypes:
                (wp as any).workout_types || (wp as any).workoutTypes || [],
              primaryGoals:
                (wp as any).primary_goals || (wp as any).primaryGoals || [],
              activityLevel:
                (wp as any).activity_level ||
                (wp as any).activityLevel ||
                "moderate",
            }
          : {
              location: "home" as const,
              equipment: [],
              time_preference: 30,
              intensity: "beginner" as const,
              workout_types: [],
              primary_goals: [],
              activity_level: "moderate",
              // Backward compatibility
              timePreference: 30,
              workoutTypes: [],
              primaryGoals: [],
              activityLevel: "moderate",
            };
      })(),
      // ✅ FIX: Map bodyAnalysis from onboarding to bodyMetrics in UserProfile
      // Handle both flat format (height_cm, current_weight_kg) and nested format (measurements.height, measurements.weight)
      bodyMetrics: data.bodyAnalysis
        ? (() => {
            const ba = data.bodyAnalysis as any;
            const measurements = ba.measurements || {};
            return {
              // Check both flat format and nested measurements format
              height_cm:
                ba.height_cm ||
                measurements.height ||
                measurements.height_cm ||
                0,
              current_weight_kg:
                ba.current_weight_kg ||
                measurements.weight ||
                measurements.current_weight_kg ||
                0,
              target_weight_kg:
                ba.target_weight_kg ||
                measurements.targetWeight ||
                measurements.target_weight_kg,
              target_timeline_weeks:
                ba.target_timeline_weeks || measurements.target_timeline_weeks,
              body_fat_percentage:
                ba.body_fat_percentage ||
                measurements.bodyFat ||
                measurements.body_fat_percentage,
              waist_cm:
                ba.waist_cm || measurements.waist || measurements.waist_cm,
              hip_cm: ba.hip_cm || measurements.hips || measurements.hip_cm,
              chest_cm:
                ba.chest_cm || measurements.chest || measurements.chest_cm,
              front_photo_url: ba.front_photo_url,
              side_photo_url: ba.side_photo_url,
              back_photo_url: ba.back_photo_url,
              // Medical fields from onboarding
              medical_conditions: ba.medical_conditions || [],
              medications: ba.medications || [],
              physical_limitations: ba.physical_limitations || [],
              pregnancy_status: ba.pregnancy_status || false,
              breastfeeding_status: ba.breastfeeding_status || false,
            };
          })()
        : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      preferences: {
        units: "metric" as const,
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



      return {
        hasData: missingTables.length === 0,
        missingTables,
      };
    } catch (error) {
      console.error("❌ [DB-VERIFY] Verification failed:", error);
      return { hasData: false, missingTables: ["unknown"] };
    }
  };

  // Sync local onboarding data to database
  const syncLocalToDatabase = async (
    userId: string,
  ): Promise<{ success: boolean; errors: string[] }> => {
    const errors: string[] = [];
    const savedTables: string[] = []; // Track successful saves for rollback

    try {


      // Load from onboarding_data (primary source used by useOnboardingState)
      const onboardingDataStr = await AsyncStorage.getItem("onboarding_data");
      if (!onboardingDataStr) {

        return { success: false, errors: ["No local data found"] };
      }

      const onboardingData = JSON.parse(onboardingDataStr);


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

    const loadExistingData = async () => {
      if (!isInitialized) return;

      setIsLoadingOnboarding(true);

      try {


        // If user is authenticated, check if profile exists in store
        if (user && profile) {
          if (!mounted) return;



          // Validate profile has all required fields
          const { checkProfileComplete } = useUserStore.getState();
          const isValid = checkProfileComplete(profile);

          if (isValid) {
            // NEW: Verify database actually has the data (fix for sync issues)

            const dbVerification = await verifyDatabaseData(user.id);

            if (!mounted) return;

            if (!dbVerification.hasData) {


              // Attempt to sync local data to database

              const syncResult = await syncLocalToDatabase(user.id);

              if (!mounted) return;

              if (!syncResult.success) {
                console.error(
                  "❌ App: Failed to sync local data to DB:",
                  syncResult.errors,
                );
                // Still show main navigation - local data exists, DB sync can happen later

              } else {

              }
            } else {

            }


            setIsOnboardingComplete(true);
          } else {

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
              const userProfile = convertOnboardingToProfile(onboardingData);
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



        // BUG-001 cleanup: clear stale workout_sessions queue items with old camelCase columns
        try {
          await offlineService.clearFailedActionsForTable('workout_sessions');

        } catch (cleanupError) {

        }

        // Initialize Google Sign-In
        try {

          await googleAuthService.configure();

          if (!mounted) return;


        } catch (error) {
          if (!mounted) return;
          console.error(
            "❌ FitAI: Google Sign-In initialization failed:",
            error,
          );
        }

        // 🎯 AI BACKEND STATUS - Cloudflare Workers


        // Initialize notifications only if not in Expo Go
        if (
          !isExpoGo &&
          initializeNotifications &&
          !areNotificationsInitialized
        ) {

          try {
            await initializeNotifications();

            if (!mounted) return;


          } catch (notifError) {
            if (!mounted) return;
            console.error(
              "❌ FitAI: Notifications initialization failed:",
              notifError,
            );
          }
        } else if (isExpoGo) {


        }
      } catch (error) {
        if (!mounted) return;
        console.error("❌ FitAI: Backend initialization failed:", error);
        // Don't throw here, let the app continue with limited functionality
      }
    };

    initializeApp().catch((error) => {
      console.error("[App] Unhandled initialization error:", error);
    });

    return () => {
      mounted = false;
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


    try {
      // Ensure guest mode is enabled if not authenticated
      if (!user && !isGuestMode) {

        setGuestModeInStore(true);
      }

      // Store in component state
      setUserData(data);

      // Convert to profile format and store in userStore for persistence
      const userProfile = convertOnboardingToProfile(data);

      setProfile(userProfile);

      // ⚠️ CRITICAL: Wait for Zustand persist middleware to finish async save
      // Without this delay, MainNavigation renders before persistence completes,
      // causing ProfileScreen to read from empty userStore

      await new Promise((resolve) => setTimeout(resolve, 150));


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




      // Invalidate metrics cache to ensure HomeScreen loads fresh data

      invalidateMetricsCache();

      // Set complete flag LAST after all async operations finish
      setIsOnboardingComplete(true);
    } catch (error) {
      console.error("❌ App: Failed to store onboarding data:", error);
      // Still allow onboarding to complete even if storage fails
      setIsOnboardingComplete(true);
    }
  };

  // Show loading while authentication is initializing or loading onboarding data
  // Only show loading if we're actually waiting for something (with timeout protection)
  if (isLoadingOnboarding) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="light" backgroundColor={colors.background.DEFAULT} />
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
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
                backgroundColor={colors.background.DEFAULT}
              />

              {isOnboardingComplete ? (
                <MainNavigation />
              ) : showWelcome ? (
                <WelcomeScreen
                  onGetStarted={() => setShowWelcome(false)}
                  onSignInSuccess={() => {

                    setShowWelcome(false);
                    setIsLoadingOnboarding(true);
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
});
