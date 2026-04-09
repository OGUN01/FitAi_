/**
 * TodayWorkoutCard Component
 * Primary action card showing today's scheduled workout with quick start
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rp } from "../../../utils/responsive";
import { DayWorkout } from "../../../ai";

interface TodayWorkoutCardProps {
  workout: DayWorkout | null;
  isRestDay: boolean;
  isCompleted: boolean;
  progress: number;
  /** When provided, overrides workout.estimatedCalories for the calories display.
   *  Pass actual burned calories when the workout is partially or fully complete. */
  displayCalories?: number;
  /** GAP-15: ISO string of when this workout was last completed (any week). */
  lastPerformedAt?: string;
  onStartWorkout: () => void;
  onViewDetails: () => void;
  onRecoveryTips?: () => void;
  selectedDay?: string;
  isToday?: boolean;
}

// Helper to format day name for display
const formatDayName = (day: string): string => {
  return day.charAt(0).toUpperCase() + day.slice(1);
};

export const TodayWorkoutCard: React.FC<TodayWorkoutCardProps> = ({
  workout,
  isRestDay,
  isCompleted,
  progress,
  displayCalories,
  lastPerformedAt,
  onStartWorkout,
  onViewDetails,
  onRecoveryTips,
  selectedDay,
  isToday = true,
}) => {
  const getStatusConfig = () => {
    if (isCompleted) {
      return {
        icon: "checkmark-circle" as const,
        color: ResponsiveTheme.colors.successAlt,
        gradient: [ResponsiveTheme.colors.successAlt, "#059669"] as [string, string],
        label: "Completed",
        buttonText: "View Summary",
      };
    }
    if (isRestDay) {
      return {
        icon: "moon" as const,
        color: ResponsiveTheme.colors.primary,
        gradient: [ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryDark] as [string, string],
        label: "Rest Day",
        buttonText: "Recovery Tips",
      };
    }
    if (progress > 0) {
      return {
        icon: "play-circle" as const,
        color: ResponsiveTheme.colors.errorLight,
        gradient: [ResponsiveTheme.colors.errorLight, "#FF8E53"] as [string, string],
        label: `${progress}% Complete`,
        buttonText: "Continue",
      };
    }
    return {
      icon: "fitness" as const,
      color: ResponsiveTheme.colors.errorLight,
      gradient: [ResponsiveTheme.colors.errorLight, "#FF8E53"] as [string, string],
      label: "Ready to Go",
      buttonText: "Start Workout",
    };
  };

  const config = getStatusConfig();
  const exerciseCount = workout?.exercises?.length || 0;

  return (
    <Animated.View entering={FadeInDown.delay(200).duration(400)}>
      <GlassCard
        elevation={3}
        blurIntensity="light"
        padding="none"
        borderRadius="xl"
      >
        <Animated.View>
          <View style={styles.container}>
            <Pressable
              onPress={onViewDetails}
              accessibilityLabel={`${isRestDay ? "Rest & Recover" : workout?.title || "Today's Workout"}, ${config.label}`}
              accessibilityHint="Double tap to view details"
            >
            {/* Top Section - Status + Info */}
            <View style={styles.topSection}>
              {/* Left: Icon */}
              <LinearGradient
                colors={config.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <Ionicons name={config.icon} size={rf(28)} color={ResponsiveTheme.colors.white} />
              </LinearGradient>

              {/* Middle: Workout Info */}
              <View style={styles.infoContainer}>
                {/* Day indicator when not viewing today */}
                {!isToday && selectedDay && (
                  <View style={styles.dayIndicator}>
                    <Ionicons
                      name="calendar-outline"
                      size={rf(12)}
                      color={ResponsiveTheme.colors.primary}
                    />
                    <Text style={styles.dayIndicatorText}>
                      {formatDayName(selectedDay)}
                    </Text>
                  </View>
                )}
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={2}>
                    {isRestDay
                      ? "Rest & Recover"
                      : workout?.title ||
                        (isToday ? "Today's Workout" : "No Workout")}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: `${config.color}20` },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: config.color },
                      ]}
                    />
                    <Text style={[styles.statusText, { color: config.color }]}>
                      {config.label}
                    </Text>
                  </View>
                </View>

                  {!isRestDay && workout && (
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="time-outline"
                        size={rf(14)}
                        color={ResponsiveTheme.colors.textSecondary}
                      />
                      <Text style={styles.metaText}>
                        {workout.duration} min
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="flame-outline"
                        size={rf(14)}
                        color={ResponsiveTheme.colors.textSecondary}
                      />
                      <Text style={styles.metaText}>
                        {displayCalories !== undefined
                          ? displayCalories
                          : (workout.estimatedCalories || 0)} cal
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="barbell-outline"
                        size={rf(14)}
                        color={ResponsiveTheme.colors.textSecondary}
                      />
                      <Text style={styles.metaText}>
                        {exerciseCount} exercises
                      </Text>
                    </View>
                  </View>
                )}

                {/* GAP-15: Last performed context */}
                {!isRestDay && !isCompleted && lastPerformedAt && (
                  <Text style={styles.lastPerformedText}>
                    Last done: {new Date(lastPerformedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </Text>
                )}

                {isRestDay && (
                  <Text style={styles.restDaySubtitle}>
                    Recovery is essential for muscle growth and preventing
                    injury
                  </Text>
                )}
              </View>
            </View>

            {/* Progress Bar (if in progress) */}
            {progress > 0 && progress < 100 && !isRestDay && (
              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress}%`, backgroundColor: config.color },
                    ]}
                  />
                </View>
              </View>
            )}
            </Pressable>

            {/* Bottom Section - Action Button */}
            <View style={styles.bottomSection}>
              <AnimatedPressable
                onPress={
                  isRestDay && onRecoveryTips
                    ? onRecoveryTips
                    : isCompleted
                      ? onViewDetails
                      : onStartWorkout
                }
                scaleValue={0.96}
                hapticFeedback={true}
                hapticType="medium"
                style={styles.actionButton}
              >
                <LinearGradient
                  colors={config.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButtonGradient}
                >
                  <Text style={styles.actionButtonText}>
                    {config.buttonText}
                  </Text>
                  <Ionicons
                    name={
                      isRestDay
                        ? "leaf-outline"
                        : isCompleted
                          ? "eye-outline"
                          : "arrow-forward"
                    }
                    size={rf(18)}
                    color={ResponsiveTheme.colors.white}
                  />
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </View>
        </Animated.View>
      </GlassCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: ResponsiveTheme.spacing.lg,
  },
  topSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: ResponsiveTheme.spacing.md,
  },
  iconContainer: {
    width: rw(56),
    height: rw(56),
    borderRadius: rw(16),
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
  },
  dayIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  dayIndicatorText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: ResponsiveTheme.spacing.sm,
    flexWrap: "nowrap",
  },
  title: {
    fontSize: rf(17),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(5),
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: rp(4),
    borderRadius: ResponsiveTheme.borderRadius.full,
    flexShrink: 0,
  },
  statusDot: {
    width: rw(6),
    height: rw(6),
    borderRadius: rw(3),
  },
  statusText: {
    fontSize: rf(11),
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
  },
  metaText: {
    fontSize: rf(12),
    color: "rgba(255,255,255,0.65)",
  },
  restDaySubtitle: {
    fontSize: rf(12),
    color: "rgba(255,255,255,0.6)",
    marginTop: ResponsiveTheme.spacing.xs,
    lineHeight: rf(18),
  },
  progressSection: {
    marginTop: ResponsiveTheme.spacing.md,
  },
  progressBar: {
    height: rh(6),
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: rh(3),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: rh(3),
  },
  bottomSection: {
    marginTop: ResponsiveTheme.spacing.lg,
    marginBottom: rh(4),
  },
  // GAP-15: last performed label
  lastPerformedText: {
    fontSize: rf(11),
    color: 'rgba(255,255,255,0.4)',
    marginTop: ResponsiveTheme.spacing.xs,
    fontStyle: 'italic',
  },
  actionButton: {
    borderRadius: ResponsiveTheme.borderRadius.lg,
    overflow: "hidden",
  },
  actionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.md + 2,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  actionButtonText: {
    fontSize: rf(15),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
    letterSpacing: 0.5,
  },
});

export default TodayWorkoutCard;
