/**
 * RadialDial — radial selector (blueprint §7.7)
 *
 * Three variants:
 *   - "time": HH:MM, 15-min ticks. value = "HH:MM".
 *   - "weeks": 4–104, 4-week ticks. value = number.
 *   - "goalArc": binds to a numeric value (e.g. target_weight_kg); draggable.
 *
 * Skia Canvas renders the track + arc fill; the center label is a RN Text
 * overlay. Drag rotates the arc; impactAsync(Medium) per tick; release
 * commits with a 200ms spring settle.
 *
 * Gesture: react-native-gesture-handler Pan + Reanimated shared values.
 */

import React, { useCallback, useEffect, useMemo } from "react";
import { StyleSheet, View, Text, ViewStyle, DimensionValue } from "react-native";
import {
  Canvas,
  Path,
} from "@shopify/react-native-skia";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import {
  surface,
  border,
  colors,
  chart,
  typography,
  spacing,
} from "../../../theme/aurora-tokens";
import { useSkiaReady } from "./useSkiaReady";

export type RadialDialVariant = "time" | "weeks" | "goalArc";

export interface RadialDialProps {
  value: number | string;
  /** [min, max] for weeks/goalArc; ignored for time (always [0, 24*60]). */
  range?: [number, number];
  onChange: (v: number | string) => void;
  label?: string;
  unit?: string;
  variant: RadialDialVariant;
  /** Accent chart color for the arc fill. @default chart[1] */
  accentColor?: string;
  /** Canvas size in px. @default 220 */
  size?: number;
  /** Stroke width in px. @default 12 */
  strokeWidth?: number;
  /** Extra container style. */
  style?: ViewStyle;
  testID?: string;
}

const COMMIT_SPRING = { damping: 18, stiffness: 140 };
const fireImpact = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};
const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

/** Build an SVG/Skia arc path from startAngle→endAngle (radians, clockwise from top). */
const buildArcPath = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string => {
  if (Math.abs(endAngle - startAngle) >= Math.PI * 2 - 0.001) {
    return `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
  }
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
};

/** Tick interval per variant (the per-tick granularity). */
const tickFor = (variant: RadialDialVariant): number => {
  if (variant === "time") return 15; // 15 minutes
  if (variant === "weeks") return 4; // 4 weeks
  return 1; // goalArc: 1 unit
};

/** Convert a value to minutes (for time) or numeric units. */
const toNumeric = (value: number | string, variant: RadialDialVariant): number => {
  if (variant === "time") {
    if (typeof value === "number") return value;
    const [h, m] = value.split(":").map((x) => parseInt(x, 10) || 0);
    return h * 60 + m;
  }
  return typeof value === "number" ? value : parseFloat(value) || 0;
};

const formatTime = (totalMinutes: number): string => {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export const RadialDial: React.FC<RadialDialProps> = ({
  value,
  range,
  onChange,
  label,
  unit,
  variant,
  accentColor = chart[1],
  size = 220,
  strokeWidth = 12,
  style,
  testID,
}) => {
  const safeSize = Math.max(80, Math.round(size));
  const stroke = Math.max(4, Math.round(strokeWidth));
  const radius = Math.max(1, Math.round((safeSize - stroke) / 2) - 4);
  const cx = safeSize / 2;
  const cy = safeSize / 2;

  const [minVal, maxVal] = useMemo<[number, number]>(() => {
    if (variant === "time") return [0, 1440];
    return range ?? [0, 100];
  }, [variant, range]);

  const numericValue = toNumeric(value, variant);
  const fraction = maxVal > minVal ? (numericValue - minVal) / (maxVal - minVal) : 0;

  // Animated fraction (drives the arc); springs on release.
  const animatedFraction = useSharedValue(Math.max(0, Math.min(1, fraction)));
  const lastTickBucket = useSharedValue(-1);

  useEffect(() => {
    animatedFraction.value = withSpring(Math.max(0, Math.min(1, fraction)), COMMIT_SPRING);
  }, [fraction, animatedFraction]);

  // Arc path rebuilt from the animated fraction.
  const arcPath = useDerivedValue(() => {
    "worklet";
    const start = -Math.PI / 2; // top
    const end = start + animatedFraction.value * Math.PI * 2;
    return buildArcPath(cx, cy, radius, start, end);
  });

  // Full circle track path.
  const trackPath = useMemo(
    () => buildArcPath(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 - 0.001),
    [cx, cy, radius]
  );

  // Tick marks as an SVG path string (no Skia object needed — avoids the
  // Skia-not-ready race where `Skia.Path.Make()` throws on first mount).
  const ticksPath = useMemo(() => {
    const tickCount =
      variant === "time"
        ? 24 * 4 // every 15 min
        : variant === "weeks"
        ? Math.round((maxVal - minVal) / 4)
        : 12;
    let d = "";
    for (let i = 0; i <= tickCount; i++) {
      const f = i / tickCount;
      const angle = -Math.PI / 2 + f * Math.PI * 2;
      const inner = radius - stroke / 2 - 4;
      const outer = radius + stroke / 2 + 4;
      const x1 = cx + inner * Math.cos(angle);
      const y1 = cy + inner * Math.sin(angle);
      const x2 = cx + outer * Math.cos(angle);
      const y2 = cy + outer * Math.sin(angle);
      d += `M ${x1} ${y1} L ${x2} ${y2} `;
    }
    return d;
  }, [variant, minVal, maxVal, cx, cy, radius, stroke]);

  const commit = useCallback(
    (fx: number) => {
      const clamped = Math.max(0, Math.min(1, fx));
      const raw = minVal + clamped * (maxVal - minVal);
      const tick = tickFor(variant);
      const snapped = Math.round(raw / tick) * tick;
      const v = Math.max(minVal, Math.min(maxVal, snapped));
      if (variant === "time") {
        onChange(formatTime(v));
      } else {
        onChange(v);
      }
    },
    [minVal, maxVal, variant, onChange]
  );

  const emitTickHaptic = (fx: number) => {
    "worklet";
    const tick = tickFor(variant);
    const span = maxVal - minVal;
    const stepFraction = span > 0 ? tick / span : 1;
    // Bucket by tick steps; fire haptic when crossing a tick boundary.
    const bucket = Math.floor(fx / stepFraction);
    if (bucket !== lastTickBucket.value) {
      lastTickBucket.value = bucket;
      runOnJS(fireImpact)();
    }
  };

  const panGesture = Gesture.Pan()
    .onBegin((e) => {
      // Map touch angle to fraction.
      const dx = e.x - cx;
      const dy = e.y - cy;
      let angle = Math.atan2(dy, dx) + Math.PI / 2; // 0 at top
      if (angle < 0) angle += Math.PI * 2;
      const fx = angle / (Math.PI * 2);
      animatedFraction.value = fx;
      emitTickHaptic(fx);
      runOnJS(fireImpact)();
    })
    .onUpdate((e) => {
      const dx = e.x - cx;
      const dy = e.y - cy;
      let angle = Math.atan2(dy, dx) + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;
      const fx = angle / (Math.PI * 2);
      animatedFraction.value = fx;
      emitTickHaptic(fx);
    })
    .onEnd((e) => {
      const dx = e.x - cx;
      const dy = e.y - cy;
      let angle = Math.atan2(dy, dx) + Math.PI / 2;
      if (angle < 0) angle += Math.PI * 2;
      const fx = angle / (Math.PI * 2);
      animatedFraction.value = withSpring(fx, COMMIT_SPRING);
      runOnJS(fireSelection)();
      runOnJS(commit)(fx);
    });

  const displayValue = (() => {
    if (variant === "time") {
      return typeof value === "string" ? value : formatTime(value);
    }
    const n = typeof value === "number" ? value : parseFloat(value) || 0;
    return unit ? `${n}${unit}` : String(Math.round(n * 10) / 10);
  })();

  const thumbStyle = useAnimatedStyle(() => {
    const angle = -Math.PI / 2 + animatedFraction.value * Math.PI * 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return {
      transform: [
        { translateX: x - 14 },
        { translateY: y - 14 },
      ],
    };
  });

  const skiaReady = useSkiaReady();
  // Static conic-gradient fallback shown only until Skia is ready (a brief
  // cold-start window on web WASM / native JSI). Not animated — it disappears
  // the moment the Canvas mounts, so a plain style is enough and avoids
  // Reanimated's DefaultStyle typing constraints.
  const fallbackDeg = Math.round(Math.max(0, Math.min(1, fraction)) * 360);

  return (
    <GestureDetector gesture={panGesture}>
      <View style={[styles.container, { width: safeSize as DimensionValue, height: safeSize as DimensionValue }, style]} testID={testID}>
        {skiaReady ? (
          <Canvas style={{ width: safeSize, height: safeSize }}>
            {/* Track */}
            <Path path={trackPath} style="stroke" strokeWidth={stroke} color={surface[2]} strokeCap="round" />
            {/* Tick marks */}
            <Path path={ticksPath} style="stroke" strokeWidth={1} color={colors.text.tertiary} strokeCap="round" opacity={0.3} />
            {/* Animated arc fill */}
            <Path path={arcPath} style="stroke" strokeWidth={stroke} color={accentColor} strokeCap="round" />
          </Canvas>
        ) : (
          <View
            style={[
              styles.fallbackRing,
              {
                width: safeSize,
                height: safeSize,
                borderRadius: safeSize / 2,
                borderWidth: stroke,
                // `background` (conic-gradient) is a web CSS property not in
                // RN's ViewStyle; only renders briefly until Skia mounts.
                background: `conic-gradient(${accentColor} ${fallbackDeg}deg, ${surface[2]} ${fallbackDeg}deg)`,
              } as unknown as ViewStyle,
            ]}
            pointerEvents="none"
          />
        )}

        {/* Drag thumb */}
        <Animated.View style={[styles.thumb, thumbStyle]} pointerEvents="none" />

        {/* Center label */}
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.value}>{displayValue}</Text>
          {label && <Text style={styles.label}>{label}</Text>}
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    // Web: RNGH pan gestures are pointercancel'd by the browser's native
    // scroll unless touch-action is none — without this the ring drag never
    // reaches onBegin on web (native unaffected; RN-web forwards the CSS).
    // Not in RN's ViewStyle types — same cast pattern as `background` above.
    touchAction: "none",
  } as unknown as ViewStyle,
  fallbackRing: {
    borderColor: surface[2],
  },
  thumb: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 9999,
    backgroundColor: colors.text.primary,
    borderWidth: 1,
    borderColor: border.DEFAULT,
  },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontFamily: typography.variants.heroStat.fontFamily,
    fontSize: typography.variants.heroStat.fontSize,
    lineHeight: typography.variants.heroStat.lineHeight,
    color: colors.text.primary,
  },
  label: {
    marginTop: spacing.xs,
    fontFamily: typography.variants.caption.fontFamily,
    fontSize: typography.variants.caption.fontSize,
    color: colors.text.secondary,
  },
});
