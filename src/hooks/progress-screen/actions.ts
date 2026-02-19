import { Alert, Share } from "react-native";
import {
  refreshProgressData,
  loadAllActivities,
  loadMoreActivities,
} from "./data";
import { WeeklyDataPoint } from "./types";

export const createActions = (
  user: any,
  selectedPeriod: string,
  progressStats: any,
  calculatedMetrics: any,
  activitiesPage: number,
  loadingMoreActivities: boolean,
  hasMoreActivities: boolean,
  refreshAll: () => Promise<void>,
  setRefreshing: (value: boolean) => void,
  setShowWeightModal: (value: boolean) => void,
  setTodaysData: (data: any) => void,
  setWeeklyProgress: (data: any) => void,
  setRecentActivities: (data: any[]) => void,
  setRealWeeklyData: (data: WeeklyDataPoint[]) => void,
  setAllActivities: (data: any[] | ((prev: any[]) => any[])) => void,
  setActivitiesPage: (page: number | ((prev: number) => number)) => void,
  setHasMoreActivities: (value: boolean) => void,
  setLoadingMoreActivities: (value: boolean) => void,
) => {
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
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

      Alert.alert("Refreshed", "Progress data has been updated!");
    } catch (error) {
      Alert.alert("Error", "Failed to refresh progress data");
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddProgressEntry = async () => {
    if (!user?.id) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to track progress.",
      );
      return;
    }

    setShowWeightModal(true);
  };

  const handleShareProgress = async () => {
    try {
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

      await Share.share({
        message,
        title: "My FitAI Progress",
      });
    } catch (error) {
      console.error("Error sharing progress:", error);
    }
  };

  const handleLoadMoreActivities = () => {
    loadMoreActivities(
      activitiesPage,
      loadingMoreActivities,
      hasMoreActivities,
      setLoadingMoreActivities,
      setAllActivities,
      setActivitiesPage,
      setHasMoreActivities,
    );
  };

  return {
    onRefresh,
    handleAddProgressEntry,
    handleShareProgress,
    loadMoreActivities: handleLoadMoreActivities,
  };
};
