/**
 * DatabaseDownloadBanner
 *
 * A polished, self-contained banner component that guides the user through
 * downloading the FitAI offline food database (~300 MB SQLite file).
 *
 * States:
 *   not_downloaded → downloading → ready
 *                 ↘ error ↗
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { sqliteFood, SQLiteDownloadState } from "../services/sqliteFood";
import { THEME } from "../utils/constants";

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
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DatabaseDownloadBanner: React.FC<DatabaseDownloadBannerProps> = ({
  onDismiss,
}) => {
  const [downloadState, setDownloadState] = useState<SQLiteDownloadState>(
    sqliteFood.getState(),
  );
  const [downloaded, setDownloaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
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
    if (downloadState === "ready") {
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
    setErrorMessage("");
    setDownloadState("downloading");
    setIsPaused(false);

    try {
      await sqliteFood.downloadDatabase((dl, tot) => {
        setDownloaded(dl);
        setTotal(tot);
      });
      setDownloadState("ready");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Download failed. Please retry.";
      setErrorMessage(msg);
      setDownloadState("error");
    }
  }, []);

  const handlePause = useCallback(async () => {
    setIsPaused(true);
    await sqliteFood.cancelDownload();
    setDownloadState("not_downloaded");
  }, []);

  const handleCancel = useCallback(async () => {
    await sqliteFood.cancelDownload();
    setDownloaded(0);
    setTotal(0);
    progressAnim.setValue(0);
    setDownloadState("not_downloaded");
    setIsPaused(false);
  }, [progressAnim]);

  const handleSkip = useCallback(() => {
    setIsDismissed(true);
    onDismiss?.();
  }, [onDismiss]);

  const handleRetry = useCallback(() => {
    setErrorMessage("");
    setDownloadState("not_downloaded");
    handleDownload();
  }, [handleDownload]);

  // ---------------------------------------------------------------------------
  // Render guards
  // ---------------------------------------------------------------------------

  if (isDismissed) return null;

  // Already ready and no need to show anything (e.g., pre-existing DB)
  if (downloadState === "ready" && sqliteFood.isDatabaseReady()) {
    // Only show the success banner briefly — the useEffect above will dismiss
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      {/* ── not_downloaded ── */}
      {downloadState === "not_downloaded" && (
        <View style={styles.banner}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="server-outline"
                size={22}
                color={THEME.colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headline}>
                Offline food database available
              </Text>
              <Text style={styles.subline}>
                {isPaused ? "Download paused — " : ""}~300 MB · works without
                internet
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleDownload}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Download Now"
            >
              <Ionicons
                name="download-outline"
                size={16}
                color={THEME.colors.white}
                style={styles.btnIcon}
              />
              <Text style={styles.primaryBtnText}>Download Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={handleSkip}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Skip for Now"
            >
              <Text style={styles.ghostBtnText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── downloading ── */}
      {downloadState === "downloading" && (
        <View style={styles.banner}>
          <View style={styles.headerRow}>
            <View style={styles.iconWrap}>
              <Ionicons
                name="cloud-download-outline"
                size={22}
                color={THEME.colors.primary}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headline}>Downloading database…</Text>
              <Text style={styles.subline}>
                {total > 0
                  ? `${formatMB(downloaded)} / ${formatMB(total)}`
                  : "Connecting…"}
              </Text>
            </View>
          </View>

          {/* Animated progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>

          {/* Percentage label */}
          {total > 0 && (
            <Text style={styles.percentLabel}>
              {Math.round((downloaded / total) * 100)}%
            </Text>
          )}

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={handlePause}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Pause"
            >
              <Ionicons
                name="pause-outline"
                size={15}
                color={THEME.colors.primary}
                style={styles.btnIcon}
              />
              <Text style={styles.outlineBtnText}>Pause</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={handleCancel}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Cancel"
            >
              <Ionicons
                name="close-outline"
                size={15}
                color={THEME.colors.primary}
                style={styles.btnIcon}
              />
              <Text style={styles.outlineBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── ready ── */}
      {downloadState === "ready" && (
        <Animated.View
          style={[styles.banner, styles.readyBanner, { opacity: readyOpacity }]}
        >
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, styles.successIconWrap]}>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={THEME.colors.success}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headline, styles.successText]}>
                Database ready
              </Text>
              <Text style={styles.subline}>
                Millions of foods available offline
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── error ── */}
      {downloadState === "error" && (
        <View style={[styles.banner, styles.errorBanner]}>
          <View style={styles.headerRow}>
            <View style={[styles.iconWrap, styles.errorIconWrap]}>
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color={THEME.colors.error}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.headline, styles.errorText]}>
                Download failed
              </Text>
              <Text style={styles.subline} numberOfLines={2}>
                {errorMessage || "An unexpected error occurred."}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.errorBtn}
              onPress={handleRetry}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Retry"
            >
              <Ionicons
                name="refresh-outline"
                size={15}
                color={THEME.colors.white}
                style={styles.btnIcon}
              />
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.ghostBtn}
              onPress={handleSkip}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Skip for Now"
            >
              <Text style={styles.ghostBtnText}>Skip for Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ---------------------------------------------------------------------------
// Styles — dark card, rounded, matches FitAI visual language
// ---------------------------------------------------------------------------

const C = THEME.colors;
const S = THEME.spacing;
const BR = THEME.borderRadius;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: S.md,
    paddingVertical: S.sm,
  },

  banner: {
    backgroundColor: C.backgroundTertiary,
    borderRadius: BR.xl,
    padding: S.md,
    borderWidth: 1,
    borderColor: C.border,
  },

  readyBanner: {
    borderColor: C.successAlt,
    backgroundColor: C.successTint,
  },

  errorBanner: {
    borderColor: C.error,
    backgroundColor: C.errorTint,
  },

  // ── Header row ──────────────────────────────────────────────────────────

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    marginBottom: S.sm,
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: BR.lg,
    backgroundColor: C.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },

  successIconWrap: {
    backgroundColor: C.successTint,
  },

  errorIconWrap: {
    backgroundColor: C.errorTint,
  },

  headerText: {
    flex: 1,
  },

  headline: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
    color: C.text,
    marginBottom: 2,
  },

  successText: {
    color: C.successAlt,
  },

  errorText: {
    color: C.error,
  },

  subline: {
    fontSize: THEME.fontSize.sm,
    color: C.textSecondary,
  },

  // ── Progress bar ─────────────────────────────────────────────────────────

  progressTrack: {
    height: 6,
    borderRadius: BR.full,
    backgroundColor: C.surface,
    overflow: "hidden",
    marginBottom: 6,
  },

  progressFill: {
    height: "100%",
    borderRadius: BR.full,
    backgroundColor: C.primary,
  },

  percentLabel: {
    fontSize: THEME.fontSize.sm,
    color: C.textMuted,
    textAlign: "right",
    marginBottom: S.sm,
  },

  // ── Action buttons ───────────────────────────────────────────────────────

  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.sm,
    marginTop: 4,
  },

  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.primary,
    borderRadius: BR.lg,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    minHeight: 42,
  },

  primaryBtnText: {
    color: C.white,
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
  },

  outlineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: BR.lg,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    minHeight: 42,
    backgroundColor: C.primaryTint,
  },

  outlineBtnText: {
    color: C.primary,
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.semibold,
  },

  ghostBtn: {
    paddingVertical: S.sm,
    paddingHorizontal: S.sm,
  },

  ghostBtnText: {
    color: C.textSecondary,
    fontSize: THEME.fontSize.sm,
    fontWeight: THEME.fontWeight.medium,
  },

  errorBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.error,
    borderRadius: BR.lg,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    minHeight: 42,
  },

  btnIcon: {
    marginRight: 4,
  },
});

export default DatabaseDownloadBanner;
