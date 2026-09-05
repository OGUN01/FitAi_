/**
 * GlassButton Component
 * The canonical app-wide CTA. NAME IS LEGACY — no longer glass/gradient.
 *
 * Reskinned per DESIGN.md §7 (Components — Button) and the app-wide visual
 * overhaul (src/docs/VISUAL_DESIGN_OVERHAUL.md, Stage 1) to match the
 * onboarding CTA exactly: a FLAT fill (never a gradient), minHeight 56,
 * borderRadius 16, Manrope_700Bold label, opacity-only press feedback (no
 * scale, no haptic — the calmer onboarding feel). Kept the component name
 * and full prop API unchanged (~53 call sites) so this is a pure internal
 * reskin — every existing consumer inherits the new flat look with zero
 * per-call-site changes.
 *
 * Variant colors are flat, sourced from the governed `chart[]` palette —
 * never the old Material Design 2014 stock colors (`success`/`warning`/
 * `error` previously pointed at `#4CAF50`/`#FF9800`/`#F44336` via
 * gradientButton, and `warning` was visually near-identical to `primary`).
 */

import React from "react";
import { StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "./AnimatedPressable";
import { AuroraSpinner } from "./AuroraSpinner";
import { colors, chart, border, spacing, typography, borderRadius } from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";

export type GlassButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error";

export interface GlassButtonProps {
  /** Button label. */
  label: string;
  /** Tap handler. */
  onPress: () => void;
  /** Visual variant (drives the flat fill color). @default 'primary' */
  variant?: GlassButtonVariant;
  /** Optional leading Ionicons icon name. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Show the loading spinner + disable interaction. @default false */
  loading?: boolean;
  /** Disable interaction. @default false */
  disabled?: boolean;
  /** Stretch to full container width. @default false */
  fullWidth?: boolean;
  /**
   * Override the fill color(s) (advanced). A 2-tuple is accepted for
   * back-compat with the old gradient API — only the first color is used
   * now (flat fill).
   */
  colors?: [string, string];
  /** Container style. */
  style?: ViewStyle;
  /** Label text style override. */
  textStyle?: TextStyle;
  /** Clamp the label to N lines (with ellipsis) instead of the default
   * unclamped wrap — opt-in, existing callers are unaffected. Useful for a
   * button whose label can be long relative to its available width at a
   * narrow viewport (see BuilderSummaryFooter's "Save Schedule" button). */
  numberOfLines?: number;
  /**
   * @deprecated Press feedback is opacity-only now (matching the onboarding
   * CTA) — haptics on every primary-CTA press were part of the retired
   * gradient/scale language. Accepted for prop-API back-compat only.
   */
  hapticType?: "light" | "medium" | "heavy";
  /** Accessible label. */
  accessibilityLabel?: string;
  /** Test ID. */
  testID?: string;
}

// Flat fill per variant — sourced from the governed `chart[]` palette, never
// a Material Design stock color. All variants use the same near-black label
// (see LABEL_COLOR below) since every one of these fills is bright enough
// for a dark label to read clearly.
const VARIANT_FILL: Record<GlassButtonVariant, string> = {
  primary: colors.primary.DEFAULT, // #FF6B35 — chart[1]
  secondary: chart[2], // #00D4FF cyan
  success: chart[4], // #4ADE80 green
  warning: chart[5], // #FBBF24 amber — clearly distinct hue from primary orange
  error: "#F87171", // a red distinct from primary orange (not Material's #F44336)
};

// Matches the onboarding CTA exactly: a near-black label on the flat accent
// fill (fresh/ScreenScaffold's nextLabel color, `tokens.bg` = `#050505`).
const LABEL_COLOR = colors.background.DEFAULT;

export const GlassButton: React.FC<GlassButtonProps> = ({
  label,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  colors: customColors,
  style,
  textStyle,
  numberOfLines,
  accessibilityLabel,
  testID,
}) => {
  const fill = customColors?.[0] ?? VARIANT_FILL[variant];
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      scaleValue={1}
      useSpring={false}
      hapticFeedback={false}
      fadeOnPress
      pressOpacity={0.85}
      disableAnimation={isDisabled}
      containerStyle={[
        styles.container,
        fullWidth && styles.fullWidth,
        style,
      ]}
      style={styles.pressable}
      accessibilityRole="button"
      accessibilityLabel={
        loading
          ? `${accessibilityLabel ?? label}, loading`
          : (accessibilityLabel ?? label)
      }
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      testID={testID}
    >
      <View style={[styles.fill, { backgroundColor: isDisabled ? border.subtle : fill }]}>
        {loading ? (
          <View style={styles.content}>
            <AuroraSpinner customSize={rf(20)} theme="dark" />
          </View>
        ) : (
          <View style={styles.content}>
            {icon ? (
              <Ionicons
                name={icon}
                size={rf(typography.fontSize.body)}
                color={isDisabled ? colors.text.tertiary : LABEL_COLOR}
                style={styles.icon}
              />
            ) : null}
            <Text
              style={[
                styles.label,
                { color: isDisabled ? colors.text.tertiary : LABEL_COLOR },
                textStyle,
              ]}
              numberOfLines={numberOfLines}
            >
              {label}
            </Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  // Inner Pressable must stretch to fill the outer Animated.View wrapper so
  // the fill + content honor the wrapper's flex/width constraints. Without
  // this, the wrapper sizes to content and flex:1 from callers has no effect,
  // causing buttons to overflow their row (e.g. CustomPlanEmptyState CTAs).
  pressable: {
    flex: 1,
    alignSelf: "stretch",
    borderRadius: borderRadius.xl,
    overflow: "hidden",
  },
  fullWidth: {
    // Use flex:1 instead of width:"100%" so the button sizes correctly when
    // placed inside a flex row alongside other elements (known issue pattern:
    // width:100% in a row forces the button to the full container width and
    // pushes siblings off-screen). flex:1 makes it share the row evenly.
    flex: 1,
  },
  fill: {
    flex: 1,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: rp(spacing.md),
    paddingHorizontal: rp(spacing.xl),
    minHeight: rf(56),
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 1,
  },
  icon: {
    marginRight: rp(spacing.sm),
  },
  label: {
    fontFamily: "Manrope_700Bold",
    fontSize: rf(typography.fontSize.body),
    letterSpacing: 0.3,
    flexShrink: 1,
    textAlign: "center",
  },
});

export default GlassButton;
