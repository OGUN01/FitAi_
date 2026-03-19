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
  useHydrationStore,
} from "../stores";
import { buildTodaysData } from "./progress-screen/data";
import { useProfileStore } from "../stores/profileStore";
import { completionTrackingService } from "../services/completionTracking";
import { analyticsDataService } from "../services/analyticsData";
import {
  findCompletedSessionForWorkout,
  getCompletedSessionsForDate,
  hasCompletedSessionForDay,
} from "../utils/workoutIdentity";
import { getCurrentWeekStart } from "../utils/weekUtils";

export const useHomeLogic = () => {
  const { getUserStats, profile } = useDashboardIntegration();
  const { user, isGuestMode } = useAuth();
  const { bodyAnalysis, personalInfo } = useProfileStore();

  // Derived weight unit from user preferences
  const weightUnit: "kg" | "lbs" =
    personalInfo?.units === "imperial" ? "lbs" : "kg";

  // Stores
  const { loadData: loadFitnessData, weeklyWorkoutPlan } = useFitnessStore();
  const {
    loadData: loadNutritionData,
    dailyMeals,
    weeklyMealPlan,
  } = useNutritionStore();
  const {
    currentStreak: achievementStreak,
    initialize: initializeAchievements,
    isInitialized: achievementsInitialized,
  } = useAchievementStore();
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
    setHistoryData,
    weightHistory,
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
  const todaysConsumedNutrition = useNutritionStore((s) =>
    s.getTodaysConsumedNutrition(),
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SSOT Fix 17: todaysData computed reactively from stores, not snapshotted
  const todaysData = useMemo(
    () => buildTodaysData(),
    [weeklyWorkoutPlan, workoutProgress, weeklyMealPlan, mealProgress],
  );
  // SSOT Fix 17: weeklyProgress derived from completedSessions + mealProgress
  const weeklyProgress = useMemo(() => {
    const weekStart = getCurrentWeekStart();
    return {
      workoutsCompleted: completedSessions.filter(
        (s) => s.type === "planned" && s.weekStart === weekStart,
      ).length,
      totalWorkouts: weeklyWorkoutPlan?.workouts.length ?? 0,
      mealsCompleted: Object.values(mealProgress).filter(
        (p) => p.progress === 100,
      ).length,
      totalMeals: weeklyMealPlan?.meals.length ?? 0,
      streak: achievementStreak,
    };
  }, [
    completedSessions,
    mealProgress,
    weeklyWorkoutPlan,
    weeklyMealPlan,
    achievementStreak,
  ]);

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
    if (!user?.id || isGuestMode) return;
    analyticsDataService
      .getWeightHistory(user.id, 90)
      .then((weightData) => {
        if (weightData.length > 0) {
          const analyticsState = useAnalyticsStore.getState();
          setHistoryData(weightData, analyticsState.calorieHistory);
        }
      })
      .catch((err) => {
        console.warn("[HomeScreen] Failed to fetch weight history:", err);
      });
  }, [user?.id]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await Promise.all([
          useFitnessStore.getState().loadData(),
          useNutritionStore.getState().loadData(),
        ]);
        if (Platform.OS === "ios" && healthSettings.healthKitEnabled) {
          isHealthKitAuthorized ? syncHealthData() : initializeHealthKit();
        } else if (
          Platform.OS === "android" &&
          healthSettings.healthConnectEnabled
        ) {
          isHealthConnectAuthorized
            ? syncFromHealthConnect(7)
            : initializeHealthConnect();
        }
        analyticsInitialized ? refreshAnalytics() : initializeAnalytics();
        initializeSubscription();
        if (user?.id && !achievementsInitialized) {
          useAchievementStore.getState().initialize(user.id);
        }
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
    // Completion events update the stores; useMemo consumers re-render automatically.
    const unsubscribe = completionTrackingService.subscribe(() => {
      useFitnessStore.getState().loadData();
      useNutritionStore.getState().loadData();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Memoized values
  const userStats = useMemo(() => getUserStats() || {}, [getUserStats]);

  const appCaloriesBurned = useMemo(
    () =>
      getCompletedSessionsForDate(completedSessions).reduce(
        (sum, s) => sum + (s.caloriesBurned ?? 0),
        0,
      ),
    [completedSessions],
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
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayMon = tidx === 0 ? 6 : tidx - 1;
    const isRest =
      (hasPlan &&
        fs.weeklyWorkoutPlan?.restDays?.some((d: number | string) =>
          typeof d === "string" ? d === days[tidx] : d === todayMon,
        )) ||
      false;
    const wType = !hasPlan
      ? "none"
      : isRest
        ? "rest"
        : (w?.category ?? "workout");
    const dStatus = !hasPlan
      ? "No Plan"
      : isRest
        ? "Rest Day"
        : w?.category
          ? `${w.category[0].toUpperCase()}${w.category.slice(1)} Day`
          : "Workout Day";
    const completedSession = w
      ? findCompletedSessionForWorkout({
          completedSessions,
          workout: w,
          plan: weeklyWorkoutPlan,
          weekStart: getCurrentWeekStart(),
        })
      : null;
    return {
      workout: w,
      hasWorkout: !!w,
      isCompleted:
        !!completedSession || (todaysData?.progress?.workoutProgress ?? 0) === 100,
      hasWeeklyPlan: hasPlan,
      isRestDay: isRest,
      workoutType: wType,
      dayStatus: dStatus,
    };
  }, [todaysData, weeklyWorkoutPlan, completedSessions]);

  const userAge = useMemo(() => {
    // SSOT: profileStore.personalInfo is authoritative (onboarding_data); userStore profile is legacy fallback
    return personalInfo?.age || profile?.personalInfo?.age;
  }, [personalInfo, profile]);

  const userName = useMemo(() => {
    // SSOT: profileStore.personalInfo is authoritative; compute from first+last, fallback to userStore
    const profileName =
      `${personalInfo?.first_name || ""} ${personalInfo?.last_name || ""}`.trim();
    return (
      profileName || personalInfo?.name || profile?.personalInfo?.name || ""
    );
  }, [personalInfo, profile]);

  const weightData = useMemo(() => {
    const goalWeight = bodyAnalysis?.target_weight_kg;

    const chartHistory = weightHistory.length > 0 ? weightHistory : [];

    const currentWeight =
      chartHistory.length > 0
        ? chartHistory[chartHistory.length - 1].weight
        : undefined;

    const startingWeight =
      chartHistory.length >= 2 ? chartHistory[0].weight : currentWeight;

    return {
      currentWeight:
        currentWeight && currentWeight > 0 ? currentWeight : undefined,
      goalWeight: goalWeight && goalWeight > 0 ? goalWeight : undefined,
      startingWeight,
      weightHistory: chartHistory,
    };
  }, [bodyAnalysis, weightHistory]);

  const caloriesConsumed = useMemo(() => {
    return todaysConsumedNutrition.calories;
  }, [todaysConsumedNutrition]);

  const workoutMinutes = useMemo(() => {
    const todaysCompletedDuration = getCompletedSessionsForDate(completedSessions)
      .reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0);
    if (todaysCompletedDuration > 0) {
      return todaysCompletedDuration;
    }
    const workout = todaysWorkoutInfo.workout;
    if (!workout) return 0;
    const progress = todaysData?.progress?.workoutProgress ?? 0;
    // Only count actual completed/in-progress minutes
    // If 100% done → full duration; if in progress → proportional; if 0% → 0
    return Math.round((workout.duration || 0) * (progress / 100));
  }, [todaysWorkoutInfo, todaysData, completedSessions]);

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
      const weekStart = getCurrentWeekStart();

      return {
        date,
        hasWorkout: !!workout && !workout.isRestDay,
        workoutCompleted: hasCompletedSessionForDay({
          completedSessions,
          dayKey: dayName,
          weekStart,
        }),
        isRestDay: workout?.isRestDay || i === 0,
      };
    });
  }, [weeklyWorkoutPlan, completedSessions]);

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
