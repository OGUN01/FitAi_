import React from "react";
import { Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { colors, spacing } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf } from "../../utils/responsive";
import { useReducedMotion } from "../../utils/accessibility/hooks";

interface AboutFitAISocialButtonsProps {
  onSocialPress: (platform: string) => void;
}

export const AboutFitAISocialButtons: React.FC<
  AboutFitAISocialButtonsProps
> = ({ onSocialPress }) => {
  const reducedMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeInDown.delay(750).duration(400)}
      style={styles.socialGrid}
    >
      <AnimatedPressable
        onPress={() => onSocialPress("twitter")}
        scaleValue={0.95}
        hapticFeedback={false}
        style={styles.socialButtonWrapper}
        accessibilityRole="link"
        accessibilityLabel="FitAI on Twitter"
        accessibilityHint="Opens Twitter"
      >
        <GlassCard
          elevation={1}
          padding="md"
          borderRadius="lg"
          style={styles.socialButton}
        >
          <Ionicons name="logo-twitter" size={rf(20)} color="#1DA1F2" />
          <Text style={styles.socialText}>Twitter</Text>
        </GlassCard>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => onSocialPress("instagram")}
        scaleValue={0.95}
        hapticFeedback={false}
        style={styles.socialButtonWrapper}
        accessibilityRole="link"
        accessibilityLabel="FitAI on Instagram"
        accessibilityHint="Opens Instagram"
      >
        <GlassCard
          elevation={1}
          padding="md"
          borderRadius="lg"
          style={styles.socialButton}
        >
          <Ionicons name="logo-instagram" size={rf(20)} color="#E4405F" />
          <Text style={styles.socialText}>Instagram</Text>
        </GlassCard>
      </AnimatedPressable>

      <AnimatedPressable
        onPress={() => onSocialPress("facebook")}
        scaleValue={0.95}
        hapticFeedback={false}
        style={styles.socialButtonWrapper}
        accessibilityRole="link"
        accessibilityLabel="FitAI on Facebook"
        accessibilityHint="Opens Facebook"
      >
        <GlassCard
          elevation={1}
          padding="md"
          borderRadius="lg"
          style={styles.socialButton}
        >
          <Ionicons name="logo-facebook" size={rf(20)} color="#1877F2" />
          <Text style={styles.socialText}>Facebook</Text>
        </GlassCard>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  socialGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  socialButtonWrapper: {
    flex: 1,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  socialText: {
    fontFamily: FONT_FAMILY.medium,
    fontSize: rf(12),
    color: colors.text.primary,
  },
});
