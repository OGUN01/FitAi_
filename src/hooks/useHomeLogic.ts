/**
 * useHomeLogic - Business logic for HomeScreen
 * Extracted to reduce HomeScreen.tsx complexity
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Platform, Animated, InteractionManager } from "react-native";
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
  useHydrationStore,
} from "../stores";
import { buildTodaysData } from "./progress-screen/data";
import { useProfileStore } from "../stores/profileStore";
import { completionTrackingService } from "../services/completionTracking";
import { analyticsDataService } from "../services/analyticsData";
import { resolveCurrentWeight } from "../services/currentWeight";
import {
  findCompletedSessionForWorkout,
  getCompletedSessionsForDate,
  hasCompletedSessionForDay,
} from "../utils/workoutIdentity";
import {
  getCurrentWeekStart,
  getLocalDateString,
  getLocalDayName,
} from "../utils/weekUtils";
import { type WeightUnit } from "../utils/units";

export const isHealthSnapshotFromToday = (
  lastUpdated?: string | null,
): boolean => {
  if (!lastUpdated) {
    return false;
  }

  return getLocalDateString(lastUpdated) === getLocalDateString();
};

export const useHomeLogic = () => {
  const { profile } = useDashboardIntegration();
  const { user, isGuestMode } = useAuth();
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const workoutPreferences = useProfileStore((s) => s.workoutPreferences);

  // Derived weight unit from user preferences
  const weightUnit: WeightUnit =
    personalInfo?.units === "imperial" ? "lbs" : "kg";

  // Stores
  const loadFitnessData = useFitnessStore((s) => s.loadData);
  const weeklyWorkoutPlan = useFitnessStore((s) => s.weeklyWorkoutPlan);
  const loadNutritionData = useNutritionStore((s) => s.loadData);
  const weeklyMealPlan = useNutritionStore((s) => s.weeklyMealPlan);
  const achievementStreak = useAchievementStore((s) => s.currentStreak);
  const initializeAchievements = useAchievementStore((s) => s.initialize);
  const achievementsInitialized = useAchievementStore((s) => s.isInitialized);
  const healthMetrics = useHealthDataStore((s) => s.metrics);
  const isHealthKitAuthorized = useHealthDataStore(
    (s) => s.isHealthKitAuthorized,
  );
  const isHealthConnectAuthorized = useHealthDataStore(
    (s) => s.isHealthConnectAuthorized,
  );
  const initializeHealthKit = useHealthDataStore((s) => s.initializeHealthKit);
  const syncHealthData = useHealthDataStore((s) => s.syncHealthData);
  const initializeHealthConnect = useHealthDataStore(
    (s) => s.initializeHealthConnect,
  );
  const syncFromHealthConnect = useHealthDataStore(
    (s) => s.syncFromHealthConnect,
  );
  const healthSettings = useHealthDataStore((s) => s.settings);
  const analyticsInitialized = useAnalyticsStore((s) => s.isInitialized);
  const initializeAnalytics = useAnalyticsStore((s) => s.initialize);
  const refreshAnalytics = useAnalyticsStore((s) => s.refreshAnalytics);
  const setHistoryData = useAnalyticsStore((s) => s.setHistoryData);
  const calorieHistory = useAnalyticsStore((s) => s.calorieHistory);

  // Hydration
  const waterIntakeML = useHydrationStore((s) => s.waterIntakeML);
  const waterGoal = useHydrationStore((s) => s.dailyGoalML);
  const hydrationAddWater = useHydrationStore((s) => s.addWater);
  const setHydrationGoal = useHydrationStore((s) => s.setDailyGoal);
  const checkAndResetIfNewDay = useHydrationStore(
    (s) => s.checkAndResetIfNewDay,
  );
  const syncHydrationWithSupabase = useHydrationStore(
    (s) => s.syncWithSupabase,
  );

  const { metrics: calculatedMetrics } = useCalculatedMetrics();

  const completedSessions = useFitnessStore((s) => s.completedSessions);
  const workoutProgress = useFitnessStore((s) => s.workoutProgress);
  const checkAndResetProgressIfNewDay = useFitnessStore(
    (s) => s.checkAndResetProgressIfNewDay,
  );
  const mealProgress = useNutritionStore((s) => s.mealProgress);
  const dailyMeals = useNutritionStore((s) => s.dailyMeals);
  const getTodaysConsumedNutrition = useNutritionStore(
    (s) => s.getTodaysConsumedNutrition,
  );
  const todaysConsumedNutrition = useMemo(
    () => getTodaysConsumedNutrition(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mealProgress, dailyMeals],
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isLoadingDataRef = useRef(false);
  // Keep a ref to the current user id so the subscription callback always reads
  // the latest value without needing to re-subscribe when user changes.
  const userIdRef = useRef(user?.id);
  useEffect(() => { userIdRef.current = user?.id; }, [user?.id]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const weightHistory = useAnalyticsStore((s) => s.weightHistory);

  // SSOT Fix 17: todaysData computed reactively from stores, not snapshotted
  // Include todayDateString so this recomputes if the date changes (e.g., midnight boundary)
  const todayDateString = getLocalDateString();
  const todaysData = useMemo(
    () => buildTodaysData(),
    [
      weeklyWorkoutPlan,
      workoutProgress,
      weeklyMealPlan,
      mealProgress,
      todayDateString,
    ],
  );
  // Sync hydration goal
  // NOTE: useNutritionTracking.ts also sets hydration goal — one of these should be removed
  useEffect(() => {
    if (calculatedMetrics?.dailyWaterML) {
      setHydrationGoal(calculatedMetrics.dailyWaterML);
    }
    checkAndResetIfNewDay();
    checkAndResetProgressIfNewDay();

    syncHydrationWithSupabase().catch((err) => {
      console.warn("[HomeScreen] Failed to sync hydration from Supabase:", err);
    });
  }, [
    calculatedMetrics?.dailyWaterML,
    checkAndResetIfNewDay,
    checkAndResetProgressIfNewDay,
    syncHydrationWithSupabase,
  ]);

  useEffect(() => {
    if (!user?.id || achievementsInitialized) {
      return;
    }

    initializeAchievements(user.id).catch((err) => {
      console.warn("[HomeScreen] Failed to initialize achievements:", err);
    });
  }, [user?.id, achievementsInitialized, initializeAchievements]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (isLoadingDataRef.current) return; // deduplicate concurrent loads
      isLoadingDataRef.current = true;
      try {
        if (!cancelled) {
          setIsLoading(true);
          setError(null);
        }
        await Promise.all([
          useFitnessStore.getState().loadData(),
          useNutritionStore.getState().loadData(),
        ]);
      } catch (err) {
        console.error("Load error:", err);
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load dashboard data",
          );
        }
      } finally {
        isLoadingDataRef.current = false;
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    // Defer data loading so UI renders first, then fetch
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      loadData();
    });

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    // Completion events update the stores; useMemo consumers re-render automatically.
    const unsubscribe = completionTrackingService.subscribe(() => {
      if (!isLoadingDataRef.current) {
        useFitnessStore.getState().loadData();
        useNutritionStore.getState().loadData();
      }
      if (userIdRef.current) {
        useAchievementStore.getState().reconcileWithCurrentData(userIdRef.current);
      }
    });
    return () => {
      cancelled = true;
      interactionTask.cancel();
      unsubscribe();
    };
  }, [fadeAnim, user?.id]);

  useEffect(() => {
    const analyticsTask = InteractionManager.runAfterInteractions(() => {
      const loadAnalytics = async () => {
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

        if (analyticsInitialized) {
          await refreshAnalytics();
        } else {
          await initializeAnalytics();
        }

        if (!user?.id) {
          return;
        }

        const weightData = await analyticsDataService.getWeightHistory(
          user.id,
          90,
        );
        setHistoryData(weightData, useAnalyticsStore.getState().calorieHistory);
      };

      loadAnalytics().catch((error) => {
        console.warn("[useHomeLogic] Failed to load analytics history:", error);
      });
    });

    return () => {
      analyticsTask.cancel();
    };
  }, [
    analyticsInitialized,
    healthSettings.healthConnectEnabled,
    healthSettings.healthKitEnabled,
    initializeAnalytics,
    initializeHealthConnect,
    initializeHealthKit,
    isHealthConnectAuthorized,
    isHealthKitAuthorized,
    refreshAnalytics,
    syncFromHealthConnect,
    syncHealthData,
    setHistoryData,
    user?.id,
  ]);

  // Memoized values
  const appCaloriesBurned = useMemo(
    () =>
      getCompletedSessionsForDate(completedSessions).reduce(
        (sum, s) => sum + (s.caloriesBurned ?? 0),
        0,
      ),
    [completedSessions],
  );

  const wearableConnected = isHealthKitAuthorized || isHealthConnectAuthorized;
  const hasFreshWearableMetrics = useMemo(
    () =>
      wearableConnected &&
      isHealthSnapshotFromToday(healthMetrics?.lastUpdated),
    [wearableConnected, healthMetrics?.lastUpdated],
  );

  const realCaloriesBurned = useMemo(() => {
    if (hasFreshWearableMetrics) {
      if (healthMetrics?.totalCalories && healthMetrics.totalCalories > 0) {
        return healthMetrics.totalCalories;
      }
      if (healthMetrics?.activeCalories && healthMetrics.activeCalories > 0) {
        return healthMetrics.activeCalories;
      }
    }
    return appCaloriesBurned;
  }, [
    hasFreshWearableMetrics,
    healthMetrics?.totalCalories,
    healthMetrics?.activeCalories,
    appCaloriesBurned,
  ]);

  const currentSteps = useMemo(
    () => (hasFreshWearableMetrics ? (healthMetrics?.steps ?? 0) : 0),
    [hasFreshWearableMetrics, healthMetrics?.steps],
  );

  const currentStepsSource = useMemo(
    () => (hasFreshWearableMetrics ? healthMetrics?.sources?.steps : undefined),
    [hasFreshWearableMetrics, healthMetrics?.sources?.steps],
  );

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
      isCompleted: !!completedSession,
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
    const resolvedCurrentWeight = resolveCurrentWeight({
      weightHistory: chartHistory,
      bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
    });
    const currentWeight = resolvedCurrentWeight.value ?? undefined;

    const startingWeight =
      chartHistory.length > 0 ? chartHistory[0].weight : currentWeight;

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
    const todaysCompletedDuration = getCompletedSessionsForDate(
      completedSessions,
    ).reduce((sum, session) => sum + (session.durationMinutes ?? 0), 0);
    if (todaysCompletedDuration > 0) {
      return todaysCompletedDuration;
    }
    const workout = todaysWorkoutInfo.workout;
    if (!workout) return 0;
    const progress = todaysData?.progress?.workoutProgress ?? 0;
    return Math.round((workout.duration || 0) * (progress / 100));
  }, [todaysWorkoutInfo, todaysData, completedSessions]);

  const weekCalendarData = useMemo(() => {
    const startOfWeek = new Date(`${getCurrentWeekStart()}T00:00:00`);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayName = getLocalDayName(date);
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
        isRestDay: weeklyWorkoutPlan ? !!workout?.isRestDay || !workout : false,
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
      // todaysData updates reactively via useMemo

      if (user?.id) {
        const weightData = await analyticsDataService.getWeightHistory(
          user.id,
          90,
        );
        setHistoryData(weightData, calorieHistory);
      }

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
    calorieHistory,
    isHealthKitAuthorized,
    isHealthConnectAuthorized,
    setHistoryData,
    syncHealthData,
    syncFromHealthConnect,
    user?.id,
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
    hasFreshWearableMetrics,
    realCaloriesBurned,
    currentSteps,
    currentStepsSource,
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
    // Workout preferences (live SSOT for user-selected duration)
    workoutPreferences,
    // Calculated metrics
    calculatedMetrics,

    // Handlers
    handleRefresh,
    handleAddWater,
  };
};
