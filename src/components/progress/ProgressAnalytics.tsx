import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  } from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rh, rbr } from "../../utils/responsive";
import { useProgressData } from "../../hooks/useProgressData";

const { width } = Dimensions.get("window");

interface ProgressAnalyticsProps {
  timeRange?: "week" | "month" | "year";
  onTimeRangeChange?: (range: "week" | "month" | "year") => void;
}

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = ({
  timeRange = "month",
  onTimeRangeChange,
}) => {
  const {
    progressStats,
    progressEntries,
    progressGoals,
    loadProgressStats,
    statsLoading,
  } = useProgressData();

  const [selectedRange, setSelectedRange] = useState<"week" | "month" | "year">(
    timeRange,
  );

  useEffect(() => {
    const days =
      selectedRange === "week" ? 7 : selectedRange === "month" ? 30 : 365;
    loadProgressStats(days);
  }, [selectedRange, loadProgressStats]);

  const handleRangeChange = (range: "week" | "month" | "year") => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const timeRanges = [
    { id: "week", label: "Week", icon: "📅" },
    { id: "month", label: "Month", icon: "🗓️" },
    { id: "year", label: "Year", icon: "📆" },
  ] as const;

  const getProgressColor = (change: number) => {
    if (change > 0) return ResponsiveTheme.colors.success;
    if (change < 0) return ResponsiveTheme.colors.warning;
    return ResponsiveTheme.colors.textSecondary;
  };

  const getProgressIcon = (change: number) => {
    if (change > 0) return "📈";
    if (change < 0) return "📉";
    return "➡️";
  };

  const formatChange = (change: number, unit: string) => {
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(1)}${unit}`;
  };

  const calculateGoalProgress = (current: number, goal: number) => {
    if (goal === 0) return 0;
    return Math.min((current / goal) * 100, 100);
  };

  if (statsLoading) {
    return (
      <Card style={styles.container} variant="elevated">
        <Text style={styles.loadingText}>Loading progress analytics...</Text>
      </Card>
    );
  }

  if (!progressStats) {
    return (
      <Card style={styles.container} variant="elevated">
        <Text style={styles.emptyText}>No progress data available</Text>
        <Text style={styles.emptySubtext}>
          Add measurements to see analytics
        </Text>
      </Card>
    );
  }

  return (
    <Card style={styles.container} variant="elevated">
      <View style={styles.header}>
        <Text style={styles.title}>Progress Analytics</Text>

        {/* Time Range Selector */}
        <View style={styles.timeRangeSelector}>
          {timeRanges.map((range) => (
            <TouchableOpacity
              key={range.id}
              style={[
                styles.timeRangeButton,
                selectedRange === range.id && styles.timeRangeButtonActive,
              ]}
              onPress={() => handleRangeChange(range.id)}
            >
              <Text style={styles.timeRangeIcon}>{range.icon}</Text>
              <Text
                style={[
                  styles.timeRangeLabel,
                  selectedRange === range.id && styles.timeRangeLabelActive,
                ]}
              >
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View>
        {/* Main Progress Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            {/* Weight Progress */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>⚖️</Text>
                <Text style={styles.metricValue}>
                  {(progressStats?.weightChange?.current ?? 0).toFixed(1)}kg
                </Text>
              </View>
              <Text style={styles.metricLabel}>Weight</Text>
              <View style={styles.changeContainer}>
                <Text
                  style={[
                    styles.changeText,
                    {
                      color: getProgressColor(
                        progressStats.weightChange.change,
                      ),
                    },
                  ]}
                >
                  {getProgressIcon(progressStats.weightChange.change)}{" "}
                  {formatChange(progressStats.weightChange.change, "kg")}
                </Text>
              </View>
              {progressGoals?.target_weight_kg && (
                <View style={styles.goalProgress}>
                  <Text style={styles.goalText}>
                    Goal: {progressGoals.target_weight_kg}kg
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${calculateGoalProgress(progressStats.weightChange.current, progressGoals.target_weight_kg)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Body Fat Progress */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>📊</Text>
                <Text style={styles.metricValue}>
                  {(progressStats?.bodyFatChange?.current ?? 0).toFixed(1)}%
                </Text>
              </View>
              <Text style={styles.metricLabel}>Body Fat</Text>
              <View style={styles.changeContainer}>
                <Text
                  style={[
                    styles.changeText,
                    {
                      color: getProgressColor(
                        -progressStats.bodyFatChange.change,
                      ),
                    },
                  ]}
                >
                  {getProgressIcon(-progressStats.bodyFatChange.change)}{" "}
                  {formatChange(progressStats.bodyFatChange.change, "%")}
                </Text>
              </View>
              {progressGoals?.target_body_fat_percentage && (
                <View style={styles.goalProgress}>
                  <Text style={styles.goalText}>
                    Goal: {progressGoals.target_body_fat_percentage}%
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${100 - calculateGoalProgress(progressStats.bodyFatChange.current, progressGoals.target_body_fat_percentage)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Muscle Mass Progress */}
            <View style={styles.metricCard}>
              <View style={styles.metricHeader}>
                <Text style={styles.metricIcon}>💪</Text>
                <Text style={styles.metricValue}>
                  {(progressStats?.muscleChange?.current ?? 0).toFixed(1)}kg
                </Text>
              </View>
              <Text style={styles.metricLabel}>Muscle Mass</Text>
              <View style={styles.changeContainer}>
                <Text
                  style={[
                    styles.changeText,
                    {
                      color: getProgressColor(
                        progressStats.muscleChange.change,
                      ),
                    },
                  ]}
                >
                  {getProgressIcon(progressStats.muscleChange.change)}{" "}
                  {formatChange(progressStats.muscleChange.change, "kg")}
                </Text>
              </View>
              {progressGoals?.target_muscle_mass_kg && (
                <View style={styles.goalProgress}>
                  <Text style={styles.goalText}>
                    Goal: {progressGoals.target_muscle_mass_kg}kg
                  </Text>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${calculateGoalProgress(progressStats.muscleChange.current, progressGoals.target_muscle_mass_kg)}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Body Measurements */}
        {Object.keys(progressStats.measurementChanges).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Body Measurements</Text>
            <View style={styles.measurementsContainer}>
              {Object.entries(progressStats.measurementChanges).map(
                ([measurement, data]) => (
                  <View key={measurement} style={styles.measurementItem}>
                    <View style={styles.measurementHeader}>
                      <Text style={styles.measurementName}>
                        {measurement.charAt(0).toUpperCase() +
                          measurement.slice(1)}
                      </Text>
                      <Text style={styles.measurementValue}>
                        {data.current.toFixed(1)}cm
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.measurementChange,
                        { color: getProgressColor(data.change) },
                      ]}
                    >
                      {formatChange(data.change, "cm")}
                    </Text>
                  </View>
                ),
              )}
            </View>
          </View>
        )}

        {/* Progress Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              📈 Total Entries: {progressStats.totalEntries}
            </Text>
            <Text style={styles.summaryText}>
              📅 Tracking Period: {progressStats.timeRange} days
            </Text>
            {progressStats.weightChange.changePercentage !== 0 && (
              <Text style={styles.summaryText}>
                ⚖️ Weight Change:{" "}
                {progressStats.weightChange.changePercentage.toFixed(1)}%
              </Text>
            )}
          </View>
        </View>

        {/* Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightsContainer}>
            {progressStats.totalEntries === 0 ? (
              <Text style={styles.insightText}>
                📊 Start tracking your measurements to see progress insights!
              </Text>
            ) : (
              <>
                {progressStats.totalEntries >= 2 && (
                  <Text style={styles.insightText}>
                    🎯 Great consistency! You have {progressStats.totalEntries}{" "}
                    measurements recorded.
                  </Text>
                )}

                {progressStats.weightChange.change < 0 && (
                  <Text style={styles.insightText}>
                    📉 You're making progress with weight loss! Keep up the
                    great work.
                  </Text>
                )}

                {progressStats.muscleChange.change > 0 && (
                  <Text style={styles.insightText}>
                    💪 Excellent muscle gain! Your strength training is paying
                    off.
                  </Text>
                )}

                {progressStats.bodyFatChange.change < 0 && (
                  <Text style={styles.insightText}>
                    🔥 Body fat reduction detected! Your fitness routine is
                    working.
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: ResponsiveTheme.spacing.lg,
    margin: ResponsiveTheme.spacing.md,
  },

  header: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  timeRangeSelector: {
    flexDirection: "row",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: ResponsiveTheme.borderRadius.md,
    padding: rp(4),
  },

  timeRangeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  timeRangeButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  timeRangeIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  timeRangeLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  timeRangeLabelActive: {
    color: ResponsiveTheme.colors.white,
  },

  section: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  metricsGrid: {
    gap: ResponsiveTheme.spacing.md,
  },

  metricCard: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  metricIcon: {
    fontSize: rf(24),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  metricValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
  },

  metricLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  changeContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  changeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  goalProgress: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  goalText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressBar: {
    height: rh(4),
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
    borderRadius: rbr(2),
  },

  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(2),
  },

  measurementsContainer: {
    gap: ResponsiveTheme.spacing.sm,
  },

  measurementItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  measurementHeader: {
    flex: 1,
  },

  measurementName: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  measurementValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  measurementChange: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  summaryContainer: {
    gap: ResponsiveTheme.spacing.sm,
  },

  summaryText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  insightsContainer: {
    gap: ResponsiveTheme.spacing.sm,
  },

  insightText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  loadingText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: ResponsiveTheme.spacing.xl,
  },

  emptyText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  emptySubtext: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textMuted,
    textAlign: "center",
  },
});
