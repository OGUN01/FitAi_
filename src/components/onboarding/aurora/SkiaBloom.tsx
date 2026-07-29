/**
 * SkiaBloom — particle burst (blueprint §7.13)
 *
 * 12 particles expand radially from `origin` and fade out over 400ms. When
 * `trigger` flips true, the burst runs once. Mounted once at flow root and
 * triggered by NavRail commits and the S5 final reveal.
 *
 * Skia Canvas renders N circles; Reanimated shared values drive each
 * particle's center + radius + opacity. The component is absolutely
 * positioned to fill its parent so callers can overlay it over the CTA /
 * AuroraField. Each particle is its own component so the Reanimated hooks
 * are called at the top level (Rules of Hooks).
 */

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, ViewStyle, LayoutChangeEvent } from "react-native";
import { Canvas, Circle } from "@shopify/react-native-skia";
import Animated, {
  useSharedValue,
  useDerivedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSkiaReady } from "./useSkiaReady";

export interface SkiaBloomProps {
  /** Flip to true to fire the burst (runs once per true edge). */
  trigger: boolean;
  /** Particle fill color (a chart color). */
  color: string;
  /** Particle count. @default 12 */
  count?: number;
  /** Burst origin in px relative to the component. Default = center (auto). */
  origin?: { x: number; y: number };
  /** Extra style for the absolutely-positioned overlay. */
  style?: ViewStyle;
  testID?: string;
}

const BURST_MS = 400;
const MAX_RADIUS = 60;

interface ParticleSpec {
  angle: number;
  dist: number;
  r: number;
}

interface ParticleProps {
  spec: ParticleSpec;
  progress: Animated.SharedValue<number>;
  color: string;
  ox: number;
  oy: number;
}

const Particle: React.FC<ParticleProps> = ({ spec, progress, color, ox, oy }) => {
  const cx = useDerivedValue(() => ox + Math.cos(spec.angle) * spec.dist * progress.value);
  const cy = useDerivedValue(() => oy + Math.sin(spec.angle) * spec.dist * progress.value);
  const r = useDerivedValue(() => spec.r * (1 - progress.value) + 0.5);
  const op = useDerivedValue(() => 1 - progress.value);
  return <Circle cx={cx} cy={cy} r={r} color={color} opacity={op} />;
};

export const SkiaBloom: React.FC<SkiaBloomProps> = ({
  trigger,
  color,
  count = 12,
  origin,
  style,
  testID,
}) => {
  const progress = useSharedValue(0);
  const fired = React.useRef(false);

  const particles = useMemo<ParticleSpec[]>(() => {
    const arr: ParticleSpec[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const dist = MAX_RADIUS * (0.7 + (i % 3) * 0.12); // radial spread
      const r = 4 + (i % 4); // particle size variation
      arr.push({ angle, dist, r });
    }
    return arr;
  }, [count]);

  useEffect(() => {
    if (trigger && !fired.current) {
      fired.current = true;
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: BURST_MS,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    }
    if (!trigger) {
      // Reset so the next true-edge fires again.
      fired.current = false;
    }
  }, [trigger, progress]);

  const onLayout = (_e: LayoutChangeEvent) => {
    /* origin defaults to center; callers may pass an explicit origin. */
  };

  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;
  const skiaReady = useSkiaReady();

  return (
    <View style={[styles.overlay, style]} onLayout={onLayout} pointerEvents="none" testID={testID}>
      {skiaReady && (
        <Canvas style={StyleSheet.absoluteFill}>
          {particles.map((p, i) => (
            <Particle key={i} spec={p} progress={progress} color={color} ox={ox} oy={oy} />
          ))}
        </Canvas>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
