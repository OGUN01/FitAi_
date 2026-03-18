import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { completionTrackingService } from "../../services/completionTracking";
import { useProgressScreenState } from "./state";
import { refreshProgressData, loadAllActivities } from "./data";
import {
  getPeriods,
  computeStats,
  getWeeklyData,
} from "./computed";
// SSOT fix: computeAchievements was removed from computed.ts — achievements
// now come from achievementStore. Import it from there.
import { useAchievementStore } from "../../stores/achievementStore";
import { useAnalyticsStore } from "../../stores/analyticsStore";
import { createActions } from "./actions";
import { UseProgressScreenReturn } from "./types";

export const useProgressScreen = (navigation: any): UseProgressScreenReturn => {
  const stateValues = useProgressScreenState();

  const loadMoreTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const {
    selectedPeriod,
    setSelectedPeriod,
    refreshing,
    setRefreshing,
    isLoading,
    setIsLoading,
    showWeightModal,
    setShowWeightModal,
    showAnalytics,
    setShowAnalytics,
    showAllActivities,
    setShowAllActivities,
    weeklyProgress,
    setWeeklyProgress,
    recentActivities,
    setRecentActivities,
    realWeeklyData,
    setRealWeeklyData,
    allActivities,
    setAllActivities,
    activitiesPage,
    setActivitiesPage,
    loadingMoreActivities,
    setLoadingMoreActivities,
    hasMoreActivities,
    setHasMoreActivities,
    todaysData,
    setTodaysData,
    user,
    isAuthenticated,
    healthMetrics,
    syncError,
    isWearableConnected,
    progressEntries,
    progressLoading,
    progressError,
    analysisError,
    progressStats,
    statsError,
    statsLoading,
    progressGoals,
    calculatedMetrics,
    hasCalculatedMetrics,
    fadeAnim,
    slideAnim,
    trackBStatus,
    refreshAll,
  } = stateValues;

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await refreshProgressData(
          setTodaysData,
          setWeeklyProgress,
          setRecentActivities,
          setRealWeeklyData,
        );
        loadAllActivities(
          setAllActivities,
          setActivitiesPage,
          setHasMoreActivities,
        );
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const unsubscribe = completionTrackingService.subscribe((event) => {

      if (event.type === "meal" || event.type === "workout") {
        refreshProgressData(
          setTodaysData,
          setWeeklyProgress,
          setRecentActivities,
          setRealWeeklyData,
        );
      }
    });

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

    return () => {
      unsubscribe();
      if (loadMoreTimeoutRef.current !== undefined) {
        clearTimeout(loadMoreTimeoutRef.current);
      }
    };
  }, []);

  const periods = getPeriods();
  const stats = computeStats(progressStats, calculatedMetrics, progressGoals);
  // SSOT fix: computeAchievements() was deleted from computed.ts.
  // achievementStore is the single source of truth for all achievements.
  const rawAchievements = useAchievementStore.getState().getRecentAchievements(20);
  const achievements = rawAchievements.map((a: any) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    iconName: a.icon || 'trophy',
    date: a.earnedAt || new Date().toISOString(),
    completed: !!a.isEarned,
    category: a.category || 'general',
    points: a.points || 0,
    rarity: a.rarity || 'common',
    progress: a.currentProgress,
    target: a.targetValue,
  }));
  const weeklyData = getWeeklyData(realWeeklyData);

  const actions = createActions(
    user,
    selectedPeriod,
    progressStats,
    calculatedMetrics,
    activitiesPage,
    loadingMoreActivities,
    hasMoreActivities,
    refreshAll,
    setRefreshing,
    setShowWeightModal,
    setTodaysData,
    setWeeklyProgress,
    setRecentActivities,
    setRealWeeklyData,
    setAllActivities,
    setActivitiesPage,
    setHasMoreActivities,
    setLoadingMoreActivities,
  );

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
      // SSOT: weight history is cached in analyticsStore by Fix 6
      weightHistory: useAnalyticsStore.getState().weightHistory,
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
      ...actions,
      loadMoreActivities: () => {
        loadMoreTimeoutRef.current = actions.loadMoreActivities();
      },
    },
  };
};

export * from "./types";
