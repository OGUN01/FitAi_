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
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rh, rw, rs } from "../../utils/responsive";
import { hexToRgba, TINT_ALPHA_LOW } from "../../utils/colors";
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
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
    message: string;
  }
> = {
  idle: {
    icon: "moon-outline",
    color: colors.textMuted,
    bgColor: hexToRgba(colors.textMuted, TINT_ALPHA_LOW),
    message: "Ready to generate",
  },
  pending: {
    icon: "hourglass-outline",
    color: colors.warningAlt,
    bgColor: hexToRgba(colors.warningAlt, TINT_ALPHA_LOW),
    message: "Waiting in queue...",
  },
  processing: {
    icon: "sparkles",
    color: colors.blue,
    bgColor: hexToRgba(colors.blue, TINT_ALPHA_LOW),
    message: "AI is cooking up your meals...",
  },
  completed: {
    icon: "checkmark-circle-outline",
    color: colors.successAlt,
    bgColor: hexToRgba(colors.successAlt, TINT_ALPHA_LOW),
    message: "Meal plan ready!",
  },
  failed: {
    icon: "alert-circle-outline",
    color: colors.errorAlt,
    bgColor: hexToRgba(colors.errorAlt, TINT_ALPHA_LOW),
    message: "Generation failed",
  },
  cancelled: {
    icon: "ban-outline",
    color: colors.textMuted,
    bgColor: hexToRgba(colors.textMuted, TINT_ALPHA_LOW),
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
        <Ionicons name={config.icon} size={rf(16)} color={config.color} />
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
            <Animated.View style={[styles.emojiWrap, { transform: [{ rotate: spin }] }]}>
              <Ionicons name={config.icon} size={rf(20)} color={config.color} />
            </Animated.View>
          ) : (
            <View style={styles.emojiWrap}>
              <Ionicons name={config.icon} size={rf(20)} color={config.color} />
            </View>
          )}
          <Text style={[styles.statusText, { color: config.color }]}>
            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
          </Text>
        </View>

        {isTerminal && onDismiss && (
          <TouchableOpacity
            onPress={onDismiss}
            style={styles.dismissButton}
            accessibilityRole="button"
            accessibilityLabel="Dismiss generation status"
          >
            <Ionicons name="close" size={rf(18)} color={colors.textSecondary} />
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
              accessibilityRole="button"
              accessibilityLabel="Cancel generation"
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
          <Ionicons name="bulb-outline" size={rf(14)} color={colors.warningAlt} style={styles.tipIcon} />
          <Text style={styles.tipText}>
            You can navigate away - we&apos;ll notify you when ready!
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },

  compactContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },

  compactText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },

  compactTime: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },

  emojiWrap: {
    justifyContent: "center",
    alignItems: "center",
  },

  statusText: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },

  dismissButton: {
    width: Math.max(rw(24), 44),
    height: Math.max(rh(24), 44),
    borderRadius: Math.max(rs(12), 22),
    backgroundColor: colors.glassSurface,
    justifyContent: "center",
    alignItems: "center",
  },

  message: {
    fontSize: fontSize.md,
    color: colors.text,
    marginBottom: spacing.md,
  },

  progressSection: {
    gap: spacing.md,
  },

  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  timeLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  timeValue: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
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
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  completionInfo: {
    marginTop: spacing.sm,
  },

  completionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  errorInfo: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: `${colors.errorAlt}1A`,
    borderRadius: borderRadius.sm,
  },

  errorText: {
    fontSize: fontSize.sm,
    color: colors.errorAlt,
  },

  tipsSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  tipIcon: {
    marginTop: spacing.xxs,
  },

  tipText: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: "italic",
  },
});

export default JobStatusIndicator;
