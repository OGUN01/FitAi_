import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import {
  flatColors as colors,
  spacing,
  borderRadius,
} from "../../theme/aurora-tokens";

interface ErrorBannerProps {
  error: string;
  onRetry: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ error, onRetry }) => (
  <View style={styles.wrapper}>
    <View style={styles.card}>
      <Text style={styles.errorText}>{error}</Text>
      <AnimatedPressable
        onPress={onRetry}
        scaleValue={0.96}
        hapticFeedback
        hapticType="light"
        accessibilityRole="button"
        accessibilityLabel="Tap to Retry"
        style={styles.retryButton}
      >
        <Text style={styles.retryText}>Tap to Retry</Text>
      </AnimatedPressable>
    </View>
  </View>
);

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  // Flat Editorial-Dark surface — matches the hairline-bordered cards used
  // across the rest of home/ (no gradients, no blur).
  card: {
    padding: spacing.md,
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.error,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  // Solid-color pill CTA, matching TodayHero's CTA / EmptyMealsMessage's CTA.
  retryButton: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: {
    color: colors.white,
    fontWeight: "700",
  },
});
