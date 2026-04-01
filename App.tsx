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
import { useSubscriptionStore } from "./src/stores/subscriptionStore";
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
import { useAppConfig } from "./src/hooks/useAppConfig";
import { runAfterInteractions } from "./src/utils/performance";
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
      (wp as any)?.time_preference ?? (wp as any)?.timePreference ?? 0;
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
      experience: wp?.intensity ?? data.fitnessGoals?.experience ?? "beginner",
      experience_level:
        wp?.intensity ?? data.fitnessGoals?.experience_level ?? "beginner", // Legacy alias
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
          (data.personalInfo.occupation_type as any) ?? undefined,
      } as PersonalInfo,
      fitnessGoals: fitnessGoals as FitnessGoals,
      dietPreferences: data.dietPreferences
        ? {
            // Basic diet info
            diet_type:
              (data.dietPreferences as any).diet_type ??
              (data.dietPreferences as any).dietType ??
              "balanced",
            allergies: data.dietPreferences.allergies || [],
            restrictions: data.dietPreferences.restrictions || [],

            // Diet readiness toggles (6) - defaults for backward compatibility
            keto_ready: (data.dietPreferences as any).keto_ready ?? false,
            intermittent_fasting_ready:
              (data.dietPreferences as any).intermittent_fasting_ready ?? false,
            paleo_ready: (data.dietPreferences as any).paleo_ready ?? false,
            mediterranean_ready:
              (data.dietPreferences as any).mediterranean_ready ?? false,
            low_carb_ready:
              (data.dietPreferences as any).low_carb_ready ?? false,
            high_protein_ready:
              (data.dietPreferences as any).high_protein_ready ?? false,

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
              (data.dietPreferences as any).drinks_enough_water ?? false,
            limits_sugary_drinks:
              (data.dietPreferences as any).limits_sugary_drinks ?? false,
            eats_regular_meals:
              (data.dietPreferences as any).eats_regular_meals ?? false,
            avoids_late_night_eating:
              (data.dietPreferences as any).avoids_late_night_eating ?? false,
            controls_portion_sizes:
              (data.dietPreferences as any).controls_portion_sizes ?? false,
            reads_nutrition_labels:
              (data.dietPreferences as any).reads_nutrition_labels ?? false,
            eats_processed_foods:
              (data.dietPreferences as any).eats_processed_foods ?? false,
            eats_5_servings_fruits_veggies:
              (data.dietPreferences as any).eats_5_servings_fruits_veggies ??
              false,
            limits_refined_sugar:
              (data.dietPreferences as any).limits_refined_sugar ?? false,
            includes_healthy_fats:
              (data.dietPreferences as any).includes_healthy_fats ?? false,
            drinks_alcohol:
              (data.dietPreferences as any).drinks_alcohol ?? false,
            smokes_tobacco:
              (data.dietPreferences as any).smokes_tobacco ?? false,
            drinks_coffee: (data.dietPreferences as any).drinks_coffee ?? false,
            takes_supplements:
              (data.dietPreferences as any).takes_supplements ?? false,
          }
        : undefined,
      workoutPreferences: (() => {
        const wp = data.workoutPreferences;
        return wp
          ? {
              location: wp.location ?? "home",
              equipment: wp.equipment || [],
              time_preference:
                (wp as any).time_preference ?? (wp as any).timePreference ?? 0,
              intensity: wp.intensity ?? "beginner",
              workout_types:
                (wp as any).workout_types ?? (wp as any).workoutTypes ?? [],
              primary_goals:
                (wp as any).primary_goals ?? (wp as any).primaryGoals ?? [],
              activity_level:
                (wp as any).activity_level ??
                (wp as any).activityLevel ??
                undefined,
              workout_frequency_per_week:
                (wp as any).workout_frequency_per_week,
              workout_experience_years:
                (wp as any).workout_experience_years,
              preferred_workout_times:
                (wp as any).preferred_workout_times ?? [],
              enjoys_cardio: (wp as any).enjoys_cardio,
              enjoys_strength_training: (wp as any).enjoys_strength_training,
              enjoys_group_classes: (wp as any).enjoys_group_classes,
              prefers_outdoor_activities: (wp as any).prefers_outdoor_activities,
              needs_motivation: (wp as any).needs_motivation,
              prefers_variety: (wp as any).prefers_variety,
              // Backward compatibility
              timePreference:
                (wp as any).time_preference ?? (wp as any).timePreference ?? 0,
              workoutTypes:
                (wp as any).workout_types ?? (wp as any).workoutTypes ?? [],
              primaryGoals:
                (wp as any).primary_goals ?? (wp as any).primaryGoals ?? [],
              activityLevel:
                (wp as any).activity_level ??
                (wp as any).activityLevel ??
                undefined,
            }
          : {
              location: "home" as const,
              equipment: [],
              time_preference: 0,
              intensity: "beginner" as const,
              workout_types: [],
              primary_goals: [],
              activity_level: undefined,
              // Backward compatibility
              timePreference: 0,
              workoutTypes: [],
              primaryGoals: [],
              activityLevel: undefined,
            };
      })(),
      // ✅ FIX: Map bodyAnalysis from onboarding to bodyMetrics in UserProfile
      // Handle both flat format (height_cm, current_weight_kg) and nested format (measurements.height, measurements.weight)
      bodyMetrics: data.bodyAnalysis
        ? (() => {
            const ba = data.bodyAnalysis as any;
            const measurements = ba.measurements || {};
            return {
              // Check both flat format and nested measurements format, also check personalInfo
              height_cm:
                ba.height_cm ??
                measurements.height ??
                measurements.height_cm ??
                data.personalInfo?.height ??
                0,
              current_weight_kg:
                ba.current_weight_kg ??
                measurements.weight ??
                measurements.current_weight_kg ??
                data.personalInfo?.weight ??
                0,
              target_weight_kg:
                ba.target_weight_kg ??
                measurements.targetWeight ??
                measurements.target_weight_kg,
              target_timeline_weeks:
                ba.target_timeline_weeks ?? measurements.target_timeline_weeks,
              body_fat_percentage:
                ba.body_fat_percentage ??
                measurements.bodyFat ??
                measurements.body_fat_percentage,
              waist_cm:
                ba.waist_cm ?? measurements.waist ?? measurements.waist_cm,
              hip_cm: ba.hip_cm ?? measurements.hips ?? measurements.hip_cm,
              chest_cm:
                ba.chest_cm ?? measurements.chest ?? measurements.chest_cm,
              bmi: ba.bmi ?? null,
              bmr: ba.bmr ?? null,
              ideal_weight_min: ba.ideal_weight_min ?? null,
              ideal_weight_max: ba.ideal_weight_max ?? null,
              front_photo_url: ba.front_photo_url,
              side_photo_url: ba.side_photo_url,
              back_photo_url: ba.back_photo_url,
              // Medical fields from onboarding
              medical_conditions: ba.medical_conditions ?? [],
              medications: ba.medications ?? [],
              physical_limitations: ba.physical_limitations ?? [],
              pregnancy_status: ba.pregnancy_status ?? false,
              breastfeeding_status: ba.breastfeeding_status ?? false,
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
          }
        });
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
      const userProfile = convertOnboardingToProfile(data);

      console.warn(`\n📱 [APP DEBUG] Profile converted from onboarding:`);
      console.warn(`  Name: ${userProfile.personalInfo?.name}`);
      console.warn(`  Age: ${(userProfile.personalInfo as any)?.age} | Gender: ${(userProfile.personalInfo as any)?.gender}`);
      console.warn(`  Goals: [${(userProfile.fitnessGoals as any)?.primary_goals?.join(', ') || 'none'}]`);
      console.warn(`  Height: ${(userProfile.bodyMetrics as any)?.height_cm}cm | Weight: ${(userProfile.bodyMetrics as any)?.current_weight_kg}kg`);
      console.warn(`  Diet: ${(userProfile.dietPreferences as any)?.diet_type}`);
      console.warn(`  Workout: ${(userProfile.workoutPreferences as any)?.location} | ${(userProfile.workoutPreferences as any)?.intensity}`);

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
    !!user && !isGuestMode && !isSubscriptionInitialized;
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
                <MainNavigation />
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
