/**
 * GuestPromptBanner Component
 * Compact horizontal banner for guest sign-up prompt
 * Fixes Issue #1 - Guest Sign-Up Prompt Card redesign
 *
 * Changed from large card to compact horizontal banner (similar to Diet tab)
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rp } from "../../utils/responsive";

interface GuestPromptBannerProps {
  onSignUpPress: () => void;
}

export const GuestPromptBanner: React.FC<GuestPromptBannerProps> = ({
  onSignUpPress,
}) => {
  return (
    <GlassCard
      elevation={2}
      blurIntensity="light"
      padding="sm"
      borderRadius="lg"
      style={styles.banner}
    >
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons
            name="cloud-upload-outline"
            size={rf(20)}
            color={ResponsiveTheme.colors.primary}
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.title} numberOfLines={1}>
            Save Your Progress
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Sync across devices & backup your data
          </Text>
        </View>

        {/* Sign Up Button */}
        <AnimatedPressable
          onPress={onSignUpPress}
          scaleValue={0.95}
          hapticFeedback={true}
          hapticType="medium"
          style={styles.button}
          accessibilityLabel="Sign up to save your progress"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Sign Up</Text>
          <Ionicons
            name="arrow-forward"
            size={rf(14)}
            color={ResponsiveTheme.colors.white}
          />
        </AnimatedPressable>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: `${ResponsiveTheme.colors.primary}08`,
    borderColor: `${ResponsiveTheme.colors.primary}20`,
    borderWidth: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.xs,
  },
  iconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: `${ResponsiveTheme.colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.sm,
  },
  textContent: {
    flex: 1,
    marginRight: ResponsiveTheme.spacing.sm,
  },
  title: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.full,
    gap: rw(4),
  },
  buttonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
    color: ResponsiveTheme.colors.white,
  },
});

export default GuestPromptBanner;
