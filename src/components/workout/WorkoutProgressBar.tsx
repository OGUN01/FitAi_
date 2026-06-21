/**
 * FitAI — Workout Progress Bar (Aurora)
 *
 * Slim progress bar shown under the workout header. Previously a flat track with
 * a solid-color fill and a legacy RN `Animated.Value` driving opacity.
 *
 * Aurora modernization:
 *  - Solid fill → LinearGradient (primary token gradient) for a richer bar.
 *  - Legacy `Animated.Value` opacity → Reanimated shared value (the parent
 *    useWorkoutAnimations hook now returns SharedValue<number>).
 *  - Hardcoded colors → aurora tokens.
 *  - Width is now driven by Reanimated `withTiming` so progress changes animate
 *    smoothly instead of snapping.
 */
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SharedValue,
} from "react-native-reanimated";
import { colors, spacing, borderRadius, typography } from "../../theme/aurora-tokens";
import { rf, rp, rh } from "../../utils/responsive";
import { gradientPrimary } from "../../theme/gradients";
import { animations } from "../../theme/animations";

interface WorkoutProgressBarProps {
  progress: number; // 0..1
  /** Reanimated shared value (0..1) from useWorkoutAnimations — drives opacity. */
  fadeAnim: SharedValue<number>;
}

const safeString = (value: any, fallback: string = ""): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "number" && Number.isNaN(value)) return fallback;
  if (typeof value === "string") return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

export const WorkoutProgressBar: React.FC<WorkoutProgressBarProps> = ({
  progress,
  fadeAnim,
}) => {
  const widthSV = useSharedValue(0);

  // Animate the bar width whenever progress changes (smooth instead of snap).
  useEffect(() => {
    widthSV.value = withTiming(Math.min(100, Math.max(0, progress * 100)), {
      duration: animations.duration.normal,
    });
  }, [progress, widthSV]);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${widthSV.value}%`,
    opacity: fadeAnim.value,
  }));

  return (
    <View
      style={styles.outerWrapper}
      accessibilityRole="progressbar"
      accessibilityLabel={`Workout progress: ${Math.round(progress * 100)}%`}
    >
      <Text style={styles.progressPercentage}>
        {safeString(Math.round(progress * 100))}%
      </Text>
      <View style={styles.progressBarContainer}>
        <Animated.View style={[styles.progressBar, barAnimatedStyle]}>
          <LinearGradient
            colors={gradientPrimary.colors as [string, string, ...string[]]}
            start={gradientPrimary.start}
            end={gradientPrimary.end}
            style={styles.gradientFill}
          />
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    flexDirection: "column",
  },
  progressBarContainer: {
    height: rh(6),
    backgroundColor: colors.glass.backgroundDark,
    marginHorizontal: rp(spacing.lg),
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  gradientFill: {
    flex: 1,
    height: "100%",
  },
  progressPercentage: {
    textAlign: "right",
    marginRight: rp(spacing.lg),
    marginBottom: rp(spacing.xxs),
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.medium) as any,
  },
});
