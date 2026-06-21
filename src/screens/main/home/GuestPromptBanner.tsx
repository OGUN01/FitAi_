/**
 * GuestPromptBanner Component
 * Compact inline banner for guest sign-up
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";

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
      <GlassCard
        elevation={1}
        blurIntensity="light"
        padding="sm"
        borderRadius="lg"
        style={styles.card}
      >
        <View style={styles.row}>
          <View style={styles.iconCircle}>
            <Ionicons
              name="person-add"
              size={rf(16)}
              color={colors.primary}
            />
          </View>
          <Text style={styles.text}>Create account to save progress</Text>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Sign Up</Text>
          </View>
        </View>
      </GlassCard>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: `${colors.primary}08`,
    borderColor: `${colors.primary}20`,
    borderWidth: 1,
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
    backgroundColor: `${colors.primary}15`,
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
