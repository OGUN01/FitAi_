/**
 * GlassCard Component
 * Glassmorphic card with blur effect, optional gradient border, and elevation
 */

import React from "react";
import { StyleSheet, View, ViewStyle, Pressable } from "react-native";
import { GlassView } from "./aurora/GlassView";
import {
  spacing,
  shadows,
  borderRadius as br,
} from "../../theme/aurora-tokens";
import { rp, rw } from "../../utils/responsive";

type ElevationLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type PaddingSize = "none" | "sm" | "md" | "lg" | "xl";
type BorderRadiusSize = "none" | "sm" | "md" | "lg" | "xl" | "xxl";

interface GlassCardProps {
  /**
   * Blur intensity for glass effect
   * @default 'default'
   */
  blurIntensity?: "light" | "default" | "heavy";

  /**
   * Elevation level (1-8)
   * @default 3
   */
  elevation?: ElevationLevel;

  /**
   * Show gradient border
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
   * Show standard border
   * @default true
   */
  showBorder?: boolean;

  /**
   * Enable press effect (renders the card in a Pressable so onPress works).
   * @default false
   */
  pressable?: boolean;

  /**
   * Press handler. Required when `pressable` is true.
   */
  onPress?: () => void;

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
}

const getPaddingValue = (size: PaddingSize): number => {
  // Scale padding responsively (the aurora GlassCard already did this; this
  // non-aurora variant was returning raw spacing tokens).
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

const getShadowStyle = (level: ElevationLevel) => {
  const shadowKey = `level${level}` as keyof typeof shadows;
  return shadows[shadowKey];
};

export const GlassCard: React.FC<GlassCardProps> = ({
  blurIntensity = "default",
  elevation = 3,
  gradientBorder = false,
  padding = "md",
  borderRadius = "lg",
  showBorder = true,
  pressable = false,
  onPress,
  children,
  style,
  contentStyle,
}) => {
  const paddingValue = getPaddingValue(padding);
  const borderRadiusValue = getBorderRadiusValue(borderRadius);
  const shadowStyle = getShadowStyle(elevation);

  const containerStyle: ViewStyle = {
    borderRadius: borderRadiusValue,
    ...shadowStyle,
  };

  const content = (
    <View style={[styles.shadowWrapper, containerStyle, style]}>
      <GlassView
        blurAmount={blurIntensity}
        borderRadius={borderRadiusValue}
        showBorder={!gradientBorder && showBorder}
        style={styles.glassContainer}
      >
        <View style={[styles.content, { padding: paddingValue }, contentStyle]}>
          {children}
        </View>
      </GlassView>
    </View>
  );

  if (pressable && onPress) {
    // Use a Pressable wrapper so the press handler actually fires. The
    // previous implementation accepted pressable/onPress but never wired
    // them up — the props were a no-op.
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.pressableWrap,
          pressed && styles.pressablePressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  shadowWrapper: {
    // The shadow wrapper previously set overflow:hidden, which clipped the
    // elevation shadow drawn outside the bounds — defeating the shadow.
    // GlassView below already clips its content; let the shadow breathe.
  },
  glassContainer: {
    overflow: "hidden",
  },
  content: {
    width: "100%",
    overflow: "hidden",
  },
  pressableWrap: {
    width: "100%",
  },
  pressablePressed: {
    opacity: 0.9,
  },
});

// Export default
export default GlassCard;
