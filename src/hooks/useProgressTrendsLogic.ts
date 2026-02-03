import { useState, useEffect, useCallback, useMemo } from "react";
import { useUserStore } from "../stores/userStore";
import { useAuthStore } from "../stores/authStore";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { analyticsDataService, DailyMetrics } from "../services/analyticsData";
import { haptics } from "../utils/haptics";

export type TrendPeriod = "week" | "month" | "quarter" | "year";

export interface TrendData {
  labels: string[];
  data: number[];
  min: number;
  max: number;
  avg: number;
  change: number;
  changePercent: number;
}

export const useProgressTrendsLogic = () => {
  // State
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>("month");
  const [refreshing, setRefreshing] = useState(false);
  const [metricsHistory, setMetricsHistory] = useState<DailyMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  // Stores
  const { profile } = useUserStore();
  const { user } = useAuthStore();
  const { metrics: calculatedMetrics } = useCalculatedMetrics();

  // Load metrics history
  const loadMetrics = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const periodDays =
        selectedPeriod === "week"
          ? 7
          : selectedPeriod === "month"
            ? 30
            : selectedPeriod === "quarter"
              ? 90
              : 365;

      const data = await analyticsDataService.loadMetricsHistory(
        user.id,
        periodDays,
      );
      setMetricsHistory(data);
    } catch (error) {
      console.error("Failed to load metrics history:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedPeriod]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Calculate trend data
  const weightTrend = useMemo((): TrendData | null => {
    const weightData = metricsHistory.filter((m) => m.weightKg !== null);
    if (weightData.length < 2) return null;

    const weights = weightData.map((m) => m.weightKg!);
    const labels = weightData.map((m) =>
      new Date(m.metricDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );

    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
    const change = weights[weights.length - 1] - weights[0];
    const changePercent = (change / weights[0]) * 100;

    return { labels, data: weights, min, max, avg, change, changePercent };
  }, [metricsHistory]);

  const calorieTrend = useMemo((): TrendData | null => {
    const calorieData = metricsHistory.filter(
      (m) => m.caloriesConsumed !== null,
    );
    if (calorieData.length < 2) return null;

    const calories = calorieData.map((m) => m.caloriesConsumed!);
    const labels = calorieData.map((m) =>
      new Date(m.metricDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    );

    const min = Math.min(...calories);
    const max = Math.max(...calories);
    const avg = calories.reduce((a, b) => a + b, 0) / calories.length;
    const change = calories[calories.length - 1] - calories[0];
    const changePercent = (change / calories[0]) * 100;

    return { labels, data: calories, min, max, avg, change, changePercent };
  }, [metricsHistory]);

  const workoutTrend = useMemo(() => {
    const totalWorkouts = metricsHistory.reduce(
      (sum, m) => sum + (m.workoutsCompleted || 0),
      0,
    );
    const avgPerDay =
      metricsHistory.length > 0 ? totalWorkouts / metricsHistory.length : 0;

    return { total: totalWorkouts, avgPerDay };
  }, [metricsHistory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await loadMetrics();
    setRefreshing(false);
  };

  const handlePeriodChange = (period: TrendPeriod) => {
    haptics.light();
    setSelectedPeriod(period);
  };

  return {
    selectedPeriod,
    refreshing,
    loading,
    metricsHistory,
    profile,
    calculatedMetrics,
    weightTrend,
    calorieTrend,
    workoutTrend,
    handleRefresh,
    handlePeriodChange,
  };
};
