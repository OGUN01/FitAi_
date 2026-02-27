import { useState, useEffect, useRef, useMemo } from "react";
import { Animated, Platform, Share } from "react-native";
import { useAuth } from "../hooks/useAuth";
import { useProgressData } from "../hooks/useProgressData";
import { useCalculatedMetrics } from "../hooks/useCalculatedMetrics";
import { useHealthDataStore } from "../stores/healthDataStore";
import DataRetrievalService from "../services/dataRetrieval";
import { completionTrackingService } from "../services/completionTracking";

import { crossPlatformAlert } from "../utils/crossPlatformAlert";
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type TimeoutId = ReturnType<typeof setTimeout> | null;
export const useProgressScreen = (navigation: any) => {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Real data from stores
  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [realWeeklyData, setRealWeeklyData] = useState<any[]>([]);

  // Activities pagination
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const ACTIVITIES_PER_PAGE = 10;
  const [todaysData, setTodaysData] = useState<any>(null);

  // Authentication and user data
  const { user, isAuthenticated } = useAuth();

  // Wearable health data from Health Connect / HealthKit - use separate selectors to avoid object creation
  const healthMetrics = useHealthDataStore((state) => state.metrics);
  const syncError = useHealthDataStore((state) => state.syncError);
  const isWearableConnected = useHealthDataStore(
    (state) => state.isHealthKitAuthorized || state.isHealthConnectAuthorized,
  );
  // const healthSettings = useHealthDataStore((state) => state.settings); // Unused

  // Real progress data with Track B integration
  const {
    progressEntries,
    progressLoading,
    progressError,
    // loadProgressEntries, // Unused
    // bodyAnalysis, // Unused
    analysisError,
    progressStats,
    statsError,
    statsLoading,
    progressGoals,
    // createProgressEntry, // Unused
    trackBStatus,
    refreshAll,
    // clearErrors, // Unused
  } = useProgressData();

  // Use calculated metrics from onboarding - NO FALLBACKS
  const { metrics: calculatedMetrics, hasCalculatedMetrics } =
    useCalculatedMetrics();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Bug 1 fix: ref to track setTimeout for cleanup on unmount
  const loadMoreTimeoutRef = useRef<TimeoutId>(null);

  // Bug 2 fix: ref to hold latest refreshProgressData to avoid stale closures
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  // Generate weekly chart data from activities
  const generateWeeklyChartData = (activities: any[]) => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weekData = days.map((day) => ({
      day,
      workouts: 0,
      meals: 0,
      calories: 0,
      duration: 0,
    }));

    activities.forEach((activity) => {
      const activityDate = new Date(activity.completedAt);
      const dayIndex = (activityDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0

      if (activity.type === "workout") {
        weekData[dayIndex].workouts += 1;
        weekData[dayIndex].calories += activity.calories || 0;
        weekData[dayIndex].duration += activity.duration || 0;
      } else if (activity.type === "meal") {
        weekData[dayIndex].meals += 1;
        weekData[dayIndex].calories += activity.calories || 0;
      }
    });

    return weekData;
  };

  // Function to refresh progress data
  const refreshProgressData = async () => {
    try {
      // Load persisted data into stores
      await DataRetrievalService.loadAllData();

      // Pull real data from centralized retrieval service
      const today = DataRetrievalService.getTodaysData();
      setTodaysData(today);

      const weekly = DataRetrievalService.getWeeklyProgress();
      setWeeklyProgress(weekly);

      const activities = DataRetrievalService.getRecentActivities(50);
      setRecentActivities(activities);

      // Build weekly chart data from activities
      const weekData = generateWeeklyChartData(activities);
      setRealWeeklyData(weekData);
    } catch (error) {
      console.error("Failed to load progress data:", error);
    }
  };

  const loadAllActivities = () => {
    // Load all activities for the modal
    const allActivitiesData = DataRetrievalService.getRecentActivities(100); // Get more activities
    setAllActivities(allActivitiesData);
    setActivitiesPage(1);
    setHasMoreActivities(allActivitiesData.length >= ACTIVITIES_PER_PAGE);
  };

  const loadMoreActivities = () => {
    if (loadingMoreActivities || !hasMoreActivities) return;

    setLoadingMoreActivities(true);

    // Bug 1 fix: store timeout ID in ref for cleanup
    loadMoreTimeoutRef.current = setTimeout(() => {
      const startIndex = activitiesPage * ACTIVITIES_PER_PAGE;
      const moreActivities = DataRetrievalService.getRecentActivities(
        200,
      ).slice(startIndex, startIndex + ACTIVITIES_PER_PAGE);

      if (moreActivities.length > 0) {
        setAllActivities((prev) => [...prev, ...moreActivities]);
        setActivitiesPage((prev) => prev + 1);
        setHasMoreActivities(moreActivities.length === ACTIVITIES_PER_PAGE);
      } else {
        setHasMoreActivities(false);
      }

      setLoadingMoreActivities(false);
    }, 1000);
  };

  // Load real data on mount and subscribe to completion events
  // Bug 2 fix: keep ref in sync with latest refreshProgressData on every render
  useEffect(() => {
    refreshRef.current = refreshProgressData;
  });

  useEffect(() => {
    // Initial data load
    // Initial data load
    const init = async () => {
      setIsLoading(true);
      try {
        await refreshProgressData();
        loadAllActivities();
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    // Subscribe to completion events for real-time updates
    const unsubscribe = completionTrackingService.subscribe((event) => {

      // Refresh progress data when meals or workouts are completed
      if (event.type === "meal" || event.type === "workout") {
        // Bug 2 fix: call via ref to avoid stale closure
        refreshRef.current();
      }
    });

    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      // Bug 1 fix: clear pending timeout on unmount
      if (loadMoreTimeoutRef.current !== null) {
        clearTimeout(loadMoreTimeoutRef.current);
        loadMoreTimeoutRef.current = null;
      }
    };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
      await refreshProgressData();

      // Refresh all activities for modal
      loadAllActivities();

      // Bug 4 fix: removed Alert.alert — pull-to-refresh has visual feedback via RefreshControl spinner
    } catch (error) {
      crossPlatformAlert("Error", "Failed to refresh progress data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddProgressEntry = async () => {
    // Allow both authenticated and guest users to open the weight modal
    setShowWeightModal(true);
  };

  const handleShareProgress = async () => {
    const currentWeight = progressStats?.weightChange?.current;
    const weightDisplay = currentWeight
      ? `${currentWeight.toFixed(1)} kg`
      : "Not recorded";
    const bmi = calculatedMetrics?.calculatedBMI
      ? calculatedMetrics.calculatedBMI.toFixed(1)
      : "Not calculated";

    const message = `My FitAI Progress Update!

Current Weight: ${weightDisplay}
BMI: ${bmi}
Period: ${
      selectedPeriod === "week"
        ? "This Week"
        : selectedPeriod === "month"
          ? "This Month"
          : "This Year"
    }

Track your fitness journey with FitAI!`;

    try {
      await Share.share({
        message,
        title: "My FitAI Progress",
      });
    } catch (error) {
      // Share API may fail on web or unsupported browsers — fall back to clipboard
      try {
        if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          crossPlatformAlert("Copied!", "Progress summary copied to clipboard.");
        } else {
          crossPlatformAlert("Share Unavailable", "Unable to share on this device.");
        }
      } catch (clipboardError) {
        console.error("Clipboard fallback failed:", clipboardError);
        crossPlatformAlert("Share Unavailable", "Unable to share on this device.");
      }
    }
  };

  const periods = [
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "year", label: "Year" },
  ];

  // Real stats from progress data
  const stats = progressStats
    ? {
        weight: {
          current: progressStats.weightChange.current,
          change: progressStats.weightChange.change,
          unit: "kg",
          goal: calculatedMetrics?.targetWeightKg,
          trend:
            progressStats.weightChange.change < 0
              ? "decreasing"
              : progressStats.weightChange.change > 0
                ? "increasing"
                : "stable",
          weeklyAvg: progressStats.weightChange.current,
        },
        bodyFat: {
          current: progressStats.bodyFatChange.current,
          change: progressStats.bodyFatChange.change,
          unit: "%",
          goal: calculatedMetrics?.ideal_body_fat_max,
          trend:
            progressStats.bodyFatChange.change < 0
              ? "decreasing"
              : progressStats.bodyFatChange.change > 0
                ? "increasing"
                : "stable",
          weeklyAvg: progressStats.bodyFatChange.current,
        },
        muscle: {
          current: progressStats.muscleChange.current,
          change: progressStats.muscleChange.change,
          unit: "kg",
          goal: progressGoals?.target_muscle_mass_kg ?? null,
          trend:
            progressStats.muscleChange.change < 0
              ? "decreasing"
              : progressStats.muscleChange.change > 0
                ? "increasing"
                : "stable",
          weeklyAvg: progressStats.muscleChange.current,
        },
        bmi: {
          current: calculatedMetrics?.calculatedBMI || null,
          change: null,
          unit: "",
          goal: null,
          trend: "stable",
          weeklyAvg: calculatedMetrics?.calculatedBMI || null,
        },
      }
    : {
        weight: {
          current: null,
          change: null,
          unit: "kg",
          goal: calculatedMetrics?.targetWeightKg,
          trend: "stable",
          weeklyAvg: null,
        },
        bodyFat: {
          current: null,
          change: null,
          unit: "%",
          goal: null,
          trend: "stable",
          weeklyAvg: null,
        },
        muscle: {
          current: null,
          change: null,
          unit: "kg",
          goal: null,
          trend: "stable",
          weeklyAvg: null,
        },
        bmi: {
          current: calculatedMetrics?.calculatedBMI || null,
          change: null,
          unit: "",
          goal: null,
          trend: "stable",
          weeklyAvg: null,
        },
      };

  // Real achievements based on actual user progress
  // Bug 3 fix: memoize achievements to avoid recomputing every render
  const achievements = useMemo(() => [
    {
      id: "first-workout",
      title: "First Workout",
      description: "Complete your first workout",
      iconName: "barbell-outline",
      date: weeklyProgress?.workoutsCompleted > 0 ? "Completed" : "Not yet",
      completed: weeklyProgress?.workoutsCompleted > 0,
      category: "Milestone",
      points: 25,
      rarity: "common",
    },
    {
      id: "first-meal",
      title: "First Meal",
      description: "Complete your first meal",
      iconName: "restaurant-outline",
      date: weeklyProgress?.mealsCompleted > 0 ? "Completed" : "Not yet",
      completed: weeklyProgress?.mealsCompleted > 0,
      category: "Nutrition",
      points: 15,
      rarity: "common",
    },
    {
      id: "meal-streak",
      title: "Meal Master",
      description: "Complete 5 meals in a row",
      iconName: "nutrition-outline",
      date: weeklyProgress?.mealsCompleted >= 5 ? "Completed" : "Not yet",
      completed: weeklyProgress?.mealsCompleted >= 5,
      category: "Nutrition",
      points: 50,
      rarity: "uncommon",
      progress: weeklyProgress?.mealsCompleted,
      target: 5,
    },
    {
      id: "nutrition-week",
      title: "Nutrition Week",
      description: "Complete 21 meals (full week)",
      iconName: "star-outline",
      date: weeklyProgress?.mealsCompleted >= 21 ? "Completed" : "Not yet",
      completed: weeklyProgress?.mealsCompleted >= 21,
      category: "Nutrition",
      points: 100,
      rarity: "rare",
      progress: weeklyProgress?.mealsCompleted,
      target: 21,
    },
    {
      id: "week-streak",
      title: "Week Warrior",
      description: "Maintain a 7-day streak",
      iconName: "flame-outline",
      date: weeklyProgress?.streak >= 7 ? "Completed" : "Not yet",
      completed: weeklyProgress?.streak >= 7,
      category: "Consistency",
      points: 100,
      rarity: "uncommon",
      progress: weeklyProgress?.streak,
      target: 7,
    },
    {
      id: "calorie-crusher",
      title: "Calorie Crusher",
      description: "Burn 1000+ calories in workouts",
      iconName: "flame-outline",
      date:
        todaysData?.totalCaloriesBurned >= 1000
          ? "Completed"
          : "Not yet",
      completed: todaysData?.totalCaloriesBurned >= 1000,
      category: "Fitness",
      points: 150,
      rarity: "rare",
      progress: todaysData?.totalCaloriesBurned ?? 0,
      target: 1000,
    },
  ], [weeklyProgress, todaysData]);

  const weeklyData =
    realWeeklyData.length > 0
      ? realWeeklyData
      : [
          { day: "Mon", workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: "Tue", workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: "Wed", workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: "Thu", workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: "Fri", workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: "Sat", workouts: 0, meals: 0, calories: 0, duration: 0 },
          { day: "Sun", workouts: 0, meals: 0, calories: 0, duration: 0 },
        ];

  return {
    state: {
      selectedPeriod,
      refreshing,
      isLoading,
      showWeightModal,
      showAnalytics,
      showAllActivities,
      weeklyProgress,
      recentActivities,
      realWeeklyData,
      allActivities,
      activitiesPage,
      loadingMoreActivities,
      hasMoreActivities,
      todaysData,
      user,
      isAuthenticated,
      healthMetrics,
      syncError,
      isWearableConnected,
      progressLoading,
      progressError,
      analysisError,
      statsError,
      statsLoading,
      calculatedMetrics,
      hasCalculatedMetrics,
      fadeAnim,
      slideAnim,
      trackBStatus,
      progressEntries,
      progressStats,
    },
    computed: {
      periods,
      stats,
      achievements,
      weeklyData,
    },
    actions: {
      setSelectedPeriod,
      setRefreshing,
      setShowWeightModal,
      setShowAnalytics,
      setShowAllActivities,
      onRefresh,
      handleAddProgressEntry,
      handleShareProgress,
      loadMoreActivities,
    },
  };
};
