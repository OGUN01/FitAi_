/**
 * AuroraField — the drifting background layer (blueprint §7.2)
 *
 * A single LinearGradient that lives behind the entire onboarding flow and
 * never fully resets between screens. As the user advances (step 1→5) the
 * color stops DRIFT over 600ms (Easing.bezier(0.4,0,0.2,1)) so the sky takes
 * on each screen's mood — You (calm purple) → Fuel (warm amber) → Body (cool
 * cyan) → Move (energetic orange) → Plan (full spectrum) — a breathing color
 * journey rather than a monotonic ramp, so the bg never fights the controls.
 *
 * Mount-once semantics are the consumer's responsibility; the component just
 * renders the gradient absolutely filling its parent (z-index 0,
 * pointerEvents none).
 *
 * Cross-fade: expo-linear-gradient does not accept Reanimated animated color
 * props, so we stack two gradient layers (previous step + current step) and
 * cross-fade the top layer's opacity from 0→1 over 600ms on step change. The
 * eye reads this as the stops drifting, not a hard cut.
 */

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors, chart } from "../../../theme/aurora-tokens";

export interface AuroraFieldProps {
  /** Current step 1–5; drives the hue drift. */
  step: number;
}

// Per-screen gradient stop endpoints, mood-mapped to each tab's accent in
// ACTUAL flow order (You → Fuel → Body → Move → Plan), not the blueprint's
// conceptual S-order. Each row = [topColor, midColor, bottomColor]. The sky
// takes on each screen's mood — a breathing color journey, not a monotonic
// ramp — so the background never fights the foreground controls.
//   You (purple, calm) → Fuel (amber, warm) → Body (cyan, clarity) →
//   Move (orange, energy) → Plan (full spectrum)
const STEP_STOPS: [string, string, string][] = [
  // Tab 1 — You (deep purple calm)
  [colors.aurora.purple.base, colors.aurora.purple.mid, colors.aurora.space.base],
  // Tab 2 — Fuel (warm amber drifting in from purple)
  [colors.aurora.purple.mid, colors.aurora.space.mid, chart[5]],
  // Tab 3 — Body (cool cyan clarity)
  [colors.aurora.space.mid, colors.aurora.ocean.mid, chart[2]],
  // Tab 4 — Move (energetic orange)
  [colors.aurora.ocean.mid, chart[1], colors.aurora.space.mid],
  // Tab 5 — Plan (full spectrum reveal)
  [chart[3], chart[1], chart[2]],
];

export const AuroraField: React.FC<AuroraFieldProps> = ({ step }) => {
  const clampedStep = Math.max(1, Math.min(5, step));
  const currentIndex = clampedStep - 1;

  // Track the previous step's stops so we can cross-fade FROM them.
  const prevRef = useRef(STEP_STOPS[currentIndex]);
  const [prevStops, setPrevStops] = useState(STEP_STOPS[currentIndex]);
  const fade = useSharedValue(1);

  useEffect(() => {
    const newStops = STEP_STOPS[currentIndex];
    if (prevRef.current === newStops) return;
    // Start from the previous stops (opaque) and fade the new layer in.
    setPrevStops(prevRef.current);
    fade.value = 0;
    fade.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.4, 0, 0.2, 1) });
    prevRef.current = newStops;
  }, [currentIndex, fade]);

  const topStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View style={styles.root} pointerEvents="none">
      {/* Base layer = previous step's stops. */}
      <LinearGradient
        colors={prevStops}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Top layer = current step's stops, cross-fading in. */}
      <Animated.View style={[StyleSheet.absoluteFill, topStyle]}>
        <LinearGradient
          colors={STEP_STOPS[currentIndex]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
