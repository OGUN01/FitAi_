import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rp } from "../../utils/responsive";
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
      <Card style={styles.container} variant="elevated">
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </Card>
    );
  }

  if (statsError) {
    return (
      <Card style={styles.container} variant="elevated">
        <Text style={styles.errorText}>Error: {statsError}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.container} variant="elevated">
      <View style={styles.header}>
        <Text style={styles.title}>Workout Analytics</Text>

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

      <ScrollView showsVerticalScrollIndicator={false}>
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

        {workoutStats?.workoutsByType &&
          Object.keys(workoutStats.workoutsByType).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Workout Types</Text>
              <View style={styles.workoutTypesContainer}>
                {Object.entries(workoutStats.workoutsByType).map(
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
                )}
              </View>
            </View>
          )}

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
                  Object.keys(workoutStats.workoutsByType).length > 2 && (
                    <Text style={styles.insightText}>
                      Excellent variety. You're training different muscle
                      groups and fitness aspects.
                    </Text>
                  )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
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
  },

  statItem: {
    width: "50%",
    alignItems: "center",
    paddingVertical: spacing.md,
  },

  statValue: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginBottom: spacing.xs,
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

  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: "center",
    paddingVertical: spacing.xl,
  },
});
