import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { THEME } from '../../utils/constants';

interface WorkoutDay {
  date: string;
  intensity: number; // 0-5 scale
  duration: number; // minutes
  type: string;
}

interface WorkoutIntensityChartProps {
  data: WorkoutDay[];
  style?: any;
}

export const WorkoutIntensityChart: React.FC<WorkoutIntensityChartProps> = ({ data, style }) => {
  // Generate calendar grid for the last 12 weeks
  const generateCalendarData = () => {
    const weeks = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 12 * 7); // 12 weeks ago

    for (let week = 0; week < 12; week++) {
      const weekData = [];
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);

        const dateString = currentDate.toISOString().split('T')[0];
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
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Get intensity color
  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return THEME.colors.surface;

    const colors = [
      THEME.colors.surface,
      '#1a3d2e', // Very light green
      '#2d5a3d', // Light green
      '#40774c', // Medium green
      '#53945b', // Dark green
      THEME.colors.success, // Darkest green
    ];

    return colors[Math.min(intensity, 5)];
  };

  // Calculate stats
  const totalWorkouts = data.length;
  const averageIntensity =
    data.length > 0 ? data.reduce((sum, workout) => sum + workout.intensity, 0) / data.length : 0;
  const totalDuration = data.reduce((sum, workout) => sum + workout.duration, 0);

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
          <Text style={styles.statValue}>{Math.round(totalDuration / 60)}h</Text>
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
                        backgroundColor: getIntensityColor(day.workout?.intensity || 0),
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
              style={[styles.legendCell, { backgroundColor: getIntensityColor(intensity) }]}
            />
          ))}
        </View>
        <Text style={styles.legendLabel}>More</Text>
      </View>

      {/* Selected Day Info */}
      {selectedDay && selectedDay.workout && (
        <View style={styles.selectedDayContainer}>
          <Text style={styles.selectedDayDate}>
            {selectedDay.date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
          <View style={styles.selectedDayStats}>
            <View style={styles.selectedDayStat}>
              <Text style={styles.selectedDayStatLabel}>Type</Text>
              <Text style={styles.selectedDayStatValue}>{selectedDay.workout.type}</Text>
            </View>
            <View style={styles.selectedDayStat}>
              <Text style={styles.selectedDayStatLabel}>Duration</Text>
              <Text style={styles.selectedDayStatValue}>{selectedDay.workout.duration}m</Text>
            </View>
            <View style={styles.selectedDayStat}>
              <Text style={styles.selectedDayStatLabel}>Intensity</Text>
              <Text style={styles.selectedDayStatValue}>{selectedDay.workout.intensity}/5</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.backgroundTertiary,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.md,
    marginVertical: THEME.spacing.sm,
  },

  header: {
    marginBottom: THEME.spacing.md,
  },

  title: {
    fontSize: THEME.fontSize.lg,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
  },

  subtitle: {
    fontSize: THEME.fontSize.sm,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 2,
  },

  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    fontSize: THEME.fontSize.xl,
    fontWeight: THEME.fontWeight.bold,
    color: THEME.colors.primary,
  },

  statLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
    marginTop: THEME.spacing.xs / 2,
  },

  calendarContainer: {
    marginVertical: THEME.spacing.md,
  },

  dayLabelsContainer: {
    flexDirection: 'column',
    marginRight: THEME.spacing.sm,
  },

  dayLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
    height: 14,
    textAlign: 'center',
    marginBottom: 2,
  },

  calendarGrid: {
    flexDirection: 'row',
    position: 'absolute',
    left: 20,
    top: 0,
  },

  weekColumn: {
    flexDirection: 'column',
    marginRight: 2,
  },

  dayCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginBottom: 2,
  },

  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.md,
  },

  legendLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textMuted,
  },

  legendScale: {
    flexDirection: 'row',
    marginHorizontal: THEME.spacing.sm,
  },

  legendCell: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginHorizontal: 1,
  },

  selectedDayContainer: {
    marginTop: THEME.spacing.md,
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
  },

  selectedDayDate: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: THEME.colors.text,
    marginBottom: THEME.spacing.sm,
  },

  selectedDayStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  selectedDayStat: {
    alignItems: 'center',
  },

  selectedDayStatLabel: {
    fontSize: THEME.fontSize.xs,
    color: THEME.colors.textSecondary,
  },

  selectedDayStatValue: {
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
    color: THEME.colors.text,
    marginTop: THEME.spacing.xs / 2,
  },
});
