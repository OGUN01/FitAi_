import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuthStore } from "../stores/authStore";
import { useCalculatedMetrics } from "./useCalculatedMetrics";
import { useAnalyticsStore } from "../stores/analyticsStore";
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
  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>("month");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user } = useAuthStore();
  const { metrics: calculatedMetrics } = useCalculatedMetrics();

  // SSOT Fix 21: DailyMetrics lives in analyticsStore, not local state.
  // All consumers share the same cache. Supabase is only hit when the cache
  // is empty or the requested period is wider than what was last fetched.
  const metricsHistory = useAnalyticsStore((s) => s.dailyMetricsHistory);
  const cachedPeriod = useAnalyticsStore((s) => s.dailyMetricsHistoryPeriod);
  const setDailyMetricsHistory = useAnalyticsStore(
    (s) => s.setDailyMetricsHistory,
  );

  const periodDays =
    selectedPeriod === "week"
      ? 7
      : selectedPeriod === "month"
        ? 30
        : selectedPeriod === "quarter"
          ? 90
          : 365;

  const selectedMetricsHistory = useMemo(() => {
    if (metricsHistory.length === 0) {
      return [];
    }

    const sortedHistory = [...metricsHistory].sort(
      (a, b) =>
        new Date(a.metricDate).getTime() - new Date(b.metricDate).getTime(),
    );
    const latestMetricDate = new Date(
      sortedHistory[sortedHistory.length - 1].metricDate,
    );
    const cutoffDate = new Date(latestMetricDate);
    cutoffDate.setHours(0, 0, 0, 0);
    cutoffDate.setDate(cutoffDate.getDate() - (periodDays - 1));

    return sortedHistory.filter(
      (metric) => new Date(metric.metricDate).getTime() >= cutoffDate.getTime(),
    );
  }, [metricsHistory, periodDays]);

  const loadMetrics = useCallback(
    async (force = false) => {
      if (!user?.id) return;
      // Skip the round-trip if we already have enough data cached
      if (!force && metricsHistory.length > 0 && cachedPeriod >= periodDays)
        return;

      setLoading(true);
      try {
        const data = await analyticsDataService.loadMetricsHistory(
          user.id,
          periodDays,
        );
        setDailyMetricsHistory(data, periodDays);
      } catch (error) {
        console.error("Failed to load metrics history:", error);
      } finally {
        setLoading(false);
      }
    },
    [user?.id, periodDays, metricsHistory.length, cachedPeriod, setDailyMetricsHistory],
  );

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Derived trend calculations — all read from the SSOT metricsHistory
  const weightTrend = useMemo((): TrendData | null => {
    const weightData = selectedMetricsHistory.filter((m) => m.weightKg !== null);
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
  }, [selectedMetricsHistory]);

  const calorieTrend = useMemo((): TrendData | null => {
    const calorieData = selectedMetricsHistory.filter(
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
  }, [selectedMetricsHistory]);

  const workoutTrend = useMemo(() => {
    const totalWorkouts = selectedMetricsHistory.reduce(
      (sum, m) => sum + (m.workoutsCompleted || 0),
      0,
    );
    const avgPerDay =
      selectedMetricsHistory.length > 0
        ? totalWorkouts / selectedMetricsHistory.length
        : 0;

    return { total: totalWorkouts, avgPerDay };
  }, [selectedMetricsHistory]);

  const handleRefresh = async () => {
    setRefreshing(true);
    haptics.light();
    await loadMetrics(true);
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
    metricsHistory: selectedMetricsHistory,
    // SSOT: callers should use profileStore.personalInfo/bodyAnalysis directly;
    // calculatedMetrics provides the authoritative computed health stats (BMI/BMR/TDEE)
    calculatedMetrics,
    weightTrend,
    calorieTrend,
    workoutTrend,
    handleRefresh,
    handlePeriodChange,
  };
};
