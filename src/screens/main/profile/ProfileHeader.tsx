/**
 * ProfileHeader - Compact Hero Section with Avatar and User Info
 *
 * Features:
 * - Compact animated avatar with edit badge
 * - User name and member since date
 * - Minimal, elegant design
 * - NO streak badge (moved to stats row)
 */

import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import {
  gradientAuroraSpace,
  toLinearGradientProps,
} from "../../../theme/gradients";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rp, rbr, rw } from "../../../utils/responsive";

const avatarShadow = {
  shadowColor: ResponsiveTheme.colors.errorLight,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
};

interface ProfileHeaderProps {
  userName: string;
  memberSince?: string | null;
  onEditPress: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userName,
  memberSince,
  onEditPress: _onEditPress,
}) => {
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <LinearGradient
      {...toLinearGradientProps(gradientAuroraSpace)}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Avatar (non-interactive — use Personal Information below to edit) */}
        <Animated.View
          entering={FadeIn.delay(100).duration(400)}
          style={styles.avatarContainer}
        >
          <LinearGradient
            colors={["#FF6B6B", "#FF8E53"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.avatar, Platform.OS !== 'web' && avatarShadow]}
          >
            <Text style={styles.avatarText}>{getInitials(userName)}</Text>
          </LinearGradient>
        </Animated.View>

        {/* User Info */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <Text style={styles.userName}>{userName || "Fitness Champion"}</Text>
          <Text style={styles.memberSince}>
            {memberSince === null || memberSince === undefined
              ? "Just joined today"
              : /^\d+ (day|week)/.test(memberSince)
                ? `Member for ${memberSince}`
                : `Member since ${memberSince}`}
          </Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.lg,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  content: {
    alignItems: "center",
  },
  avatarContainer: {
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  avatar: {
    width: rw(80),
    height: rw(80),
    borderRadius: rw(40),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.25)",
    elevation: 8,
  },
  avatarText: {
    fontSize: rf(32),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
    lineHeight: rw(80),
    textAlignVertical: "center",
    includeFontPadding: false,
  },

  userName: {
    fontSize: rf(22),
    fontWeight: "700",
    color: ResponsiveTheme.colors.white,
    textAlign: "center",
    marginBottom: rp(2),
    letterSpacing: 0.3,
  },
  memberSince: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.text,
    textAlign: 'center',
    opacity: 0.85,
  },
});

export default ProfileHeader;
