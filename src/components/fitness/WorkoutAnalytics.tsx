import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuroraSpinner, AnimatedPressable } from "../ui/aurora";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography, errorText } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rp, rh } from "../../utils/responsive";
import { useFitnessData } from "../../hooks/useFitnessData";

interface WorkoutAnalyticsProps {
  timeRange?: "week" | "month" | "year";
  onTimeRangeChange?: (range: "week" | "month" | "year") => void;
}

export const WorkoutAnalytics: React.FC<WorkoutAnalyticsProps> = ({
  timeRange = "week",
  onTimeRangeChange,
}) => {
  const { workoutStats, loadWorkoutStats, statsLoading, statsError } =
    useFitnessData();
  const [selectedRange, setSelectedRange] = useState<"week" | "month" | "year">(
    timeRange,
  );

  useEffect(() => {
    loadWorkoutStats(selectedRange);
  }, [selectedRange, loadWorkoutStats]);

  const handleRangeChange = (range: "week" | "month" | "year") => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
  };

  const timeRanges = [
    { id: "week", label: "Week" },
    { id: "month", label: "Month" },
    { id: "year", label: "Year" },
  ] as const;

  const getWorkoutTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case "strength":
        return "Strength";
      case "cardio":
        return "Cardio";
      case "flexibility":
        return "Flexibility";
      case "hiit":
        return "HIIT";
      default:
        return "Workout";
    }
  };

  if (statsLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.stateWrap}>
          <AuroraSpinner size="md" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (statsError) {
    return (
      <View style={styles.container}>
        <View style={styles.stateWrap}>
          <Ionicons name="alert-circle-outline" size={rf(32)} color={colors.error} />
          <Text style={styles.errorText}>Couldn't load analytics</Text>
          <AnimatedPressable
            style={styles.retryButton}
            onPress={() => loadWorkoutStats(selectedRange)}
            scaleValue={0.96}
            springConfig="snappy"
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Retry loading analytics"
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </AnimatedPressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Workout Analytics</Text>

        <View style={styles.timeRangeSelector}>
          {timeRanges.map((range) => (
            <AnimatedPressable
              key={range.id}
              style={[
                styles.timeRangeButton,
                selectedRange === range.id && styles.timeRangeButtonActive,
              ]}
              onPress={() => handleRangeChange(range.id)}
              scaleValue={0.95}
              springConfig="snappy"
              hapticType="light"
            >
              <Text
                style={[
                  styles.timeRangeLabel,
                  selectedRange === range.id && styles.timeRangeLabelActive,
                ]}
              >
                {range.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollArea}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {workoutStats?.totalWorkouts || 0}
            </Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {workoutStats?.totalDuration
                ? `${Math.round(workoutStats.totalDuration / 60)}h`
                : "0h"}
            </Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {workoutStats?.totalCalories?.toLocaleString() || "0"}
            </Text>
            <Text style={styles.statLabel}>Calories</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {workoutStats?.averageDuration
                ? `${Math.round(workoutStats.averageDuration)}m`
                : "0m"}
            </Text>
            <Text style={styles.statLabel}>Avg Duration</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Types</Text>
          <View style={styles.workoutTypesContainer}>
            {workoutStats?.workoutsByType &&
            Object.keys(workoutStats.workoutsByType).length > 0 ? (
              Object.entries(workoutStats.workoutsByType).map(
                ([type, count]) => (
                  <View key={type} style={styles.workoutTypeItem}>
                    <View style={styles.workoutTypeHeader}>
                      <Text style={styles.workoutTypeName}>
                        {getWorkoutTypeLabel(type)}
                      </Text>
                    </View>
                    <Text style={styles.workoutTypeCount}>{count}</Text>
                  </View>
                ),
              )
            ) : (
              <Text style={styles.emptySectionText}>
                No workout types yet. Complete a workout to see your breakdown.
              </Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightsContainer}>
            {workoutStats?.totalWorkouts === 0 ? (
              <Text style={styles.insightText}>
                Start your fitness journey by completing your first workout.
              </Text>
            ) : (
              <>
                {workoutStats && workoutStats.totalWorkouts > 0 && (
                  <Text style={styles.insightText}>
                    You've completed {workoutStats.totalWorkouts} workout
                    {workoutStats.totalWorkouts > 1 ? "s" : ""} this{" "}
                    {selectedRange}.
                  </Text>
                )}

                {workoutStats && workoutStats.totalCalories > 500 && (
                  <Text style={styles.insightText}>
                    Great job burning{" "}
                    {workoutStats.totalCalories.toLocaleString()} calories.
                  </Text>
                )}

                {workoutStats && workoutStats.averageDuration > 30 && (
                  <Text style={styles.insightText}>
                    Your average workout duration of{" "}
                    {Math.round(workoutStats.averageDuration)} minutes shows
                    great consistency.
                  </Text>
                )}

                {workoutStats &&
                Object.keys(workoutStats.workoutsByType).length > 2 ? (
                  <Text style={styles.insightText}>
                    Excellent variety. You're training different muscle
                    groups and fitness aspects.
                  </Text>
                ) : (
                  // Fallback insight — without this the section title renders
                  // with no content when none of the above conditions hit.
                  <Text style={styles.insightText}>
                    Keep going — every workout moves you closer to your goals.
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  // Flat surface + hairline (was old ui/Card variant="elevated" — elevation
  // shadow replaced by border per Editorial Dark).
  container: {
    padding: spacing.lg,
    margin: spacing.md,
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
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
    minHeight: 44,
    borderRadius: borderRadius.sm,
  },

  timeRangeButtonActive: {
    backgroundColor: colors.primary,
  },

  timeRangeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
  },

  timeRangeLabelActive: {
    color: colors.white,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },

  // Cap the scroll area so the analytics card doesn't grow to fill the whole
  // screen when nested inside a parent ScrollView.
  scrollArea: {
    maxHeight: rh(400),
  },

  emptySectionText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.md,
  },

  // flexBasis 48% (not 50%) leaves room for the row gap so two-per-row never
  // overflows to a third column on narrow screens.
  statItem: {
    flexBasis: "48%",
    alignItems: "center",
    paddingVertical: spacing.md,
  },

  statValue: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
    fontVariant: ["tabular-nums"],
  },

  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: typography.fontWeight.medium,
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

  workoutTypesContainer: {
    gap: spacing.sm,
  },

  workoutTypeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },

  workoutTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  workoutTypeName: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
    textTransform: "capitalize",
  },

  workoutTypeCount: {
    fontSize: fontSize.lg,
    color: colors.primary,
    fontWeight: typography.fontWeight.bold,
    fontVariant: ["tabular-nums"],
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
    marginTop: spacing.sm,
  },

  errorText: {
    fontSize: fontSize.md,
    color: errorText,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },

  stateWrap: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },

  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    justifyContent: "center",
  },

  retryButtonText: {
    color: colors.surface,
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
  },
});
