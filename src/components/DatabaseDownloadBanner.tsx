/**
 * DatabaseDownloadBanner
 *
 * A polished, self-contained banner component that guides the user through
 * downloading the FitAI offline food database (~300 MB SQLite file).
 *
 * States:
 *   not_downloaded → downloading → ready
 *                 ↘ error ↗
 *
 * Visual language: Aurora dark surface (flatColors), tinted icon discs,
 * hairline borders, spring-press buttons, staggered FadeInDown entrances.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { sqliteFood, SQLiteDownloadState } from '../services/sqliteFood';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from '../theme/aurora-tokens';
import { gradients, toLinearGradientProps } from '../theme/gradients';
import { AnimatedPressable } from './ui/aurora/AnimatedPressable';
import { hexToRgba, TINT_ALPHA_LOW } from '../utils/colors';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DatabaseDownloadBannerProps {
  onDismiss?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DatabaseDownloadBanner: React.FC<DatabaseDownloadBannerProps> = ({ onDismiss }) => {
  const [downloadState, setDownloadState] = useState<SQLiteDownloadState>(sqliteFood.getState());
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Animated progress bar value: 0 → 1
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Fade-in for the ready state banner entrance
  const readyOpacity = useRef(new Animated.Value(0)).current;

  // Auto-dismiss timer ref
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll the download state (backup to progress callback)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------------------------------------------------------------------------
  // Progress bar animation
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (total > 0) {
      const ratio = Math.min(downloaded / total, 1);
      Animated.timing(progressAnim, {
        toValue: ratio,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [downloaded, total, progressAnim]);

  // ---------------------------------------------------------------------------
  // Ready state: fade-in + auto-dismiss
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (downloadState === 'ready') {
      Animated.timing(readyOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      dismissTimerRef.current = setTimeout(() => {
        setIsDismissed(true);
        onDismiss?.();
      }, 3000);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [downloadState, onDismiss, readyOpacity]);

  // ---------------------------------------------------------------------------
  // Polling to keep state fresh
  // ---------------------------------------------------------------------------

  useEffect(() => {
    pollingRef.current = setInterval(() => {
      const current = sqliteFood.getState();
      setDownloadState(current);
    }, 500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleDownload = useCallback(async () => {
    setErrorMessage('');
    setDownloadState('downloading');
    setIsPaused(false);

    try {
      await sqliteFood.downloadDatabase((dl, tot) => {
        setDownloaded(dl);
        setTotal(tot);
      });
      setDownloadState('ready');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Download failed. Please retry.';
      setErrorMessage(msg);
      setDownloadState('error');
    }
  }, []);

  const handlePause = useCallback(async () => {
    setIsPaused(true);
    await sqliteFood.cancelDownload();
    setDownloadState('not_downloaded');
  }, []);

  const handleCancel = useCallback(async () => {
    await sqliteFood.cancelDownload();
    setDownloaded(0);
    setTotal(0);
    progressAnim.setValue(0);
    setDownloadState('not_downloaded');
    setIsPaused(false);
  }, [progressAnim]);

  const handleSkip = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleRetry = useCallback(() => {
    setErrorMessage('');
    setDownloadState('not_downloaded');
    handleDownload();
  }, [handleDownload]);

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (isDismissed) return null;

  // Already ready and no need to show anything (e.g., pre-existing DB)
  if (downloadState === 'ready' && sqliteFood.isDatabaseReady()) {
    // Only show the success banner briefly — the useEffect above will dismiss
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* ── not_downloaded ── */}
      {downloadState === 'not_downloaded' && (
        <Reanimated.View entering={FadeInDown.duration(350)}>
          <View style={styles.banner}>
            <View style={styles.headerRow}>
              <View style={styles.iconDisc}>
                <Ionicons name="server-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headline}>Offline food database available</Text>
                <Text style={styles.subline}>
                  {isPaused ? 'Download paused — ' : ''}~300 MB · works without internet
                </Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <AnimatedPressable
                style={styles.primaryBtn}
                onPress={handleDownload}
                scaleValue={0.97}
                hapticType="medium"
                accessibilityRole="button"
                accessibilityLabel="Download Now"
              >
                <Ionicons
                  name="download-outline"
                  size={16}
                  color={colors.white}
                  style={styles.btnIcon}
                />
                <Text style={styles.primaryBtnText}>Download Now</Text>
              </AnimatedPressable>

              <AnimatedPressable
                style={styles.ghostBtn}
                onPress={handleSkip}
                scaleValue={0.95}
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel="Skip for Now"
              >
                <Text style={styles.ghostBtnText}>Skip for Now</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Reanimated.View>
      )}

      {/* ── downloading ── */}
      {downloadState === 'downloading' && (
        <Reanimated.View entering={FadeInDown.duration(350)}>
          <View style={styles.banner}>
            <View style={styles.headerRow}>
              <View style={styles.iconDisc}>
                <Ionicons name="cloud-download-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headline}>Downloading database…</Text>
                <Text style={styles.subline}>
                  {total > 0 ? `${formatMB(downloaded)} / ${formatMB(total)}` : 'Connecting…'}
                </Text>
              </View>
            </View>

            {/* Animated gradient progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              >
                <LinearGradient
                  {...toLinearGradientProps(gradients.primary)}
                  style={styles.progressGradient}
                />
              </Animated.View>
            </View>

            {/* Percentage label */}
            {total > 0 && (
              <Text style={styles.percentLabel}>{Math.round((downloaded / total) * 100)}%</Text>
            )}

            <View style={styles.actionsRow}>
              <AnimatedPressable
                style={styles.outlineBtn}
                onPress={handlePause}
                scaleValue={0.97}
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel="Pause"
              >
                <Ionicons
                  name="pause-outline"
                  size={15}
                  color={colors.primary}
                  style={styles.btnIcon}
                />
                <Text style={styles.outlineBtnText}>Pause</Text>
              </AnimatedPressable>

              <AnimatedPressable
                style={styles.outlineBtn}
                onPress={handleCancel}
                scaleValue={0.97}
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Ionicons
                  name="close-outline"
                  size={15}
                  color={colors.primary}
                  style={styles.btnIcon}
                />
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Reanimated.View>
      )}

      {/* ── ready ── */}
      {downloadState === 'ready' && (
        <Animated.View style={[styles.banner, styles.readyBanner, { opacity: readyOpacity }]}>
          <View style={[styles.headerRow, styles.headerRowFlush]}>
            <View style={[styles.iconDisc, styles.successIconDisc]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.successAlt} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headline, styles.successText]}>Database ready</Text>
              <Text style={styles.subline}>Millions of foods available offline</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── error ── */}
      {downloadState === 'error' && (
        <Reanimated.View entering={FadeInDown.duration(350)}>
          <View style={[styles.banner, styles.errorBanner]}>
            <View style={styles.headerRow}>
              <View style={[styles.iconDisc, styles.errorIconDisc]}>
                <Ionicons name="alert-circle-outline" size={22} color={colors.errorAlt} />
              </View>
              <View style={styles.headerText}>
                <Text style={[styles.headline, styles.errorText]}>Download failed</Text>
                <Text style={styles.subline} numberOfLines={2}>
                  {errorMessage || 'An unexpected error occurred.'}
                </Text>
              </View>
            </View>

            <View style={styles.actionsRow}>
              <AnimatedPressable
                style={styles.errorBtn}
                onPress={handleRetry}
                scaleValue={0.97}
                hapticType="medium"
                accessibilityRole="button"
                accessibilityLabel="Retry"
              >
                <Ionicons
                  name="refresh-outline"
                  size={15}
                  color={colors.white}
                  style={styles.btnIcon}
                />
                <Text style={styles.primaryBtnText}>Retry</Text>
              </AnimatedPressable>

              <AnimatedPressable
                style={styles.ghostBtn}
                onPress={handleSkip}
                scaleValue={0.95}
                hapticType="light"
                accessibilityRole="button"
                accessibilityLabel="Skip for Now"
              >
                <Text style={styles.ghostBtnText}>Skip for Now</Text>
              </AnimatedPressable>
            </View>
          </View>
        </Reanimated.View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles — Aurora dark surface, tinted icon discs, hairline borders
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    // Match the horizontal inset + bottom margin every sibling card on the
    // Diet screen uses (spacing.lg / spacing.md).
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  banner: {
    backgroundColor: colors.backgroundTertiary,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  readyBanner: {
    borderColor: hexToRgba(colors.successAlt, 0.35),
    backgroundColor: hexToRgba(colors.successAlt, TINT_ALPHA_LOW),
  },

  errorBanner: {
    borderColor: hexToRgba(colors.errorAlt, 0.35),
    backgroundColor: hexToRgba(colors.errorAlt, TINT_ALPHA_LOW),
  },

  // ── Header row ──────────────────────────────────────────────────────────

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  headerRowFlush: {
    marginBottom: 0,
  },

  iconDisc: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
    alignItems: 'center',
    justifyContent: 'center',
  },

  successIconDisc: {
    backgroundColor: hexToRgba(colors.successAlt, TINT_ALPHA_LOW),
  },

  errorIconDisc: {
    backgroundColor: hexToRgba(colors.errorAlt, TINT_ALPHA_LOW),
  },

  headerText: {
    flex: 1,
  },

  headline: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: 2,
  },

  successText: {
    color: colors.successAlt,
  },

  errorText: {
    color: colors.errorAlt,
  },

  subline: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // ── Progress bar ─────────────────────────────────────────────────────────

  progressTrack: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 6,
  },

  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },

  progressGradient: {
    flex: 1,
  },

  percentLabel: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },

  // ── Action buttons ───────────────────────────────────────────────────────

  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 4,
  },

  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },

  primaryBtnText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },

  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary, 0.4),
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_LOW),
  },

  outlineBtnText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },

  ghostBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },

  ghostBtnText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },

  errorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorAlt,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },

  btnIcon: {
    marginRight: 4,
  },
});

export default DatabaseDownloadBanner;
