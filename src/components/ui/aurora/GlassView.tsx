/**
 * GlassView Component
 * Reusable blur container for glassmorphism effects
 * Wraps content with frosted glass appearance
 */

import React from "react";
import { StyleSheet, View, ViewStyle, StyleProp, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { colors, glassSurface } from "../../../theme/aurora-tokens";

type BlurType = "light" | "dark" | "default";
type BlurAmount = "light" | "default" | "heavy" | "medium" | "strong";

interface GlassViewProps {
  /**
   * Blur type (iOS only)
   * @default 'dark'
   */
  blurType?: BlurType;

  /**
   * Blur intensity
   * @default 'default'
   */
  blurAmount?: BlurAmount;

  /**
   * Overlay background color
   * @default 'rgba(255, 255, 255, 0.1)'
   */
  overlayColor?: string;

  /**
   * Show border
   * @default false
   */
  showBorder?: boolean;

  /**
   * Border color
   * @default 'rgba(255, 255, 255, 0.18)'
   */
  borderColor?: string;

  /**
   * Border width
   * @default 1
   */
  borderWidth?: number;

  /**
   * Border radius
   * @default 12
   */
  borderRadius?: number;

  /**
   * Enable performance optimization for Android
   * @default true
   */
  optimizeForAndroid?: boolean;

  /**
   * Children components
   */
  children: React.ReactNode;

  /**
   * Additional styles
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Opt-in: give the Android-fallback content wrapper `flex: 1` so it fills
   * whatever height its own ancestor chain actually provides. Default
   * (false) sizes to content instead — the safe default, since `flex: 1`
   * here collapses this wrapper (and everything inside it) to zero height
   * whenever the nearest ancestor with a DEFINITE height is more than one
   * level up (e.g. a Modal's auto-height centered dialog wrapper — see the
   * Health Connect disclosure modal fix this default exists for).
   * Only pass `fillHeight` when you know a definite height truly is
   * available one level up from this GlassView's own outer container (e.g.
   * DetentBottomSheet, whose wrapping Animated.View sets an explicit
   * numeric `height` from the active snap point) — otherwise leave it off.
   */
  fillHeight?: boolean;
}

const getBlurAmount = (amount: BlurAmount): number => {
  switch (amount) {
    case "light":
      return glassSurface.blur.light;
    case "medium":
      return (glassSurface.blur.default + glassSurface.blur.heavy) / 2;
    case "heavy":
      return glassSurface.blur.heavy;
    case "strong":
      return glassSurface.blur.heavy * 1.2;
    default:
      return glassSurface.blur.default;
  }
};

export const GlassView: React.FC<GlassViewProps> = ({
  blurType = "dark",
  blurAmount = "default",
  overlayColor = colors.glass.background,
  showBorder = false,
  borderColor = colors.glass.border,
  borderWidth = 1,
  borderRadius = 12,
  optimizeForAndroid = true,
  children,
  style,
  fillHeight = false,
}) => {
  const blurIntensity = getBlurAmount(blurAmount);

  // On Android or Web, use a semi-transparent background as fallback
  // BlurView performance can be inconsistent on older Android devices
  // and may have issues on web platforms
  const useFallback =
    (Platform.OS === "android" && optimizeForAndroid) || Platform.OS === "web";

  if (useFallback) {
    // Layer a tinted background on top of the background tier so the fallback
    // is actually visible against the dark app background (the previous
    // overlayColor default rgba(255,255,255,0.1) was ~10% white — imperceptible).
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: overlayColor,
            borderColor: showBorder ? borderColor : "transparent",
            borderWidth: showBorder ? borderWidth : 0,
            borderRadius,
          },
          // BUG FIX: fillHeight previously only reached `contentFrontFill`
          // (the inner wrapper below) — this OUTER View is the one that
          // actually sits inside the caller's bounded ancestor (e.g.
          // BottomSheet's sheetWrapper, constrained via `maxHeight`) and had
          // no flex/height styling of its own, so it sized to its CONTENT
          // instead of receiving that bound and passing it down. Giving the
          // inner wrapper flex:1 did nothing when its own parent never
          // shrank to fit in the first place.
          fillHeight && styles.containerFill,
          style,
        ]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background.secondary, opacity: 0.85 }]} />
        <View style={[styles.contentFront, fillHeight && styles.contentFrontFill]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <BlurView
      style={[
        styles.container,
        {
          borderColor: showBorder ? borderColor : "transparent",
          borderWidth: showBorder ? borderWidth : 0,
          borderRadius,
          overflow: "hidden",
        },
        style,
      ]}
      tint={blurType}
      intensity={blurIntensity}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: overlayColor,
          },
        ]}
      />
      <View style={styles.content}>{children}</View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  // Opt-in via `fillHeight` — see the outer View's usage above. Lets this
  // OUTER wrapper actually receive and pass down a bounded height from its
  // own ancestor instead of sizing to content.
  containerFill: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flex: 1,
  },
  contentFront: {
    // `flex: 1` here used to collapse to zero height whenever this fallback
    // is nested inside an auto-height ancestor chain (e.g. a Modal's
    // centered, content-sized dialog wrapper) — Yoga has no bounded main
    // axis to grow into, so the whole subtree (and everything inside it)
    // rendered with zero size and swallowed touches fell through to
    // whatever sat behind it. Size to content instead; zIndex alone is
    // enough to keep this layer above the tint.
    zIndex: 1,
  },
  // Opt-in via the `fillHeight` prop — see its doc comment above. Restores
  // `flex: 1` for callers whose ancestor chain genuinely provides a
  // definite height one level up (e.g. DetentBottomSheet).
  contentFrontFill: {
    flex: 1,
    // Without this, a flex-column child won't shrink below its own content's
    // intrinsic height even when the parent has a definite bounded height
    // (the classic flexbox "min-height: auto" default) — the content just
    // overflows past the parent's edge instead of being constrained so a
    // descendant ScrollView can take over scrolling.
    minHeight: 0,
  },
});

// Export default
export default GlassView;
