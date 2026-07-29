/**
 * JobStatusIndicator Component
 *
 * Displays the status of an async meal generation job.
 * Shows progress, estimated time, and allows cancellation.
 *
 * Visual language: Aurora dark surface (flatColors), tinted status disc,
 * AuroraSpinner hero while active, gradient progress fill, quiet text cancel.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import Reanimated, {
  FadeInDown,
  useSharedValue,
  withRepeat,
  withTiming,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from '../../theme/aurora-tokens';
import { gradients, toLinearGradientProps } from '../../theme/gradients';
import { AuroraSpinner } from '../ui/aurora/AuroraSpinner';
import { rf, rh, rw, rs } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_LOW } from '../../utils/colors';
import { AsyncMealJob, JobStatus } from '../../hooks/useAsyncMealGeneration';

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
    icon: 'moon-outline',
    color: colors.textMuted,
    bgColor: hexToRgba(colors.textMuted, TINT_ALPHA_LOW),
    message: 'Ready to generate',
  },
  pending: {
    icon: 'hourglass-outline',
    color: colors.warningAlt,
    bgColor: hexToRgba(colors.warningAlt, TINT_ALPHA_LOW),
    message: 'Waiting in queue...',
  },
  processing: {
    icon: 'sync-outline',
    color: colors.blue,
    bgColor: hexToRgba(colors.blue, TINT_ALPHA_LOW),
    message: 'AI is cooking up your meals...',
  },
  completed: {
    icon: 'checkmark-circle-outline',
    color: colors.successAlt,
    bgColor: hexToRgba(colors.successAlt, TINT_ALPHA_LOW),
    message: 'Meal plan ready!',
  },
  failed: {
    icon: 'alert-circle-outline',
    color: colors.errorAlt,
    bgColor: hexToRgba(colors.errorAlt, TINT_ALPHA_LOW),
    message: 'Generation failed',
  },
  cancelled: {
    icon: 'ban-outline',
    color: colors.textMuted,
    bgColor: hexToRgba(colors.textMuted, TINT_ALPHA_LOW),
    message: 'Cancelled',
  },
};

export const JobStatusIndicator: React.FC<JobStatusIndicatorProps> = ({
  job,
  onCancel,
  onDismiss,
  compact = false,
}) => {
  const [opacityValue] = useState(new Animated.Value(1));
  const [pulseValue] = useState(new Animated.Value(1));

  // Reanimated shared values for the indeterminate progress bar
  const progressSlide = useSharedValue(0);
  const trackWidth = useSharedValue(0);

  // Pulsing OPACITY animation for the pending badge (hourglasses don't spin)
  useEffect(() => {
    if (job?.status === 'pending') {
      const opacityAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityValue, {
            toValue: 0.4,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      opacityAnimation.start();
      return () => opacityAnimation.stop();
    }
    return undefined;
  }, [job?.status, opacityValue]);

  // Indeterminate slide for the progress bar fill (processing only)
  useEffect(() => {
    if (job?.status === 'processing') {
      progressSlide.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
    } else {
      progressSlide.value = 0;
    }
  }, [job?.status, progressSlide]);

  const progressFillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progressSlide.value, [0, 1], [-trackWidth.value, trackWidth.value]),
      },
    ],
  }));

  // Pulse animation for the card
  useEffect(() => {
    if (job?.status === 'processing') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.04,
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
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [job?.status, pulseValue]);

  if (!job || job.status === 'idle') {
    return null;
  }

  const config = STATUS_CONFIG[job.status];
  const isActive = job.status === 'pending' || job.status === 'processing';
  const isTerminal =
    job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';

  const formatTime = (seconds?: number): string => {
    if (!seconds) return '';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    return `${Math.round(seconds / 60)} min`;
  };

  const formatGenerationTime = (ms?: number): string => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon} size={rf(16)} color={config.color} />
        <Text style={[styles.compactText, { color: config.color }]}>{config.message}</Text>
        {isActive && job.estimatedTimeRemaining && (
          <Text style={styles.compactTime}>{formatTime(job.estimatedTimeRemaining)}</Text>
        )}
      </View>
    );
  }

  return (
    <Reanimated.View entering={FadeInDown.duration(300)} style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          {
            // Solid card surface so the modal content is opaque/readable.
            // The status tint (config.bgColor) is applied as a subtle accent
            // border instead of the whole-card background — using a 12%-alpha
            // tint as the card bg left a transparent card over the overlay.
            backgroundColor: colors.backgroundSecondary,
            borderColor: config.color,
            transform: [{ scale: pulseValue }],
          },
        ]}
      >
        {/* Header: status badge + optional dismiss */}
        <View style={styles.header}>
          <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
            {job.status === 'pending' ? (
              <Animated.View style={[styles.emojiWrap, { opacity: opacityValue }]}>
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

        {isActive ? (
          <>
            {/* Hero: spinner + status headline */}
            <View style={styles.hero}>
              <AuroraSpinner size="lg" theme="primary" />
              <Text style={styles.heroMessage}>{config.message}</Text>
            </View>

            {/* Progress info */}
            <View style={styles.progressSection}>
              {job.estimatedTimeRemaining && (
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Estimated time:</Text>
                  <Text style={[styles.timeValue, { color: config.color }]}>
                    {formatTime(job.estimatedTimeRemaining)}
                  </Text>
                </View>
              )}

              {/* Indeterminate gradient progress bar while processing */}
              {job.status === 'processing' && (
                <View
                  style={styles.progressBar}
                  onLayout={(e) => {
                    trackWidth.value = e.nativeEvent.layout.width;
                  }}
                >
                  <Reanimated.View style={[styles.progressFill, progressFillStyle]}>
                    <LinearGradient
                      {...toLinearGradientProps(gradients.primary)}
                      style={styles.progressGradient}
                    />
                  </Reanimated.View>
                </View>
              )}

              {/* Quiet secondary cancel */}
              {onCancel && (
                <TouchableOpacity
                  onPress={onCancel}
                  style={styles.cancelButton}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel generation"
                >
                  <Text style={[styles.cancelText, { color: config.color }]}>
                    Cancel Generation
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Tips for waiting users */}
            <View style={styles.tipsSection}>
              <Ionicons
                name="bulb-outline"
                size={rf(14)}
                color={colors.warningAlt}
                style={styles.tipIcon}
              />
              <Text style={styles.tipText}>
                You can navigate away - we&apos;ll notify you when ready!
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Terminal states: headline + detail */}
            <Text style={styles.message}>{config.message}</Text>

            {job.status === 'completed' && job.generationTimeMs && (
              <View style={styles.completionInfo}>
                <Ionicons name="time-outline" size={rf(14)} color={colors.successAlt} />
                <Text style={styles.completionLabel}>
                  Generated in {formatGenerationTime(job.generationTimeMs)}
                </Text>
              </View>
            )}

            {job.status === 'failed' && job.error && (
              <View style={styles.errorInfo}>
                <Text style={styles.errorText}>{job.error}</Text>
              </View>
            )}
          </>
        )}
      </Animated.View>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
  },

  container: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    // Soft shadow so the opaque card lifts off the dark overlay.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },

  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },

  emojiWrap: {
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },

  hero: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },

  heroMessage: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    textAlign: 'center',
  },

  message: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },

  progressSection: {
    gap: spacing.md,
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  timeLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  timeValue: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },

  progressBar: {
    height: rh(6),
    backgroundColor: hexToRgba(colors.white, 0.08),
    borderRadius: rs(3),
    overflow: 'hidden',
  },

  progressFill: {
    width: '40%',
    height: '100%',
    borderRadius: rs(3),
    overflow: 'hidden',
  },

  progressGradient: {
    flex: 1,
  },

  cancelButton: {
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.successAlt, TINT_ALPHA_LOW),
  },

  completionLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  errorInfo: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: hexToRgba(colors.errorAlt, TINT_ALPHA_LOW),
    borderRadius: borderRadius.sm,
  },

  errorText: {
    fontSize: fontSize.sm,
    color: colors.errorAlt,
  },

  tipsSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontStyle: 'italic',
  },
});

export default JobStatusIndicator;
