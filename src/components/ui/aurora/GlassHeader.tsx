/**
 * GlassHeader Component
 * Shared screen header for the Aurora design language.
 *
 * Replaces the per-screen hand-rolled header (back chevron + title + spacer)
 * used by Notifications / Privacy / About / Help / Wearable / ManualHealthEntry
 * (the exemplary modern screens) so every screen shares ONE header affordance.
 * Back button uses AnimatedPressable + haptic; optional right action slot.
 */

import React from "react";
import { StyleSheet, Text, View, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { AnimatedPressable } from "./AnimatedPressable";
import { colors, spacing, typography, borderRadius } from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";
import { useReducedMotion } from "../../../utils/accessibility/hooks";

export interface GlassHeaderProps {
  /**
   * Title shown centered (or left-aligned). Optional so "eyebrow-only"
   * headers (e.g. CreateWorkoutScreen's compact top row: back chevron +
   * uppercase step label, no title line) can render via this same component
   * instead of hand-rolling their own header.
   */
  title?: string;
  /**
   * Small uppercase/letter-spaced label rendered above `title` (or standalone
   * when `title` is omitted). Reuses the typography previously duplicated
   * identically across WorkoutHistoryScreen/FullPlanScreen/
   * ExerciseHistoryScreen/TemplateLibraryScreen's local header components.
   */
  eyebrow?: string;
  /** Optional Ionicons icon next to the title. */
  titleIcon?: keyof typeof Ionicons.glyphMap;
  /** Back handler. When omitted, no back chevron renders (top-level screens). */
  onBack?: () => void;
  /** Back-button accessibility label. @default 'Go back' */
  backAccessibilityLabel?: string;
  /** Optional right-side action node (icon button, etc). */
  rightAction?: React.ReactNode;
  /** Extra container style. */
  style?: ViewStyle;
  /** Title text style override. */
  titleStyle?: TextStyle;
  /** Eyebrow text style override. */
  eyebrowStyle?: TextStyle;
  /** Align title left (with a back chevron) instead of centered. @default false */
  leftAlignTitle?: boolean;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  title,
  eyebrow,
  titleIcon,
  onBack,
  backAccessibilityLabel = "Go back",
  rightAction,
  style,
  titleStyle,
  eyebrowStyle,
  leftAlignTitle = false,
}) => {
  const reducedMotion = useReducedMotion();
  const showBack = typeof onBack === "function";

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(250)}
      style={[styles.container, style]}
      accessibilityRole="header"
    >
      {/* Left: back chevron (fixed width so titles align when absent) */}
      <View style={styles.side}>
        {showBack ? (
          <AnimatedPressable
            onPress={onBack}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={backAccessibilityLabel}
          >
            <Ionicons
              name="chevron-back"
              size={rf(26)}
              color={colors.text.primary}
            />
          </AnimatedPressable>
        ) : null}
      </View>

      {/* Center/Left: title */}
      <View
        style={[
          styles.titleWrap,
          leftAlignTitle ? styles.titleLeft : styles.titleCenter,
          !leftAlignTitle && styles.titleCenterShrink,
        ]}
      >
        {titleIcon ? (
          <Ionicons
            name={titleIcon}
            size={rf(typography.fontSize.h3)}
            color={colors.primary.DEFAULT}
            style={styles.titleIcon}
          />
        ) : null}
        <View
          style={[
            styles.textColumn,
            leftAlignTitle ? styles.textColumnLeft : styles.textColumnCenter,
          ]}
        >
          {eyebrow ? (
            <Text numberOfLines={2} style={[styles.eyebrow, eyebrowStyle]}>
              {eyebrow}
            </Text>
          ) : null}
          {title ? (
            <Text numberOfLines={2} style={[styles.title, titleStyle]}>
              {title}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Right: action slot (fixed width = left side for centering) */}
      <View style={styles.side}>{rightAction}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: rp(spacing.sm),
    paddingHorizontal: rp(spacing.md),
    minHeight: rf(52),
  },
  side: {
    // Fixed-width side slot for back + right action. Use minWidth instead of
    // width so wider right actions (e.g. an inline "Edit" pill) aren't
    // clipped to 44px.
    minWidth: rf(44),
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: Math.max(rf(40), 44),
    height: Math.max(rf(40), 44),
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.glass.background,
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  titleCenter: {
    justifyContent: "center",
  },
  titleCenterShrink: {
    // Allow the centered title to shrink so it doesn't push the side slots
    // off-screen when the title is long.
    flexShrink: 1,
  },
  titleLeft: {
    justifyContent: "flex-start",
  },
  titleIcon: {
    marginRight: rp(spacing.xs),
  },
  textColumn: {
    flex: 1,
    minWidth: 0,
    flexShrink: 1,
  },
  textColumnCenter: {
    alignItems: "center",
  },
  textColumnLeft: {
    alignItems: "flex-start",
  },
  eyebrow: {
    color: colors.text.secondary,
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.bold) as any,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: rp(2),
  },
  title: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as any,
  },
});

export default GlassHeader;
