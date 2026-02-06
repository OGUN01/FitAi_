/**
 * useHomeLogic - Business logic for HomeScreen
 * Extracted to reduce HomeScreen.tsx complexity
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Platform, Animated, Alert } from "react-native";
import { haptics } from "../utils/haptics";
import { useDashboardIntegration } from "../utils/integration";
import { useAuth } from "./useAuth";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import DataRetrievalService from "../services/dataRetrieval";
import {
  useFitnessStore,
  useNutritionStore,
  useAchievementStore,
  useHealthDataStore,
  useAnalyticsStore,
  useSubscriptionStore,
  useUserStore,
  useHydrationStore,
} from "../stores";
import { completionTrackingService } from "../services/completionTracking";

export const useHomeLogic = () => {
  const { getUserStats, profile } = useDashboardIntegration();
  const { isGuestMode } = useAuth();
  const userProfile = useUserStore((state) => state.profile);

  // Stores
  const { loadData: loadFitnessData, weeklyWorkoutPlan } = useFitnessStore();
  const {
    loadData: loadNutritionData,
    dailyMeals,
    weeklyMealPlan,
  } = useNutritionStore();
  const { currentStreak: achievementStreak } = useAchievementStore();
  const {
    metrics: healthMetrics,
    isHealthKitAuthorized,
    isHealthConnectAuthorized,
    initializeHealthKit,
    syncHealthData,
    initializeHealthConnect,
    syncFromHealthConnect,
    settings: healthSettings,
  } = useHealthDataStore();
  const {
    isInitialized: analyticsInitialized,
    initialize: initializeAnalytics,
    refreshAnalytics,
  } = useAnalyticsStore();
  const { initialize: initializeSubscription } = useSubscriptionStore();

  // Hydration
  const {
    waterIntakeML,
    dailyGoalML: waterGoal,
    addWater: hydrationAddWater,
    setDailyGoal: setHydrationGoal,
    checkAndResetIfNewDay,
    syncWithSupabase: syncHydrationWithSupabase,
  } = useHydrationStore();

  const {
    metrics: calculatedMetrics,
    hasCalculatedMetrics,
    refreshMetrics,
  } = useCalculatedMetrics();

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State
  const [todaysData, setTodaysData] = useState<any>(null);
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refresh data on mount
  useEffect(() => {
    console.log("[HomeScreen] Screen mounted - refreshing metrics and data");

    refreshMetrics().catch((err) => {
      console.warn("[HomeScreen] Failed to refresh metrics on mount:", err);
    });

    DataRetrievalService.loadAllData()
      .then(() => {
        setTodaysData(DataRetrievalService.getTodaysData());
        setWeeklyProgress(DataRetrievalService.getWeeklyProgress());
      })
      .catch((err) => {
        console.warn("[HomeScreen] Failed to load data on mount:", err);
      });
  }, [refreshMetrics]);

  // Sync hydration goal
  useEffect(() => {
    if (calculatedMetrics?.dailyWaterML) {
      setHydrationGoal(calculatedMetrics.dailyWaterML);
    }
    checkAndResetIfNewDay();

    syncHydrationWithSupabase().catch((err) => {
      console.warn("[HomeScreen] Failed to sync hydration from Supabase:", err);
    });
  }, [calculatedMetrics?.dailyWaterML]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await DataRetrievalService.loadAllData();
        setTodaysData(DataRetrievalService.getTodaysData());
        setWeeklyProgress(DataRetrievalService.getWeeklyProgress());

        // Auto-sync health data
        if (Platform.OS === "ios" && healthSettings.healthKitEnabled) {
          if (isHealthKitAuthorized) {
            console.log("[HEALTH] Auto-syncing from HealthKit...");
            syncHealthData();
          } else {
            console.log("[HEALTH] Initializing HealthKit...");
            initializeHealthKit();
          }
        } else if (
          Platform.OS === "android" &&
          healthSettings.healthConnectEnabled
        ) {
          if (isHealthConnectAuthorized) {
            console.log(
              "[HEALTH] Auto-syncing from Health Connect (7 days)...",
            );
            syncFromHealthConnect(7);
          } else {
            console.log("[HEALTH] Initializing Health Connect...");
            initializeHealthConnect();
          }
        }

        analyticsInitialized ? refreshAnalytics() : initializeAnalytics();
        initializeSubscription();
      } catch (err) {
        console.error("Load error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    console.log("[EVENT] HomeScreen: Setting up completion event listener");
    const unsubscribe = completionTrackingService.subscribe((event) => {
      console.log("[EVENT] HomeScreen: Received completion event:", event);
      setTodaysData(DataRetrievalService.getTodaysData());
      setWeeklyProgress(DataRetrievalService.getWeeklyProgress());
    });

    return () => {
      console.log("[EVENT] HomeScreen: Unsubscribing from completion events");
      unsubscribe();
    };
  }, []);

  // Memoized values
  const userStats = useMemo(() => getUserStats() || {}, [getUserStats]);

  const appCaloriesBurned = useMemo(
    () => DataRetrievalService.getTotalCaloriesBurned(),
    [todaysData],
  );

  const wearableConnected = isHealthKitAuthorized || isHealthConnectAuthorized;

  const realCaloriesBurned = useMemo(() => {
    if (wearableConnected) {
      if (healthMetrics?.totalCalories && healthMetrics.totalCalories > 0) {
        return healthMetrics.totalCalories;
      }
      if (healthMetrics?.activeCalories && healthMetrics.activeCalories > 0) {
        return healthMetrics.activeCalories;
      }
    }
    return appCaloriesBurned;
  }, [
    wearableConnected,
    healthMetrics?.totalCalories,
    healthMetrics?.activeCalories,
    appCaloriesBurned,
  ]);

  const actualCaloriesGoal = useMemo(() => {
    if (healthMetrics?.caloriesGoal && healthMetrics.caloriesGoal > 0) {
      return healthMetrics.caloriesGoal;
    }
    if (
      calculatedMetrics?.calculatedTDEE &&
      calculatedMetrics.calculatedTDEE > 0
    ) {
      return calculatedMetrics.calculatedTDEE;
    }
    if (
      calculatedMetrics?.dailyCalories &&
      calculatedMetrics.dailyCalories > 0
    ) {
      return calculatedMetrics.dailyCalories;
    }
    return 0;
  }, [
    healthMetrics?.caloriesGoal,
    calculatedMetrics?.calculatedTDEE,
    calculatedMetrics?.dailyCalories,
  ]);

  const realStreak = achievementStreak;

  const todaysWorkoutInfo = useMemo(
    () => DataRetrievalService.getTodaysWorkoutForHome(),
    [todaysData],
  );

  const userAge = useMemo(() => {
    return profile?.personalInfo?.age;
  }, [profile]);

  const weightData = useMemo(() => {
    const currentWeight = profile?.bodyMetrics?.current_weight_kg;
    const goalWeight = profile?.bodyMetrics?.target_weight_kg;
    const startingWeight =
      profile?.bodyMetrics?.current_weight_kg ?? currentWeight;

    return {
      currentWeight,
      goalWeight,
      startingWeight,
      weightHistory: currentWeight
        ? [
            {
              date: new Date().toISOString().split("T")[0],
              weight: currentWeight,
            },
          ]
        : [],
    };
  }, [healthMetrics, userProfile, calculatedMetrics]);

  const caloriesConsumed = useMemo(() => {
    const consumedNutrition = useNutritionStore
      .getState()
      .getTodaysConsumedNutrition();
    return consumedNutrition.calories;
  }, [weeklyMealPlan, dailyMeals]);

  const workoutMinutes = useMemo(() => {
    return todaysWorkoutInfo.workout?.duration || 0;
  }, [todaysWorkoutInfo]);

  const weekCalendarData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayName = date
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const workout = weeklyWorkoutPlan?.workouts?.find(
        (w: any) => w.dayOfWeek?.toLowerCase() === dayName,
      );

      return {
        date,
        hasWorkout: !!workout && !workout.isRestDay,
        workoutCompleted: workout?.completed || false,
        isRestDay: workout?.isRestDay || i === 0,
      };
    });
  }, [weeklyWorkoutPlan]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.light();
    setError(null);
    try {
      await Promise.all([loadFitnessData(), loadNutritionData()]);
      setTodaysData(DataRetrievalService.getTodaysData());
      setWeeklyProgress(DataRetrievalService.getWeeklyProgress());

      if (Platform.OS === "ios" && isHealthKitAuthorized) {
        await syncHealthData(true);
      } else if (Platform.OS === "android" && isHealthConnectAuthorized) {
        await syncFromHealthConnect(7);
      }
    } catch (err) {
      console.error("Refresh error:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  }, [
    loadFitnessData,
    loadNutritionData,
    isHealthKitAuthorized,
    isHealthConnectAuthorized,
    syncHealthData,
    syncFromHealthConnect,
  ]);

  const handleAddWater = useCallback(
    (amount: number) => {
      haptics.medium();
      hydrationAddWater(amount);
    },
    [hydrationAddWater],
  );

  return {
    // State
    isLoading,
    error,
    refreshing,
    showGuestSignUp,
    showWeightModal,
    setShowGuestSignUp,
    setShowWeightModal,
    fadeAnim,

    // Profile data
    profile,
    userProfile,
    isGuestMode,
    realStreak,
    userAge,

    // Health metrics
    healthMetrics,
    wearableConnected,
    realCaloriesBurned,
    actualCaloriesGoal,

    // Workout/nutrition data
    todaysWorkoutInfo,
    todaysData,
    caloriesConsumed,
    workoutMinutes,
    weekCalendarData,

    // Hydration
    waterIntakeML,
    waterGoal,

    // Weight data
    weightData,

    // Calculated metrics
    calculatedMetrics,

    // Handlers
    handleRefresh,
    handleAddWater,
  };
};
