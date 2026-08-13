/**
 * FitAI — Exercise Session Modal (Aurora)
 *
 * Full-screen performing-phase card shown while the user executes a set.
 * Hosts the exercise GIF, a breathing animation, an optional per-side timer
 * arc, and the Complete Set / Back controls.
 *
 * Aurora modernization:
 *  - Hand-rolled half-circle arc timer (View-clipping hack) → ProgressRing
 *    (SVG, animated, tokenized).
 *  - Legacy RN `Animated` breathing/pulse → Reanimated shared values
 *    (withRepeat + withSequence) so the loop runs on the UI thread.
 *  - Direct `Vibration.vibrate(...)` calls → `haptics` util (expo-haptics).
 *  - Hardcoded `#E05C2A` → colors.primary.DEFAULT (single source of truth).
 *  - GlassCard surface (elevation 6) → flat surface + hairline (Editorial Dark).
 *
 * Timer logic (parseTimedExercise, per-side phase state machine, switch
 * countdown) is UNCHANGED — only presentation + animation primitives changed.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { AnimatedPressable, ProgressRing } from '../ui/aurora';
import { colors, flatColors, surface, border, spacing, borderRadius, typography } from '../../theme/aurora-tokens';
import { rf, rp, rbr, rh, rs } from '../../utils/responsive';
import { hexToRgba } from '../../utils/colors';
import { haptics } from '../../utils/haptics';
import { useReducedMotion } from '../../utils/accessibility/hooks';
import { ExerciseGifPlayer } from './ExerciseGifPlayer';
import { parseTimedExercise, formatDuration } from '../../utils/exerciseDuration';
import { SafeAreaView } from 'react-native-safe-area-context';

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
type TimerPhase = 'side1' | 'side2' | 'done';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Don't append " reps" if the value already contains a time/directional unit. */
function formatRepsDisplay(reps: string): string {
  const s = reps.trim().toLowerCase();
  if (
    /\d+\s*(s|sec|secs|second|seconds|min|mins|minute|minutes)/.test(s) ||
    s.includes('per ') ||
    s.includes('each ') ||
    /^\d+:\d{1,2}$/.test(s)
  ) {
    return reps.trim();
  }
  return `${reps.trim()} reps`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Arc timer — now a ProgressRing (replaces the View-clipping half-circle hack)
// ─────────────────────────────────────────────────────────────────────────────

interface MiniArcTimerProps {
  remaining: number;
  total: number;
  isPaused: boolean;
  /** Label shown under the seconds count (e.g. "Left leg") */
  sideLabel?: string;
}

const ARC_SIZE = rs(72);

function MiniArcTimer({ remaining, total, isPaused, sideLabel }: MiniArcTimerProps) {
  const fraction = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 1;
  // ProgressRing expects 0-100; deplete as time elapses.
  const progress = Math.round(fraction * 100);

  return (
    <View style={arcStyles.wrapper}>
      <ProgressRing
        progress={progress}
        size={ARC_SIZE}
        strokeWidth={rf(5)}
        color={isPaused ? colors.text.tertiary : colors.primary.DEFAULT}
        backgroundColor={colors.background.tertiary}
        animated
        showText={false}
      >
        <View style={arcStyles.inner}>
          <Text style={arcStyles.countdown}>{formatDuration(remaining)}</Text>
          {isPaused && <Text style={arcStyles.pausedLabel}>paused</Text>}
          {sideLabel ? <Text style={arcStyles.sideLabel}>{sideLabel}</Text> : null}
        </View>
      </ProgressRing>
    </View>
  );
}

const arcStyles = StyleSheet.create({
  wrapper: {
    width: ARC_SIZE,
    height: ARC_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  pausedLabel: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    marginTop: 1,
  },
  sideLabel: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.primary.DEFAULT,
    marginTop: 1,
    textAlign: 'center',
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
  // FadeIn/FadeOut so the banner doesn't jarringly cover the GIF instantly.
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={bannerStyles.container}
    >
      <Ionicons name="swap-horizontal" size={rf(36)} color={colors.secondary.DEFAULT} />
      <Text style={bannerStyles.title}>Switch to {side2Label}</Text>
      <Text style={bannerStyles.sub}>Starting in {secondsLeft}s...</Text>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: hexToRgba(surface[0], 0.95),
    borderRadius: rbr(16),
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  title: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: rp(spacing.xs),
    marginBottom: rp(spacing.xxs),
  },
  sub: {
    fontSize: rf(typography.fontSize.body),
    color: colors.text.secondary,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

const ExerciseSessionModalComponent: React.FC<ExerciseSessionModalProps> = ({
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

  // ── Breathing animation (Reanimated shared values) ────────────────────────
  // Reduce-motion: skip the infinite breathing pulse entirely. The two
  // withRepeat(..., -1) loops below keep the UI thread perpetually "busy",
  // which blocks uiautomator waitForIdle() (and Detox's idleness monitor) →
  // empty view-tree dumps → Maestro can't see any element while this modal
  // is open. Same root cause + fix as AuroraBackground (see VERIFIED-FINDINGS
  // "A11Y-1"). When reduce-motion is on, hold static values so the surface is
  // calm AND the test harness can reach idle.
  const reduceMotion = useReducedMotion();
  const breathingScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  // ── Exercise timer state (only relevant when isTimeBased) ──────────────────
  const [timerRemaining, setTimerRemaining] = useState(totalSeconds);
  const [timerPhase, setTimerPhase] = useState<TimerPhase>('side1');
  const [isPaused, setIsPaused] = useState(false);
  const [switchCountdown, setSwitchCountdown] = useState(0); // 3,2,1 between phases
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const switchRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pausedRemainingRef = useRef(0);

  // ── Reset timer whenever the modal becomes visible ─────────────────────────
  useEffect(() => {
    if (!isVisible) return;
    setTimerRemaining(totalSeconds);
    setTimerPhase('side1');
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
    // haptics replaces direct Vibration.vibrate
    haptics.warning();
    switchRef.current = setInterval(() => {
      count -= 1;
      setSwitchCountdown(count);
      if (count <= 0) {
        clearInterval(switchRef.current!);
        switchRef.current = null;
        setSwitchCountdown(0);
        setTimerPhase('side2');
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
    if (timerPhase === 'done') return;

    timerRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          // haptics replaces direct Vibration.vibrate([0,200,100,200])
          haptics.celebration();

          if (isPerSide && timerPhase === 'side1') {
            // First side done → start switch countdown
            startSwitchCountdown();
          } else {
            // Both sides done (or single phase done) → mark phase done
            setTimerPhase('done');
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
  }, [
    isVisible,
    isTimeBased,
    isPaused,
    switchCountdown,
    timerPhase,
    isPerSide,
    startSwitchCountdown,
  ]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  const handlePauseResume = useCallback(() => {
    setIsPaused((prev) => {
      if (!prev) pausedRemainingRef.current = timerRemaining;
      return !prev;
    });
  }, [timerRemaining]);

  // ── Breathing animation (Reanimated) ───────────────────────────────────────
  // Loops: scale 1 → 1.2 → 1 (2s each half) + opacity 0 → 1 → 0 (1.5s each half).
  // Gated behind reduceMotion: infinite withRepeat loops keep the UI thread
  // busy and block test-harness idle (uiautomator/Detox). Static when on.
  useEffect(() => {
    if (!isVisible) return;
    if (reduceMotion) {
      // Hold a calm static state; no infinite loops → thread can idle.
      breathingScale.value = 1;
      pulseOpacity.value = 1;
      return;
    }
    breathingScale.value = withRepeat(
      withSequence(withTiming(1.2, { duration: 2000 }), withTiming(1, { duration: 2000 })),
      -1,
      false
    );
    pulseOpacity.value = withRepeat(
      withSequence(withTiming(1, { duration: 1500 }), withTiming(0, { duration: 1500 })),
      -1,
      false
    );
    return () => {
      cancelAnimation(breathingScale);
      cancelAnimation(pulseOpacity);
    };
  }, [isVisible, reduceMotion, breathingScale, pulseOpacity]);

  const breathingOuterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
    opacity: pulseOpacity.value,
  }));
  const breathingMiddleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathingScale.value }],
  }));

  if (!isVisible) return null;

  // ── Derived values for display ─────────────────────────────────────────────
  const currentSideLabel = isPerSide
    ? timerPhase === 'side1'
      ? side1Label
      : side2Label
    : undefined;

  // Contextual per-set tips — each set gets a distinct, actionable cue rather
  // than the same generic phrase repeated for every middle set. The first and
  // last sets keep their dedicated messages; intermediate sets rotate through
  // form/breathing/tempo cues so the user gets useful coaching per set.
  const motivationText = (() => {
    if (currentSet === 1) return 'Focus on form — nail technique on set 1';
    if (currentSet === totalSets) return 'Last set — give it everything!';
    const midSetTips = [
      'Control the negative — 2s down, 1s up',
      'Breathe out on the exertion, brace your core',
      'Drive through your heels — keep tension tight',
      'Squeeze at the top — full range of motion',
      'Tempo over speed — own every rep',
    ];
    // Rotate tips deterministically by set number so the same set always
    // shows the same tip (stable across re-renders / pause-resume).
    return midSetTips[(currentSet - 2) % midSetTips.length];
  })();

  const timedMotivation = isPerSide
    ? timerPhase === 'side1'
      ? `Hold for ${totalSeconds}s on ${side1Label}`
      : `Hold for ${totalSeconds}s on ${side2Label}`
    : `Hold for ${totalSeconds}s`;

  return (
    <View style={styles.overlay}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.cardWrapper}>
          {/* Flat surface + hairline (was GlassCard elevation 6 — deep elevated
              glass contradicts Editorial Dark flat surfaces). */}
          <View style={styles.sessionCard}>
            {/* Header row: spacer | "Set X of Y" | timer (or spacer) */}
            <View style={styles.headerRow}>
              <View style={styles.headerSpacer} />
              <View style={styles.headerCenter}>
                <Text style={styles.setIndicator}>
                  Set {currentSet} of {totalSets}
                </Text>
                <Text style={styles.repsText}>{formatRepsDisplay(reps)}</Text>
              </View>
              <View style={styles.headerTimerSlot}>
                {isTimeBased && (
                  <AnimatedPressable
                    onPress={handlePauseResume}
                    scaleValue={0.95}
                    springConfig="snappy"
                    hapticType="light"
                    accessibilityRole="button"
                    accessibilityLabel={isPaused ? 'Resume exercise timer' : 'Pause exercise timer'}
                  >
                    <MiniArcTimer
                      remaining={timerRemaining}
                      total={totalSeconds}
                      isPaused={isPaused}
                      sideLabel={currentSideLabel}
                    />
                  </AnimatedPressable>
                )}
              </View>
            </View>

            {/* Breathing circle + GIF */}
            <View style={styles.animationContainer}>
              {/* Outer breathing circles (Reanimated) */}
              <Animated.View style={[styles.breathingCircleOuter, breathingOuterStyle]} />
              <Animated.View style={[styles.breathingCircleMiddle, breathingMiddleStyle]} />

              {/* Exercise GIF */}
              <View style={styles.exerciseGifContainer}>
                <ExerciseGifPlayer
                  exerciseId={exerciseId}
                  exerciseName={exerciseName}
                  height={rs(180)}
                  width={rs(180)}
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
            <Text
              style={styles.exerciseName}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {exerciseName}
            </Text>

            {/* Motivational / instructional text */}
            <Text style={styles.motivationText}>
              {isTimeBased ? timedMotivation : motivationText}
            </Text>

            {/* Controls */}
            <View style={styles.controls}>
              <AnimatedPressable
                onPress={onCancel}
                scaleValue={0.96}
                springConfig="snappy"
                hapticType="light"
                style={[styles.controlButton, styles.cancelButton]}
                containerStyle={styles.controlButtonOuter}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <View style={styles.controlContent}>
                  <Ionicons name="chevron-back" size={rf(16)} color={colors.text.primary} />
                  <Text style={[styles.controlText, styles.cancelText]}>Back</Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={onComplete}
                scaleValue={0.96}
                springConfig="snappy"
                hapticType="success"
                style={[styles.controlButton, styles.completeButton]}
                containerStyle={styles.controlButtonOuter}
                accessibilityRole="button"
                accessibilityLabel="Complete set"
              >
                <View style={styles.controlContent}>
                  <Ionicons name="checkmark-circle" size={rf(16)} color={colors.text.primary} />
                  <Text style={[styles.controlText, styles.completeText]}>Complete Set</Text>
                </View>
              </AnimatedPressable>
            </View>

            {/* Progress dots — 3 states: completed / active / pending.
              Dots represent SETS within this exercise. For >7 sets the dot
              row wraps and misaligns, so switch to a compact "Set X of Y"
              text indicator instead. */}
            {totalSets > 7 ? (
              <Text style={styles.setsIndicatorText}>
                Set {currentSet} of {totalSets}
              </Text>
            ) : (
              <View style={styles.progressDotsWrapper}>
                <Text style={styles.progressDotsLabel}>Sets</Text>
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
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

/**
 * Memoized: mounted unconditionally in WorkoutSessionScreen (isVisible=false
 * returns null internally rather than being conditionally unmounted), so
 * without memo every screen-level re-render — including the old per-second
 * timer tick — re-ran this component's full render + effect bookkeeping even
 * while hidden.
 */
export const ExerciseSessionModal = React.memo(ExerciseSessionModalComponent);

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: hexToRgba(flatColors.black, 0.8),
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  /** Outer wrapper — plain View so position:absolute on overlays works correctly. */
  cardWrapper: {
    width: '90%',
    maxWidth: 400,
    position: 'relative',
  },
  sessionCard: {
    width: '100%',
    alignItems: 'center' as const,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: border.subtle,
    padding: rp(spacing.xl),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: rp(spacing.lg),
  },
  headerSpacer: {
    width: ARC_SIZE,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTimerSlot: {
    width: ARC_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setIndicator: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.primary.DEFAULT,
    marginBottom: rp(spacing.xxs),
  },
  repsText: {
    fontSize: rf(typography.fontSize.body),
    color: colors.text.secondary,
  },
  animationContainer: {
    width: rs(200),
    height: rs(200),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: rp(spacing.md),
    position: 'relative',
  },
  breathingCircleOuter: {
    position: 'absolute',
    width: rs(200),
    height: rs(200),
    borderRadius: rbr(100),
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.125),
    borderWidth: 2,
    borderColor: hexToRgba(colors.primary.DEFAULT, 0.25),
  },
  breathingCircleMiddle: {
    position: 'absolute',
    width: rs(180),
    height: rs(180),
    borderRadius: rbr(90),
    backgroundColor: hexToRgba(colors.primary.DEFAULT, 0.06),
    borderWidth: 1,
    borderColor: hexToRgba(colors.primary.DEFAULT, 0.19),
  },
  exerciseGifContainer: {
    position: 'relative',
    zIndex: 10,
    borderRadius: rbr(90),
    overflow: 'hidden',
    width: rs(180),
    height: rs(180),
    flexShrink: 0,
  },
  exerciseName: {
    fontSize: rf(typography.fontSize.h3),
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: rp(spacing.md),
  },
  motivationText: {
    fontSize: rf(typography.fontSize.caption),
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: rp(spacing.xl),
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: rp(spacing.lg),
    gap: rp(spacing.md),
    flexShrink: 0,
  },
  controlButton: {
    flex: 1,
    height: rh(50),
    flexShrink: 0,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  controlButtonOuter: {
    flex: 1,
    flexShrink: 0,
    height: rh(50),
  },
  controlContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rp(spacing.xs),
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderColor: border.DEFAULT,
  },
  completeButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  controlText: {
    fontSize: rf(typography.fontSize.body),
    fontWeight: String(typography.fontWeight.semibold) as any,
  },
  cancelText: {
    color: colors.text.primary,
  },
  completeText: {
    color: colors.text.primary,
  },
  progressDotsWrapper: {
    alignItems: 'center',
  },
  progressDotsLabel: {
    fontSize: rf(typography.fontSize.micro),
    color: colors.text.tertiary,
    fontWeight: String(typography.fontWeight.medium) as any,
    letterSpacing: 0.8,
    marginBottom: rp(spacing.xxs),
  },
  progressDots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: rp(spacing.sm),
  },
  setsIndicatorText: {
    fontSize: rf(typography.fontSize.caption),
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  progressDot: {
    width: rs(10),
    height: rs(10),
    borderRadius: rbr(5),
    backgroundColor: colors.background.tertiary,
  },
  // Completed: orange fill, no ring.
  progressDotCompleted: {
    backgroundColor: colors.primary.DEFAULT,
  },
  // Active: orange fill + white ring (same size as completed; ring distinguishes state).
  progressDotActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderWidth: 2,
    borderColor: colors.text.primary,
  },
});
