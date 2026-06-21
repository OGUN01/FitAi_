import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  } from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
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
    if (change > 0) return colors.success;
    if (change < 0) return colors.warning;
    return colors.textSecondary;
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
    padding: spacing.lg,
    margin: spacing.md,
  },

  header: {
    marginBottom: spacing.lg,
  },

  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  timeRangeSelector: {
    flexDirection: "row",
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: rp(4),
  },

  timeRangeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },

  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },

  timeRangeIcon: {
    fontSize: rf(16),
    marginRight: spacing.xs,
  },

  timeRangeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },

  timeRangeLabelActive: {
    color: colors.white,
  },

  section: {
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.md,
  },

  metricsGrid: {
    gap: spacing.md,
  },

  metricCard: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  metricHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  metricIcon: {
    fontSize: rf(24),
    marginRight: spacing.sm,
  },

  metricValue: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },

  metricLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },

  changeContainer: {
    marginBottom: spacing.sm,
  },

  changeText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  goalProgress: {
    marginTop: spacing.sm,
  },

  goalText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },

  progressBar: {
    height: rh(4),
    backgroundColor: colors.backgroundTertiary,
    borderRadius: rbr(2),
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rbr(2),
  },

  measurementsContainer: {
    gap: spacing.sm,
  },

  measurementItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  measurementHeader: {
    flex: 1,
  },

  measurementName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
  },

  measurementValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  measurementChange: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  summaryContainer: {
    gap: spacing.sm,
  },

  summaryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  insightsContainer: {
    gap: spacing.sm,
  },

  insightText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(20),
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  loadingText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },

  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },

  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: "center",
  },
});
