/**
 * FitAI — Workout Progress Bar (Aurora, 2026 session redesign)
 *
 * Hairline full-bleed progress bar pinned directly under the compact header
 * row. No percentage label, no boxed track — a thin gradient fill over a
 * faint white hairline track so the bar reads as part of the background.
 *
 * Behavior preserved: Reanimated `withTiming` width animation driven by
 * `progress` (0..1), opacity driven by the parent's `fadeAnim` shared value,
 * accessibilityRole="progressbar" with a percent accessibility label.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  SharedValue,
} from 'react-native-reanimated';
import { rh } from '../../utils/responsive';
import { colors } from '../../theme/aurora-tokens';
import { hexToRgba } from '../../utils/colors';
import { gradientPrimary } from '../../theme/gradients';
import { animations } from '../../theme/animations';
import { getAccessibleDuration, useReducedMotion } from '../../utils/accessibility/hooks';

interface WorkoutProgressBarProps {
  progress: number; // 0..1
  /** Reanimated shared value (0..1) from useWorkoutAnimations — drives opacity. */
  fadeAnim: SharedValue<number>;
}

const safeString = (value: any, fallback: string = ''): string => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && Number.isNaN(value)) return fallback;
  if (typeof value === 'string') return value;
  try {
    return String(value);
  } catch {
    return fallback;
  }
};

const WorkoutProgressBarComponent: React.FC<WorkoutProgressBarProps> = ({ progress, fadeAnim }) => {
  const widthSV = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const finiteProgress = Number.isFinite(progress) ? progress : 0;
  const progressPercent = Math.min(100, Math.max(0, Math.round(finiteProgress * 100)));

  // Animate the bar width whenever progress changes (smooth instead of snap).
  useEffect(() => {
    widthSV.value = withTiming(progressPercent, {
      duration: getAccessibleDuration(animations.duration.normal, reducedMotion, true),
    });
  }, [progressPercent, reducedMotion, widthSV]);

  const barAnimatedStyle = useAnimatedStyle(() => ({
    width: `${widthSV.value}%`,
    opacity: fadeAnim.value,
  }));

  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityLabel={`Workout progress: ${safeString(progressPercent)}%`}
      accessibilityValue={{ min: 0, max: 100, now: progressPercent }}
    >
      <Animated.View style={[styles.fill, barAnimatedStyle]}>
        <LinearGradient
          colors={gradientPrimary.colors as [string, string, ...string[]]}
          start={gradientPrimary.start}
          end={gradientPrimary.end}
          style={styles.gradientFill}
        />
      </Animated.View>
    </View>
  );
};

/** Memoized — see WorkoutHeader.tsx for why (avoids unrelated screen ticks). */
export const WorkoutProgressBar = React.memo(WorkoutProgressBarComponent);

const styles = StyleSheet.create({
  track: {
    height: rh(3),
    backgroundColor: hexToRgba(colors.text.primary, 0.08),
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
    // Solid fallback under the gradient: on devices where the native gradient
    // view paints nothing (observed on ColorOS HWUI), the fill stays visible
    // in the gradient's base color instead of disappearing entirely.
    backgroundColor: gradientPrimary.colors[0],
  },
  gradientFill: {
    flex: 1,
    height: '100%',
  },
});
