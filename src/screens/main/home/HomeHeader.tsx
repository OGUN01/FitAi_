/**
 * HomeHeader Component
 * Premium header with greeting, date, weather-style summary
 */

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rp, rs } from "../../../utils/responsive";

const avatarGradientShadow = {
  shadowColor: ResponsiveTheme.colors.black,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
};

interface HomeHeaderProps {
  userName: string;
  userInitial: string;
  streak: number;
  onProfilePress: () => void;
  onNotificationPress?: () => void;
  onStreakPress?: () => void;
  notificationCount?: number;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  userName,
  userInitial,
  streak,
  onProfilePress,
  onStreakPress,
  onNotificationPress,
  notificationCount = 0,
}) => {
  const hour = new Date().getHours();
  const { greeting, icon, gradientColors } = (() => {
    if (hour >= 5 && hour < 12) {
      return {
        greeting: "Good morning",
        icon: "sunny" as const,
        gradientColors: ["#FF9500", "#FF6B00"] as [string, string],
      };
    }
    if (hour >= 12 && hour < 18) {
      return {
        greeting: "Good afternoon",
        icon: "partly-sunny" as const,
        gradientColors: [ResponsiveTheme.colors.errorLight, ResponsiveTheme.colors.accent] as [string, string],
      };
    }
    return {
      greeting: "Good evening",
      icon: "moon" as const,
      gradientColors: [ResponsiveTheme.colors.primary, ResponsiveTheme.colors.primaryDark] as [string, string],
    };
  })();

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <View style={styles.container}>
      {/* Main Header Row */}
      <View style={styles.headerRow}>
        {/* Left: Avatar */}
        <AnimatedPressable
          onPress={onProfilePress}
          scaleValue={0.95}
          hapticFeedback={true}
          hapticType="light"
          accessibilityRole="button"
          accessibilityLabel="Profile"
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.avatarGradient, Platform.OS !== 'web' && avatarGradientShadow]}
          >
            <Text style={styles.avatarText}>{(userInitial || '').toUpperCase()}</Text>
          </LinearGradient>
        </AnimatedPressable>

        {/* Center: Greeting + Name */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Ionicons
              name={icon}
              size={rf(14)}
              color={gradientColors[0]}
              style={styles.greetingIcon}
            />
          </View>
          <Text style={styles.userName} numberOfLines={1}>
            {userName}
          </Text>
          <Text style={styles.dateText}>{todayDate}</Text>
        </View>

        {/* Right: Actions */}
        <View style={styles.rightSection}>
          {/* Streak Badge */}
          {streak > 0 && (
            <AnimatedPressable
              onPress={onStreakPress}
              scaleValue={0.92}
              hapticFeedback={true}
              hapticType="light"
              style={styles.streakBadge}
              accessibilityRole="button"
              accessibilityLabel={`${streak} day streak`}
            >
              <Ionicons name="flame" size={rf(16)} color={ResponsiveTheme.colors.errorLight} />
              <Text style={styles.streakNumber}>{streak}</Text>
            </AnimatedPressable>
          )}

          {/* Notification Bell */}
          <AnimatedPressable
            onPress={onNotificationPress}
            scaleValue={0.92}
            hapticFeedback={true}
            hapticType="light"
            style={styles.notificationBtn}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons
              name="notifications-outline"
              size={rf(20)}
              color={ResponsiveTheme.colors.text}
            />
            {notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Text>
              </View>
            )}
          </AnimatedPressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: rp(16),
    paddingTop: rp(4),
    paddingBottom: rp(8),
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.md,
  },
  avatarGradient: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  avatarText: {
    fontSize: rf(16),
    fontWeight: "800",
    color: ResponsiveTheme.colors.white,
  },
  greetingSection: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  greetingText: {
    fontSize: rf(13),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  greetingIcon: {
    marginLeft: rp(4),
  },
  userName: {
    fontSize: rf(22),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
    letterSpacing: -0.5,
    marginTop: rp(2),
  },
  dateText: {
    fontSize: rf(12),
    fontWeight: '500',
    color: ResponsiveTheme.colors.text,
    marginTop: rp(2),
    opacity: 0.75,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
    backgroundColor: ResponsiveTheme.colors.errorTint,
    paddingHorizontal: rp(10),
    paddingVertical: rp(6),
    borderRadius: rw(20),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primaryFaded,
  },
  streakNumber: {
    fontSize: rf(15),
    fontWeight: "800",
    color: ResponsiveTheme.colors.errorLight,
  },
  notificationBtn: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(18),
    backgroundColor: ResponsiveTheme.colors.glassBorder,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.glassHighlight,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    backgroundColor: ResponsiveTheme.colors.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: rp(4),
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.background,
  },
  notificationBadgeText: {
    fontSize: rf(10),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
  },
});

export default HomeHeader;
