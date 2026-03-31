import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Vibration,
} from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rw, rh, rs } from "../../utils/responsive";
import { ExerciseGifPlayer } from "./ExerciseGifPlayer";
import { parseTimedExercise, formatDuration } from "../../utils/exerciseDuration";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ExerciseSessionModalProps {
  isVisible: boolean;
  onComplete: () => void;
  onCancel: () => void;
  exerciseId: string;
  exerciseName: string;
  reps: string;
  currentSet: number;
  totalSets: number;
}

/** "Set 1 of 2" phase: which side of a per-side exercise are we on */
type TimerPhase = "side1" | "side2" | "done";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Don't append " reps" if the value already contains a time/directional unit. */
function formatRepsDisplay(reps: string): string {
  const s = reps.trim().toLowerCase();
  if (
    /\d+\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)/.test(s) ||
    s.includes("per ") ||
    s.includes("each ") ||
    /^\d+:\d{1,2}$/.test(s)
  ) {
    return reps.trim();
  }
  return `${reps.trim()} reps`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mini circular arc timer (SVG-free, View-based)
// We approximate a circle using a trick: two half-circles rotated.
// For simplicity we use a progress-ring drawn with border clipping.
// ─────────────────────────────────────────────────────────────────────────────

interface MiniArcTimerProps {
  remaining: number;
  total: number;
  isPaused: boolean;
  /** Label shown under the seconds count (e.g. "Left leg") */
  sideLabel?: string;
}

const ARC_SIZE = rs(64);
const ARC_STROKE = 4;

function MiniArcTimer({ remaining, total, isPaused, sideLabel }: MiniArcTimerProps) {
  const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 1;
  // Degrees remaining (from top, clockwise)
  const degrees = Math.round(fraction * 360);

  // We'll draw the arc as a border trick:
  // - A full circle with accent border
  // - Masked by a white clip based on remaining %
  // Simple approach: use two half-circle views (left + right) rotated

  const leftDeg = degrees > 180 ? 180 : degrees;
  const rightDeg = degrees > 180 ? degrees - 180 : 0;

  return (
    <View style={arcStyles.wrapper}>
      {/* Track ring */}
      <View style={arcStyles.track} />

      {/* Right half fill */}
      <View style={arcStyles.halfBox}>
        <View
          style={[
            arcStyles.halfFill,
            {
              transform: [{ rotate: `${rightDeg}deg` }],
              backgroundColor: isPaused ? "#888" : "#E05C2A",
            },
          ]}
        />
      </View>

      {/* Right half of circle (halfBox positioned on right side) */}
      <View style={[arcStyles.halfBox, { left: ARC_SIZE / 2 }]}>
        <View
          style={[
            arcStyles.halfFill,
            {
              transform: [{ rotate: `${leftDeg}deg` }],
              backgroundColor: isPaused ? "#888" : "#E05C2A",
              left: -(ARC_SIZE / 2),
            },
          ]}
        />
      </View>

      {/* Inner content */}
      <View style={arcStyles.inner}>
        <Text style={arcStyles.countdown}>{formatDuration(remaining)}</Text>
        {isPaused && <Text style={arcStyles.pausedLabel}>paused</Text>}
        {sideLabel ? <Text style={arcStyles.sideLabel}>{sideLabel}</Text> : null}
      </View>
    </View>
  );
}

const arcStyles = StyleSheet.create({
  wrapper: {
    width: ARC_SIZE,
    height: ARC_SIZE,
    position: "relative",
  },
  track: {
    position: "absolute",
    width: ARC_SIZE,
    height: ARC_SIZE,
    borderRadius: ARC_SIZE / 2,
    borderWidth: ARC_STROKE,
    borderColor: "#2A2A44",
  },
  halfBox: {
    position: "absolute",
    width: ARC_SIZE / 2,
    height: ARC_SIZE,
    overflow: "hidden",
    left: 0,
    top: 0,
  },
  halfFill: {
    position: "absolute",
    width: ARC_SIZE,
    height: ARC_SIZE,
    borderRadius: ARC_SIZE / 2,
    borderWidth: ARC_STROKE,
    borderColor: "#E05C2A",
    left: 0,
    top: 0,
    transformOrigin: `${ARC_SIZE / 2}px ${ARC_SIZE / 2}px`,
  },
  inner: {
    position: "absolute",
    width: ARC_SIZE,
    height: ARC_SIZE,
    borderRadius: ARC_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
  countdown: {
    fontSize: rf(11),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  pausedLabel: {
    fontSize: rf(7),
    color: "#888",
    marginTop: 1,
  },
  sideLabel: {
    fontSize: rf(7),
    color: "#E05C2A",
    marginTop: 1,
    textAlign: "center",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Switch banner (shown between per-side phases)
// ─────────────────────────────────────────────────────────────────────────────

interface SwitchBannerProps {
  side2Label: string;
  secondsLeft: number;
}

function SwitchBanner({ side2Label, secondsLeft }: SwitchBannerProps) {
  return (
    <View style={bannerStyles.container}>
      <Text style={bannerStyles.emoji}>🔄</Text>
      <Text style={bannerStyles.title}>Switch to {side2Label}</Text>
      <Text style={bannerStyles.sub}>Starting in {secondsLeft}s...</Text>
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(28,28,46,0.95)",
    borderRadius: rbr(16),
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  emoji: { fontSize: rf(36), marginBottom: rp(8) },
  title: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: rp(6),
  },
  sub: {
    fontSize: rf(14),
    color: "#AAAACC",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const ExerciseSessionModal: React.FC<ExerciseSessionModalProps> = ({
  isVisible,
  onComplete,
  onCancel,
  exerciseId,
  exerciseName,
  reps,
  currentSet,
  totalSets,
}) => {
  // ── Parse timed exercise info once ─────────────────────────────────────────
  const timedInfo = parseTimedExercise(reps);
  const { isTimeBased, totalSeconds, isPerSide, side1Label, side2Label } = timedInfo;

  // ── Breathing animation ────────────────────────────────────────────────────
  const [breathingAnim] = useState(new Animated.Value(1));
  const [pulseAnim] = useState(new Animated.Value(0));

  // ── Exercise timer state (only relevant when isTimeBased) ──────────────────
  const [timerRemaining, setTimerRemaining] = useState(totalSeconds);
  const [timerPhase, setTimerPhase] = useState<TimerPhase>("side1");
  const [isPaused, setIsPaused] = useState(false);
  const [switchCountdown, setSwitchCountdown] = useState(0); // 3,2,1 between phases
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const switchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRemainingRef = useRef(0);

  // ── Reset timer whenever the modal becomes visible ─────────────────────────
  useEffect(() => {
    if (!isVisible) return;
    setTimerRemaining(totalSeconds);
    setTimerPhase("side1");
    setIsPaused(false);
    setSwitchCountdown(0);
  }, [isVisible, totalSeconds]);

  // ── Countdown interval for exercise timer ──────────────────────────────────
  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (switchRef.current) clearInterval(switchRef.current);
    timerRef.current = null;
    switchRef.current = null;
  }, []);

  const startSwitchCountdown = useCallback(() => {
    setSwitchCountdown(3);
    let count = 3;
    Vibration.vibrate([0, 300]);
    switchRef.current = setInterval(() => {
      count -= 1;
      setSwitchCountdown(count);
      if (count <= 0) {
        clearInterval(switchRef.current!);
        switchRef.current = null;
        setSwitchCountdown(0);
        setTimerPhase("side2");
        setTimerRemaining(totalSeconds);
      }
    }, 1000);
  }, [totalSeconds]);

  useEffect(() => {
    if (!isVisible || !isTimeBased || isPaused || switchCountdown > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    if (timerPhase === "done") return;

    timerRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          Vibration.vibrate([0, 200, 100, 200]);

          if (isPerSide && timerPhase === "side1") {
            // First side done → start switch countdown
            startSwitchCountdown();
          } else {
            // Both sides done (or single phase done) → mark phase done
            setTimerPhase("done");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [isVisible, isTimeBased, isPaused, switchCountdown, timerPhase, isPerSide, startSwitchCountdown]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  const handlePauseResume = useCallback(() => {
    setIsPaused((prev) => {
      if (!prev) pausedRemainingRef.current = timerRemaining;
      return !prev;
    });
  }, [timerRemaining]);

  // ── Breathing animation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isVisible) return;
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnim, { toValue: 1.2, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathingAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ]),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    breathing.start();
    pulse.start();
    return () => { breathing.stop(); pulse.stop(); };
  }, [isVisible, breathingAnim, pulseAnim]);

  if (!isVisible) return null;

  // ── Derived values for display ─────────────────────────────────────────────
  const currentSideLabel = isPerSide
    ? timerPhase === "side1" ? side1Label : side2Label
    : undefined;

  const motivationText = currentSet === 1
    ? "Focus on form — nail technique on set 1"
    : currentSet === totalSets
    ? "Last set — give it everything!"
    : "Stay strong — maintain your form";

  const timedMotivation = isPerSide
    ? (timerPhase === "side1"
        ? `Hold for ${totalSeconds}s on ${side1Label}`
        : `Hold for ${totalSeconds}s on ${side2Label}`)
    : `Hold for ${totalSeconds}s`;

  return (
    <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.cardWrapper}>
          <Card style={styles.sessionCard} variant="elevated">
            <View style={styles.sessionContent}>

            {/* Header row: spacer | "Set X of Y" | timer (or spacer) */}
            <View style={styles.headerRow}>
              <View style={styles.headerSpacer} />
              <View style={styles.headerCenter}>
                <Text style={styles.setIndicator}>Set {currentSet} of {totalSets}</Text>
                <Text style={styles.repsText}>{formatRepsDisplay(reps)}</Text>
              </View>
              <View style={styles.headerTimerSlot}>
                {isTimeBased && (
                  <TouchableOpacity
                    onPress={handlePauseResume}
                    accessibilityRole="button"
                    accessibilityLabel={isPaused ? "Resume exercise timer" : "Pause exercise timer"}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MiniArcTimer
                      remaining={timerRemaining}
                      total={totalSeconds}
                      isPaused={isPaused}
                      sideLabel={currentSideLabel}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Breathing circle + GIF + mini arc timer (top-right corner of circle) */}
            <View style={styles.animationContainer}>
              {/* Outer breathing circles */}
              <Animated.View
                style={[styles.breathingCircleOuter, { transform: [{ scale: breathingAnim }], opacity: pulseAnim }]}
              />
              <Animated.View
                style={[styles.breathingCircleMiddle, { transform: [{ scale: breathingAnim }] }]}
              />

              {/* Exercise GIF */}
              <View style={styles.exerciseGifContainer}>
                <ExerciseGifPlayer
                  exerciseId={exerciseId}
                  exerciseName={exerciseName}
                  height={180}
                  width={180}
                  showTitle={false}
                  showInstructions={false}
                  showControls={false}
                />
              </View>

            </View>

            {/* Phase switch overlay (shown between per-side phases) */}
            {switchCountdown > 0 && (
              <SwitchBanner side2Label={side2Label} secondsLeft={switchCountdown} />
            )}

            {/* Exercise name */}
            <Text style={styles.exerciseName} numberOfLines={2}>{exerciseName}</Text>

            {/* Motivational / instructional text */}
            <Text style={styles.motivationText}>
              {isTimeBased ? timedMotivation : motivationText}
            </Text>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity style={[styles.controlButton, styles.cancelButton]} onPress={onCancel}>
                <Text style={[styles.controlText, styles.cancelText]}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.controlButton, styles.completeButton]} onPress={onComplete}>
                <Text style={[styles.controlText, styles.completeText]}>Complete Set</Text>
              </TouchableOpacity>
            </View>

            {/* Progress dots — 3 states: completed / active / pending */}
            <View style={styles.progressDots}>
              {Array.from({ length: totalSets }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.progressDot,
                    i < currentSet - 1
                      ? styles.progressDotCompleted
                      : i === currentSet - 1
                      ? styles.progressDotActive
                      : {},
                  ]}
                />
              ))}
            </View>

          </View>
          </Card>

        </View>{/* /cardWrapper */}
      </View>{/* /overlay */}
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: rp(48),
  },
  /** Outer wrapper — plain View so position:absolute on timerBadge works correctly.
    Card's renderChildrenSafely() recursively clones children and breaks absolute positioning. */
  cardWrapper: {
    width: "90%" as any,
    maxWidth: 400,
    position: "relative" as any,
  },
  sessionCard: {
    width: "100%",
    padding: ResponsiveTheme.spacing.xl,
    alignItems: "center" as any,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  sessionContent: {
    alignItems: "center",
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  headerSpacer: {
    width: ARC_SIZE,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTimerSlot: {
    width: ARC_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  setIndicator: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.primary,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  repsText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.textSecondary,
  },
  animationContainer: {
    width: rw(250),
    height: rh(250),
    justifyContent: "center",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.lg,
    position: "relative",
  },
  breathingCircleOuter: {
    position: "absolute",
    width: rw(250),
    height: rh(250),
    borderRadius: rbr(125),
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    borderWidth: 2,
    borderColor: ResponsiveTheme.colors.primary + "40",
  },
  breathingCircleMiddle: {
    position: "absolute",
    width: rw(220),
    height: rh(220),
    borderRadius: rbr(110),
    backgroundColor: ResponsiveTheme.colors.primary + "10",
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary + "30",
  },
  exerciseGifContainer: {
    position: "relative",
    zIndex: 10,
    borderRadius: rbr(90),
    overflow: "hidden",
    elevation: 4,
  },
  /** Top-right corner of cardWrapper (plain View) — safe for absolute positioning */
  exerciseName: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: ResponsiveTheme.fontWeight.bold,
    color: ResponsiveTheme.colors.text,
    textAlign: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  motivationText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: ResponsiveTheme.spacing.lg,
    gap: ResponsiveTheme.spacing.md,
  },
  controlButton: {
    flex: 1,
    height: rh(50),
    borderRadius: ResponsiveTheme.borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,255,255,0.35)",
  },
  completeButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  controlText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: ResponsiveTheme.fontWeight.semibold,
  },
  cancelText: {
    color: ResponsiveTheme.colors.text,
  },
  completeText: {
    color: ResponsiveTheme.colors.white,
  },
  progressDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.sm,
  },
  progressDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rbr(5),
    backgroundColor: ResponsiveTheme.colors.border,
  },
  progressDotCompleted: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  progressDotActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    width: rs(13),
    height: rs(13),
    borderRadius: rbr(6.5),
    borderWidth: 2,
    borderColor: "#FFF",
  },
});
