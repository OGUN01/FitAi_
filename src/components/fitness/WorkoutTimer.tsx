import React, { useState, useEffect, useRef, PropsWithChildren } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Modal } from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rs, rh } from "../../utils/responsive";

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

  // Calculate progress percentage (guard against zero duration)
  const safeDuration = Math.max(1, Number.isFinite(duration) ? duration : 0);
  const progressPercentage =
    ((safeDuration - Math.min(timeRemaining, safeDuration)) / safeDuration) *
    100;

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <Card style={styles.timerCard} variant="elevated">
          <View style={styles.timerContent}>
            {/* Optional visual (e.g., GIF) */}
            {children}

            {/* Title */}
            <Text style={styles.timerTitle}>{title}</Text>

            {/* Circular Progress Indicator */}
            <View style={styles.circularTimer}>
              <View style={styles.progressBackground}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      transform: [{ rotate: `${progressPercentage * 3.6}deg` }],
                    },
                  ]}
                />
              </View>
              <View style={styles.timerDisplay}>
                <Text style={styles.timeText}>{formatTime(timeRemaining)}</Text>
                <Text style={styles.timeLabel}>
                  {isPaused ? "Paused" : "Remaining"}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercentage}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progressPercentage)}% Complete
              </Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.modernControlButton, styles.outlineButton]}
                onPress={handlePauseResume}
              >
                <Text
                  style={[styles.modernControlText, styles.outlineButtonText]}
                >
                  {isPaused ? "Resume" : "Pause"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modernControlButton, styles.primaryButton]}
                onPress={onComplete}
              >
                <Text
                  style={[styles.modernControlText, styles.primaryButtonText]}
                >
                  Skip Rest
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modernControlButton, styles.outlineButton]}
                onPress={onCancel}
              >
                <Text
                  style={[styles.modernControlText, styles.outlineButtonText]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Time Adjustments */}
            <View style={styles.quickAdjustments}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() =>
                  setTimeRemaining((prev) => Math.max(0, prev - 30))
                }
              >
                <Text style={styles.adjustButtonText}>-30s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => setTimeRemaining((prev) => prev + 30)}
              >
                <Text style={styles.adjustButtonText}>+30s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },

  timerCard: {
    width: "90%",
    maxWidth: 400,
    padding: ResponsiveTheme.spacing.xl,
    alignItems: "center",
  },

  timerContent: {
    alignItems: "center",
    width: "100%",
  },

  timerTitle: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.lg,
    textAlign: "center",
  },

  circularTimer: {
    width: rs(200),
    height: rs(200),
    marginBottom: ResponsiveTheme.spacing.lg,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },

  progressBackground: {
    position: "absolute",
    width: rs(200),
    height: rs(200),
    borderRadius: rbr(100),
    borderWidth: 8,
    borderColor: ResponsiveTheme.colors.backgroundSecondary,
  },

  progressFill: {
    position: "absolute",
    width: rs(200),
    height: rs(200),
    borderRadius: rbr(100),
    borderWidth: 8,
    borderColor: ResponsiveTheme.colors.primary,
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    transform: [{ rotate: "-90deg" }],
  },

  timerDisplay: {
    alignItems: "center",
  },

  timeText: {
    fontSize: rf(48),
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    fontFamily: "monospace",
  },

  timeLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(4),
  },

  progressBarContainer: {
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  progressBar: {
    height: rh(8),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: rbr(4),
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  progressBarFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(4),
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.md,
    gap: ResponsiveTheme.spacing.sm,
  },

  modernControlButton: {
    flex: 1,
    height: 44,
    borderRadius: ResponsiveTheme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },

  primaryButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },

  outlineButton: {
    backgroundColor: "transparent",
    borderColor: ResponsiveTheme.colors.border,
  },

  modernControlText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    textAlign: "center",
  },

  primaryButtonText: {
    color: ResponsiveTheme.colors.surface,
  },

  outlineButtonText: {
    color: ResponsiveTheme.colors.text,
  },

  controlButton: {
    flex: 1,
    maxWidth: 100,
  },

  quickAdjustments: {
    flexDirection: "row",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.lg,
  },

  adjustButton: {
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },

  adjustButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    color: ResponsiveTheme.colors.text,
  },
});
