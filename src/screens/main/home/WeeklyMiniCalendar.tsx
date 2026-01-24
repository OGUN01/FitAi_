/**
 * WeeklyMiniCalendar Component
 * Compact 7-day view - NO redundant legend
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw } from "../../../utils/responsive";

interface DayActivity {
  date: Date;
  hasWorkout: boolean;
  workoutCompleted: boolean;
  isRestDay: boolean;
}

interface WeeklyMiniCalendarProps {
  weekData?: DayActivity[];
  onDayPress?: (date: Date) => void;
  onViewFullCalendar?: () => void;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export const WeeklyMiniCalendar: React.FC<WeeklyMiniCalendarProps> = ({
  weekData,
  onDayPress,
  onViewFullCalendar,
}) => {
  const week = useMemo(() => {
    if (weekData && weekData.length === 7) return weekData;

    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return {
        date,
        hasWorkout: i !== 0 && i !== 6,
        workoutCompleted: false,
        isRestDay: i === 0 || i === 6,
      };
    });
  }, [weekData]);

  const stats = useMemo(() => {
    const completed = week.filter((d) => d.workoutCompleted).length;
    const total = week.filter((d) => d.hasWorkout).length;
    return { completed, total };
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
            <View style={styles.headerIconBg}>
              <Ionicons
                name="calendar-outline"
                size={rf(14)}
                color={ResponsiveTheme.colors.primary}
              />
            </View>
            <Text style={styles.headerTitle}>This Week</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.statsText}>
              {stats.completed}/{stats.total}
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

            let cellStyle = styles.defaultCell;
            let textColor = ResponsiveTheme.colors.textSecondary;

            if (isToday) {
              cellStyle = styles.todayCell;
              textColor = ResponsiveTheme.colors.primary;
            } else if (day.workoutCompleted) {
              cellStyle = styles.completedCell;
              textColor = "#fff";
            } else if (day.isRestDay) {
              cellStyle = styles.restCell;
            } else if (isPast && day.hasWorkout) {
              cellStyle = styles.missedCell;
            }

            return (
              <AnimatedPressable
                key={index}
                onPress={() => onDayPress?.(day.date)}
                scaleValue={0.9}
                hapticFeedback={true}
                hapticType="light"
                style={styles.dayWrapper}
              >
                <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                  {DAY_LABELS[index]}
                </Text>
                <View style={[styles.dayCell, cellStyle]}>
                  {day.workoutCompleted ? (
                    <Ionicons name="checkmark" size={rf(14)} color="#fff" />
                  ) : (
                    <Text style={[styles.dayNumber, { color: textColor }]}>
                      {day.date.getDate()}
                    </Text>
                  )}
                </View>
              </AnimatedPressable>
            );
          })}
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
    gap: ResponsiveTheme.spacing.sm,
  },
  headerIconBg: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: `${ResponsiveTheme.colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  statsText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayWrapper: {
    alignItems: "center",
    gap: 4,
  },
  dayLabel: {
    fontSize: rf(10),
    fontWeight: "600",
    color: ResponsiveTheme.colors.textSecondary,
  },
  todayLabel: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: "700",
  },
  dayCell: {
    width: rw(34),
    height: rw(34),
    borderRadius: rw(17),
    justifyContent: "center",
    alignItems: "center",
  },
  dayNumber: {
    fontSize: rf(12),
    fontWeight: "600",
  },
  defaultCell: {
    backgroundColor: ResponsiveTheme.colors.backgroundTertiary,
  },
  todayCell: {
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary,
  },
  completedCell: {
    backgroundColor: ResponsiveTheme.colors.success,
  },
  restCell: {
    backgroundColor: `${ResponsiveTheme.colors.info}10`,
  },
  missedCell: {
    backgroundColor: `${ResponsiveTheme.colors.error}10`,
  },
});

export default WeeklyMiniCalendar;
