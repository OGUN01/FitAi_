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
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, Platform } from "react-native";
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
import { useUserStore } from "../../stores/userStore";
import { useAuthStore } from "../../stores/authStore";
import { useProfileStore } from "../../stores/profileStore";
import { useCalculatedMetrics } from "../../hooks/useCalculatedMetrics";
import { analyticsDataService } from "../../services/analyticsData";
import DataRetrievalService from "../../services/dataRetrieval";

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
  const [selectedPeriod, setSelectedPeriod] = useState<Period>("month");
  const [refreshing, setRefreshing] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [weightHistory, setWeightHistory] = useState<
    Array<{ date: string; weight: number }>
  >([]);
  const [calorieHistory, setCalorieHistory] = useState<
    Array<{ date: string; consumed: number; burned: number }>
  >([]);

  // Stores
  const { profile } = useUserStore();
  const { user } = useAuthStore();
  const { metrics: healthMetrics } = useHealthDataStore();
  const { weeklyWorkoutPlan, workoutProgress } = useFitnessStore();
  const { bodyAnalysis, personalInfo, workoutPreferences } = useProfileStore();
  const { metrics: calculatedMetrics } = useCalculatedMetrics();
  const {
    initialize: initializeAnalytics,
    refreshAnalytics,
    isInitialized,
    isLoading: isAnalyticsLoading,
  } = useAnalyticsStore();

  // Initialize analytics on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAnalytics();
    }
  }, [isInitialized, initializeAnalytics]);

  // Compute period days from selected period
  const periodDays = useMemo(() => {
    switch (selectedPeriod) {
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      default: return 365;
    }
  }, [selectedPeriod]);

  // Shared data loader used by both useEffect and handleRefresh
  const loadHistoryData = useCallback(async () => {
    if (!user?.id) {
      setIsDataLoading(false);
      return;
    }

    try {
      setDataError(null);
      const [weightData, calorieData] = await Promise.all([
        analyticsDataService.getWeightHistory(user.id, periodDays),
        analyticsDataService.getCalorieHistory(user.id, periodDays),
      ]);

      setWeightHistory(weightData);
      setCalorieHistory(calorieData);
    } catch (error) {
      console.error('Failed to load analytics history:', error);
      setDataError('Failed to load analytics data. Pull to refresh.');
    } finally {
      setIsDataLoading(false);
    }
  }, [user?.id, periodDays]);

  // Load weight and calorie history from Supabase
  useEffect(() => {
    loadHistoryData();
  }, [loadHistoryData]);

  // Calculate metrics data - prioritize calculatedMetrics from onboarding
  const metricsData = useMemo((): MetricData => {
    // Weight data - prefer calculated metrics from onboarding, fallback to health metrics or profile
    // Weight: prefer calculatedMetrics, then profileStore.bodyAnalysis (source of truth from onboarding)
    const currentWeight = (calculatedMetrics?.currentWeightKg && calculatedMetrics.currentWeightKg > 0)
      ? calculatedMetrics.currentWeightKg
      : (bodyAnalysis?.current_weight_kg && bodyAnalysis.current_weight_kg > 0)
        ? bodyAnalysis.current_weight_kg
        : undefined;
    const targetWeight = calculatedMetrics?.targetWeightKg
      || (bodyAnalysis?.target_weight_kg && bodyAnalysis.target_weight_kg > 0 ? bodyAnalysis.target_weight_kg : undefined);

    // Calculate completed workouts this period
    const completedWorkouts = Object.values(workoutProgress).filter(
      (p) => p.progress === 100,
    ).length;

    // Calculate calories burned from workouts
    // Calculate calories consumed from DataRetrievalService (same source as Progress screen)
    const todaysData = DataRetrievalService.getTodaysData();
    const caloriesConsumed = todaysData.progress.caloriesConsumed;

    // Calculate calories burned from workouts
    const totalCaloriesBurned =
      weeklyWorkoutPlan?.workouts?.reduce((total, workout) => {
        const progress = workoutProgress[workout.id];
        if (progress && progress.progress === 100) {
          return total + (workout.estimatedCalories || 0);
        }
        return total;
      }, 0) || 0;

    // Use consumed calories as the primary display (what user ate today)
    // Fall back to burned if no consumed data
    const displayCalories = caloriesConsumed > 0 ? caloriesConsumed : totalCaloriesBurned;

    // Get streak from DataRetrievalService (same source as Progress screen)
    const weeklyProgress = DataRetrievalService.getWeeklyProgress();
    const streak = weeklyProgress.streak;

    // Calculate weight change toward goal
    const weightChange =
      currentWeight && targetWeight
        ? Number((targetWeight - currentWeight).toFixed(1))
        : undefined;

    return {
      weight: currentWeight
        ? {
            current: currentWeight,
            change: weightChange,
            trend:
              weightChange && weightChange < 0
                ? ("down" as const)
                : weightChange && weightChange > 0
                  ? ("up" as const)
                  : ("stable" as const),
            target: targetWeight,
          }
        : undefined,
      calories: {
        burned: displayCalories,
        target: calculatedMetrics?.dailyCalories || undefined,
        change: calorieHistory.length >= 2
          ? Math.round(calorieHistory[calorieHistory.length - 1].consumed - calorieHistory[0].consumed)
          : undefined,
        trend: displayCalories > 0 ? ("up" as const) : ("stable" as const),
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
      // Add onboarding calculated metrics for display
      // BMI/BMR/TDEE: prefer calculatedMetrics, fallback to local calculation from profileStore
      bmi: (calculatedMetrics?.calculatedBMI && calculatedMetrics.calculatedBMI > 0)
        ? calculatedMetrics.calculatedBMI
        : (currentWeight && bodyAnalysis?.height_cm && bodyAnalysis.height_cm > 0)
          ? Number((currentWeight / ((bodyAnalysis.height_cm / 100) ** 2)).toFixed(1))
          : undefined,
      bmr: (calculatedMetrics?.calculatedBMR && calculatedMetrics.calculatedBMR > 0)
        ? calculatedMetrics.calculatedBMR
        : (currentWeight && bodyAnalysis?.height_cm && bodyAnalysis.height_cm > 0 && personalInfo?.age && personalInfo?.gender)
          ? Math.round(personalInfo.gender === 'male'
            ? (10 * currentWeight + 6.25 * bodyAnalysis.height_cm - 5 * personalInfo.age + 5)
            : (10 * currentWeight + 6.25 * bodyAnalysis.height_cm - 5 * personalInfo.age - 161))
          : undefined,
      tdee: (calculatedMetrics?.calculatedTDEE && calculatedMetrics.calculatedTDEE > 0)
        ? calculatedMetrics.calculatedTDEE
        : (currentWeight && bodyAnalysis?.height_cm && bodyAnalysis.height_cm > 0 && personalInfo?.age && personalInfo?.gender)
          ? Math.round((personalInfo.gender === 'male'
            ? (10 * currentWeight + 6.25 * bodyAnalysis.height_cm - 5 * personalInfo.age + 5)
            : (10 * currentWeight + 6.25 * bodyAnalysis.height_cm - 5 * personalInfo.age - 161)) * (() => {
              const level = workoutPreferences?.activity_level;
              if (level === 'sedentary') return 1.2;
              if (level === 'light') return 1.375;
              if (level === 'moderate') return 1.55;
              if (level === 'active') return 1.725;
              if (level === 'extreme') return 1.9;
              return 1.55; // default moderate if unknown
            })())
          : undefined,
      dailyWater: calculatedMetrics?.dailyWaterML,
    };
  }, [
    healthMetrics,
    profile,
    bodyAnalysis,
    personalInfo,
    weeklyWorkoutPlan,
    workoutProgress,
    calculatedMetrics,
    workoutPreferences,
  ]);

  // Generate chart data based on period
  const chartData = useMemo(() => {
    const labels =
      selectedPeriod === "week"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : selectedPeriod === "month"
          ? ["W1", "W2", "W3", "W4"]
          : selectedPeriod === "quarter"
            ? ["M1", "M2", "M3"]
            : ["Jan", "Mar", "May", "Jul", "Sep", "Nov"];

    // Calculate workout data per day/week
    const workoutData = labels.map((label, index) => {
      // Count workouts for this period
      const count =
        weeklyWorkoutPlan?.workouts?.filter((w, i) => {
          if (selectedPeriod === "week") {
            const dayMap: Record<string, number> = {
              monday: 0,
              tuesday: 1,
              wednesday: 2,
              thursday: 3,
              friday: 4,
              saturday: 5,
              sunday: 6,
            };
            const dayOfWeek = w.dayOfWeek?.toLowerCase();
            return (
              dayOfWeek &&
              dayMap[dayOfWeek] === index &&
              workoutProgress[w.id]?.progress === 100
            );
          }
          return false;
        }).length || 0;

      return { label, value: count };
    });

    // Use actual data from Supabase for weight and calorie history
    // Transform weight history to chart format
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
            const fallbackWeight = (calculatedMetrics?.currentWeightKg && calculatedMetrics.currentWeightKg > 0)
              ? calculatedMetrics.currentWeightKg
              : (bodyAnalysis?.current_weight_kg && bodyAnalysis.current_weight_kg > 0)
                ? bodyAnalysis.current_weight_kg
                : undefined;
            return fallbackWeight ? [{
              label: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }),
              value: fallbackWeight,
            }] : undefined;
          })();

    // Transform calorie history to chart format
    const calorieChartData =
      calorieHistory.length > 0
        ? calorieHistory.map((c) => ({
            label: new Date(c.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
            value: c.consumed,
          }))
        : undefined;

    return {
      // Weight data - from Supabase analytics_metrics
      weightData: weightChartData,

      // Calorie data - from Supabase analytics_metrics
      calorieData: calorieChartData,

      // Workout data - shows actual completed workouts
      workoutData: workoutData.some((d) => d.value > 0)
        ? workoutData
        : undefined,
    };
  }, [
    selectedPeriod,
    weeklyWorkoutPlan,
    workoutProgress,
    metricsData,
    calculatedMetrics,
    bodyAnalysis,
    weightHistory,
    calorieHistory,
    profile,
  ]);

  // Handlers
  const handlePeriodChange = useCallback((period: Period) => {
    haptics.light();
    setSelectedPeriod(period);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setDataError(null);
    haptics.light();
    try {
      await refreshAnalytics();
      await loadHistoryData();
    } catch (error) {
      console.error('Refresh error:', error);
      setDataError('Failed to refresh data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  }, [refreshAnalytics, loadHistoryData]);

  const handleMetricPress = useCallback((metric: string) => {
    haptics.light();
  }, []);

  const handleChartPress = useCallback((chartType: string) => {
    haptics.light();
  }, []);

  // Navigation handlers
  const handleProgressPress = useCallback(() => {
    haptics.light();
    navigation?.navigate("Progress");
  }, [navigation]);

  const handleTrendsPress = useCallback(() => {
    haptics.light();
    navigation?.navigate("ProgressTrends");
  }, [navigation]);

  // Show loading state for initial load
  const showLoading = (isDataLoading || isAnalyticsLoading) && !refreshing;

  return (
    <AuroraBackground theme="space" animated={true} intensity={0.3}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <Animated.View
          entering={Platform.OS !== 'web' ? FadeIn.duration(300) : undefined}
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
              onTrendsPress={navigation ? handleTrendsPress : undefined}
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

                {/* 3. Achievement Showcase */}
                <View style={styles.sectionContainer}>
                  <AchievementShowcase />
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
});

export default AnalyticsScreen;
