/**
 * EmptyState Component
 * Shared empty/loading-fallback state for the Aurora design language.
 *
 * Replaces ~20 ad-hoc inline empty states across screens (detail screens,
 * ExerciseHistoryScreen, WorkoutErrorState, ExerciseInstructionModal, etc.)
 * that each rolled their own icon (emoji vs Ionicons), copy, and CTA.
 *
 * Centered, glass-free (so it sits naturally on an AuroraBackground). One
 * icon, one title, an optional subtitle, and an optional CTA button.
 */

import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { colors, spacing, typography, borderRadius } from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";
import { AnimatedPressable } from "./AnimatedPressable";

export interface EmptyStateProps {
  /** Ionicons icon name. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Icon size in responsive font units. @default 56 */
  iconSize?: number;
  /** Tint color for the icon + icon disc. @default colors.primary.DEFAULT */
  iconColor?: string;
  /** Headline. */
  title: string;
  /** Supporting copy under the title. */
  subtitle?: string;
  /** CTA button label. When provided with `onCta`, renders an action button. */
  ctaText?: string;
  /** CTA tap handler. */
  onCta?: () => void;
  /** Extra container style. */
  style?: ViewStyle;
  /** Stagger delay (ms) for the entrance animation. @default 100 */
  delay?: number;
  /** Optional accessibility label override (defaults to title). */
  accessibilityLabel?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  iconSize,
  iconColor = colors.primary.DEFAULT,
  title,
  subtitle,
  ctaText,
  onCta,
  style,
  delay = 100,
  accessibilityLabel,
}) => {
  const size = iconSize ?? rf(56);
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400)}
      style={[styles.container, style]}
      accessibilityRole="summary"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <View style={[styles.iconDisc, { backgroundColor: `${iconColor}1A` }]}>
        <Ionicons name={icon} size={size} color={iconColor} />
      </View>

      <Animated.View entering={FadeInDown.delay(delay + 80).duration(400)}>
        <Text style={styles.title}>{title}</Text>
      </Animated.View>

      {subtitle ? (
        <Animated.View entering={FadeInDown.delay(delay + 160).duration(400)}>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </Animated.View>
      ) : null}

      {ctaText && onCta ? (
        <Animated.View entering={FadeInDown.delay(delay + 240).duration(400)}>
          <AnimatedPressable
            onPress={onCta}
            scaleValue={0.96}
            springConfig="snappy"
            hapticType="light"
            style={styles.cta}
            accessibilityRole="button"
            accessibilityLabel={ctaText}
          >
            <Animated.Text style={styles.ctaText}>{ctaText}</Animated.Text>
          </AnimatedPressable>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.xxl),
    paddingHorizontal: rp(spacing.xl),
  },
  iconDisc: {
    width: rp(96),
    height: rp(96),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rp(spacing.lg),
  },
  title: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.semibold) as any,
    textAlign: "center",
    lineHeight: typography.fontSize.h3 * typography.lineHeight.tight,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.body),
    textAlign: "center",
    marginTop: rp(spacing.sm),
    lineHeight: typography.fontSize.body * typography.lineHeight.normal,
  },
  cta: {
    marginTop: rp(spacing.lg),
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: rp(spacing.xl),
    paddingVertical: rp(spacing.md),
    borderRadius: borderRadius.xl,
  },
  ctaText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
});

export default EmptyState;
