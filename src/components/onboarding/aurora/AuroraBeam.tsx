/**
 * AuroraBeam — shared progress indicator (blueprint §7.1)
 *
 * A single thin (2dp) horizontal rule pinned top-center under the safe area.
 * A filled segment grows left→right colored by the *current* screen's chart
 * color; as the user advances the fill extends (spring) and the color
 * cross-fades (timing) to the next step's chart color. Completed segments
 * are tappable to navigate back; the current segment is not.
 *
 * No labels, no dots — reads as one continuous fill.
 */

import React, { useEffect } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { border, spacing, chart } from "../../../theme/aurora-tokens";

// Blueprint-spec spring for the beam fill grow.
const BEAM_SPRING = { damping: 14, stiffness: 120 };

export interface AuroraBeamProps {
  /** Current step, 1–5. */
  currentStep: number;
  /** The 5 chart colors, one per step (e.g. [chart[3], chart[2], chart[5], chart[1], chart[1]]). */
  stepColors: string[];
  /** Fired when a *completed* step's segment is tapped. */
  onStepPress?: (step: number) => void;
}

const fireSelection = () => {
  Haptics.selectionAsync().catch(() => {});
};

export const AuroraBeam: React.FC<AuroraBeamProps> = ({
  currentStep,
  stepColors,
  onStepPress,
}) => {
  const clampedStep = Math.max(1, Math.min(5, currentStep));
  // Fill grows proportionally to the current step (step/5 of full width).
  const targetFill = clampedStep / 5;
  const fill = useSharedValue(targetFill);
  const colorIndex = useSharedValue(clampedStep - 1);

  useEffect(() => {
    fill.value = withSpring(targetFill, BEAM_SPRING);
    colorIndex.value = withTiming(clampedStep - 1, {
      duration: 600,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [targetFill, clampedStep, fill, colorIndex]);

  const fillStyle = useAnimatedStyle(() => {
    const palette = stepColors.length
      ? stepColors
      : [chart[1], chart[2], chart[3], chart[4], chart[5]];
    const color = interpolateColor(
      colorIndex.value,
      [0, 1, 2, 3, 4],
      palette
    );
    return {
      width: `${fill.value * 100}%`,
      backgroundColor: color as string,
    };
  });

  const handleStepPress = (step: number) => {
    // Only completed steps (less than current) are tappable.
    if (step >= clampedStep) return;
    runOnJS(fireSelection)();
    onStepPress?.(step);
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: 5, now: clampedStep }}
    >
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
      {/* Invisible tap segments over completed steps. */}
      <View style={styles.tapRow}>
        {[1, 2, 3, 4, 5].map((step) => {
          const completed = step < clampedStep;
          return (
            <Pressable
              key={step}
              style={styles.tapSegment}
              onPress={() => completed && handleStepPress(step)}
              hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }}
              accessibilityRole={completed ? "button" : "none"}
              accessibilityLabel={
                completed ? `Go back to step ${step}` : undefined
              }
            />
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
    // Transparent so the drifting AuroraField shows through — only the 2dp
    // track reads as visible. Keeps the "one continuous sky" feel (blueprint §1).
    backgroundColor: "transparent",
  },
  track: {
    height: 2,
    width: "100%",
    backgroundColor: border.subtle,
    borderRadius: 9999,
    overflow: "hidden",
  },
  fill: {
    height: 2,
    borderRadius: 9999,
  },
  tapRow: {
    position: "absolute",
    top: 0,
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    flexDirection: "row",
  },
  tapSegment: {
    flex: 1,
    height: "100%",
  },
});

// surface.0 is the container backdrop (beam sits over the screen background).
