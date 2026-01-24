/**
 * ProgressTrendsScreen - Detailed Progress Trends and Analytics
 *
 * Displays comprehensive fitness progress with:
 * - Weight trend chart
 * - Calorie consumption/burn trends
 * - Workout frequency trends
 * - Historical comparisons
 * - Goal progress tracking
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { ResponsiveTheme } from "../../utils/constants";
import { rh, rw, rf } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { Ionicons } from "@expo/vector-icons";

// Stores
import { useUserStore } from "../../stores/userStore";
import { useAuthStore } from "../../stores/authStore";
import { useCalculatedMetrics } from "../../hooks/useCalculatedMetrics";

// Services
import {
  analyticsDataService,
  DailyMetrics,
} from "../../services/analyticsData";

type TrendPeriod = "week" | "month" | "quarter" | "year";

interface TrendData {
  labels: string[];
  data: number[];
  min: number;
  max: number;
  avg: number;
  change: number;
  changePercent: number;
}

export const ProgressTrendsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get("window");

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

  const renderTrendCard = (
    title: string,
    icon: keyof typeof Ionicons.glyphMap,
    trend: TrendData | null,
    unit: string,
    color: string,
  ) => (
    <Animated.View
      entering={FadeInDown.delay(200).duration(400)}
      style={styles.trendCard}
    >
      <View style={styles.trendHeader}>
        <View
          style={[styles.trendIconContainer, { backgroundColor: color + "20" }]}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.trendTitle}>{title}</Text>
      </View>

      {trend ? (
        <>
          <View style={styles.trendStats}>
            <View style={styles.trendStatItem}>
              <Text style={styles.trendStatLabel}>Current</Text>
              <Text style={styles.trendStatValue}>
                {trend.data[trend.data.length - 1]?.toFixed(1)} {unit}
              </Text>
            </View>
            <View style={styles.trendStatItem}>
              <Text style={styles.trendStatLabel}>Avg</Text>
              <Text style={styles.trendStatValue}>
                {trend.avg.toFixed(1)} {unit}
              </Text>
            </View>
            <View style={styles.trendStatItem}>
              <Text style={styles.trendStatLabel}>Change</Text>
              <Text
                style={[
                  styles.trendStatValue,
                  { color: trend.change >= 0 ? "#4CAF50" : "#FF5252" },
                ]}
              >
                {trend.change >= 0 ? "+" : ""}
                {trend.change.toFixed(1)} {unit}
              </Text>
            </View>
          </View>

          <View style={styles.miniChart}>
            {trend.data.slice(-7).map((value, index, arr) => {
              const max = Math.max(...arr);
              const min = Math.min(...arr);
              const range = max - min || 1;
              const height = ((value - min) / range) * 40 + 10;
              return (
                <View
                  key={index}
                  style={[styles.chartBar, { height, backgroundColor: color }]}
                />
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Not enough data yet</Text>
          <Text style={styles.noDataSubtext}>
            Keep tracking to see your trends
          </Text>
        </View>
      )}
    </Animated.View>
  );

  return (
    <AuroraBackground style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <Text style={styles.headerTitle}>Progress Trends</Text>
          <Text style={styles.headerSubtitle}>
            Track your fitness journey over time
          </Text>
        </Animated.View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(["week", "month", "quarter", "year"] as TrendPeriod[]).map(
            (period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => handlePeriodChange(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ),
          )}
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + rh(20) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={ResponsiveTheme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Card */}
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={styles.summaryCard}
          >
            <Text style={styles.summaryTitle}>
              {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}
              ly Summary
            </Text>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>
                  {workoutTrend.total}
                </Text>
                <Text style={styles.summaryStatLabel}>Workouts</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>
                  {metricsHistory.reduce(
                    (sum, m) => sum + (m.mealsLogged || 0),
                    0,
                  )}
                </Text>
                <Text style={styles.summaryStatLabel}>Meals Logged</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>
                  {(
                    metricsHistory.reduce(
                      (sum, m) => sum + (m.waterIntakeMl || 0),
                      0,
                    ) / 1000
                  ).toFixed(1)}
                  L
                </Text>
                <Text style={styles.summaryStatLabel}>Water</Text>
              </View>
            </View>
          </Animated.View>

          {/* Weight Trend */}
          {renderTrendCard(
            "Weight Trend",
            "scale-outline",
            weightTrend,
            "kg",
            "#4CAF50",
          )}

          {/* Calorie Trend */}
          {renderTrendCard(
            "Calorie Intake",
            "flame-outline",
            calorieTrend,
            "kcal",
            "#FF9800",
          )}

          {/* Goals Progress */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
            style={styles.trendCard}
          >
            <View style={styles.trendHeader}>
              <View
                style={[
                  styles.trendIconContainer,
                  { backgroundColor: "#9C27B020" },
                ]}
              >
                <Ionicons name="flag-outline" size={20} color="#9C27B0" />
              </View>
              <Text style={styles.trendTitle}>Goal Progress</Text>
            </View>

            <View style={styles.goalContainer}>
              {calculatedMetrics?.targetWeightKg &&
                profile?.bodyMetrics?.current_weight_kg && (
                  <View style={styles.goalItem}>
                    <Text style={styles.goalLabel}>Weight Goal</Text>
                    <View style={styles.goalProgressBar}>
                      <View
                        style={[
                          styles.goalProgressFill,
                          {
                            width: `${Math.min(
                              100,
                              Math.abs(
                                ((profile.bodyMetrics.current_weight_kg -
                                  calculatedMetrics.targetWeightKg) /
                                  (profile.bodyMetrics.current_weight_kg -
                                    calculatedMetrics.targetWeightKg)) *
                                  100,
                              ),
                            )}%`,
                            backgroundColor: "#9C27B0",
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.goalText}>
                      {profile.bodyMetrics.current_weight_kg.toFixed(1)} kg →{" "}
                      {calculatedMetrics.targetWeightKg.toFixed(1)} kg
                    </Text>
                  </View>
                )}

              {calculatedMetrics?.dailyCalories && (
                <View style={styles.goalItem}>
                  <Text style={styles.goalLabel}>Daily Calorie Target</Text>
                  <Text style={styles.goalValue}>
                    {calculatedMetrics.dailyCalories.toLocaleString()} kcal/day
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: rw(20),
    paddingTop: rh(10),
    paddingBottom: rh(15),
  },
  headerTitle: {
    fontSize: rf(28),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
  },
  headerSubtitle: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rh(4),
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: rw(20),
    marginBottom: rh(15),
    gap: rw(8),
  },
  periodButton: {
    flex: 1,
    paddingVertical: rh(10),
    borderRadius: 10,
    backgroundColor: ResponsiveTheme.colors.surface,
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  periodButtonText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  periodButtonTextActive: {
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: rw(20),
    gap: rh(15),
  },
  summaryCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: 16,
    padding: rw(16),
  },
  summaryTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(12),
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryStatItem: {
    alignItems: "center",
  },
  summaryStatValue: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
  summaryStatLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rh(4),
  },
  trendCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: 16,
    padding: rw(16),
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rh(12),
  },
  trendIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rw(12),
  },
  trendTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  trendStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: rh(12),
  },
  trendStatItem: {
    alignItems: "center",
  },
  trendStatLabel: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
  },
  trendStatValue: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginTop: rh(2),
  },
  miniChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 50,
    paddingTop: rh(10),
  },
  chartBar: {
    width: 8,
    borderRadius: 4,
    opacity: 0.8,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: rh(20),
  },
  noDataText: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  noDataSubtext: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rh(4),
  },
  goalContainer: {
    gap: rh(12),
  },
  goalItem: {
    gap: rh(6),
  },
  goalLabel: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
  },
  goalProgressBar: {
    height: 8,
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: 4,
    overflow: "hidden",
  },
  goalProgressFill: {
    height: "100%",
    borderRadius: 4,
  },
  goalText: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.text,
  },
  goalValue: {
    fontSize: rf(18),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
});

export default ProgressTrendsScreen;
