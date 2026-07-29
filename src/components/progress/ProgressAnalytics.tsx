/**
 * ProgressAnalytics - Aurora 2026 deep-dive analytics panel
 *
 * Single surface.1 container, hairline dividers, Ionicons (no emojis),
 * chart-palette accents, Manrope type, no drop shadows.
 */

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  colors,
  surface,
  border as borderTokens,
  chart,
  spacing,
  borderRadius,
  typography,
} from "../../theme/aurora-tokens";
import { useProgressData } from "../../hooks/useProgressData";
import { haptics } from "../../utils/haptics";

interface ProgressAnalyticsProps {
  timeRange?: "week" | "month" | "year";
  onTimeRangeChange?: (range: "week" | "month" | "year") => void;
}

type Range = "week" | "month" | "year";

export const ProgressAnalytics: React.FC<ProgressAnalyticsProps> = React.memo(({
  timeRange = "month",
  onTimeRangeChange,
}) => {
  const {
    progressStats,
    progressGoals,
    loadProgressStats,
    statsLoading,
  } = useProgressData();

  const [selectedRange, setSelectedRange] = useState<Range>(timeRange);

  useEffect(() => {
    const days =
      selectedRange === "week" ? 7 : selectedRange === "month" ? 30 : 365;
    loadProgressStats(days);
  }, [selectedRange, loadProgressStats]);

  const handleRangeChange = (range: Range) => {
    haptics.light();
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const timeRanges: { id: Range; label: string }[] = [
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "year", label: "Year" },
  ];

  const getProgressColor = (change: number) => {
    if (change > 0) return colors.success.DEFAULT;
    if (change < 0) return colors.warning.DEFAULT;
    return colors.text.secondary;
  };

  const getProgressIconName = (
    change: number,
  ): keyof typeof Ionicons.glyphMap => {
    if (change > 0) return "trending-up";
    if (change < 0) return "trending-down";
    return "remove";
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
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading progress analytics...</Text>
      </View>
    );
  }

  if (!progressStats) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No progress data available</Text>
        <Text style={styles.emptySubtext}>
          Add measurements to see analytics
        </Text>
      </View>
    );
  }

  const metrics: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: number;
    unit: string;
    change: number;
    changeUnit: string;
    accent: string;
    goal?: number;
    goalUnit?: string;
    invertGoal?: boolean;
  }[] = [
    {
      key: "weight",
      icon: "scale-outline",
      label: "Weight",
      value: progressStats?.weightChange?.current ?? 0,
      unit: "kg",
      change: progressStats.weightChange.change,
      changeUnit: "kg",
      accent: chart[1],
      goal: progressGoals?.target_weight_kg,
      goalUnit: "kg",
    },
    {
      key: "bodyFat",
      icon: "analytics-outline",
      label: "Body Fat",
      value: progressStats?.bodyFatChange?.current ?? 0,
      unit: "%",
      change: progressStats.bodyFatChange.change,
      changeUnit: "%",
      accent: chart[2],
      goal: progressGoals?.target_body_fat_percentage,
      goalUnit: "%",
      invertGoal: true,
    },
    {
      key: "muscle",
      icon: "barbell-outline",
      label: "Muscle Mass",
      value: progressStats?.muscleChange?.current ?? 0,
      unit: "kg",
      change: progressStats.muscleChange.change,
      changeUnit: "kg",
      accent: chart[4],
      goal: progressGoals?.target_muscle_mass_kg,
      goalUnit: "kg",
    },
  ];

  return (
    <Animated.View
      entering={FadeInDown.delay(60).duration(320)}
      style={styles.container}
    >
      {/* Header + Time Range Selector */}
      <View style={styles.header}>
        <Text style={styles.title}>Progress Analytics</Text>
        <View style={styles.timeRangeSelector}>
          {timeRanges.map((range) => {
            const active = selectedRange === range.id;
            return (
              <TouchableOpacity
                key={range.id}
                style={[
                  styles.timeRangeButton,
                  active && styles.timeRangeButtonActive,
                ]}
                onPress={() => handleRangeChange(range.id)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityLabel={range.label}
                accessibilityState={{ selected: active }}
              >
                <Text
                  style={[
                    styles.timeRangeLabel,
                    active && styles.timeRangeLabelActive,
                  ]}
                >
                  {range.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Key Metrics — single surface, hairline dividers, no nested cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View>
          {metrics.map((m, idx) => {
            const pct =
              m.goal != null
                ? m.invertGoal
                  ? 100 - calculateGoalProgress(m.value, m.goal)
                  : calculateGoalProgress(m.value, m.goal)
                : null;
            return (
              <Animated.View
                key={m.key}
                entering={FadeInDown.delay(100 + idx * 60).duration(280)}
                style={[
                  styles.metricRow,
                  idx > 0 && styles.metricRowDivider,
                ]}
              >
                <View
                  style={[
                    styles.metricIconWrap,
                    { backgroundColor: `${m.accent}1A` },
                  ]}
                >
                  <Ionicons name={m.icon} size={18} color={m.accent} />
                </View>
                <View style={styles.metricBody}>
                  <View style={styles.metricHeaderRow}>
                    <Text style={styles.metricLabel}>{m.label}</Text>
                    <View style={styles.changeChip}>
                      <Ionicons
                        name={getProgressIconName(m.change)}
                        size={12}
                        color={getProgressColor(m.change)}
                      />
                      <Text
                        style={[
                          styles.changeText,
                          { color: getProgressColor(m.change) },
                        ]}
                      >
                        {formatChange(m.change, m.changeUnit)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.metricValue}>
                    {m.value.toFixed(1)}
                    <Text style={styles.metricUnit}> {m.unit}</Text>
                  </Text>
                  {pct != null && m.goal != null && (
                    <View style={styles.goalBlock}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${pct}%`, backgroundColor: m.accent },
                          ]}
                        />
                      </View>
                      <Text style={styles.goalText}>
                        Goal {m.goal}
                        {m.goalUnit}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      </View>

      {/* Body Measurements */}
      {Object.keys(progressStats.measurementChanges).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Body Measurements</Text>
          <View>
            {Object.entries(progressStats.measurementChanges).map(
              ([measurement, data], idx, arr) => (
                <View
                  key={measurement}
                  style={[
                    styles.measurementRow,
                    idx < arr.length - 1 && styles.measurementRowDivider,
                  ]}
                >
                  <Text style={styles.measurementName}>
                    {measurement.charAt(0).toUpperCase() + measurement.slice(1)}
                  </Text>
                  <View style={styles.measurementRight}>
                    <Text style={styles.measurementValue}>
                      {data.current.toFixed(1)}cm
                    </Text>
                    <Ionicons
                      name={getProgressIconName(data.change)}
                      size={12}
                      color={getProgressColor(data.change)}
                      style={styles.measurementIcon}
                    />
                    <Text
                      style={[
                        styles.measurementChange,
                        { color: getProgressColor(data.change) },
                      ]}
                    >
                      {formatChange(data.change, "cm")}
                    </Text>
                  </View>
                </View>
              ),
            )}
          </View>
        </View>
      )}

      {/* Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.summaryRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={colors.text.muted}
          />
          <Text style={styles.summaryText}>
            {progressStats.totalEntries} entries · {progressStats.timeRange}{" "}
            days
            {progressStats.weightChange.changePercentage !== 0
              ? ` · ${progressStats.weightChange.changePercentage.toFixed(1)}% weight`
              : ""}
          </Text>
        </View>
      </View>

      {/* Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Insights</Text>
        <View>
          {progressStats.totalEntries === 0 ? (
            <Text style={styles.insightText}>
              Start tracking your measurements to see progress insights!
            </Text>
          ) : (
            <>
              {progressStats.totalEntries >= 2 && (
                <Text style={styles.insightText}>
                  Great consistency! You have {progressStats.totalEntries}{" "}
                  measurements recorded.
                </Text>
              )}
              {progressStats.weightChange.change < 0 && (
                <Text style={styles.insightText}>
                  You're making progress with weight loss! Keep up the great
                  work.
                </Text>
              )}
              {progressStats.muscleChange.change > 0 && (
                <Text style={styles.insightText}>
                  Excellent muscle gain! Your strength training is paying off.
                </Text>
              )}
              {progressStats.bodyFatChange.change < 0 && (
                <Text style={styles.insightText}>
                  Body fat reduction detected! Your fitness routine is working.
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: surface[1],
    borderRadius: 20,
    borderWidth: 1,
    borderColor: borderTokens.subtle,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.variants.sectionTitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  timeRangeSelector: {
    flexDirection: "row",
    backgroundColor: surface[2],
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  timeRangeButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    minHeight: 36,
  },
  timeRangeButtonActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  timeRangeLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  timeRangeLabelActive: {
    fontFamily: "Manrope_600SemiBold",
    color: colors.text.primary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.variants.cardHeadline,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  metricRow: {
    flexDirection: "row",
    paddingVertical: spacing.sm,
  },
  metricRowDivider: {
    borderTopWidth: 1,
    borderTopColor: borderTokens.subtle,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  metricBody: {
    flex: 1,
  },
  metricHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xxs,
  },
  metricLabel: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  metricValue: {
    fontFamily: "Manrope_700Bold",
    fontSize: 20,
    letterSpacing: -0.5,
    color: colors.text.primary,
  },
  metricUnit: {
    ...typography.variants.caption2,
    color: colors.text.muted,
  },
  changeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  changeText: {
    ...typography.variants.caption,
    fontFamily: "Manrope_600SemiBold",
  },
  goalBlock: {
    marginTop: spacing.xs,
  },
  progressBar: {
    height: 6,
    backgroundColor: surface[2],
    borderRadius: borderRadius.sm,
    overflow: "hidden",
    marginBottom: spacing.xxs,
  },
  progressFill: {
    height: "100%",
    borderRadius: borderRadius.sm,
  },
  goalText: {
    ...typography.variants.caption,
    color: colors.text.muted,
  },
  measurementRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  measurementRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: borderTokens.subtle,
  },
  measurementName: {
    ...typography.variants.body,
    color: colors.text.primary,
  },
  measurementRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  measurementValue: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginRight: spacing.xs,
  },
  measurementIcon: {
    marginRight: spacing.xxs,
  },
  measurementChange: {
    ...typography.variants.caption2,
    fontFamily: "Manrope_600SemiBold",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryText: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
  },
  insightText: {
    ...typography.variants.caption2,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  loadingText: {
    ...typography.variants.body,
    color: colors.text.secondary,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.variants.body,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.variants.caption2,
    color: colors.text.muted,
    textAlign: "center",
  },
});

export default ProgressAnalytics;
