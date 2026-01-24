/**
 * WeeklyPlanOverview Component
 * Compact weekly calendar with workout stats and visual progress
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";
import { WeeklyWorkoutPlan } from "../../../ai";

interface WorkoutProgressItem {
  workoutId: string;
  progress: number;
  completedAt?: string;
}

interface WeeklyPlanOverviewProps {
  plan: WeeklyWorkoutPlan;
  workoutProgress: Record<string, WorkoutProgressItem>;
  selectedDay: string;
  onDayPress: (day: string) => void;
  onViewFullPlan: () => void;
  onRegeneratePlan?: () => void;
  isRegenerating?: boolean;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_KEYS = [
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
  // Calculate stats
  const stats = useMemo(() => {
    const totalWorkouts = plan.workouts?.length || 0;
    const completedWorkouts = Object.values(workoutProgress).filter(
      (p) => p.progress === 100,
    ).length;
    const totalCalories = plan.totalEstimatedCalories || 0;
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
  }, [plan, workoutProgress]);

  // Get day status for mini calendar
  const getDayStatus = (dayKey: string) => {
    const workout = plan.workouts?.find((w) => w.dayOfWeek === dayKey);
    const restDays = plan.restDays || [];
    const isRestDay = restDays.includes(
      DAY_KEYS.indexOf(dayKey) as unknown as number,
    );
    const progress = workout ? (workoutProgress[workout.id]?.progress ?? 0) : 0;
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
                : `Week ${plan.weekNumber || 1}`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {onRegeneratePlan && (
              <AnimatedPressable
                onPress={onRegeneratePlan}
                disabled={isRegenerating}
                scaleValue={0.95}
                hapticFeedback={true}
                hapticType="medium"
                style={styles.regenerateButton}
              >
                <Ionicons
                  name={isRegenerating ? "sync" : "refresh"}
                  size={rf(16)}
                  color={
                    isRegenerating
                      ? ResponsiveTheme.colors.textSecondary
                      : ResponsiveTheme.colors.primary
                  }
                  style={isRegenerating ? styles.spinning : undefined}
                />
              </AnimatedPressable>
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
                    <Ionicons name="checkmark" size={rf(14)} color="#10b981" />
                  ) : status.isRestDay ? (
                    <Ionicons name="moon" size={rf(12)} color="#667eea" />
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
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  regenerateButton: {
    padding: ResponsiveTheme.spacing.xs,
    opacity: 1,
  },
  spinning: {
    // Animation will be added via Reanimated
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
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
    borderRadius: rw(18),
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF6B6B",
  },
  workoutDotInProgress: {
    backgroundColor: "#FF8E53",
  },
  emptyDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
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
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: rh(24),
    backgroundColor: "rgba(255,255,255,0.08)",
  },
});

export default WeeklyPlanOverview;
