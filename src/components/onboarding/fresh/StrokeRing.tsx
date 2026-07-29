/**
 * StrokeRing — THE replacement for the pixelated filled pie-wedges
 * (docs/onboarding-fresh-design.md)
 *
 * A smooth ring built with react-native-svg: a track <Circle> (hairline) and
 * a progress <Circle> (accent, strokeLinecap "round", rotated -90° so the arc
 * starts at top, strokeDasharray = circumference, strokeDashoffset for
 * progress). Center children (big number + label) render absolutely on top.
 *
 * Crisp at any size — never pixelated, no Skia dependency.
 */

import React from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { tokens } from "./tokens";

export interface StrokeRingProps {
  /** Outer diameter in px. */
  size: number;
  /** Ring stroke width in px. @default 8 */
  strokeWidth?: number;
  /** Fill fraction, 0..1 (clamped). */
  progress: number;
  /** Progress stroke color. @default tokens.accent */
  color?: string;
  /** Track stroke color. @default tokens.hairline */
  trackColor?: string;
  /** Content centered inside the ring (e.g. big number + label). */
  children?: React.ReactNode;
  /** Extra container style. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const StrokeRing: React.FC<StrokeRingProps> = ({
  size,
  strokeWidth = 8,
  progress,
  color = tokens.accent,
  trackColor = tokens.hairline,
  children,
  style,
  testID,
}) => {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped);

  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      testID={testID}
    >
      <Svg width={size} height={size}>
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress — starts at top (-90°), round caps, dash-trimmed */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
          fill="none"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      {children != null && (
        <View style={styles.center} pointerEvents="none">
          {children}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default StrokeRing;
