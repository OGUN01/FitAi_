/**
 * WeeklyMiniCalendar Component
 * Compact 7-day view - NO redundant legend
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing } from "../../../theme/aurora-tokens";
import { rf, rw, rp } from "../../../utils/responsive";

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

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export const WeeklyMiniCalendar: React.FC<WeeklyMiniCalendarProps> = ({
  weekData,
  onDayPress,
  onViewFullCalendar,
}) => {
  const week = useMemo(() => {
    // SSOT: do not fabricate workout data when the caller has none. Returning
    // an empty array renders an empty grid rather than fake Mon-Fri workouts.
    if (weekData && weekData.length === 7) return weekData;
    return [] as DayActivity[];
  }, [weekData]);

  const stats = useMemo(() => {
    const completed = week.filter((d) => d.workoutCompleted).length;
    const total = week.filter((d) => d.hasWorkout).length;
    return { completed, total };
  }, [week]);

  // No real week data → render nothing rather than an empty/misleading card.
  if (week.length === 0) return null;

  return (
    <View>
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
                color={colors.primary}
              />
            </View>
            <Text style={styles.headerTitle}>This Week</Text>
          </View>
          <AnimatedPressable
            onPress={onViewFullCalendar}
            scaleValue={0.97}
            hapticFeedback={true}
            hapticType="light"
            style={styles.statsRow}
          >
            <Text style={styles.statsText}>
              {stats.completed}/{stats.total}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={rf(14)}
              color={colors.textSecondary}
            />
          </AnimatedPressable>
        </View>

        {/* Week Grid */}
        <View style={styles.weekGrid}>
          {week.map((day, index) => {
            const today = new Date();
            const isToday = day.date.toDateString() === today.toDateString();
            const isPast = day.date < today && !isToday;

            let cellStyle = styles.defaultCell;
            let textColor = colors.textSecondary;

            if (isToday) {
              cellStyle = styles.todayCell;
              textColor = colors.primary;
            } else if (day.workoutCompleted) {
              cellStyle = styles.completedCell;
              textColor = colors.white;
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
                hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
              >
                <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                  {DAY_LABELS[index]}
                </Text>
                <View style={[styles.dayCell, cellStyle]}>
                  {day.workoutCompleted ? (
                    <Ionicons name="checkmark" size={rf(14)} color={colors.white} />
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
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIconBg: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: `${colors.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: rf(14),
    fontWeight: "700",
    color: colors.text,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statsText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: colors.textSecondary,
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayWrapper: {
    flex: 1,
    alignItems: "center",
    gap: rp(4),
    minHeight: 44,
    justifyContent: "center",
  },
  dayLabel: {
    fontSize: rf(10),
    fontWeight: "600",
    color: colors.textSecondary,
  },
  todayLabel: {
    color: colors.primary,
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
    backgroundColor: colors.backgroundTertiary,
  },
  todayCell: {
    backgroundColor: `${colors.primary}15`,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  completedCell: {
    backgroundColor: colors.success,
  },
  restCell: {
    backgroundColor: `${colors.info}10`,
  },
  missedCell: {
    backgroundColor: `${colors.error}10`,
  },
});

export default WeeklyMiniCalendar;
