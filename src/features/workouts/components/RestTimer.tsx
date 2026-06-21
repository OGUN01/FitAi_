/**
 * FitAI — Rest Timer (Aurora)
 *
 * Countdown rest timer shown between sets / between exercises. Now rendered on
 * a GlassCard surface with token colors, a reanimated progress bar, an SVG
 * ProgressRing arc, and preset duration chips.
 *
 * Timer logic (restTimerService contract) is UNCHANGED:
 *  - `targetEndTime` (epoch ms) drives the countdown via a 500ms interval.
 *  - +10s extends the effective end time; Pause/Resume snapshots remaining.
 *  - On expiry, Vibration.vibrate([0,400,100,400]) fires (preserved for the
 *    existing test contract) and onExpire() is called once.
 *
 * Visual modernization:
 *  - Flat #1C1C2E card → GlassCard (blur + border + elevation).
 *  - Drifted #E05C2A accent → colors.primary.DEFAULT (single source of truth).
 *  - Hardcoded #2A2A44 / #9999BB / #CCCCDD → aurora tokens.
 *  - View-clipping progress bar → reanimated withTiming width.
 *  - Added ProgressRing arc around the countdown for a richer visual.
 *  - Added preset chips (60/90/120/180s) as AnimatedPressable pills — wired
 *    through the optional onSetPreset callback (parent restarts the timer).
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { GlassCard, AnimatedPressable, ProgressRing } from "../../../components/ui/aurora";
import { colors, spacing, borderRadius, typography } from "../../../theme/aurora-tokens";
import { rp, rf } from "../../../utils/responsive";
import { animations } from "../../../theme/animations";

interface RestTimerProps {
  targetEndTime: number | null;
  onExpire: () => void;
  onSkip: () => void;
  /** True when resting between exercises (not between sets). */
  isInterExercise?: boolean;
  /** Name of the exercise currently being rested on (for intra-set context). */
  exerciseName?: string;
  /** Name of the next exercise (displayed during inter-exercise rest). */
  nextExerciseName?: string;
  /** Set number that just finished (1-indexed), for intra-set context line. */
  currentSet?: number;
  /** Total sets for this exercise. */
  totalSets?: number;
  /** Total rest duration in seconds — used to draw the progress bar. */
  totalDuration?: number;
  /** Optional handler for preset-duration chips (60/90/120/180s). */
  onSetPreset?: (seconds: number) => void;
}

const PRESETS = [60, 90, 120, 180];

function fmt(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function RestTimer({
  targetEndTime,
  onExpire,
  onSkip,
  isInterExercise = false,
  nextExerciseName,
  currentSet,
  totalSets,
  totalDuration = 60,
  onSetPreset,
}: RestTimerProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [remaining, setRemaining] = useState(0);
  const [addedSeconds, setAddedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const remainingAtPauseRef = useRef(0);
  const expiredRef = useRef(false);
  const effectiveEndRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // Reanimated shared value for the progress bar width (0..1).
  const progressSV = useSharedValue(0);

  // ── Initialise when a new targetEndTime arrives ───────────────────────────
  useEffect(() => {
    if (targetEndTime == null) return;

    const initial = Math.max(
      0,
      Math.ceil((targetEndTime - Date.now()) / 1000),
    );
    effectiveEndRef.current = targetEndTime;
    expiredRef.current = false;
    setAddedSeconds(0);
    setIsPaused(false);
    setRemaining(initial);
  }, [targetEndTime]);

  // ── Countdown interval ────────────────────────────────────────────────────
  useEffect(() => {
    if (targetEndTime == null || isPaused) return;

    const id = setInterval(() => {
      const secs = Math.max(
        0,
        Math.ceil((effectiveEndRef.current - Date.now()) / 1000),
      );
      setRemaining(secs);

      if (secs === 0 && !expiredRef.current) {
        expiredRef.current = true;
        Vibration.vibrate([0, 400, 100, 400]);
        onExpireRef.current();
      }
    }, 500); // 500ms tick for smoothness

    return () => clearInterval(id);
  }, [targetEndTime, isPaused]);

  // ── Animate the progress bar with reanimated withTiming ───────────────────
  const effectiveTotalDuration = totalDuration + addedSeconds;
  const progressFraction =
    effectiveTotalDuration > 0
      ? Math.max(0, Math.min(1, 1 - remaining / effectiveTotalDuration))
      : 0;
  useEffect(() => {
    progressSV.value = withTiming(progressFraction, {
      duration: animations.duration.quick,
    });
  }, [progressFraction, progressSV]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progressSV.value * 100)}%`,
  }));

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePauseResume = useCallback(() => {
    setIsPaused((prev) => {
      if (prev) {
        // Resuming — create a new effective end time from remaining seconds
        const newEnd = Date.now() + remainingAtPauseRef.current * 1000;
        effectiveEndRef.current = newEnd;
      } else {
        // Pausing — snapshot remaining
        remainingAtPauseRef.current = remaining;
      }
      return !prev;
    });
  }, [remaining]);

  const handleAddTen = useCallback(() => {
    if (isPaused) {
      // Add directly to the paused remaining
      remainingAtPauseRef.current += 10;
      setRemaining((r) => r + 10);
    } else {
      // Extend effective end time; interval will pick up the change on next tick
      effectiveEndRef.current += 10_000;
    }
    setAddedSeconds((a) => a + 10);
  }, [isPaused]);

  // ── Derived display values ─────────────────────────────────────────────────
  if (targetEndTime == null) return null;

  const headingLabel = isInterExercise
    ? "REST BEFORE NEXT EXERCISE"
    : "REST BETWEEN SETS";

  let contextLine: string | null = null;
  if (isInterExercise && nextExerciseName) {
    contextLine = `Next up: ${nextExerciseName}`;
  } else if (!isInterExercise && currentSet != null && totalSets != null) {
    contextLine = `Set ${currentSet} of ${totalSets} complete`;
  }

  // ProgressRing expects 0-100; use the remaining fraction inverted so the
  // ring depletes as rest elapses.
  const ringProgress = Math.round((1 - progressFraction) * 100);

  return (
    <View style={styles.overlay}>
      <GlassCard
        elevation={6}
        padding="lg"
        borderRadius="xxl"
        contentStyle={styles.cardContent}
        style={styles.card}
      >
        <View testID="rest-timer-container" style={styles.containerInner}>
          {/* Heading */}
          <Text style={styles.heading}>{headingLabel}</Text>

          {/* Countdown + ProgressRing arc */}
          <View style={styles.countdownWrap}>
            <ProgressRing
              progress={ringProgress}
              size={rf(168)}
              strokeWidth={rf(6)}
              color={colors.primary.DEFAULT}
              backgroundColor={colors.glass.backgroundDark}
              animated
              showText={false}
            >
              <Text style={styles.countdown} testID="rest-timer-countdown">
                {fmt(remaining)}
              </Text>
            </ProgressRing>
          </View>

          {/* Progress bar (reanimated width) */}
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressStyle]} />
          </View>

          {/* Context line */}
          {contextLine ? (
            <Text style={styles.contextLine}>{contextLine}</Text>
          ) : null}

          {/* Preset chips — only when the parent wires onSetPreset */}
          {onSetPreset ? (
            <View style={styles.presetRow}>
              {PRESETS.map((secs) => (
                <AnimatedPressable
                  key={secs}
                  onPress={() => onSetPreset!(secs)}
                  scaleValue={0.94}
                  springConfig="snappy"
                  hapticType="selection"
                  style={styles.presetChip}
                  accessibilityRole="button"
                  accessibilityLabel={`Set rest to ${secs} seconds`}
                >
                  <Text style={styles.presetChipText}>{secs}s</Text>
                </AnimatedPressable>
              ))}
            </View>
          ) : null}

          {/* Controls row: +10s | Pause/Resume | Skip */}
          <View style={styles.controls}>
            {/* +10s */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleAddTen}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Add 10 seconds to rest"
            >
              <Text style={styles.secondaryBtnText}>+10s</Text>
            </TouchableOpacity>

            {/* Pause / Resume */}
            <TouchableOpacity
              style={styles.pauseBtn}
              onPress={handlePauseResume}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={isPaused ? "Resume rest timer" : "Pause rest timer"}
            >
              <Text style={styles.pauseBtnText}>
                {isPaused ? "Resume" : "Pause"}
              </Text>
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={onSkip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Skip rest timer"
              testID="rest-timer-skip"
            >
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GlassCard>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  card: {
    width: "88%",
    maxWidth: 360,
  },
  cardContent: {
    alignItems: "center",
  },
  containerInner: {
    alignItems: "center",
    width: "100%",
  },

  // ── Text ────
  heading: {
    color: colors.text.tertiary,
    fontSize: rf(11),
    fontWeight: String(typography.fontWeight.bold) as any,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: rp(spacing.sm),
  },
  countdownWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rp(spacing.md),
  },
  countdown: {
    color: colors.text.primary,
    fontSize: rf(48),
    fontWeight: String(typography.fontWeight.bold) as any,
    letterSpacing: -2,
    fontVariant: ["tabular-nums"],
  },
  contextLine: {
    color: colors.text.secondary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.medium) as any,
    textAlign: "center",
    marginTop: rp(spacing.sm),
    marginBottom: rp(spacing.xxs),
  },

  // ── Progress bar ────
  progressTrack: {
    width: "100%",
    height: 3,
    backgroundColor: colors.glass.backgroundDark,
    borderRadius: borderRadius.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: borderRadius.sm,
  },

  // ── Preset chips ────
  presetRow: {
    flexDirection: "row",
    gap: rp(spacing.xs),
    marginTop: rp(spacing.md),
  },
  presetChip: {
    backgroundColor: colors.glass.background,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.full,
    paddingVertical: rp(spacing.xs),
    paddingHorizontal: rp(spacing.md),
  },
  presetChipText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },

  // ── Controls ────
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(spacing.sm),
    marginTop: rp(spacing.lg),
  },

  // +10s
  secondaryBtn: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    paddingVertical: rp(12),
    paddingHorizontal: rp(spacing.md),
    minWidth: rp(60),
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  secondaryBtnText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },

  // Pause / Resume
  pauseBtn: {
    flex: 1,
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    paddingVertical: rp(12),
    paddingHorizontal: rp(spacing.sm),
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  pauseBtnText: {
    color: colors.text.primary,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },

  // Skip
  skipBtn: {
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.md,
    paddingVertical: rp(12),
    paddingHorizontal: rp(spacing.md),
    minWidth: rp(60),
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  skipBtnText: {
    color: colors.error.light,
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
});
