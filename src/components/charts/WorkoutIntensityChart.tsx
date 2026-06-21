import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rs, rp, rbr } from "../../utils/responsive";
import { getLocalDateString } from "../../utils/weekUtils";

interface WorkoutDay {
  date: string;
  intensity: number; // 0-5 scale
  duration: number; // minutes
  type: string;
}

interface WorkoutIntensityChartProps {
  data: WorkoutDay[];
  style?: StyleProp<ViewStyle>;
}

export const WorkoutIntensityChart: React.FC<WorkoutIntensityChartProps> = ({
  data,
  style,
}) => {
  // Generate calendar grid for the last 12 weeks, aligned to Monday-first weeks
  const generateCalendarData = () => {
    const weeks = [];
    const today = new Date();
    // Align start to Monday of the week 12 weeks ago
    const startDate = new Date(today);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Go to this Monday
    startDate.setDate(startDate.getDate() - 12 * 7); // Then back 12 weeks

    for (let week = 0; week < 12; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);

        const dateString = getLocalDateString(currentDate);
        const workoutData = data.find((workout) => workout.date === dateString);

        weekData.push({
          date: currentDate,
          dateString,
          workout: workoutData,
        });
      }
      weeks.push(weekData);
    }

    return weeks;
  };

  const calendarData = generateCalendarData();
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  // Get intensity color
  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return colors.surface;

    const intensityColors = [
      colors.surface,
      "#1a3d2e", // Very light green
      "#2d5a3d", // Light green
      "#40774c", // Medium green
      "#53945b", // Dark green
      colors.success, // Darkest green
    ];

    return intensityColors[Math.min(intensity, 5)];
  };

  // Calculate stats
  const totalWorkouts = data.length;
  const averageIntensity =
    data.length > 0
      ? data.reduce((sum, workout) => sum + workout.intensity, 0) / data.length
      : 0;
  const totalDuration = data.reduce(
    (sum, workout) => sum + workout.duration,
    0,
  );

  const [selectedDay, setSelectedDay] = React.useState<any>(null);

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Workout Intensity</Text>
        <Text style={styles.subtitle}>Last 12 weeks</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalWorkouts}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{averageIntensity.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg Intensity</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {Math.round(totalDuration / 60)}h
          </Text>
          <Text style={styles.statLabel}>Total Time</Text>
        </View>
      </View>

      {/* Calendar Heatmap */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.calendarContainer}>
          {/* Day labels */}
          <View style={styles.dayLabelsContainer}>
            {dayLabels.map((label, index) => (
              <Text key={index} style={styles.dayLabel}>
                {label}
              </Text>
            ))}
          </View>

          {/* Calendar grid */}
          <View style={styles.calendarGrid}>
            {calendarData.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekColumn}>
                {week.map((day, dayIndex) => (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      {
                        backgroundColor: getIntensityColor(
                          day.workout?.intensity || 0,
                        ),
                      },
                    ]}
                    onPress={() => setSelectedDay(day)}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendLabel}>Less</Text>
        <View style={styles.legendScale}>
          {[0, 1, 2, 3, 4, 5].map((intensity) => (
            <View
              key={intensity}
              style={[
                styles.legendCell,
                { backgroundColor: getIntensityColor(intensity) },
              ]}
            />
          ))}
        </View>
        <Text style={styles.legendLabel}>More</Text>
      </View>

      {/* Selected Day Info */}
      {selectedDay && selectedDay.workout && (
        <View style={styles.selectedDayContainer}>
          <Text style={styles.selectedDayDate}>
            {selectedDay.date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </Text>
          <View style={styles.selectedDayStats}>
            <View style={styles.selectedDayStat}>
              <Text style={styles.selectedDayStatLabel}>Type</Text>
              <Text style={styles.selectedDayStatValue}>
                {selectedDay.workout.type}
              </Text>
            </View>
            <View style={styles.selectedDayStat}>
              <Text style={styles.selectedDayStatLabel}>Duration</Text>
              <Text style={styles.selectedDayStatValue}>
                {selectedDay.workout.duration}m
              </Text>
            </View>
            <View style={styles.selectedDayStat}>
              <Text style={styles.selectedDayStatLabel}>Intensity</Text>
              <Text style={styles.selectedDayStatValue}>
                {selectedDay.workout.intensity}/5
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },

  header: {
    marginBottom: spacing.md,
  },

  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },

  subtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },

  statItem: {
    alignItems: "center",
  },

  statValue: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },

  calendarContainer: {
    marginVertical: spacing.md,
  },

  dayLabelsContainer: {
    flexDirection: "column",
    marginRight: spacing.sm,
  },

  dayLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    height: rs(14),
    textAlign: "center",
    marginBottom: rp(2),
  },

  calendarGrid: {
    flexDirection: "row",
    position: "absolute",
    left: rp(20),
    top: 0,
  },

  weekColumn: {
    flexDirection: "column",
    marginRight: rp(2),
  },

  dayCell: {
    width: rs(12),
    height: rs(12),
    borderRadius: rbr(2),
    marginBottom: rp(2),
  },

  legendContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },

  legendLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  legendScale: {
    flexDirection: "row",
    marginHorizontal: spacing.sm,
  },

  legendCell: {
    width: rs(12),
    height: rs(12),
    borderRadius: rbr(2),
    marginHorizontal: rp(1),
  },

  selectedDayContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
  },

  selectedDayDate: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  selectedDayStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  selectedDayStat: {
    alignItems: "center",
  },

  selectedDayStatLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },

  selectedDayStatValue: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
    marginTop: spacing.xs / 2,
  },
});
