/**
 * HomeHeader Component
 * Premium header with greeting, date, weather-style summary
 */

import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rp } from "../../../utils/responsive";

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
  const { greeting, icon, gradientColors } = useMemo(() => {
    const hour = new Date().getHours();
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
        gradientColors: ["#FF6B6B", "#FF8E53"] as [string, string],
      };
    }
    return {
      greeting: "Good evening",
      icon: "moon" as const,
      gradientColors: ["#667eea", "#764ba2"] as [string, string],
    };
  }, []);

  const todayDate = useMemo(() => {
    const date = new Date();
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }, []);

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
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>{userInitial.toUpperCase()}</Text>
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
            >
              <Ionicons name="flame" size={rf(16)} color="#FF6B6B" />
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
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: rf(20),
    fontWeight: "800",
    color: "#FFFFFF",
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
    marginLeft: 4,
  },
  userName: {
    fontSize: rf(22),
    fontWeight: "800",
    color: ResponsiveTheme.colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  dateText: {
    fontSize: rf(11),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 107, 107, 0.15)",
    paddingHorizontal: rp(10),
    paddingVertical: rp(6),
    borderRadius: rw(20),
    borderWidth: 1,
    borderColor: "rgba(255, 107, 107, 0.3)",
  },
  streakNumber: {
    fontSize: rf(15),
    fontWeight: "800",
    color: "#FF6B6B",
  },
  notificationBtn: {
    width: rw(42),
    height: rw(42),
    borderRadius: rw(21),
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: rw(18),
    height: rw(18),
    borderRadius: rw(9),
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.background,
  },
  notificationBadgeText: {
    fontSize: rf(10),
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default HomeHeader;
