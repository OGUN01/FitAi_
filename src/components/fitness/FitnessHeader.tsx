/**
 * FitnessHeader Component
 * Personalized greeting with week indicator and calendar quick access
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rp, rbr } from "../../utils/responsive";

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
              color={ResponsiveTheme.colors.primary}
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
            color={ResponsiveTheme.colors.text}
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
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: rf(22),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    letterSpacing: -0.5,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  weekBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: rp(4),
    borderRadius: ResponsiveTheme.borderRadius.full,
  },
  weekText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  progressText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  calendarButton: {
    marginLeft: ResponsiveTheme.spacing.md,
  },
  calendarIconContainer: {
    width: rw(44),
    height: rw(44),
    borderRadius: rw(22),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassHighlight,
  },
  progressIndicator: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: rp(5),
    paddingVertical: rp(2),
    borderRadius: rbr(8),
    minWidth: rp(28),
    alignItems: "center",
  },
  progressIndicatorText: {
    fontSize: rf(9),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
  },
});

export default FitnessHeader;
