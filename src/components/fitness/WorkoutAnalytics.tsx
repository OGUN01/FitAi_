import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Card, THEME } from "../ui";
import { useFitnessData } from "../../hooks/useFitnessData";

const { width } = Dimensions.get("window");

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
    { id: "week", label: "Week", icon: "📅" },
    { id: "month", label: "Month", icon: "🗓️" },
    { id: "year", label: "Year", icon: "📆" },
  ] as const;

  const getWorkoutTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "strength":
        return "💪";
      case "cardio":
        return "🏃";
      case "flexibility":
        return "🧘";
      case "hiit":
        return "🔥";
      default:
        return "🏋️";
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
        <Text style={styles.errorText}>⚠️ {statsError}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.container} variant="elevated">
      <View style={styles.header}>
        <Text style={styles.title}>Workout Analytics</Text>

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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Main Stats */}
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

        {/* Workout Types Breakdown */}
        {workoutStats?.workoutsByType &&
          Object.keys(workoutStats.workoutsByType).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Workout Types</Text>
              <View style={styles.workoutTypesContainer}>
                {Object.entries(workoutStats.workoutsByType).map(
                  ([type, count]) => (
                    <View key={type} style={styles.workoutTypeItem}>
                      <View style={styles.workoutTypeHeader}>
                        <Text style={styles.workoutTypeIcon}>
                          {getWorkoutTypeIcon(type)}
                        </Text>
                        <Text style={styles.workoutTypeName}>{type}</Text>
                      </View>
                      <Text style={styles.workoutTypeCount}>{count}</Text>
                    </View>
                  ),
                )}
              </View>
            </View>
          )}

        {/* Progress Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Insights</Text>
          <View style={styles.insightsContainer}>
            {workoutStats?.totalWorkouts === 0 ? (
              <Text style={styles.insightText}>
                🎯 Start your fitness journey by completing your first workout!
              </Text>
            ) : (
              <>
                {workoutStats && workoutStats.totalWorkouts > 0 && (
                  <Text style={styles.insightText}>
                    🔥 You've completed {workoutStats.totalWorkouts} workout
                    {workoutStats.totalWorkouts > 1 ? "s" : ""} this{" "}
                    {selectedRange}!
                  </Text>
                )}

                {workoutStats && workoutStats.totalCalories > 500 && (
                  <Text style={styles.insightText}>
                    💪 Great job burning{" "}
                    {workoutStats.totalCalories.toLocaleString()} calories!
                  </Text>
                )}

                {workoutStats && workoutStats.averageDuration > 30 && (
                  <Text style={styles.insightText}>
                    ⏱️ Your average workout duration of{" "}
                    {Math.round(workoutStats.averageDuration)} minutes shows
                    great consistency!
                  </Text>
                )}

                {workoutStats &&
                  Object.keys(workoutStats.workoutsByType).length > 2 && (
                    <Text style={styles.insightText}>
                      🎨 Excellent variety! You're training different muscle
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
    padding: THEME.spacing.lg,
    margin: THEME.spacing.md,
  },

  header: {
    marginBottom: THEME.spacing.lg,
  },

  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  timeRangeSelector: {
    flexDirection: "row",
    backgroundColor: THEME.colors.backgroundSecondary,
    borderRadius: THEME.borderRadius.md,
    padding: 4,
  },

  timeRangeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
  },

  timeRangeButtonActive: {
    backgroundColor: THEME.colors.primary,
  },

  timeRangeIcon: {
    fontSize: 16,
    marginRight: THEME.spacing.xs,
  },

  timeRangeLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },

  timeRangeLabelActive: {
    color: THEME.colors.white,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: THEME.spacing.lg,
  },

  statItem: {
    width: "50%",
    alignItems: "center",
    paddingVertical: THEME.spacing.md,
  },

  statValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
    marginBottom: THEME.spacing.xs,
  },

  statLabel: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.fontWeight.medium,
  },

  section: {
    marginBottom: THEME.spacing.lg,
  },

  sectionTitle: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },

  workoutTypesContainer: {
    gap: THEME.spacing.sm,
  },

  workoutTypeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },

  workoutTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  workoutTypeIcon: {
    fontSize: 20,
    marginRight: THEME.spacing.sm,
  },

  workoutTypeName: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    fontWeight: THEME.fontWeight.medium,
    textTransform: "capitalize",
  },

  workoutTypeCount: {
    fontSize: THEME.fontSize.lg,
    color: THEME.colors.primary,
    fontWeight: THEME.fontWeight.bold,
  },

  insightsContainer: {
    gap: THEME.spacing.sm,
  },

  insightText: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    backgroundColor: THEME.colors.backgroundSecondary,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },

  loadingText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.textSecondary,
    textAlign: "center",
    paddingVertical: THEME.spacing.xl,
  },

  errorText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.error,
    textAlign: "center",
    paddingVertical: THEME.spacing.xl,
  },
});
