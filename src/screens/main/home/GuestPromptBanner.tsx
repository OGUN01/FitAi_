/**
 * GuestPromptBanner Component
 * Compact inline banner for guest sign-up
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { hexToRgba } from "../../../utils/colors";

interface GuestPromptBannerProps {
  onSignUpPress: () => void;
}

export const GuestPromptBanner: React.FC<GuestPromptBannerProps> = ({
  onSignUpPress,
}) => {
  return (
    <AnimatedPressable
      onPress={onSignUpPress}
      scaleValue={0.98}
      hapticFeedback={true}
      hapticType="light"
      accessibilityRole="button"
      accessibilityLabel="Sign up"
    >
      {/* Flat Editorial-Dark surface replacing the former GlassCard (no blur,
          no elevation) — same primary-tinted fill + hairline accent border. */}
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="person-add"
              size={rf(16)}
              color={colors.primary}
            />
          </View>
          <Text style={styles.text} numberOfLines={1}>Create account to save progress</Text>
          <View style={styles.button}>
            <Text style={styles.buttonText} numberOfLines={1}>Sign Up</Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: hexToRgba(colors.primary, 0.05),
    borderColor: hexToRgba(colors.primary, 0.12),
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  iconCircle: {
    width: rw(32),
    height: rw(32),
    borderRadius: rw(16),
    backgroundColor: hexToRgba(colors.primary, 0.09),
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.text,
    fontWeight: typography.fontWeight.medium,
    flexShrink: 1,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.white,
  },
});

export default GuestPromptBanner;
