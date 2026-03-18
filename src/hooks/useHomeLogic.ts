/**
 * useHomeLogic - Business logic for HomeScreen
 * Extracted to reduce HomeScreen.tsx complexity
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Platform, Animated } from "react-native";
import { haptics } from "../utils/haptics";
import { useDashboardIntegration } from "../utils/integration";
import { useAuth } from "./useAuth";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
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
import { buildTodaysData } from "./progress-screen/data";
import { useProfileStore } from "../stores/profileStore";
import { completionTrackingService } from "../services/completionTracking";

export const useHomeLogic = () => {
  const { getUserStats, profile } = useDashboardIntegration();
  const { user, isGuestMode } = useAuth();
  const userProfile = useUserStore((state) => state.profile);
  const { bodyAnalysis, personalInfo } = useProfileStore();

  // Derived weight unit from user preferences
  const weightUnit: "kg" | "lbs" = personalInfo?.units === "imperial" ? "lbs" : "kg";

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
  const { initializeSubscription } = useSubscriptionStore();

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

  const completedSessions = useFitnessStore((s) => s.completedSessions);
  const workoutProgress = useFitnessStore((s) => s.workoutProgress);
  const mealProgress = useNutritionStore((s) => s.mealProgress);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weightHistory = useAnalyticsStore((s) => s.weightHistory);

  // SSOT Fix 17: todaysData computed reactively from stores, not snapshotted
  const todaysData = useMemo(() => buildTodaysData(), [
    weeklyWorkoutPlan, workoutProgress, weeklyMealPlan, mealProgress,
  ]);
  // SSOT Fix 17: weeklyProgress derived from completedSessions + mealProgress
  const weeklyProgress = useMemo(() => {
    const d = new Date();
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + diff); d.setHours(0, 0, 0, 0);
    const weekStart = d.toISOString().split("T")[0];
    return {
      workoutsCompleted: completedSessions.filter((s) => s.type === "planned" && s.weekStart === weekStart).length,
      totalWorkouts: weeklyWorkoutPlan?.workouts.length ?? 0,
      mealsCompleted: Object.values(mealProgress).filter((p) => p.progress === 100).length,
      totalMeals: weeklyMealPlan?.meals.length ?? 0,
      streak: achievementStreak,
    };
  }, [completedSessions, mealProgress, weeklyWorkoutPlan, weeklyMealPlan, achievementStreak]);

  // Refresh calculated metrics on mount (does not trigger duplicate loadAllData)
  useEffect(() => {
    refreshMetrics().catch((err) => {
      console.warn("[HomeScreen] Failed to refresh metrics on mount:", err);
    });
    // NOTE: DataRetrievalService.loadAllData() is called in the main loading
    // useEffect below. We do NOT call it here again to avoid a double-fetch on mount.
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

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true); setError(null);
        await Promise.all([useFitnessStore.getState().loadData(), useNutritionStore.getState().loadData()]);
        if (Platform.OS === "ios" && healthSettings.healthKitEnabled) {
          isHealthKitAuthorized ? syncHealthData() : initializeHealthKit();
        } else if (Platform.OS === "android" && healthSettings.healthConnectEnabled) {
          isHealthConnectAuthorized ? syncFromHealthConnect(7) : initializeHealthConnect();
        }
        analyticsInitialized ? refreshAnalytics() : initializeAnalytics();
        initializeSubscription();
      } catch (err) {
        console.error("Load error:", err);
        setError(err instanceof Error ? err.message : "Failed to load dashboard data");
      } finally { setIsLoading(false); }
    };
    loadData();
    Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    // Completion events update the stores; useMemo consumers re-render automatically.
    const unsubscribe = completionTrackingService.subscribe(() => {
      useFitnessStore.getState().loadData();
      useNutritionStore.getState().loadData();
    });
    return () => { unsubscribe(); };
  }, []);

  // Memoized values
  const userStats = useMemo(() => getUserStats() || {}, [getUserStats]);

  const appCaloriesBurned = useMemo(
    () => completedSessions.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0),
    [completedSessions]
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
      calculatedMetrics?.dailyCalories &&
      calculatedMetrics.dailyCalories > 0
    ) {
      return calculatedMetrics.dailyCalories;
    }
    if (
      calculatedMetrics?.calculatedTDEE &&
      calculatedMetrics.calculatedTDEE > 0
    ) {
      return calculatedMetrics.calculatedTDEE;
    }
    return 0;
  }, [
    healthMetrics?.caloriesGoal,
    calculatedMetrics?.calculatedTDEE,
    calculatedMetrics?.dailyCalories,
  ]);

  const realStreak = achievementStreak;

  const todaysWorkoutInfo = useMemo(() => {
    const fs = useFitnessStore.getState();
    const w = todaysData?.workout ?? null;
    const hasPlan = !!weeklyWorkoutPlan;
    const tidx = new Date().getDay();
    const days = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
    const todayMon = tidx === 0 ? 6 : tidx - 1;
    const isRest = (hasPlan && fs.weeklyWorkoutPlan?.restDays?.some(
      (d: number|string) => typeof d === "string" ? d === days[tidx] : d === todayMon)) || false;
    const wType = !hasPlan ? "none" : isRest ? "rest" : (w?.category ?? "workout");
    const dStatus = !hasPlan ? "No Plan" : isRest ? "Rest Day" : w?.category ? `${w.category[0].toUpperCase()}${w.category.slice(1)} Day` : "Workout Day";
    return { workout: w, hasWorkout: !!w, isCompleted: (todaysData?.progress?.workoutProgress ?? 0) === 100, hasWeeklyPlan: hasPlan, isRestDay: isRest, workoutType: wType, dayStatus: dStatus };
  }, [todaysData, weeklyWorkoutPlan]);

  const userAge = useMemo(() => {
    // SSOT: profileStore.personalInfo is authoritative (onboarding_data); userStore profile is legacy fallback
    return personalInfo?.age || profile?.personalInfo?.age;
  }, [personalInfo, profile]);

  const userName = useMemo(() => {
    // SSOT: profileStore.personalInfo is authoritative; compute from first+last, fallback to userStore
    const profileName = `${personalInfo?.first_name || ''} ${personalInfo?.last_name || ''}`.trim();
    return profileName || personalInfo?.name || profile?.personalInfo?.name || '';
  }, [personalInfo, profile]);

  const weightData = useMemo(() => {
    const profileWeight = bodyAnalysis?.current_weight_kg ?? profile?.bodyMetrics?.current_weight_kg;
    const goalWeight = bodyAnalysis?.target_weight_kg ?? profile?.bodyMetrics?.target_weight_kg;

    // SSOT fix: use analyticsStore.weightHistory (cached, persisted) instead of
    // a parallel Supabase fetch via progressDataService. Both serve the same data.
    // Falls back to a synthetic single-point entry from profile weight when empty.
    let chartHistory: { date: string; weight: number }[] = [];
    if (weightHistory.length > 0) {
      chartHistory = weightHistory;
    } else if (profileWeight && profileWeight > 0) {
      chartHistory = [
        {
          date: new Date().toISOString().split("T")[0],
          weight: profileWeight,
        },
      ];
    }

    // Current weight = most recently logged entry (sorted ascending → last = newest).
    const currentWeight =
      chartHistory.length > 0
        ? chartHistory[chartHistory.length - 1].weight
        : (profileWeight && profileWeight > 0 ? profileWeight : undefined);

    const startingWeight =
      chartHistory.length >= 2
        ? chartHistory[0].weight
        : (profileWeight && profileWeight > 0 ? profileWeight : currentWeight);

    return {
      currentWeight: currentWeight && currentWeight > 0 ? currentWeight : undefined,
      goalWeight: goalWeight && goalWeight > 0 ? goalWeight : undefined,
      startingWeight,
      weightHistory: chartHistory,
    };
  }, [healthMetrics, userProfile, calculatedMetrics, bodyAnalysis, weightHistory]);

  const caloriesConsumed = useMemo(() => {
    const consumedNutrition = useNutritionStore
      .getState()
      .getTodaysConsumedNutrition();
    return consumedNutrition.calories;
  }, [weeklyMealPlan, dailyMeals]);

  const workoutMinutes = useMemo(() => {
    const workout = todaysWorkoutInfo.workout;
    if (!workout) return 0;
    const progress = todaysData?.progress?.workoutProgress ?? 0;
    // Only count actual completed/in-progress minutes
    // If 100% done → full duration; if in progress → proportional; if 0% → 0
    return Math.round((workout.duration || 0) * (progress / 100));
  }, [todaysWorkoutInfo, todaysData]);

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
      // todaysData and weeklyProgress update reactively via useMemo

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
    userName,

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

    // Weight unit preference
    weightUnit,

    // Health sync functions
    syncHealthData,
    syncFromHealthConnect,
    // Calculated metrics
    calculatedMetrics,

    // Handlers
    handleRefresh,
    handleAddWater,
  };
};
