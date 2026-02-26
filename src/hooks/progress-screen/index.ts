import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import { completionTrackingService } from "../../services/completionTracking";
import { useProgressScreenState } from "./state";
import { refreshProgressData, loadAllActivities } from "./data";
import {
  getPeriods,
  computeStats,
  computeAchievements,
  getWeeklyData,
} from "./computed";
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
  const achievements = computeAchievements(weeklyProgress);
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
