/**
 * FitnessHeader Component
 * Personalized greeting with week indicator and calendar quick access
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius } from "../../../theme/aurora-tokens";
import { rf, rw, rp, rbr } from "../../../utils/responsive";

interface FitnessHeaderProps {
  userName: string;
  weekNumber: number;
  totalWorkouts: number;
  completedWorkouts: number;
  onCalendarPress?: () => void;
}

export const FitnessHeader: React.FC<FitnessHeaderProps> = ({
  userName,
  weekNumber,
  totalWorkouts,
  completedWorkouts,
  onCalendarPress,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const progressPercent =
    totalWorkouts > 0
      ? Math.round((completedWorkouts / totalWorkouts) * 100)
      : 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(100).duration(400)}
      style={styles.container}
    >
      {/* Left: Greeting */}
      <View style={styles.textContainer}>
        <Text style={styles.greeting}>
          {getGreeting()}, {userName}
        </Text>
        <View style={styles.subtitleRow}>
          <View style={styles.weekBadge}>
            <Ionicons
              name="calendar-outline"
              size={rf(12)}
              color={colors.primary}
            />
            <Text style={styles.weekText}>Week {weekNumber}</Text>
          </View>
          {totalWorkouts > 0 && (
            <Text style={styles.progressText}>
              {completedWorkouts}/{totalWorkouts} workouts
            </Text>
          )}
        </View>
      </View>

      {/* Right: Calendar Button */}
      <AnimatedPressable
        onPress={onCalendarPress}
        scaleValue={0.92}
        hapticFeedback={true}
        hapticType="light"
        style={styles.calendarButton}
        accessibilityRole="button"
        accessibilityLabel="Calendar"
      >
        <View style={styles.calendarIconContainer}>
          <Ionicons
            name="calendar"
            size={rf(20)}
            color={colors.text}
          />
          {progressPercent > 0 && progressPercent < 100 && (
            <View style={styles.progressIndicator}>
              <Text style={styles.progressIndicatorText}>
                {progressPercent}%
              </Text>
            </View>
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  textContainer: {
    flex: 1,
    minWidth: 0,
  },
  greeting: {
    fontSize: rf(22),
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  weekBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: rp(4),
    borderRadius: borderRadius.full,
  },
  weekText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.primary,
  },
  progressText: {
    fontSize: rf(12),
    color: colors.textSecondary,
  },
  calendarButton: {
    marginLeft: spacing.md,
  },
  calendarIconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rbr(22),
    backgroundColor: colors.primaryTint,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: `${colors.primary}60`,
  },
  progressIndicator: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: colors.primary,
    paddingHorizontal: rp(5),
    paddingVertical: rp(2),
    borderRadius: rbr(8),
    minWidth: rw(28),
    alignItems: "center",
  },
  progressIndicatorText: {
    fontSize: rf(9),
    fontWeight: "700",
    color: colors.white,
  },
});

export default FitnessHeader;
