import { useState, useRef } from "react";
import { Animated } from "react-native";
import { useAuth } from "../useAuth";
import { useProgressData } from "../useProgressData";
import { useCalculatedMetrics } from "../useCalculatedMetrics";
import { useHealthDataStore } from "../../stores/healthDataStore";

export const useProgressScreenState = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("week");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);

  const [weeklyProgress, setWeeklyProgress] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [realWeeklyData, setRealWeeklyData] = useState<any[]>([]);

  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);
  const [todaysData, setTodaysData] = useState<any>(null);

  const { user, isAuthenticated } = useAuth();

  const { metrics: healthMetrics, syncError } = useHealthDataStore((state) => ({
    metrics: state.metrics,
    syncError: state.syncError,
  }));
  const isWearableConnected = useHealthDataStore(
    (state) => state.isHealthKitAuthorized || state.isHealthConnectAuthorized,
  );

  const {
    progressEntries,
    progressLoading,
    progressError,
    analysisError,
    progressStats,
    statsError,
    statsLoading,
    progressGoals,
    trackBStatus,
    refreshAll,
  } = useProgressData();

  const { metrics: calculatedMetrics, hasCalculatedMetrics } =
    useCalculatedMetrics();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  return {
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
  };
};
