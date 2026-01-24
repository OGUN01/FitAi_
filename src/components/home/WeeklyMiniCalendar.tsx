/**
 * WeeklyMiniCalendar Component
 * 7-day horizontal activity view showing workout completion
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";

interface DayActivity {
  date: Date;
  hasWorkout: boolean;
  workoutCompleted: boolean;
  isRestDay: boolean;
  workoutType?: string;
}

interface WeeklyMiniCalendarProps {
  weekData?: DayActivity[];
  onDayPress?: (date: Date) => void;
  onViewFullCalendar?: () => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Day cell component
const DayCell: React.FC<{
  label: string;
  isToday: boolean;
  hasWorkout: boolean;
  workoutCompleted: boolean;
  isRestDay: boolean;
  isPast: boolean;
  onPress?: () => void;
}> = ({
  label,
  isToday,
  hasWorkout,
  workoutCompleted,
  isRestDay,
  isPast,
  onPress,
}) => {
  // Determine cell state
  const getCellStyle = () => {
    if (isToday) {
      return styles.todayCell;
    }
    if (workoutCompleted) {
      return styles.completedCell;
    }
    if (isRestDay && isPast) {
      return styles.restCell;
    }
    if (hasWorkout && isPast && !workoutCompleted) {
      return styles.missedCell;
    }
    return styles.defaultCell;
  };

  const getIcon = () => {
    if (workoutCompleted) {
      return <Ionicons name="checkmark" size={rf(14)} color="#fff" />;
    }
    if (isRestDay) {
      return (
        <Ionicons
          name="moon"
          size={rf(12)}
          color={ResponsiveTheme.colors.info}
        />
      );
    }
    if (hasWorkout && isPast && !workoutCompleted) {
      return (
        <Ionicons
          name="close"
          size={rf(12)}
          color={ResponsiveTheme.colors.error}
        />
      );
    }
    if (hasWorkout && !isPast) {
      return (
        <Ionicons
          name="fitness"
          size={rf(12)}
          color={ResponsiveTheme.colors.primary}
        />
      );
    }
    return null;
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleValue={0.9}
      hapticFeedback={!!onPress}
      hapticType="light"
      style={styles.dayCellWrapper}
    >
      <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
        {label}
      </Text>
      <View style={[styles.dayCell, getCellStyle()]}>{getIcon()}</View>
    </AnimatedPressable>
  );
};

export const WeeklyMiniCalendar: React.FC<WeeklyMiniCalendarProps> = ({
  weekData,
  onDayPress,
  onViewFullCalendar,
}) => {
  // Generate week data if not provided
  const week = useMemo(() => {
    if (weekData && weekData.length === 7) {
      return weekData;
    }

    // Generate current week starting from Sunday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      // Default: assume rest on Sunday, workout on other days
      const isRestDay = i === 0 || i === 6;

      return {
        date,
        hasWorkout: !isRestDay,
        workoutCompleted: false,
        isRestDay,
      };
    });
  }, [weekData]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    const completed = week.filter((d) => d.workoutCompleted).length;
    const total = week.filter((d) => d.hasWorkout).length;
    const todayIndex = today.getDay();

    return { completed, total, todayIndex };
  }, [week]);

  return (
    <AnimatedPressable
      onPress={onViewFullCalendar}
      scaleValue={0.99}
      hapticFeedback={true}
      hapticType="light"
    >
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="md"
        borderRadius="lg"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="calendar"
              size={rf(16)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text style={styles.headerTitle}>This Week</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.statsText}>
              {stats.completed}/{stats.total} workouts
            </Text>
            <Ionicons
              name="chevron-forward"
              size={rf(14)}
              color={ResponsiveTheme.colors.textSecondary}
            />
          </View>
        </View>

        {/* Week Grid */}
        <View style={styles.weekGrid}>
          {week.map((day, index) => {
            const today = new Date();
            const isToday = day.date.toDateString() === today.toDateString();
            const isPast = day.date < today && !isToday;

            return (
              <DayCell
                key={index}
                label={DAY_LABELS[index]}
                isToday={isToday}
                hasWorkout={day.hasWorkout}
                workoutCompleted={day.workoutCompleted}
                isRestDay={day.isRestDay}
                isPast={isPast}
                onPress={() => onDayPress?.(day.date)}
              />
            );
          })}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: ResponsiveTheme.colors.success },
              ]}
            />
            <Text style={styles.legendText}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: ResponsiveTheme.colors.info },
              ]}
            />
            <Text style={styles.legendText}>Rest</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: ResponsiveTheme.colors.primary },
              ]}
            />
            <Text style={styles.legendText}>Scheduled</Text>
          </View>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  statsText: {
    fontSize: rf(12),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  dayCellWrapper: {
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  dayLabel: {
    fontSize: rf(10),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
  },
  todayLabel: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: "700",
  },
  dayCell: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    justifyContent: "center",
    alignItems: "center",
  },
  defaultCell: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },
  todayCell: {
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
  },
  completedCell: {
    backgroundColor: ResponsiveTheme.colors.success,
  },
  restCell: {
    backgroundColor: `${ResponsiveTheme.colors.info}15`,
  },
  missedCell: {
    backgroundColor: `${ResponsiveTheme.colors.error}15`,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.lg,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  legendDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rw(4),
  },
  legendText: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
  },
});

export default WeeklyMiniCalendar;
