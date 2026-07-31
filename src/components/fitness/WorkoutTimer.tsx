import React, { useState, useEffect, useRef, PropsWithChildren } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { DetentBottomSheet } from "../ui/aurora/DetentBottomSheet";
import { ProgressRing } from "../ui/aurora/ProgressRing";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { FONT_FAMILY } from "../../theme/fonts";
import { rf, rp, rs } from "../../utils/responsive";

interface WorkoutTimerProps {
  isVisible: boolean;
  duration: number; // in seconds
  title?: string;
  onComplete: () => void;
  onCancel: () => void;
  onPause?: () => void;
  onResume?: () => void;
}

export const WorkoutTimer: React.FC<PropsWithChildren<WorkoutTimerProps>> = ({
  isVisible,
  duration,
  title = "Rest Timer",
  onComplete,
  onCancel,
  onPause,
  onResume,
  children,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isPaused, setIsPaused] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Reset timer when duration or visibility changes
  useEffect(() => {
    if (isVisible) {
      setTimeRemaining(duration);
      setIsPaused(false);
      setIsRunning(true);
    } else {
      setIsRunning(false);
    }
  }, [isVisible, duration]);

  // Keep latest onComplete in a ref to avoid effect restarts
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Timer countdown logic - stable interval not affected by parent re-renders
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // stop and invoke complete
            setIsRunning(false);
            // use ref to avoid stale closures
            onCompleteRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, isPaused]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle pause/resume
  const handlePauseResume = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);

    if (newPausedState) {
      onPause?.();
    } else {
      onResume?.();
    }
  };

  // Guard against zero/invalid duration. When duration is 0 the timer has no
  // work to do — render null instead of showing a misleading full meter.
  if (!duration || duration <= 0 || !Number.isFinite(duration)) return null;

  const safeDuration = Math.max(1, duration);
  const progressPercentage =
    ((safeDuration - Math.min(timeRemaining, safeDuration)) / safeDuration) *
    100;

  // Editorial Dark: bottom sheet (thumb-reachable, swipe-dismissible) with a
  // single ProgressRing meter — the old centered Card modal stacked a
  // hand-rolled circular hack AND a thin bar + "% Complete" text (two meters).
  return (
    <DetentBottomSheet
      visible={isVisible}
      onClose={onCancel}
      snapPoints={[0.55, 0.75]}
      initialSnapIndex={1}
      testID="workout-timer-sheet"
    >
      <View style={styles.timerContent}>
        {/* Optional visual (e.g., GIF) */}
        {children}

        {/* Title */}
        <Text style={styles.timerTitle}>{title}</Text>

        {/* Single progress meter — ProgressRing with the countdown inside */}
        <View style={styles.ringWrap}>
          <ProgressRing
            progress={progressPercentage}
            size={rs(200)}
            strokeWidth={8}
            color={colors.primary}
            backgroundColor={colors.backgroundSecondary}
            animated={false}
          >
            <View style={styles.timerDisplay}>
              <Text style={styles.timeText}>{formatTime(timeRemaining)}</Text>
              <Text style={styles.timeLabel}>
                {isPaused ? "Paused" : "Remaining"}
              </Text>
            </View>
          </ProgressRing>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <AnimatedPressable
            style={[styles.modernControlButton, styles.outlineButton]}
            onPress={handlePauseResume}
            accessibilityRole="button"
            accessibilityLabel={isPaused ? "Resume timer" : "Pause timer"}
            scaleValue={0.95}
            springConfig="snappy"
            hapticType="light"
          >
            <Text
              style={[styles.modernControlText, styles.outlineButtonText]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {isPaused ? "Resume" : "Pause"}
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.modernControlButton, styles.primaryButton]}
            onPress={onComplete}
            accessibilityRole="button"
            accessibilityLabel="Skip rest"
            scaleValue={0.95}
            springConfig="snappy"
            hapticType="light"
          >
            <Text
              style={[styles.modernControlText, styles.primaryButtonText]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Skip Rest
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.modernControlButton, styles.outlineButton]}
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Cancel timer"
            scaleValue={0.95}
            springConfig="snappy"
            hapticType="light"
          >
            <Text
              style={[styles.modernControlText, styles.outlineButtonText]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Cancel
            </Text>
          </AnimatedPressable>
        </View>

        {/* Quick Time Adjustments */}
        <View style={styles.quickAdjustments}>
          <AnimatedPressable
            style={styles.adjustButton}
            onPress={() =>
              setTimeRemaining((prev) => Math.max(0, prev - 30))
            }
            accessibilityRole="button"
            accessibilityLabel="Subtract 30 seconds"
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
          >
            <Text style={styles.adjustButtonText}>-30s</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={styles.adjustButton}
            onPress={() => setTimeRemaining((prev) => prev + 30)}
            accessibilityRole="button"
            accessibilityLabel="Add 30 seconds"
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
          >
            <Text style={styles.adjustButtonText}>+30s</Text>
          </AnimatedPressable>
        </View>
      </View>
    </DetentBottomSheet>
  );
};

const styles = StyleSheet.create({
  timerContent: {
    alignItems: "center",
    width: "100%",
    paddingBottom: spacing.lg,
  },

  timerTitle: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.lg,
    textAlign: "center",
  },

  ringWrap: {
    marginBottom: spacing.lg,
  },

  timerDisplay: {
    alignItems: "center",
  },

  timeText: {
    fontSize: rf(48),
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    // "monospace" family may not exist on all platforms; fontVariant keeps the
    // digits tabular so the countdown doesn't jitter.
    fontVariant: ["tabular-nums"],
  },

  timeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: rp(4),
  },

  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },

  modernControlButton: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  outlineButton: {
    backgroundColor: "transparent",
    borderColor: colors.border,
  },

  modernControlText: {
    fontSize: fontSize.sm,
    fontFamily: FONT_FAMILY.semibold,
    fontWeight: "600",
    textAlign: "center",
  },

  primaryButtonText: {
    color: colors.surface,
  },

  outlineButtonText: {
    color: colors.text,
  },

  quickAdjustments: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
  },

  adjustButton: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },

  adjustButtonText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text,
  },
});
