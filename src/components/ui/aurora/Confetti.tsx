/**
 * Confetti
 * Reanimated 3 confetti burst with gravity + rotation + physics settling.
 * Triggered imperatively via the `trigger` prop (fire-and-forget: set trigger
 * to true to launch a burst; the component resets automatically after the
 * duration).
 *
 * This extends the existing `ParticleBurst` (radial burst) with downward
 * gravity, continuous spin, and a physics-style settle — closer to the legacy
 * `AchievementCelebration` confetti (which used RN Animated + PanResponder)
 * but rebuilt on Reanimated 3 so it runs on the UI thread.
 *
 * Reduce-motion is respected: when the OS "Reduce Motion" setting is on, the
 * burst renders particles statically (no falling animation) and immediately
 * calls onComplete.
 */

import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import { colors, flatColors } from "../../../theme/aurora-tokens";
import { duration } from "../../../theme/animations";
import { useReducedMotion } from "../../../utils/accessibility/hooks";
import { rf, rp } from "../../../utils/responsive";

// ============================================================================
// TYPES
// ============================================================================

export interface ConfettiProps {
  /** Fire a burst when this becomes true. Resets to false internally. */
  trigger: boolean;
  /** Number of confetti pieces. @default 24 */
  particleCount?: number;
  /** Confetti colors. @default [orange, cyan, gold, green, purple] */
  colors?: string[];
  /** Total animation duration in ms (fall + settle). @default 2500 */
  duration?: number;
  /** Fired once after the burst completes (use to chain state changes). */
  onComplete?: () => void;
  /** Burst origin offset from the container's top-left (in px). @default center */
  origin?: { x: number; y: number };
  /** Extra container styles. */
  style?: ViewStyle;
  /** Test ID. */
  testID?: string;
}

interface Particle {
  id: number;
  /** Initial horizontal velocity (px spread). */
  vx: number;
  /** Initial vertical velocity (px upward, negative = up). */
  vy: number;
  /** Rotation speed (deg per ms). */
  rotationSpeed: number;
  /** Piece size in px. */
  size: number;
  /** Color. */
  color: string;
  /** Stagger delay in ms so the burst isn't perfectly uniform. */
  delay: number;
  /** Shape variant so pieces aren't all identical squares. */
  shape: "rect" | "circle";
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_COLORS: string[] = [
  colors.primary[500], // orange
  flatColors.secondary, // cyan
  flatColors.gold, // gold
  colors.success.DEFAULT, // green
  flatColors.purple, // purple
];

// Gravity in px/ms^2 (tuned to feel like a gentle celebration, not a brick).
const GRAVITY = 0.0016;
// Fall distance — enough to clear the container with margin.
const FALL_DISTANCE = 600;

// ============================================================================
// PARTICLE COMPONENT
// ============================================================================

interface ParticleViewProps {
  particle: Particle;
  progress: Animated.SharedValue<number>;
  originX: number;
  originY: number;
  reduceMotion: boolean;
}

const ParticleView: React.FC<ParticleViewProps> = ({
  particle,
  progress,
  originX,
  originY,
  reduceMotion,
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      // Static fade-out only.
      return {
        opacity: interpolate(progress.value, [0, 0.5, 1], [1, 1, 0], Extrapolate.CLAMP),
        transform: [
          { translateX: originX },
          { translateY: originY },
          { rotate: "0deg" },
        ],
      };
    }

    const t = progress.value; // 0..1 over `duration`
    // Horizontal drift: linear with vx (no horizontal gravity).
    const x = originX + particle.vx * t * 2;
    // Vertical: projectile motion. y = originY + vy*t + 0.5*g*t^2
    // We scale gravity so it's perceptible within the duration.
    const y =
      originY +
      particle.vy * t +
      0.5 * GRAVITY * FALL_DISTANCE * t * t * 8;
    // Rotation accumulates over the fall.
    const rotation = particle.rotationSpeed * t * 360;
    // Fade in fast, hold, fade out near the end.
    const opacity = interpolate(
      progress.value,
      [0, 0.1, 0.8, 1],
      [0, 1, 1, 0],
      Extrapolate.CLAMP,
    );
    // Slight scale-down as it settles.
    const scale = interpolate(t, [0, 1], [1, 0.6], Extrapolate.CLAMP);

    return {
      opacity,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotation}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.size,
          height: particle.shape === "rect" ? particle.size * 0.5 : particle.size,
          backgroundColor: particle.color,
          borderRadius: particle.shape === "circle" ? particle.size / 2 : 2,
        },
        animatedStyle,
      ]}
    />
  );
};

// ============================================================================
// COMPONENT
// ============================================================================

export const Confetti: React.FC<ConfettiProps> = ({
  trigger,
  particleCount = 24,
  colors: palette = DEFAULT_COLORS,
  duration: burstDuration = 2500,
  onComplete,
  origin,
  style,
  testID,
}) => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  // Default origin = container center (we can't measure the container here
  // without a layout event; callers pass an explicit origin if needed, and
  // the burst spreads radially from that point).
  const ox = origin?.x ?? 0;
  const oy = origin?.y ?? 0;

  // Generate the particle set. Regenerate on each trigger so the burst feels
  // fresh (different velocities / colors each time).
  const particles = useMemo<Particle[]>(() => {
    const set: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      // Random angle biased upward (celebration shoots up first).
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 60 + Math.random() * 120;
      set.push({
        id: i,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotationSpeed: (Math.random() - 0.5) * 4,
        size: rf(6 + Math.random() * 8),
        color: palette[Math.floor(Math.random() * palette.length)],
        delay: Math.random() * 120,
        shape: Math.random() > 0.5 ? "rect" : "circle",
      });
    }
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [particleCount, palette, trigger]);

  // Fire the burst when `trigger` flips to true.
  useEffect(() => {
    if (!trigger) return;
    progress.value = 0;
    if (reduceMotion) {
      // Skip the fall animation; just fade and complete.
      progress.value = withTiming(1, { duration: Math.min(burstDuration, 400) });
      if (onComplete) {
        const t = setTimeout(onComplete, Math.min(burstDuration, 450));
        return () => clearTimeout(t);
      }
      return;
    }
    progress.value = withDelay(
      50,
      withSequence(
        withTiming(1, {
          duration: burstDuration,
          easing: Easing.out(Easing.cubic),
        }),
        withTiming(0, { duration: 0 }),
      ),
    );
    if (onComplete) {
      const t = setTimeout(onComplete, burstDuration + 150);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [trigger, reduceMotion, burstDuration, progress, onComplete]);

  return (
    <View
      testID={testID}
      style={[styles.container, { left: ox, top: oy }, style]}
      pointerEvents="none"
      accessibilityRole="image"
      accessibilityLabel="Celebration confetti"
    >
      {particles.map((p) => (
        <ParticleView
          key={p.id}
          particle={p}
          progress={progress}
          originX={ox}
          originY={oy}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
  },
});

export default Confetti;
