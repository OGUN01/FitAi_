/**
 * AnalyticsScreen - Progress Analytics Dashboard
 *
 * REDESIGNED: Following HomeScreen pattern with modular components
 *
 * Layout Order:
 * 1. AnalyticsHeader (title with AI badge, period selector)
 * 2. MetricSummaryGrid (2x2 metrics: Weight, Calories, Workouts, Streak)
 * 3. AchievementShowcase (earned badges)
 * 4. TrendCharts (detailed analytics charts)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, { FadeIn } from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { ResponsiveTheme } from "../../utils/constants";
import { rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";

// Stores
import { useAnalyticsStore } from "../../stores/analyticsStore";
import { useHealthDataStore } from "../../stores/healthDataStore";
import { useFitnessStore } from "../../stores/fitnessStore";
import { useAuthStore } from "../../stores/authStore";
import { useProfileStore } from "../../stores/profileStore";
import { useCalculatedMetrics } from "../../hooks/useCalculatedMetrics";
import { analyticsDataService } from "../../services/analyticsData";
import { resolveCurrentWeight } from "../../services/currentWeight";
import { useAchievementStore } from "../../stores/achievementStore";
import {
  getCurrentWeekStart,
  getLocalDateString,
  getWeekStartForDate,
} from "../../utils/weekUtils";

// Modular Components
import {
  AnalyticsHeader,
  MetricSummaryGrid,
  AchievementShowcase,
  TrendCharts,
  Period,
} from "./analytics";
import type { MetricData } from "./analytics";

interface AnalyticsScreenProps {
  navigation?: {
    navigate: (screen: string, params?: any) => void;
    goBack: () => void;
  };
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();

  // State
  // NOTE: selectedPeriod is intentionally NOT local state — we read it from
  // analyticsStore so the user's choice persists across tab switches.
  const [refreshing, setRefreshing] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [loadedHistoryPeriodDays, setLoadedHistoryPeriodDays] = useState<
    number | null
  >(null);

  // Stores
  // SSOT: weight/target come from profileStore.bodyAnalysis — userStore.profile is NOT used here
  const { user } = useAuthStore();
  const { metrics: healthMetrics } = useHealthDataStore();
  const completedSessions = useFitnessStore((state) => state.completedSessions);
  const { bodyAnalysis, personalInfo, workoutPreferences } = useProfileStore();
  const { metrics: calculatedMetrics } = useCalculatedMetrics();
  const {
    initialize: initializeAnalytics,
    refreshAnalytics,
    isInitialized,
    isLoading: isAnalyticsLoading,
    // SSOT fix: selectedPeriod persisted in store — survives tab switches
    selectedPeriod,
    setPeriod: setSelectedPeriod,
    // SSOT fix: history cached in store — survives tab switches
    weightHistory,
    calorieHistory,
    setHistoryData,
  } = useAnalyticsStore();
  const hasCachedHistory = weightHistory.length > 0 || calorieHistory.length > 0;
  const initializeAchievements = useAchievementStore((s) => s.initialize);
  const areAchievementsLoading = useAchievementStore((s) => s.isLoading);
  const areAchievementsInitialized = useAchievementStore(
    (s) => s.isInitialized,
  );
  // SSOT fix: streak comes from achievementStore.currentStreak which is computed
  // from completedSessions via updateCurrentStreak(). DataRetrievalService.getWeeklyProgress()
  // returned a stale value derived from workoutProgress (can lag after plan regeneration).
  const currentStreak = useAchievementStore((s) => s.currentStreak);

  // ========== SCREEN DEBUG LOG ==========
  useEffect(() => {
    console.warn(`\n${'='.repeat(60)}`);
    console.warn(`📊 [SCREEN DEBUG] AnalyticsScreen MOUNTED`);
    console.warn(`${'='.repeat(60)}`);
    console.warn(`👤 User: ${user?.id || 'none'}`);
    console.warn(`📅 Period: ${selectedPeriod} | Streak: ${currentStreak}`);
    console.warn(`⚖️  Body: Height=${bodyAnalysis?.height_cm ?? '?'}cm | Weight=${bodyAnalysis?.current_weight_kg ?? '?'}kg | Target=${bodyAnalysis?.target_weight_kg ?? '?'}kg`);
    console.warn(`📊 Metrics: TDEE=${calculatedMetrics?.calculatedTDEE ?? '?'} | BMR=${calculatedMetrics?.calculatedBMR ?? '?'}`);
    console.warn(`🏋️ Completed Sessions: ${completedSessions?.length || 0}`);
    console.warn(`📈 History: Weight=${weightHistory.length} points | Calories=${calorieHistory.length} points`);
    console.warn(`${'='.repeat(60)}\n`);
  }, []);

  // Initialize analytics on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAnalytics();
    }
  }, [isInitialized, initializeAnalytics]);

  useEffect(() => {
    if (!user?.id || areAchievementsInitialized) {
      return;
    }

    initializeAchievements(user.id).catch((error) => {
      console.warn(
        "[AnalyticsScreen] Failed to initialize achievements:",
        error,
      );
    });
  }, [user?.id, areAchievementsInitialized, initializeAchievements]);

  // Compute period days from selected period
  const periodDays = useMemo(() => {
    switch (selectedPeriod) {
      case "week":
        return 7;
      case "month":
        return 30;
      case "quarter":
        return 90;
      default:
        return 365;
    }
  }, [selectedPeriod]);

  const isHistoryCurrent = loadedHistoryPeriodDays === periodDays;

  // Shared data loader used by both useEffect and handleRefresh
  const loadHistoryData = useCallback(async (options?: { showLoading?: boolean }) => {
    if (!user?.id) {
      setIsDataLoading(false);
      setLoadedHistoryPeriodDays(null);
      return;
    }

    const showLoading =
      options?.showLoading ??
      (!hasCachedHistory || loadedHistoryPeriodDays !== periodDays);

    try {
      if (showLoading) {
        setIsDataLoading(true);
      }
      setDataError(null);
      const [weightData, calorieData] = await Promise.all([
        analyticsDataService.getWeightHistory(user.id, periodDays),
        analyticsDataService.getCalorieHistory(user.id, periodDays),
      ]);

      // SSOT fix: write fetched history into the store instead of local state
      // so the Analytics tab shows cached data immediately on the next mount.
      setHistoryData(weightData, calorieData);
      setLoadedHistoryPeriodDays(periodDays);
    } catch (error) {
      console.error("Failed to load analytics history:", error);
      setDataError("Failed to load analytics data. Pull to refresh.");
    } finally {
      if (showLoading) {
        setIsDataLoading(false);
      }
    }
  }, [
    hasCachedHistory,
    loadedHistoryPeriodDays,
    periodDays,
    setHistoryData,
    user?.id,
  ]);

  // Load weight and calorie history from Supabase
  useEffect(() => {
    loadHistoryData({
      showLoading: !hasCachedHistory || loadedHistoryPeriodDays !== periodDays,
    });
  }, [hasCachedHistory, loadHistoryData, loadedHistoryPeriodDays, periodDays]);

  const periodBoundaries = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date(`${getCurrentWeekStart()}T00:00:00`);

    const monthStart = new Date(today);
    monthStart.setDate(today.getDate() - 29);
    monthStart.setHours(0, 0, 0, 0);

    const quarterStart = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    quarterStart.setHours(0, 0, 0, 0);

    const yearStart = new Date(today.getFullYear(), today.getMonth() - 11, 1);
    yearStart.setHours(0, 0, 0, 0);

    return {
      today,
      weekStart,
      monthStart,
      quarterStart,
      yearStart,
    };
  }, []);

  const isInSelectedPeriod = useCallback(
    (dateValue: string) => {
      const dateKey = getLocalDateString(dateValue);
      switch (selectedPeriod) {
        case "week":
          return getWeekStartForDate(dateValue) === getCurrentWeekStart();
        case "month":
          return dateKey >= getLocalDateString(periodBoundaries.monthStart);
        case "quarter":
          return dateKey >= getLocalDateString(periodBoundaries.quarterStart);
        default:
          return dateKey >= getLocalDateString(periodBoundaries.yearStart);
      }
    },
    [periodBoundaries, selectedPeriod],
  );

  // Calculate metrics data - prioritize calculatedMetrics from onboarding
  const metricsData = useMemo((): MetricData => {
    const resolvedCurrentWeight = resolveCurrentWeight({
      weightHistory,
      bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
    });

    // Weight data - prefer calculated metrics from onboarding, fallback to health metrics or profile
    // Weight: prefer calculatedMetrics, then profileStore.bodyAnalysis (source of truth from onboarding)
    const currentWeight =
      calculatedMetrics?.currentWeightKg &&
      calculatedMetrics.currentWeightKg > 0
        ? calculatedMetrics.currentWeightKg
        : resolvedCurrentWeight.value ?? undefined;
    const targetWeight =
      calculatedMetrics?.targetWeightKg ||
      (bodyAnalysis?.target_weight_kg && bodyAnalysis.target_weight_kg > 0
        ? bodyAnalysis.target_weight_kg
        : undefined);

    // Calculate completed workouts WITHIN the selected period
    // Filter by completedAt timestamp falling within periodDays window
    const completedWorkouts = completedSessions.filter((s) =>
      isInSelectedPeriod(s.completedAt),
    ).length;

    // SSOT fix: calories consumed comes from nutritionStore which aggregates
    // both completed weekly-plan meals AND manually logged daily meals.
    // Previously DataRetrievalService.getTodaysData() was used but it only
    // counted weekly-plan completions, ignoring meal_logs / barcode scans.
    const caloriesConsumed = calorieHistory
      .filter((entry) => isInSelectedPeriod(entry.date))
      .reduce((sum, entry) => sum + (entry.consumed || 0), 0);

    // SSOT: this card is intake-only because its trend/history/target all use
    // calorie consumption semantics. Burned calories belong in a separate fact.
    const displayCalories = caloriesConsumed;

    // SSOT fix: streak derived from achievementStore.currentStreak which counts
    // consecutive workout days from completedSessions. DataRetrievalService was stale.
    const streak = currentStreak;

    // Weight change: derive from Supabase history (oldest → newest in period)
    // Positive = gained weight, negative = lost weight
    // Fallback shows remaining to goal: target - current (negative = target lower than current = needs to lose)
    const hasWeightTrendData = weightHistory.length >= 2;
    const weightChange =
      hasWeightTrendData
        ? Number(
            (
              weightHistory[weightHistory.length - 1].weight -
              weightHistory[0].weight
            ).toFixed(1),
          )
        : undefined;

    // Weight trend: negative change (losing weight / below goal) = "down" = green (good for weight-loss goals)
    const weightTrend =
      hasWeightTrendData && weightChange !== undefined
        ? weightChange < 0
          ? ("down" as const)
          : weightChange > 0
            ? ("up" as const)
            : ("stable" as const)
        : undefined;

    // Calorie change: percentage change from start to end of period
    const periodCalorieHistory = calorieHistory.filter((entry) =>
      isInSelectedPeriod(entry.date),
    );
    const calorieChange =
      periodCalorieHistory.length >= 2
        ? (() => {
            const first = periodCalorieHistory[0].consumed;
            const last =
              periodCalorieHistory[periodCalorieHistory.length - 1].consumed;
            if (first === 0) return undefined;
            return Math.round(((last - first) / first) * 100);
          })()
        : undefined;

    return {
      weight: currentWeight
        ? {
            current: currentWeight,
            change: weightChange,
            trend: weightTrend,
            target: targetWeight,
            hasTrendData: hasWeightTrendData,
          }
        : undefined,
      calories: {
        consumed: displayCalories,
        target: calculatedMetrics?.dailyCalories || undefined,
        change: calorieChange,
        trend: displayCalories > 0 ? ("up" as const) : ("stable" as const),
        period: selectedPeriod,
        hasData: periodCalorieHistory.some((entry) => (entry.consumed || 0) > 0),
      },
      workouts: {
        count: completedWorkouts,
        change: undefined,
        trend: completedWorkouts > 0 ? ("up" as const) : ("stable" as const),
      },
      streak: {
        days: streak,
        isActive: streak > 0,
      },
      // SSOT fix: BMI/BMR/TDEE come ONLY from useCalculatedMetrics (which reads
      // advanced_review from Supabase). We do NOT recompute them inline here —
      // that would duplicate the Mifflin–St Jeor formula and risk divergence.
      // If calculatedMetrics is null (not loaded yet), show undefined in the UI.
      bmi:
        calculatedMetrics?.calculatedBMI && calculatedMetrics.calculatedBMI > 0
          ? calculatedMetrics.calculatedBMI
          : undefined,
      bmr:
        calculatedMetrics?.calculatedBMR && calculatedMetrics.calculatedBMR > 0
          ? calculatedMetrics.calculatedBMR
          : undefined,
      tdee:
        calculatedMetrics?.calculatedTDEE &&
        calculatedMetrics.calculatedTDEE > 0
          ? calculatedMetrics.calculatedTDEE
          : undefined,
      dailyWater: calculatedMetrics?.dailyWaterML,
    };
  }, [
    healthMetrics,
    bodyAnalysis,
    completedSessions,
    calculatedMetrics,
    weightHistory,
    calorieHistory,
    periodDays,
    isInSelectedPeriod,
    currentStreak,
  ]);

  // Calorie breakdown by session type — for breakdown display only, not part of MetricData
  const calBreakdown = useMemo(() => {
    return {
      extra: completedSessions
        .filter((s) => s.type === "extra" && isInSelectedPeriod(s.completedAt))
        .reduce((sum, s) => sum + s.caloriesBurned, 0),
      planned: completedSessions
        .filter(
          (s) => s.type === "planned" && isInSelectedPeriod(s.completedAt),
        )
        .reduce((sum, s) => sum + s.caloriesBurned, 0),
    };
  }, [completedSessions, isInSelectedPeriod]);

  // Generate chart data based on period
  const chartData = useMemo(() => {
    // Weight chart: always from Supabase history
    const weightChartData =
      weightHistory.length > 0
        ? weightHistory.map((w) => ({
            label: new Date(w.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            value: w.weight,
          }))
        : (() => {
            const fallbackWeight =
              calculatedMetrics?.currentWeightKg &&
              calculatedMetrics.currentWeightKg > 0
                ? calculatedMetrics.currentWeightKg
                : resolveCurrentWeight({
                    weightHistory,
                    bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
                  }).value ?? undefined;
            return fallbackWeight
              ? [
                  {
                    label: new Date().toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    }),
                    value: fallbackWeight,
                  },
                ]
              : undefined;
          })();

    // Calorie chart: filter out zero-value days to avoid misleading empty bars
    const calorieChartData =
      calorieHistory.length > 0
        ? calorieHistory
            .filter((c) => c.consumed > 0)
            .map((c) => ({
              label: new Date(c.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              value: c.consumed,
            }))
        : undefined;

    // Workout chart: period-aware bucketing from completedSessions
    let workoutData: Array<{ label: string; value: number }> = [];

    if (selectedPeriod === "week") {
      // Show each day of the current week (Mon-Sun)
      const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const startOfWeek = new Date(`${getCurrentWeekStart()}T00:00:00`);
      workoutData = dayLabels.map((label, index) => {
        const bucketDate = new Date(startOfWeek);
        bucketDate.setDate(startOfWeek.getDate() + index);
        const bucketDateKey = getLocalDateString(bucketDate);
        const count = completedSessions.filter((s) => {
          return getLocalDateString(s.completedAt) === bucketDateKey;
        }).length;
        return { label, value: count };
      });
    } else if (selectedPeriod === "month") {
      workoutData = Array.from({ length: 5 }, (_, index) => {
        const bucketStart = new Date(periodBoundaries.monthStart);
        bucketStart.setDate(periodBoundaries.monthStart.getDate() + index * 6);
        const bucketEnd = new Date(bucketStart);
        bucketEnd.setDate(bucketStart.getDate() + 6);
        if (index === 4) {
          bucketEnd.setTime(
            periodBoundaries.today.getTime() + 24 * 60 * 60 * 1000,
          );
        }

        const count = completedSessions.filter((s) => {
          if (!s.completedAt) return false;
          const d = new Date(s.completedAt);
          return d >= bucketStart && d < bucketEnd;
        }).length;
        return {
          label: bucketStart.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          value: count,
        };
      });
    } else if ((selectedPeriod as string) === "__month_legacy__") {
      // Show completions grouped by week (W1-W4) within last 30 days
      const now = new Date();
      workoutData = ["W1", "W2", "W3", "W4"].map((label, weekIndex) => {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - 28 + weekIndex * 7);
        weekStart.setHours(0, 0, 0, 0);
        // Last bucket must include today — extend to start of tomorrow
        const weekEnd =
          weekIndex === 3
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            : (() => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + 7);
                return d;
              })();

        const count = completedSessions.filter((s) => {
          if (!s.completedAt) return false;
          const d = new Date(s.completedAt);
          return d >= weekStart && d < weekEnd;
        }).length;
        return { label, value: count };
      });
    } else if (selectedPeriod === "quarter") {
      const monthLabels = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(
          periodBoundaries.quarterStart.getFullYear(),
          periodBoundaries.quarterStart.getMonth() + i,
          1,
        );
        return d.toLocaleDateString("en-US", { month: "short" });
      });
      workoutData = monthLabels.map((label, i) => {
        const d = new Date(
          periodBoundaries.quarterStart.getFullYear(),
          periodBoundaries.quarterStart.getMonth() + i,
          1,
        );
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const count = completedSessions.filter((s) => {
          if (!s.completedAt) return false;
          const cd = new Date(s.completedAt);
          return cd >= monthStart && cd < monthEnd;
        }).length;
        return { label, value: count };
      });
    } else if ((selectedPeriod as string) === "__quarter_legacy__") {
      // Group by month (last 3 months)
      const now = new Date();
      const monthLabels = Array.from({ length: 3 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
        return d.toLocaleDateString("en-US", { month: "short" });
      });
      workoutData = monthLabels.map((label, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (2 - i), 1);
        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
        const count = completedSessions.filter((s) => {
          if (!s.completedAt) return false;
          const cd = new Date(s.completedAt);
          return cd >= monthStart && cd < monthEnd;
        }).length;
        return { label, value: count };
      });
    } else if (selectedPeriod === "year") {
      const yearLabels = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(
          periodBoundaries.yearStart.getFullYear(),
          periodBoundaries.yearStart.getMonth() + i * 2,
          1,
        );
        return d.toLocaleDateString("en-US", { month: "short" });
      });
      workoutData = yearLabels.map((label, i) => {
        const monthStart = new Date(
          periodBoundaries.yearStart.getFullYear(),
          periodBoundaries.yearStart.getMonth() + i * 2,
          1,
        );
        const monthEnd = new Date(
          periodBoundaries.yearStart.getFullYear(),
          periodBoundaries.yearStart.getMonth() + i * 2 + 2,
          1,
        );
        const count = completedSessions.filter((s) => {
          if (!s.completedAt) return false;
          const cd = new Date(s.completedAt);
          return cd >= monthStart && cd < monthEnd;
        }).length;
        return { label, value: count };
      });
    } else {
      // year: group by bi-month
      const now = new Date();
      const yearLabels = ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];
      workoutData = yearLabels.map((label, i) => {
        const monthStart = new Date(now.getFullYear(), i * 2, 1);
        const monthEnd = new Date(now.getFullYear(), i * 2 + 2, 1);
        const count = completedSessions.filter((s) => {
          if (!s.completedAt) return false;
          const cd = new Date(s.completedAt);
          return cd >= monthStart && cd < monthEnd;
        }).length;
        return { label, value: count };
      });
    }

    return {
      // Weight data - from Supabase analytics_metrics
      weightData: weightChartData,

      // Calorie data - from Supabase analytics_metrics (non-zero only)
      calorieData:
        calorieChartData && calorieChartData.length > 0
          ? calorieChartData
          : undefined,

      // Workout data - period-aware bucketing
      workoutData: workoutData.some((d) => d.value > 0)
        ? workoutData
        : undefined,
    };
  }, [
    selectedPeriod,
    completedSessions,
    calculatedMetrics,
    bodyAnalysis,
    weightHistory,
    calorieHistory,
    periodBoundaries,
  ]);

  // Handlers
  const handlePeriodChange = useCallback(
    (period: Period) => {
      haptics.light();
      // SSOT: setPeriod writes to analyticsStore which persists across tab switches
      setSelectedPeriod(period);
    },
    [setSelectedPeriod],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setDataError(null);
    haptics.light();
    try {
      await refreshAnalytics();
      await loadHistoryData({ showLoading: false });
    } catch (error) {
      console.error("Refresh error:", error);
      setDataError("Failed to refresh data. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [refreshAnalytics, loadHistoryData]);

  const handleMetricPress = useCallback(
    (metric: string) => {
      haptics.light();
      // Navigate to the most relevant screen for each metric
      if (
        metric === "weight" ||
        metric === "streak" ||
        metric === "bmi" ||
        metric === "bmr" ||
        metric === "tdee"
      ) {
        navigation?.navigate("Progress");
      } else if (metric === "workouts") {
        navigation?.navigate("Workout");
      } else if (metric === "calories" || metric === "water") {
        navigation?.navigate(
          "Diet",
          metric === "water" ? { openWaterModal: true } : { openLogMeal: true },
        );
      }
    },
    [navigation],
  );

  const handleChartPress = useCallback(
    (chartType: string) => {
      haptics.light();
      if (chartType === "weight") {
        navigation?.navigate("Progress");
      } else if (chartType === "workouts") {
        navigation?.navigate("ProgressTrends");
      } else if (chartType === "calories") {
        navigation?.navigate("ProgressTrends");
      }
    },
    [navigation],
  );

  // Navigation handlers
  const handleProgressPress = useCallback(() => {
    haptics.light();
    navigation?.navigate("Progress");
  }, [navigation]);

  // Show loading state for initial load
  const showLoading =
    !refreshing && !dataError && (isDataLoading || isAnalyticsLoading || !isHistoryCurrent);

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Animated.View
          entering={Platform.OS !== "web" ? FadeIn.duration(300) : undefined}
          style={styles.animatedContainer}
        >
          <Animated.ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={ResponsiveTheme.colors.primary}
                colors={[ResponsiveTheme.colors.primary]}
              />
            }
          >
            {/* 1. Analytics Header */}
            <AnalyticsHeader
              selectedPeriod={selectedPeriod}
              onPeriodChange={handlePeriodChange}
              onProgressPress={navigation ? handleProgressPress : undefined}
            />

            {/* Loading State */}
            {showLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator
                  size="large"
                  color={ResponsiveTheme.colors.primary}
                />
                <Text style={styles.loadingText}>Loading analytics...</Text>
              </View>
            )}

            {/* Error State */}
            {dataError && !showLoading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{dataError}</Text>
              </View>
            )}

            {/* Content - only show when not in initial loading */}
            {!showLoading && (
              <>
                {/* 2. Metric Summary Grid */}
                <View style={styles.sectionContainer}>
                  <MetricSummaryGrid
                    data={metricsData}
                    period={selectedPeriod}
                    onMetricPress={handleMetricPress}
                  />
                </View>

                {/* Calorie Breakdown: Planned + Extra */}
                {calBreakdown.extra > 0 && (
                  <View style={styles.sectionContainer}>
                    <View style={styles.calorieBreakdown}>
                      <Text style={styles.breakdownTitle}>
                        Calorie Breakdown
                      </Text>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Plan workouts</Text>
                        <Text style={styles.breakdownValue}>
                          {calBreakdown.planned} kcal
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>
                          Extra workouts
                        </Text>
                        <Text
                          style={[styles.breakdownValue, styles.breakdownExtra]}
                        >
                          {calBreakdown.extra} kcal
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* 3. Achievement Showcase */}
                <View style={styles.sectionContainer}>
                  <AchievementShowcase
                    isLoading={areAchievementsLoading}
                    isInitialized={areAchievementsInitialized}
                  />
                </View>

                {/* 4. Trend Charts */}
                <View style={styles.sectionContainer}>
                  <TrendCharts
                    weightData={chartData.weightData}
                    calorieData={chartData.calorieData}
                    workoutData={chartData.workoutData}
                    period={selectedPeriod}
                    onChartPress={handleChartPress}
                  />
                </View>
              </>
            )}

            {/* Bottom Spacing */}
            <View style={{ height: insets.bottom + rh(100) }} />
          </Animated.ScrollView>
        </Animated.View>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.background,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: rh(120),
  },
  sectionContainer: {
    position: "relative" as const,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xxl,
    gap: ResponsiveTheme.spacing.md,
  },
  loadingText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
  errorContainer: {
    padding: ResponsiveTheme.spacing.lg,
    marginHorizontal: ResponsiveTheme.spacing.md,
    backgroundColor: `${ResponsiveTheme.colors.error}15`,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    alignItems: "center",
  },
  errorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.error,
    textAlign: "center",
  },
  calorieBreakdown: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: ResponsiveTheme.colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  breakdownExtra: {
    color: ResponsiveTheme.colors.successAlt,
  },
});

export default AnalyticsScreen;
