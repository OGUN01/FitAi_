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
import { colors, spacing, typography } from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";

export interface GlassHeaderProps {
  /** Title shown centered (or left-aligned). */
  title: string;
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
  /** Align title left (with a back chevron) instead of centered. @default false */
  leftAlignTitle?: boolean;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({
  title,
  titleIcon,
  onBack,
  backAccessibilityLabel = "Go back",
  rightAction,
  style,
  titleStyle,
  leftAlignTitle = false,
}) => {
  const showBack = typeof onBack === "function";

  return (
    <Animated.View entering={FadeIn.duration(250)} style={[styles.container, style]}>
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
        <Text
          numberOfLines={1}
          style={[styles.title, titleStyle]}
        >
          {title}
        </Text>
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
    width: rf(44),
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    width: rf(40),
    height: rf(40),
    borderRadius: 999,
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
  titleLeft: {
    justifyContent: "flex-start",
  },
  titleIcon: {
    marginRight: rp(spacing.xs),
  },
  title: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as any,
  },
});

export default GlassHeader;
