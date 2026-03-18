import { useState, useEffect, useRef, useMemo } from "react";
import { Animated, Platform, Share } from "react-native";
import { useAuth } from "./useAuth";
import { useProgressData } from "./useProgressData";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { completionTrackingService } from "../services/completionTracking";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import { useAnalyticsStore } from "../stores/analyticsStore";
import { useAchievementStore } from "../stores/achievementStore";
import { useFitnessStore } from "../stores/fitnessStore";
import { useNutritionStore } from "../stores/nutritionStore";

export const useProgressScreen = (navigation: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);

  // SSOT fix: read streak/totals directly from their canonical stores.
  // Previously a local `weeklyProgress` state was populated by
  // DataRetrievalService.getWeeklyProgress() and then used as the source for
  // streak badges, workoutsCompleted, etc. — creating a stale shadow of the
  // stores. Now each fact comes from exactly one store.

  // Streak — achievementStore is authoritative (updated after every workout/meal)
  const currentStreak = useAchievementStore((s) => s.currentStreak);

  // Workouts this week — fitnessStore.completedSessions (SSOT)
  const completedSessions = useFitnessStore((s) => s.completedSessions);
  const workoutsCompleted = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    const weekStart = d.toISOString().split("T")[0];
    return completedSessions.filter(
      (s) => s.type === "planned" && s.weekStart === weekStart
    ).length;
  }, [completedSessions]);

  // Meals completed this week — nutritionStore.mealProgress (SSOT)
  const mealProgress = useNutritionStore((s) => s.mealProgress);
  const mealsCompleted = useMemo(
    () => Object.values(mealProgress).filter((p) => p.progress === 100).length,
    [mealProgress]
  );

  // Weight history — analyticsStore (SSOT, populated by AnalyticsScreen Fix 6)
  const weightHistory = useAnalyticsStore((s) => s.weightHistory);

  const { user, isAuthenticated } = useAuth();

  const {
    progressEntries,
    progressLoading,
    progressError,
    analysisError,
    progressStats,
    statsError,
    trackBStatus,
    refreshAll,
  } = useProgressData();

  const { metrics: calculatedMetrics, hasCalculatedMetrics } = useCalculatedMetrics();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Keep ref to avoid stale closure in completionTracking callback
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const refreshProgressData = async () => {
    try {
      // Stores self-refresh via completionTrackingService/Zustand reactivity.
      // No need to call DataRetrievalService.loadAllData() — that just calls
      // fitnessStore.loadData() + nutritionStore.loadData() which are already
      // triggered by the completion tracking subscriber in useFitnessLogic.
      await refreshAll();
    } catch (error) {
      console.error("Failed to load progress data:", error);
    }
  };

  useEffect(() => {
    refreshRef.current = refreshProgressData;
  });

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await refreshProgressData();
      } catch (e) {
        console.error("Progress init error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const unsubscribe = completionTrackingService.subscribe((event) => {
      if (event.type === "meal" || event.type === "workout") {
        refreshRef.current();
      }
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    return () => { unsubscribe(); };
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } catch (error) {
      crossPlatformAlert("Error", "Failed to refresh progress data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddProgressEntry = () => { setShowWeightModal(true); };

  const handleShareProgress = async () => {
    const currentWeight = progressStats?.weightChange?.current;
    const weightDisplay = currentWeight ? `${currentWeight.toFixed(1)} kg` : "Not recorded";
    const bmi = calculatedMetrics?.calculatedBMI ? calculatedMetrics.calculatedBMI.toFixed(1) : "Not calculated";
    const message = `My FitAI Progress Update!\n\nCurrent Weight: ${weightDisplay}\nBMI: ${bmi}\n\nTrack your fitness journey with FitAI!`;

    try {
      await Share.share({ message, title: "My FitAI Progress" });
    } catch {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(message).catch(() => {});
      }
    }
  };

  // SSOT fix: achievements are derived from the same store-based values used
  // above instead of a stale `weeklyProgress` local state shadow.
  const achievements = useMemo(() => [
    {
      id: "first-workout",
      title: "First Workout",
      description: "Complete your first workout",
      iconName: "barbell-outline",
      date: workoutsCompleted > 0 ? "Completed" : "Not yet",
      completed: workoutsCompleted > 0,
      category: "Milestone",
      points: 25,
      rarity: "common",
    },
    {
      id: "first-meal",
      title: "First Meal",
      description: "Complete your first meal",
      iconName: "restaurant-outline",
      date: mealsCompleted > 0 ? "Completed" : "Not yet",
      completed: mealsCompleted > 0,
      category: "Nutrition",
      points: 15,
      rarity: "common",
    },
    {
      id: "meal-streak",
      title: "Meal Master",
      description: "Complete 5 meals in a row",
      iconName: "nutrition-outline",
      date: mealsCompleted >= 5 ? "Completed" : "Not yet",
      completed: mealsCompleted >= 5,
      category: "Nutrition",
      points: 50,
      rarity: "uncommon",
      progress: mealsCompleted,
      target: 5,
    },
    {
      id: "week-streak",
      title: "Week Warrior",
      description: "Maintain a 7-day streak",
      iconName: "flame-outline",
      date: currentStreak >= 7 ? "Completed" : "Not yet",
      completed: currentStreak >= 7,
      category: "Consistency",
      points: 100,
      rarity: "uncommon",
      progress: currentStreak,
      target: 7,
    },
    {
      id: "weight-logged",
      title: "Weight Tracker",
      description: "Log your first weight entry",
      iconName: "scale-outline",
      date: progressEntries.length > 0 ? "Completed" : "Not yet",
      completed: progressEntries.length > 0,
      category: "Milestone",
      points: 20,
      rarity: "common",
    },
    {
      id: "weight-5-entries",
      title: "Consistent Tracker",
      description: "Log weight 5 times",
      iconName: "analytics-outline",
      date: progressEntries.length >= 5 ? "Completed" : "Not yet",
      completed: progressEntries.length >= 5,
      category: "Milestone",
      points: 75,
      rarity: "uncommon",
      progress: progressEntries.length,
      target: 5,
    },
  ], [workoutsCompleted, mealsCompleted, currentStreak, progressEntries.length]);

  return {
    state: {
      refreshing,
      isLoading,
      showWeightModal,
      // weeklyProgress removed: consumers should read workoutsCompleted,
      // mealsCompleted, currentStreak directly from this hook instead of
      // an opaque object derived from a stale snapshot.
      weeklyProgress: {
        workoutsCompleted,
        mealsCompleted,
        streak: currentStreak,
      },
      user,
      isAuthenticated,
      progressLoading,
      progressError,
      analysisError,
      statsError,
      calculatedMetrics,
      hasCalculatedMetrics,
      fadeAnim,
      slideAnim,
      trackBStatus,
      progressEntries,
      progressStats,
      weightHistory,
    },
    computed: {
      achievements,
    },
    actions: {
      setShowWeightModal,
      onRefresh,
      handleAddProgressEntry,
      handleShareProgress,
    },
  };
};
