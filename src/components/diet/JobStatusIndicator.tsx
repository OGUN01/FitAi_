/**
 * JobStatusIndicator Component
 *
 * Displays the status of an async meal generation job.
 * Shows progress, estimated time, and allows cancellation.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rh, rw, rs } from "../../utils/responsive";
import { AsyncMealJob, JobStatus } from "../../hooks/useAsyncMealGeneration";

interface JobStatusIndicatorProps {
  job: AsyncMealJob | null;
  onCancel?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  JobStatus,
  {
    emoji: string;
    color: string;
    bgColor: string;
    message: string;
  }
> = {
  idle: {
    emoji: "💤",
    color: "#6b7280",
    bgColor: "#f3f4f6",
    message: "Ready to generate",
  },
  pending: {
    emoji: "⏳",
    color: "#f59e0b",
    bgColor: "#fffbeb",
    message: "Waiting in queue...",
  },
  processing: {
    emoji: "🧠",
    color: "#3b82f6",
    bgColor: "#eff6ff",
    message: "AI is cooking up your meals...",
  },
  completed: {
    emoji: "✅",
    color: "#10b981",
    bgColor: "#ecfdf5",
    message: "Meal plan ready!",
  },
  failed: {
    emoji: "❌",
    color: "#ef4444",
    bgColor: "#fef2f2",
    message: "Generation failed",
  },
  cancelled: {
    emoji: "🚫",
    color: "#6b7280",
    bgColor: "#f3f4f6",
    message: "Cancelled",
  },
};

export const JobStatusIndicator: React.FC<JobStatusIndicatorProps> = ({
  job,
  onCancel,
  onDismiss,
  compact = false,
}) => {
  const [spinValue] = useState(new Animated.Value(0));
  const [pulseValue] = useState(new Animated.Value(1));

  // Spinning animation for processing state
  useEffect(() => {
    if (job?.status === "processing" || job?.status === "pending") {
      const spinAnimation = Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      spinAnimation.start();
      return () => spinAnimation.stop();
    }
  }, [job?.status, spinValue]);

  // Pulse animation for the card
  useEffect(() => {
    if (job?.status === "processing") {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.02,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [job?.status, pulseValue]);

  if (!job || job.status === "idle") {
    return null;
  }

  const config = STATUS_CONFIG[job.status];
  const isActive = job.status === "pending" || job.status === "processing";
  const isTerminal =
    job.status === "completed" ||
    job.status === "failed" ||
    job.status === "cancelled";

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const formatTime = (seconds?: number): string => {
    if (!seconds) return "";
    if (seconds < 60) return `~${Math.round(seconds)}s`;
    return `~${Math.round(seconds / 60)} min`;
  };

  const formatGenerationTime = (ms?: number): string => {
    if (!ms) return "";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (compact) {
    return (
      <View
        style={[styles.compactContainer, { backgroundColor: config.bgColor }]}
      >
        <Text style={styles.compactEmoji}>{config.emoji}</Text>
        <Text style={[styles.compactText, { color: config.color }]}>
          {config.message}
        </Text>
        {isActive && job.estimatedTimeRemaining && (
          <Text style={styles.compactTime}>
            {formatTime(job.estimatedTimeRemaining)}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: config.bgColor, transform: [{ scale: pulseValue }] },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.statusBadge}>
          {isActive ? (
            <Animated.Text
              style={[styles.emoji, { transform: [{ rotate: spin }] }]}
            >
              {config.emoji}
            </Animated.Text>
          ) : (
            <Text style={styles.emoji}>{config.emoji}</Text>
          )}
          <Text style={[styles.statusText, { color: config.color }]}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Text>
        </View>

        {isTerminal && onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Message */}
      <Text style={styles.message}>{config.message}</Text>

      {/* Progress Info */}
      {isActive && (
        <View style={styles.progressSection}>
          {job.estimatedTimeRemaining && (
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Estimated time:</Text>
              <Text style={[styles.timeValue, { color: config.color }]}>
                {formatTime(job.estimatedTimeRemaining)}
              </Text>
            </View>
          )}

          {/* Progress bar for processing */}
          {job.status === "processing" && (
            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: config.color,
                    width: "60%",
                  },
                ]}
              />
            </View>
          )}

          {/* Cancel button */}
          {onCancel && (
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.cancelButton, { borderColor: config.color }]}
            >
              <Text style={[styles.cancelText, { color: config.color }]}>
                Cancel Generation
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Completion Info */}
      {job.status === "completed" && job.generationTimeMs && (
        <View style={styles.completionInfo}>
          <Text style={styles.completionLabel}>
            Generated in {formatGenerationTime(job.generationTimeMs)}
          </Text>
        </View>
      )}

      {/* Error Info */}
      {job.status === "failed" && job.error && (
        <View style={styles.errorInfo}>
          <Text style={styles.errorText}>{job.error}</Text>
        </View>
      )}

      {/* Tips for waiting users */}
      {isActive && (
        <View style={styles.tipsSection}>
          <Text style={styles.tipText}>
            💡 You can navigate away - we&apos;ll notify you when ready!
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginVertical: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.xl,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    gap: ResponsiveTheme.spacing.sm,
  },

  compactEmoji: {
    fontSize: rf(14),
  },

  compactText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
    flex: 1,
  },

  compactTime: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
  },

  emoji: {
    fontSize: rf(20),
  },

  statusText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.bold,
  },

  dismissButton: {
    width: rw(24),
    height: rh(24),
    borderRadius: rs(12),
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  dismissText: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },

  message: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },

  progressSection: {
    gap: ResponsiveTheme.spacing.md,
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  timeLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  timeValue: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },

  progressBar: {
    height: rh(6),
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: rs(3),
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    borderRadius: rs(3),
  },

  cancelButton: {
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },

  cancelText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: ResponsiveTheme.fontWeight.medium,
  },

  completionInfo: {
    marginTop: ResponsiveTheme.spacing.sm,
  },

  completionLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },

  errorInfo: {
    marginTop: ResponsiveTheme.spacing.sm,
    padding: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },

  errorText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: "#ef4444",
  },

  tipsSection: {
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },

  tipText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textMuted,
    fontStyle: "italic",
  },
});

export default JobStatusIndicator;
