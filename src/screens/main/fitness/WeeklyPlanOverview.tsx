/**
 * WeeklyPlanOverview Component
 * Compact weekly calendar with workout stats and visual progress
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rp, rbr } from "../../../utils/responsive";
import { WeeklyWorkoutPlan } from "../../../ai";
import { DayName } from "../../../stores/appStateStore";
import { useFitnessStore } from "../../../stores/fitnessStore";
import { getCurrentWeekStart } from "../../../utils/weekUtils";
import { findCompletedSessionForWorkout } from "../../../utils/workoutIdentity";

interface WorkoutProgressItem {
  workoutId: string;
  progress: number;
  completedAt?: string;
}

interface WeeklyPlanOverviewProps {
  plan: WeeklyWorkoutPlan;
  workoutProgress: Record<string, WorkoutProgressItem>;
  selectedDay: string;
  onDayPress: (day: DayName) => void;
  onViewFullPlan: () => void;
  onRegeneratePlan?: () => void;
  isRegenerating?: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_KEYS: DayName[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const WeeklyPlanOverview: React.FC<WeeklyPlanOverviewProps> = ({
  plan,
  workoutProgress,
  selectedDay,
  onDayPress,
  onViewFullPlan,
  onRegeneratePlan,
  isRegenerating = false,
}) => {
  const completedSessions = useFitnessStore((state) => state.completedSessions);

  // Calculate stats
  const stats = useMemo(() => {
    const totalWorkouts = plan.workouts?.length || 0;
    const currentPlanIds = new Set((plan.workouts || []).map((w) => w.id));
    const currentWeekStart = getCurrentWeekStart();
    const completedPlannedSessions = completedSessions.filter(
      (session) =>
        session.type === "planned" &&
        session.weekStart === currentWeekStart &&
        currentPlanIds.has(session.workoutId),
    );
    const completedWorkoutIds = new Set(
      completedPlannedSessions.map((session) => session.workoutId),
    );
    const completedWorkouts = completedWorkoutIds.size;
    const completedCalories = completedPlannedSessions.reduce(
      (sum, session) => sum + (session.caloriesBurned ?? 0),
      0,
    );
    const remainingEstimatedCalories = (plan.workouts || [])
      .filter((workout) => !completedWorkoutIds.has(workout.id))
      .reduce((sum, workout) => sum + (workout.estimatedCalories || 0), 0);
    const totalCalories = completedCalories + remainingEstimatedCalories;
    const restDays = plan.restDays?.length || 0;

    return {
      totalWorkouts,
      completedWorkouts,
      totalCalories,
      restDays,
      progressPercent:
        totalWorkouts > 0
          ? Math.round((completedWorkouts / totalWorkouts) * 100)
          : 0,
    };
  }, [completedSessions, plan]);

  // Get day status for mini calendar
  const getDayStatus = (dayKey: string) => {
    const workout = plan.workouts?.find((w) => w.dayOfWeek === dayKey);
    const restDayIndices = plan.restDays || [];
    const dayIndex = DAY_KEYS.indexOf(dayKey as DayName);
    // Handle both number indices (Monday=0) and string day names from AI
    const isRestDay = restDayIndices.some((d: number | string) =>
      typeof d === "string" ? d === dayKey : d === dayIndex
    );
    const completedSession = workout
      ? findCompletedSessionForWorkout({
          completedSessions,
          workout,
          plan,
          weekStart: getCurrentWeekStart(),
        })
      : null;
    const progress = workout
      ? completedSession
        ? 100
        : (workoutProgress[workout.id]?.progress ?? 0)
      : 0;
    const isSelected = selectedDay === dayKey;
    const isToday =
      DAY_KEYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] ===
      dayKey;

    return {
      hasWorkout: !!workout && !isRestDay,
      isRestDay,
      isCompleted: progress === 100,
      isSelected,
      isToday,
      progress,
    };
  };

  return (
    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
      <GlassCard
        elevation={2}
        blurIntensity="light"
        padding="md"
        borderRadius="xl"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.planTitle} numberOfLines={1}>
              {plan.planTitle || "Weekly Workout Plan"}
            </Text>
            <Text style={styles.planSubtitle}>
              {plan.duration
                ? String(plan.duration)
                : `Week ${plan.weekNumber ?? (() => {
                    // Compute real ISO week number when plan.weekNumber is missing
                    const d = new Date();
                    d.setHours(0, 0, 0, 0);
                    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
                    const week1 = new Date(d.getFullYear(), 0, 4);
                    return (
                      1 +
                      Math.round(
                        ((d.getTime() - week1.getTime()) / 86400000 -
                          3 +
                          ((week1.getDay() + 6) % 7)) /
                          7,
                      )
                    );
                  })()}`}
            </Text>
          </View>
          <View style={styles.headerActions}>
          {onRegeneratePlan && (
            <Pressable
              onPress={onRegeneratePlan}
              disabled={isRegenerating}
              accessibilityRole="button"
              accessibilityLabel="Regenerate plan"
              style={styles.regenerateButton}
            >
              <View style={styles.regenerateButtonInner}>
                <Ionicons
                  name={isRegenerating ? "sync" : "refresh"}
                  size={rf(14)}
                  color={
                    isRegenerating
                      ? ResponsiveTheme.colors.textSecondary
                      : ResponsiveTheme.colors.primary
                  }
                />
                <Text style={[styles.regenerateText, isRegenerating && styles.regenerateTextDisabled]}>
                  {isRegenerating ? "Generating..." : "Regenerate"}
                </Text>
              </View>
            </Pressable>
          )}
            <AnimatedPressable
              onPress={onViewFullPlan}
              scaleValue={0.95}
              hapticFeedback={true}
              hapticType="light"
            >
              <View style={styles.seeAllButton}>
                <Text style={styles.seeAllText}>View All</Text>
                <Ionicons
                  name="chevron-forward"
                  size={rf(14)}
                  color={ResponsiveTheme.colors.primary}
                />
              </View>
            </AnimatedPressable>
          </View>
        </View>

        {/* Mini Calendar */}
        <View style={styles.calendarContainer}>
          {DAYS.map((day, index) => {
            const dayKey = DAY_KEYS[index];
            const status = getDayStatus(dayKey);

            return (
              <AnimatedPressable
                key={dayKey}
                onPress={() => onDayPress(dayKey)}
                scaleValue={0.9}
                hapticFeedback={true}
                hapticType="light"
                style={styles.dayContainer}
              >
                <Text
                  style={[
                    styles.dayLabel,
                    status.isToday && styles.dayLabelToday,
                    status.isSelected && styles.dayLabelSelected,
                  ]}
                >
                  {day}
                </Text>
                <View
                  style={[
                    styles.dayCircle,
                    status.isSelected && styles.dayCircleSelected,
                    status.isToday &&
                      !status.isSelected &&
                      styles.dayCircleToday,
                  ]}
                >
                  {status.isCompleted ? (
                    <Ionicons name="checkmark" size={rf(14)} color={ResponsiveTheme.colors.successAlt} />
                  ) : status.isRestDay ? (
                    <Ionicons name="moon" size={rf(12)} color={ResponsiveTheme.colors.primary} />
                  ) : status.hasWorkout ? (
                    <View
                      style={[
                        styles.workoutDot,
                        status.progress > 0 && styles.workoutDotInProgress,
                      ]}
                    />
                  ) : (
                    <View style={styles.emptyDot} />
                  )}
                </View>
              </AnimatedPressable>
            );
          })}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.completedWorkouts}/{stats.totalWorkouts}
            </Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {Math.round(stats.totalCalories)}
            </Text>
            <Text style={styles.statLabel}>Est. Calories</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text
              style={[
                styles.statValue,
                { color: ResponsiveTheme.colors.primary },
              ]}
            >
              {stats.progressPercent}%
            </Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>
      </GlassCard>
    </Animated.View>
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
    flex: 1,
  },
  planTitle: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  planSubtitle: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  regenerateButton: {
    padding: ResponsiveTheme.spacing.xs,
  },
  regenerateButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
  },
  regenerateText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  regenerateTextDisabled: {
    color: ResponsiveTheme.colors.textSecondary,
  },
  spinning: {
    // Animation will be added via Reanimated
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(2),
  },
  seeAllText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  calendarContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  dayContainer: {
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  dayLabel: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    textTransform: "uppercase",
  },
  dayLabelToday: {
    color: ResponsiveTheme.colors.primary,
    fontWeight: "700",
  },
  dayLabelSelected: {
    color: ResponsiveTheme.colors.text,
    fontWeight: "700",
  },
  dayCircle: {
    width: rw(36),
    height: rw(36),
    borderRadius: rbr(18),
    backgroundColor: ResponsiveTheme.colors.glassSurface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassBorder,
  },
  dayCircleSelected: {
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
    borderColor: ResponsiveTheme.colors.primary,
  },
  dayCircleToday: {
    borderColor: ResponsiveTheme.colors.primary,
    borderWidth: 2,
  },
  workoutDot: {
    width: rw(8),
    height: rw(8),
    borderRadius: rbr(4),
    backgroundColor: ResponsiveTheme.colors.errorLight,
  },
  workoutDotInProgress: {
    backgroundColor: ResponsiveTheme.colors.primaryLight,
  },
  emptyDot: {
    width: rw(4),
    height: rw(4),
    borderRadius: rbr(2),
    backgroundColor: ResponsiveTheme.colors.glassHighlight,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassBorder,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: rf(16),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  statLabel: {
    fontSize: rf(10),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  statDivider: {
    width: 1,
    height: rh(24),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
  },
});

export default WeeklyPlanOverview;
