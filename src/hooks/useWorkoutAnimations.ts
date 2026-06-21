/**
 * FitAI — Workout Animations (Reanimated)
 *
 * Migrated from legacy RN `Animated.Value` to Reanimated shared values so the
 * exercise transition fade/scale runs on the UI thread (60-120fps) and shares
 * the same animation primitive as the rest of the Aurora design language.
 *
 * Contract preserved: `fadeAnim` / `scaleAnim` are now Reanimated SharedValue<number>
 * (0..1), consumed by WorkoutProgressBar + the exercise container's animated
 * style. `animateTransition(cb)` keeps the same fade-out → callback → fade-in
 * sequence (the requestAnimationFrame defer is retained so React re-renders
 * settle before the fade-in starts, preventing the opacity-stuck-at-0 bug).
 */
import { useEffect } from "react";
import {
  useSharedValue,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { animations } from "../theme/animations";

export const useWorkoutAnimations = () => {
  const fadeAnim = useSharedValue(1);
  const scaleAnim = useSharedValue(1);

  useEffect(() => {
    fadeAnim.value = withTiming(1, { duration: animations.duration.normal });
    scaleAnim.value = withTiming(1, { duration: animations.duration.quick });
  }, [fadeAnim, scaleAnim]);

  const animateTransition = (callback: () => void) => {
    // Fade-out + scale-down on the UI thread. When the fade-out completes, run
    // the JS callback (state transition), then fade back in on the next frame
    // so React's re-render settles first (prevents opacity stuck at 0).
    const onFadeOutComplete = () => {
      callback();
      requestAnimationFrame(() => {
        fadeAnim.value = withTiming(1, { duration: animations.duration.normal });
        scaleAnim.value = withTiming(1, { duration: animations.duration.normal });
      });
    };

    fadeAnim.value = withTiming(0, { duration: animations.duration.quick });
    scaleAnim.value = withTiming(
      0.8,
      { duration: animations.duration.quick },
      () => {
        runOnJS(onFadeOutComplete)();
      },
    );
  };

  return {
    fadeAnim,
    scaleAnim,
    animateTransition,
  };
};
