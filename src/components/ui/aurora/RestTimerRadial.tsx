/**
 * RestTimerRadial
 * Skia arc countdown timer for rest periods between sets. Features:
 *   - 60fps countdown via Reanimated `useFrameCallback` (runs on the UI thread)
 *   - arc color transitions green -> amber -> red as time depletes
 *   - haptic `selection` on each 10s mark, `celebration` + confetti on complete
 *   - pause / resume controls
 *
 * Uses the same Skia <Canvas>/<Path> declarative pattern as MuscleBalanceRadar
 * (the other Skia component). The arc is an SVG-style path rebuilt each frame
 * from the remaining-time shared value.
 */

import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, Text, Pressable, ViewStyle } from "react-native";
import {
  Canvas,
  Path,
  Group,
  LinearGradient,
  vec,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  useFrameCallback,
  runOnJS,
  interpolateColor,
} from "react-native-reanimated";
import { colors, spacing, borderRadius } from "../../../theme/aurora-tokens";
import { haptics } from "../../../utils/haptics";
import { useReducedMotion } from "../../../utils/accessibility/hooks";
import { rf, rs } from "../../../utils/responsive";
import { Confetti } from "./Confetti";

// ============================================================================
// TYPES
// ============================================================================

export interface RestTimerRadialProps {
  /** Countdown duration in seconds. */
  durationSeconds: number;
  /** Auto-start the countdown on mount. @default true */
  autoStart?: boolean;
  /** Fired when the countdown reaches zero. */
  onComplete?: () => void;
  /** Canvas size in px. @default 200 */
  size?: number;
  /** Stroke width in px. @default 12 */
  strokeWidth?: number;
  /** Extra container styles. */
  style?: ViewStyle;
  /** Test ID. */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Color stops for the time-depleting gradient.
const COLOR_FULL = colors.success.DEFAULT; // green
const COLOR_MID = colors.warning.DEFAULT; // amber
const COLOR_LOW = colors.error.DEFAULT; // red

// ============================================================================
// GEOMETRY HELPERS
// ============================================================================

/**
 * Build an SVG arc path from `startAngle` to `endAngle` (both in radians,
 * measured clockwise from the top, i.e. -PI/2 = 12 o'clock). The path is a
 * stroked arc (not filled) so we can animate strokeDasharray instead — but for
 * a countdown the cleaner approach is to rebuild the arc path each frame,
 * which is what we do here.
 */
const buildArcPath = (
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string => {
  // Skia/SVG arcs use the large-arc-flag + sweep-flag. For a progress arc
  // spanning less than 360deg we use a single arc command.
  if (Math.abs(endAngle - startAngle) >= Math.PI * 2 - 0.001) {
    // Full circle — draw as a closed circle path.
    return `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`;
  }
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const RestTimerRadial: React.FC<RestTimerRadialProps> = ({
  durationSeconds,
  autoStart = true,
  onComplete,
  size = 200,
  strokeWidth = 12,
  style,
  testID,
}) => {
  const reduceMotion = useReducedMotion();

  const safeSize = Number.isFinite(size) ? Math.round(size) : 200;
  const safeStroke = Number.isFinite(strokeWidth) ? Math.round(strokeWidth) : 12;
  const safeDuration =
    Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : 0;

  const radius = Math.max(1, Math.round((safeSize - safeStroke) / 2) - 4);
  const cx = Math.round(safeSize / 2);
  const cy = Math.round(safeSize / 2);

  // Remaining time in SECONDS (float for smooth sub-second animation).
  const remaining = useSharedValue(safeDuration);
  const isRunning = useSharedValue(autoStart && !reduceMotion);
  const [isPaused, setIsPaused] = useState(!(autoStart && !reduceMotion));
  const [completed, setCompleted] = useState(false);
  const lastHapticSecond = useSharedValue(Math.ceil(safeDuration));

  // useFrameCallback advances the countdown on every UI frame — this is the
  // smooth 60fps clock the spec asks for. It's paused when isRunning is false.
  useFrameCallback((info) => {
    if (!isRunning.value) return;
    // info.timeSinceFirstFrame / timeSinceFirstFrame is in ms.
    // We decrement by the frame delta. Use info.timestamp delta for accuracy.
    // Reanimated exposes timeSinceFirstFrame in ms on the FrameInfo.
    const dt = (info.timeSinceFirstFrame ?? 16) / 1000;
    const next = remaining.value - dt;
    if (next <= 0) {
      remaining.value = 0;
      isRunning.value = false;
      runOnJS(handleComplete)();
      return;
    }
    remaining.value = next;
    // Fire a selection haptic at each 10s mark (descending).
    const currentSecond = Math.ceil(next);
    if (
      currentSecond < lastHapticSecond.value &&
      currentSecond % 10 === 0 &&
      currentSecond > 0
    ) {
      lastHapticSecond.value = currentSecond;
      runOnJS(haptics.selection)();
    }
  }, autoStart && !reduceMotion);

  // JS-side completion handler (called via runOnJS from the worklet).
  const handleComplete = useCallback(() => {
    setCompleted(true);
    setIsPaused(true);
    haptics.celebration();
    onComplete?.();
  }, [onComplete]);

  // Derived: progress 0..1 (1 = full time remaining).
  const progress = useDerivedValue(() => {
    "worklet";
    return safeDuration > 0 ? remaining.value / safeDuration : 0;
  }, [safeDuration]);

  // Derived: arc end angle. Full circle = 2*PI. As time depletes the arc
  // shrinks from full to empty (sweeping clockwise from the top).
  const arcPath = useDerivedValue(() => {
    "worklet";
    const startAngle = -Math.PI / 2;
    const sweep = progress.value * Math.PI * 2;
    const endAngle = startAngle + sweep;
    return buildArcPath(cx, cy, radius, startAngle, endAngle);
  }, [cx, cy, radius, progress]);

  // Derived: current color via interpolateColor (green -> amber -> red).
  const currentColor = useDerivedValue(() => {
    "worklet";
    // progress: 1 = full (green), 0.5 = amber, 0 = red.
    return interpolateColor(
      progress.value,
      [0, 0.5, 1],
      [COLOR_LOW, COLOR_MID, COLOR_FULL],
    );
  }, [progress]);

  // Gradient endpoints (static — color interpolation handles the transition).
  const gradientStart = useDerivedValue(() => vec(cx, cy - radius), [cx, cy, radius]);
  const gradientEnd = useDerivedValue(() => vec(cx, cy + radius), [cx, cy, radius]);
  const gradientColors = useDerivedValue(() => {
    "worklet";
    return [currentColor.value, currentColor.value];
  }, [currentColor]);

  // Center time text (mm:ss). Derived so it updates each frame without JS.
  const displayText = useDerivedValue(() => {
    "worklet";
    const total = Math.max(0, Math.ceil(remaining.value));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }, [remaining]);

  // Pause / resume controls.
  const togglePause = useCallback(() => {
    if (completed) return;
    setIsPaused((p) => {
      const next = !p;
      isRunning.value = next && !reduceMotion;
      if (next) {
        haptics.light();
      } else {
        haptics.selection();
      }
      return next;
    });
  }, [completed, reduceMotion, isRunning]);

  // Reset when duration changes.
  useEffect(() => {
    remaining.value = safeDuration;
    lastHapticSecond.value = Math.ceil(safeDuration);
    setCompleted(false);
    const shouldAutoStart = autoStart && !reduceMotion;
    isRunning.value = shouldAutoStart;
    setIsPaused(!shouldAutoStart);
  }, [safeDuration, autoStart, reduceMotion, remaining, lastHapticSecond, isRunning]);

  // Pause indicator dot color.
  const statusColor = completed
    ? colors.success.DEFAULT
    : isPaused
      ? colors.warning.DEFAULT
      : colors.primary[500];

  return (
    <View
      testID={testID}
      style={[styles.container, { width: safeSize, height: safeSize }, style]}
      accessibilityRole="timer"
      accessibilityLabel={`Rest timer, ${Math.ceil(remaining.value)} seconds remaining`}
      accessibilityLiveRegion="polite"
      accessibilityValue={{
        min: 0,
        max: Math.round(safeDuration),
        now: Math.ceil(remaining.value),
        text: displayText.value,
      }}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Background track (full circle, faint) */}
        <Path
          path={buildArcPath(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2)}
          style="stroke"
          strokeWidth={safeStroke}
          strokeCap="round"
          color={colors.glass.surface}
          opacity={0.6}
        />
        {/* Animated countdown arc */}
        <Group>
          <Path
            path={arcPath}
            style="stroke"
            strokeWidth={safeStroke}
            strokeCap="round"
            color={currentColor}
          >
            <LinearGradient
              start={gradientStart}
              end={gradientEnd}
              colors={gradientColors}
            />
          </Path>
        </Group>
      </Canvas>

      {/* Center content (RN layer for crisp text + controls) */}
      <View style={styles.centerContent}>
        <Text style={styles.timeText}>{displayText.value}</Text>
        <Text style={styles.labelText}>
          {completed ? "Done" : isPaused ? "Paused" : "Rest"}
        </Text>
      </View>

      {/* Pause/resume control (overlaid, tappable) */}
      <Pressable
        onPress={togglePause}
        disabled={completed}
        style={styles.controlButton}
        accessibilityRole="button"
        accessibilityLabel={isPaused ? "Resume timer" : "Pause timer"}
        accessibilityHint="Double tap to pause or resume the rest countdown"
      >
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.controlText}>
          {completed ? "Complete" : isPaused ? "Resume" : "Pause"}
        </Text>
      </Pressable>

      {/* Confetti burst on completion */}
      {completed && (
        <Confetti
          trigger={completed}
          particleCount={20}
          origin={{ x: safeSize / 2, y: safeSize / 2 }}
          duration={2000}
        />
      )}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: {
    fontSize: rf(36),
    fontWeight: "800",
    color: colors.text.primary,
    fontVariant: ["tabular-nums"],
  },
  labelText: {
    fontSize: rf(11),
    fontWeight: "600",
    color: colors.text.secondary,
    marginTop: rs(2),
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  controlButton: {
    position: "absolute",
    bottom: -rs(40),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: Math.max(rs(44), 44),
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  statusDot: {
    width: rs(8),
    height: rs(8),
    borderRadius: borderRadius.full,
  },
  controlText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.text.primary,
  },
});

export default RestTimerRadial;
