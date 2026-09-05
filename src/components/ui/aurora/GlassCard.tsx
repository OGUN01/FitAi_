/**
 * GlassCard Component
 *
 * NAME IS LEGACY — this no longer renders blur/glass. Per DESIGN.md
 * (Elevation & Depth §5) and the app-wide visual overhaul
 * (src/docs/VISUAL_DESIGN_OVERHAUL.md, Stage 1), depth now comes from a flat
 * `surface[1]`/`surface[2]` fill + a `border.subtle` hairline — never blur,
 * never a shadow, regardless of the `elevation`/`gradientBorder` props. Kept
 * the component name and prop API unchanged (~90+ call sites) so this is a
 * pure internal reskin: every existing consumer inherits the new flat look
 * with zero per-call-site changes.
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";
import { surface, border, spacing, borderRadius as br } from "../../../theme/aurora-tokens";
import { rw, rp } from "../../../utils/responsive";

type ElevationLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type PaddingSize = "none" | "sm" | "md" | "lg" | "xl";
type BorderRadiusSize = "none" | "sm" | "md" | "lg" | "xl" | "xxl";

interface GlassCardProps {
  /**
   * @deprecated No longer renders blur — depth is flat surface + hairline
   * now. Accepted for prop-API back-compat only; has no visual effect.
   */
  blurIntensity?: "light" | "default" | "heavy" | "medium" | "strong";

  /**
   * Elevation level (1-8). No longer a shadow — selects which flat surface
   * tier this card sits on: 1-3 → `surface[1]` (standard card), 4-8 →
   * `surface[2]` (a raised control, e.g. a popover-like surface). Per
   * DESIGN.md, max one surface depth over the screen background — don't
   * nest a high-elevation card inside another card.
   * @default 3
   */
  elevation?: ElevationLevel;

  /**
   * @deprecated Gradient borders are retired (DESIGN.md's de-gradient
   * rule — gradients are reserved for genuine brand moments only). `true`
   * now renders a slightly stronger flat hairline (`border.DEFAULT`)
   * instead of `border.subtle`, as the closest flat equivalent.
   * @default false
   */
  gradientBorder?: boolean;

  /**
   * Internal padding size
   * @default 'md'
   */
  padding?: PaddingSize;

  /**
   * Border radius size
   * @default 'lg'
   */
  borderRadius?: BorderRadiusSize;

  /**
   * Draws a stronger hairline (`border.DEFAULT` instead of the default
   * `border.subtle`). The card ALWAYS draws a hairline now (it's the only
   * depth cue left post-blur/shadow removal) — this only picks the
   * strength.
   * @default false
   */
  showBorder?: boolean;

  /**
   * Enable press effect
   * @default false
   */
  pressable?: boolean;

  /**
   * Press handler
   */
  onPress?: () => void;

  /**
   * Disables the pressable interaction (used when `pressable` is true).
   * Mirrors GlassButton's `disabled` prop for parity across the card/button
   * primitives.
   * @default false
   */
  disabled?: boolean;

  /**
   * Accessibility label for screen readers (used when `pressable` is true).
   */
  accessibilityLabel?: string;

  /**
   * Accessibility hint for screen readers (used when `pressable` is true).
   */
  accessibilityHint?: string;

  /**
   * Children components
   */
  children: React.ReactNode;

  /**
   * Additional styles
   */
  style?: ViewStyle;

  /**
   * Content container styles
   */
  contentStyle?: ViewStyle;

  /**
   * Give the content wrapper `flex: 1` so it fills a definite height
   * provided one level up (e.g. a bottom sheet with an explicit animated
   * height). Only pass this when that's actually true of the caller's
   * ancestor chain — otherwise leave it off (sizes to content, the safe
   * default).
   */
  fillHeight?: boolean;
}

const getPaddingValue = (size: PaddingSize): number => {
  switch (size) {
    case "none":
      return 0;
    case "sm":
      return rp(spacing.sm);
    case "md":
      return rp(spacing.md);
    case "lg":
      return rp(spacing.lg);
    case "xl":
      return rp(spacing.xl);
    default:
      return rp(spacing.md);
  }
};

const getBorderRadiusValue = (size: BorderRadiusSize): number => {
  switch (size) {
    case "none":
      return 0;
    case "sm":
      return rw(br.sm);
    case "md":
      return rw(br.md);
    case "lg":
      return rw(br.lg);
    case "xl":
      return rw(br.xl);
    case "xxl":
      return rw(br.xxl);
    default:
      return rw(br.lg);
  }
};

const getSurfaceFill = (level: ElevationLevel): string => (level >= 4 ? surface[2] : surface[1]);

export const GlassCard: React.FC<GlassCardProps> = ({
  elevation = 3,
  gradientBorder = false,
  padding = "md",
  borderRadius = "lg",
  showBorder = false,
  pressable = false,
  onPress,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  children,
  style,
  contentStyle,
  fillHeight = false,
}) => {
  const paddingValue = getPaddingValue(padding);
  const borderRadiusValue = getBorderRadiusValue(borderRadius);
  const borderColor = gradientBorder || showBorder ? border.DEFAULT : border.subtle;

  const renderContent = (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: getSurfaceFill(elevation),
          borderRadius: borderRadiusValue,
          borderColor,
        },
        fillHeight && styles.surfaceFill,
        style,
      ]}
    >
      <View
        style={[
          styles.content,
          { padding: paddingValue },
          fillHeight && styles.contentFill,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );

  // pressable: wrap the surface in an AnimatedPressable so taps get the
  // standardized spring-scale + haptic micro-interaction.
  if (pressable && onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={disabled}
        scaleValue={0.98}
        springConfig="smooth"
        hapticType="light"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        style={{ borderRadius: borderRadiusValue, overflow: "hidden" }}
      >
        {renderContent}
      </AnimatedPressable>
    );
  }

  return renderContent;
};

const styles = StyleSheet.create({
  surface: {
    overflow: "hidden",
    borderWidth: 1,
  },
  // Opt-in via `fillHeight` — see its doc comment above.
  surfaceFill: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    width: "100%",
  },
  contentFill: {
    flex: 1,
    minHeight: 0,
  },
});

// Export default
export default GlassCard;
