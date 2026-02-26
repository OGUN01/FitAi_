import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp } from "../../utils/responsive";
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

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  statItem: {
    width: "50%",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
  },

  statValue: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  statLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: ResponsiveTheme.fontWeight.medium,
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

  workoutTypesContainer: {
    gap: ResponsiveTheme.spacing.sm,
  },

  workoutTypeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    padding: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  workoutTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  workoutTypeIcon: {
    fontSize: rf(20),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  workoutTypeName: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    textTransform: "capitalize",
  },

  workoutTypeCount: {
    fontSize: ResponsiveTheme.fontSize.lg,
    color: ResponsiveTheme.colors.primary,
    fontWeight: ResponsiveTheme.fontWeight.bold,
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

  errorText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.error,
    textAlign: "center",
    paddingVertical: ResponsiveTheme.spacing.xl,
  },
});
