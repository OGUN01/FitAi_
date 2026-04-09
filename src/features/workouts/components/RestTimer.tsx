import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Vibration,
  DimensionValue,
} from "react-native";

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
}

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
}: RestTimerProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  // Remaining seconds — driven by interval when unpaused
  const [remaining, setRemaining] = useState(0);
  // Extra seconds added by +10s button (accumulated offset)
  const [addedSeconds, setAddedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  // Seconds remaining at the moment the user hit Pause
  const remainingAtPauseRef = useRef(0);
  // Tracks whether onExpire has already fired for this timer instance
  const expiredRef = useRef(false);
  // Effective end time = targetEndTime + addedSeconds * 1000 (when not paused)
  const effectiveEndRef = useRef<number>(0);
  // Stable ref so the interval never needs to restart when onExpire changes
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

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

  const effectiveTotalDuration = totalDuration + addedSeconds;
  const progressFraction =
    effectiveTotalDuration > 0
      ? Math.max(0, Math.min(1, 1 - remaining / effectiveTotalDuration))
      : 0;

  const headingLabel = isInterExercise
    ? "REST BEFORE NEXT EXERCISE"
    : "REST BETWEEN SETS";

  let contextLine: string | null = null;
  if (isInterExercise && nextExerciseName) {
    contextLine = `Next up: ${nextExerciseName}`;
  } else if (!isInterExercise && currentSet != null && totalSets != null) {
    contextLine = `Set ${currentSet} of ${totalSets} complete`;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Heading */}
        <Text style={styles.heading}>{headingLabel}</Text>

        {/* Countdown */}
        <Text style={styles.countdown}>{fmt(remaining)}</Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progressFraction * 100)}%` as DimensionValue },
            ]}
          />
        </View>

        {/* Context line */}
        {contextLine ? (
          <Text style={styles.contextLine}>{contextLine}</Text>
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
            <Text style={styles.pauseBtnText}>{isPaused ? "▶  Resume" : "⏸  Pause"}</Text>
          </TouchableOpacity>

          {/* Skip */}
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={onSkip}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Skip rest timer"
          >
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const CARD_BG = "#1C1C2E";
const ACCENT = "#E05C2A";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "#9999BB";
const CONTROL_BG = "#2A2A42";

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: "center",
    width: "88%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },

  // ── Text ────
  heading: {
    color: TEXT_MUTED,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  countdown: {
    color: TEXT_PRIMARY,
    fontSize: 60,
    fontWeight: "700",
    letterSpacing: -2,
    marginBottom: 16,
    fontVariant: ["tabular-nums"],
  },
  contextLine: {
    color: "#CCCCDD",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 4,
  },

  // ── Progress bar ────
  progressTrack: {
    width: "100%",
    height: 3,
    backgroundColor: "#2A2A44",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: ACCENT,
    borderRadius: 2,
  },

  // ── Controls ────
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
  },

  // +10s
  secondaryBtn: {
    backgroundColor: CONTROL_BG,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 60,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  secondaryBtnText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },

  // Pause / Resume
  pauseBtn: {
    flex: 1,
    backgroundColor: CONTROL_BG,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  pauseBtnText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: "600",
  },

  // Skip
  skipBtn: {
    backgroundColor: CONTROL_BG,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 60,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  skipBtnText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "600",
  },
});
