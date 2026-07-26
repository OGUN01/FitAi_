/**
 * MuscleBalanceRadar
 * Skia-based radar/spider chart for weekly muscle-group volume distribution.
 *
 * 8 axes (Chest / Back / Shoulders / Biceps / Triceps / Legs / Glutes / Core).
 * Animated draw-in (spring, ~600ms), orange->transparent gradient fill, tap an
 * axis to surface a tooltip. Reduce-motion is respected: the chart snaps to
 * its final shape instantly when the OS "Reduce Motion" setting is on.
 *
 * This is the FIRST component in the codebase to use
 * `@shopify/react-native-skia` (v2.0.0-next.4). It deliberately uses Skia's
 * declarative <Canvas>/<Path>/<Text> components + Reanimated shared values
 * (the pattern recommended in the Skia v2 docs) so the draw-in animates on the
 * UI thread without per-frame JS ticks.
 */

import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import {
  Canvas,
  Path,
  Text as SkiaText,
  Group,
  LinearGradient,
  vec,
  matchFont,
} from "@shopify/react-native-skia";
import {
  useSharedValue,
  useDerivedValue,
  withSpring,
} from "react-native-reanimated";
import { colors, flatColors } from "../../theme/aurora-tokens";
import { springConfig } from "../../theme/animations";
import { haptics } from "../../utils/haptics";
import { useReducedMotion } from "../../utils/accessibility/hooks";
import { rf, rs, rp, rbr } from "../../utils/responsive";
import { hexToRgba } from "../../utils/colors";

// ============================================================================
// TYPES
// ============================================================================

/** The 8 canonical muscle groups for the radar. */
export const RADAR_AXES = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Glutes",
  "Core",
] as const;

export type RadarAxis = (typeof RADAR_AXES)[number];

export interface MuscleBalanceRadarProps {
  /** Per-muscle-group value. Missing keys are treated as 0. 0..100. */
  data: Record<string, number>;
  /** Square canvas side length in px. @default 280 */
  size?: number;
  /** Gradient fill colors [start, end]. @default orange -> transparent */
  gradientColors?: [string, string];
  /** Optional tap handler; receives the axis name. */
  onAxisPress?: (axis: string) => void;
  /** Optional accessibility label. */
  accessibilityLabel?: string;
  /** Test ID. */
  testID?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_VALUE = 100; // Values are normalized to 0..100 internally.
const RING_LEVELS = [0.25, 0.5, 0.75, 1.0] as const; // Concentric grid rings.
const VERTEX_RADIUS = 3; // px radius of the data-point dots.

// Default orange -> transparent gradient (matches plan spec).
// Use hexToRgba with alpha=0 instead of the fragile `${hex}00` append (breaks
// if the token ever changes to an rgba()/named color string).
const DEFAULT_GRADIENT: [string, string] = [
  colors.primary[500], // #FF8A5C
  hexToRgba(colors.primary[500], 0), // transparent
];

// System font (no bundled TTF available in the project). matchFont resolves
// the platform default - Helvetica on iOS, Roboto/sans-serif on Android.
const buildAxisFont = (size: number) =>
  matchFont({
    fontFamily: "System",
    fontSize: size,
    fontWeight: "600",
  });

// ============================================================================
// GEOMETRY HELPERS
// ============================================================================

interface PolarPoint {
  x: number;
  y: number;
}

const polarToCartesian = (
  cx: number,
  cy: number,
  radius: number,
  angleRadians: number,
): PolarPoint => ({
  x: cx + radius * Math.cos(angleRadians),
  y: cy + radius * Math.sin(angleRadians),
});

/**
 * Build the SVG path string for the data polygon at a given progress
 * (0 = empty, 1 = full). Each vertex's radius is interpolated from 0 to its
 * target value. Returns "" when there are no axes (degenerate case).
 */
const buildDataPath = (
  cx: number,
  cy: number,
  maxRadius: number,
  values: number[],
  progress: number,
): string => {
  if (values.length === 0) return "";
  const n = values.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    // Start at top (-90deg), go clockwise.
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const normalized = (values[i] ?? 0) / MAX_VALUE; // 0..1
    const r = maxRadius * normalized * progress;
    const p = polarToCartesian(cx, cy, r, angle);
    d += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
  }
  return `${d} Z`;
};

/** Build an SVG circle path string (used for vertex dots). */
const buildCirclePath = (cx: number, cy: number, r: number): string => {
  // SVG arc-based circle: move to (cx-r, cy), two semicircle arcs.
  return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
};

// ============================================================================
// VERTEX DOT (separate component so hooks are top-level, not in .map)
// ============================================================================

interface VertexDotProps {
  value: number;
  index: number;
  total: number;
  cx: number;
  cy: number;
  maxRadius: number;
  progress: ReturnType<typeof useSharedValue<number>>;
  color: string;
}

const VertexDot: React.FC<VertexDotProps> = ({
  value,
  index,
  total,
  cx,
  cy,
  maxRadius,
  progress,
  color,
}) => {
  // Angle is constant per dot; precompute once.
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / total;

  // Radius grows with the draw-in progress.
  const r = useDerivedValue(() => {
    "worklet";
    return (maxRadius * (value ?? 0) * progress.value) / MAX_VALUE;
  }, [value, maxRadius]);

  const dotPath = useDerivedValue(() => {
    "worklet";
    const px = cx + r.value * Math.cos(angle);
    const py = cy + r.value * Math.sin(angle);
    return buildCirclePath(px, py, VERTEX_RADIUS);
  }, [cx, cy, r, angle]);

  return <Path path={dotPath} style="fill" color={color} />;
};

// ============================================================================
// COMPONENT
// ============================================================================

export const MuscleBalanceRadar: React.FC<MuscleBalanceRadarProps> = ({
  data,
  size = 280,
  gradientColors = DEFAULT_GRADIENT,
  onAxisPress,
  accessibilityLabel = "Weekly muscle balance radar chart",
  testID,
}) => {
  const reduceMotion = useReducedMotion();

  // Geometry - derived once from size.
  const { cx, cy, maxRadius, labelRadius } = useMemo(() => {
    const center = Math.round(size / 2);
    // Leave room for axis labels + a small margin.
    const labelGap = rs(28);
    const maxR = Math.max(1, center - labelGap);
    return {
      cx: center,
      cy: center,
      maxRadius: maxR,
      labelRadius: maxR + rs(12),
    };
  }, [size]);

  // Map data dict -> ordered values aligned with RADAR_AXES.
  const values = useMemo(
    () => RADAR_AXES.map((axis) => data[axis] ?? 0),
    [data],
  );

  // Animation progress: 0 -> 1 on mount (or when data changes), spring 600ms.
  const progress = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
    } else {
      progress.value = 0;
      progress.value = withSpring(1, {
        ...springConfig.smooth,
        overshootClamping: false,
      });
    }
  }, [reduceMotion, progress]);

  // Derived animated path string - computed on the UI thread via Skia's
  // useDerivedValue so the polygon redraws each frame without JS round-trips.
  const dataPath = useDerivedValue(() => {
    "worklet";
    return buildDataPath(cx, cy, maxRadius, values, progress.value);
  }, [cx, cy, maxRadius, values]);

  // Tooltip state (lightweight - tap an axis label to highlight it).
  const [activeAxis, setActiveAxis] = useState<number | null>(null);

  // Font (resolved via matchFont - memoized by size). Re-resolves when the
  // responsive font size changes (font scale).
  const axisFontSize = rf(11);
  const axisFont = useMemo(() => buildAxisFont(axisFontSize), [axisFontSize]);

  // Precompute static grid + spoke paths (don't animate).
  const { gridPath, spokesPath } = useMemo(() => {
    let grid = "";
    let spokes = "";
    RING_LEVELS.forEach((level) => {
      const r = maxRadius * level;
      let ring = "";
      for (let i = 0; i < RADAR_AXES.length; i++) {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length;
        const p = polarToCartesian(cx, cy, r, angle);
        ring += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
      }
      grid += `${ring} Z `;
    });
    RADAR_AXES.forEach((_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length;
      const p = polarToCartesian(cx, cy, maxRadius, angle);
      spokes += `M ${cx} ${cy} L ${p.x} ${p.y} `;
    });
    return { gridPath: grid, spokesPath: spokes };
  }, [cx, cy, maxRadius]);

  // Label positions for the Skia <Text> layer.
  const labelPositions = useMemo(
    () =>
      RADAR_AXES.map((axis, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length;
        const p = polarToCartesian(cx, cy, labelRadius, angle);
        // measureText returns an SkRect ({x,y,width,height}); use .width to
        // center the label on its anchor point. Fall back to 0 if the font
        // hasn't resolved yet (first render before matchFont completes).
        const tw = axisFont?.measureText(axis)?.width ?? 0;
        return {
          axis,
          x: p.x - tw / 2,
          y: p.y + rf(4), // nudge down so the baseline sits on the anchor
          isActive: activeAxis === i,
        };
      }),
    [cx, cy, labelRadius, axisFont, activeAxis],
  );

  const handleAxisTap = (i: number) => {
    haptics.selection();
    setActiveAxis((cur) => (cur === i ? null : i));
    onAxisPress?.(RADAR_AXES[i]);
  };

  // Active-axis value for the tooltip.
  const activeValue = activeAxis !== null ? values[activeAxis] : null;

  return (
    <View
      style={[styles.container, { width: size, height: size }]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        text: RADAR_AXES.map((a) => `${a}: ${data[a] ?? 0}`).join(", "),
      }}
      testID={testID}
    >
      <Canvas style={StyleSheet.absoluteFill}>
        {/* Grid rings (static) */}
        <Path
          path={gridPath}
          style="stroke"
          strokeWidth={1}
          strokeJoin="round"
          color={colors.glass.border}
          opacity={0.5}
        />
        {/* Spokes (static) */}
        <Path
          path={spokesPath}
          style="stroke"
          strokeWidth={1}
          color={colors.glass.border}
          opacity={0.4}
        />

        {/* Data polygon - gradient fill + stroke, animated draw-in */}
        <Path path={dataPath} style="fill" opacity={0.45}>
          <LinearGradient
            start={vec(cx, cy - maxRadius)}
            end={vec(cx, cy + maxRadius)}
            colors={[gradientColors[0], gradientColors[1]]}
          />
        </Path>
        <Path
          path={dataPath}
          style="stroke"
          strokeWidth={2}
          strokeJoin="round"
          strokeCap="round"
          color={gradientColors[0]}
        />

        {/* Vertex dots - each is its own component so hooks stay top-level. */}
        <Group>
          {values.map((v, i) => (
            <VertexDot
              key={i}
              value={v}
              index={i}
              total={values.length}
              cx={cx}
              cy={cy}
              maxRadius={maxRadius}
              progress={progress}
              color={gradientColors[0]}
            />
          ))}
        </Group>

        {/* Axis labels (Skia text - overlaid on canvas) */}
        {axisFont &&
          labelPositions.map(({ axis, x, y, isActive }) => (
            <SkiaText
              key={axis}
              x={x}
              y={y}
              text={axis}
              font={axisFont}
              color={isActive ? colors.primary[400] : colors.text.secondary}
            />
          ))}
      </Canvas>

      {/* Tappable hotspots over each axis label - RN layer so Pressable works */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {RADAR_AXES.map((_, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / RADAR_AXES.length;
          const p = polarToCartesian(cx, cy, labelRadius, angle);
          const hotspot = rs(28);
          return (
            <Pressable
              key={i}
              onPress={() => handleAxisTap(i)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${RADAR_AXES[i]} muscle group, ${values[i] ?? 0} of ${MAX_VALUE}`}
              accessibilityHint="Double tap to see details"
              style={{
                position: "absolute",
                left: p.x - hotspot / 2,
                top: p.y - hotspot / 2,
                width: hotspot,
                height: hotspot,
              }}
            />
          );
        })}
      </View>

      {/* Tooltip overlay (RN Text - crisp, accessible, sits above canvas).
          Clamp position so the tooltip can't overflow the canvas edges. */}
      {activeAxis !== null && activeValue !== null && (
        <View
          style={[
            styles.tooltip,
            {
              left: Math.max(
                0,
                Math.min(
                  size - rp(80),
                  labelPositions[activeAxis].x + rf(4),
                ),
              ),
              top: Math.max(
                0,
                labelPositions[activeAxis].y - rf(40),
              ),
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.tooltipLabel}>{RADAR_AXES[activeAxis]}</Text>
          <Text style={styles.tooltipValue}>{activeValue}</Text>
        </View>
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
  },
  tooltip: {
    position: "absolute",
    backgroundColor: flatColors.backgroundTertiary,
    borderRadius: rbr(8),
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  tooltipLabel: {
    color: colors.text.secondary,
    fontSize: rf(10),
    fontWeight: "600",
  },
  tooltipValue: {
    color: colors.primary[400],
    fontSize: rf(14),
    fontWeight: "700",
  },
});

export default MuscleBalanceRadar;
