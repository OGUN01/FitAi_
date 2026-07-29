/**
 * NavRail — footer Back/Next (blueprint §7.11)
 *
 * Back: surface.1 + border.subtle + body text in colors.primary.DEFAULT.
 * Next: colors.primary.DEFAULT fill + white text, radius 16, minHeight 52,
 * padding spacing.lg. On Next press (when not disabled), fire a SkiaBloom via
 * a trigger state + bloomColor. Disabled → opacity 0.5. press scale 0.96.
 *
 * Single shared footer; screens must not render their own.
 */

import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, Pressable, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import {
  surface,
  border,
  colors,
  spacing,
  borderRadius,
  typography,
} from "../../../theme/aurora-tokens";
import { SkiaBloom } from "./SkiaBloom";

const PRESS_SPRING = { damping: 14, stiffness: 140 };

export interface NavRailProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  disabled?: boolean;
  /** When true, shows a "Return to review" affordance instead of plain Back. */
  isEditingFromReview?: boolean;
  onReturnToReview?: () => void;
  /** Current chart color for the commit burst. @default colors.primary.DEFAULT */
  bloomColor?: string;
  /** When true, hides the Next button — for screens that render their own
   *  primary CTA in the body (e.g. the Plan screen's gradient Generate CTA). */
  hideNext?: boolean;
  /** Extra container style. */
  style?: ViewStyle;
  testID?: string;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const NavRail: React.FC<NavRailProps> = ({
  onBack,
  onNext,
  nextLabel = "Next",
  disabled = false,
  isEditingFromReview = false,
  onReturnToReview,
  bloomColor = colors.primary.DEFAULT,
  hideNext = false,
  style,
  testID,
}) => {
  const nextScale = useSharedValue(1);
  const backScale = useSharedValue(1);
  const [bloom, setBloom] = useState(false);
  const bloomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextAnim = useAnimatedStyle(() => ({
    transform: [{ scale: nextScale.value }],
    opacity: disabled ? 0.5 : 1,
  }));
  const backAnim = useAnimatedStyle(() => ({
    transform: [{ scale: backScale.value }],
  }));

  const handleNext = useCallback(() => {
    if (disabled) return;
    fireSelection();
    // Fire the particle bloom from the Next button center.
    setBloom(false);
    // Two-state flip so the true-edge re-fires each commit.
    requestAnimationFrame(() => setBloom(true));
    if (bloomTimer.current) clearTimeout(bloomTimer.current);
    bloomTimer.current = setTimeout(() => setBloom(false), 500);
    onNext();
  }, [disabled, onNext]);

  React.useEffect(() => {
    return () => {
      if (bloomTimer.current) clearTimeout(bloomTimer.current);
    };
  }, []);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {!hideNext && (
        <SkiaBloom trigger={bloom} color={bloomColor} style={styles.bloom} />
      )}
      <View style={styles.row}>
        {isEditingFromReview && onReturnToReview ? (
          <Pressable
            onPress={() => {
              fireSelection();
              onReturnToReview();
            }}
            onPressIn={() => {
              backScale.value = withSpring(0.96, PRESS_SPRING);
            }}
            onPressOut={() => {
              backScale.value = withSpring(1, PRESS_SPRING);
            }}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Return to review"
          >
            <Animated.View style={[styles.backInner, backAnim]}>
              <Ionicons name="arrow-back" size={18} color={colors.primary.DEFAULT} />
              <Animated.Text style={styles.backText}>Review</Animated.Text>
            </Animated.View>
          </Pressable>
        ) : (
          <Pressable
            onPress={onBack}
            disabled={!onBack}
            onPressIn={() => {
              backScale.value = withSpring(0.96, PRESS_SPRING);
            }}
            onPressOut={() => {
              backScale.value = withSpring(1, PRESS_SPRING);
            }}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityState={{ disabled: !onBack }}
          >
            <Animated.View style={[styles.backInner, backAnim]}>
              <Ionicons name="arrow-back" size={18} color={colors.primary.DEFAULT} />
              <Animated.Text style={styles.backText}>Back</Animated.Text>
            </Animated.View>
          </Pressable>
        )}

        {!hideNext && (
        <Pressable
          onPress={handleNext}
          disabled={disabled}
          onPressIn={() => {
            if (!disabled) nextScale.value = withSpring(0.96, PRESS_SPRING);
          }}
          onPressOut={() => {
            nextScale.value = withSpring(1, PRESS_SPRING);
          }}
          accessibilityRole="button"
          accessibilityLabel={nextLabel}
          accessibilityState={{ disabled }}
        >
          <Animated.View style={[styles.next, nextAnim]}>
            <Animated.Text style={styles.nextText}>{nextLabel}</Animated.Text>
            <Ionicons name="arrow-forward" size={18} color={colors.text.primary} />
          </Animated.View>
        </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  bloom: {
    // Bloom overlays the Next button area (bottom-right).
    bottom: 0,
    right: 0,
    height: 80,
    width: 200,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  back: {
    backgroundColor: surface[1],
    borderWidth: 1,
    borderColor: border.subtle,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  backText: {
    fontFamily: typography.variants.body.fontFamily,
    fontSize: typography.variants.body.fontSize,
    lineHeight: typography.variants.body.fontSize * typography.variants.body.lineHeight,
    color: colors.primary.DEFAULT,
  },
  next: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.xl,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  nextText: {
    fontFamily: typography.variants.cardHeadline.fontFamily,
    fontSize: typography.variants.cardHeadline.fontSize,
    lineHeight: typography.variants.cardHeadline.fontSize * typography.variants.cardHeadline.lineHeight,
    color: colors.text.primary,
  },
});
