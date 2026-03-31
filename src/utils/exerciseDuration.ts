/**
 * exerciseDuration.ts
 *
 * Single source of truth for parsing time-based exercise reps strings.
 * Used by ExerciseSessionModal (timer display), WorkoutSessionScreen (skip logging),
 * SetLogModal (PR guard), and future components.
 */

export interface ParsedExerciseDuration {
  /** True if this exercise is time-based (any timing pattern detected). */
  isTimeBased: boolean;
  /** Duration in seconds per phase (per side, or total if not per-side). */
  totalSeconds: number;
  /**
   * True only if the string explicitly contains "per <bodypart>" or "each <bodypart>".
   * "45s per leg" → true.  "60s legs" → false (both legs simultaneously).
   */
  isPerSide: boolean;
  /** Display label for the first side. Empty string if not per-side. */
  side1Label: string;
  /** Display label for the second side. Empty string if not per-side. */
  side2Label: string;
}

const NOT_TIMED: ParsedExerciseDuration = {
  isTimeBased: false,
  totalSeconds: 0,
  isPerSide: false,
  side1Label: "",
  side2Label: "",
};

/**
 * Map from body-part keyword (singular) to [left label, right label].
 * Extend this as new exercise patterns appear.
 */
const BODY_PART_LABELS: Record<string, [string, string]> = {
  leg: ["Left leg", "Right leg"],
  legs: ["Left leg", "Right leg"],
  arm: ["Left arm", "Right arm"],
  arms: ["Left arm", "Right arm"],
  hand: ["Left hand", "Right hand"],
  hands: ["Left hand", "Right hand"],
  foot: ["Left foot", "Right foot"],
  feet: ["Left foot", "Right foot"],
  side: ["Left side", "Right side"],
};

/**
 * Parse a seconds value from common time strings.
 * Handles: "45s", "45 sec", "45 seconds", "1:30", "1 min", "2 mins", "1 minute"
 * Returns 0 if no time pattern found.
 */
function parseSeconds(raw: string): number {
  const s = raw.trim().toLowerCase();

  // "1:30" or "1:05" format → minutes:seconds
  const colonMatch = s.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    return parseInt(colonMatch[1], 10) * 60 + parseInt(colonMatch[2], 10);
  }

  // "X min(s)/minute(s)" → X * 60
  const minuteMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)/);
  if (minuteMatch) {
    return Math.round(parseFloat(minuteMatch[1]) * 60);
  }

  // "Xs" / "X sec" / "X secs" / "X second(s)"
  const secondMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/);
  if (secondMatch) {
    return Math.round(parseFloat(secondMatch[1]));
  }

  return 0;
}

/**
 * Detect if the reps string contains "per <bodypart>" or "each <bodypart>"
 * — the explicit signal that the duration applies to each side separately.
 *
 * NOTE: mere presence of a body part word (e.g. "60s legs") is NOT per-side.
 * Only "per" or "each" qualifies.
 */
function detectPerSide(s: string): { found: boolean; side1: string; side2: string } {
  const lower = s.toLowerCase();

  // Match: "per <word>" or "each <word>"
  const perMatch = lower.match(/\b(?:per|each)\s+(\w+)/);
  if (!perMatch) {
    return { found: false, side1: "", side2: "" };
  }

  const keyword = perMatch[1].toLowerCase();
  const labels = BODY_PART_LABELS[keyword];

  if (labels) {
    return { found: true, side1: labels[0], side2: labels[1] };
  }

  // Unknown body part after "per/each" — use safe fallback
  return { found: true, side1: "Side A", side2: "Side B" };
}

/**
 * Main parser. Call with the raw `reps` value from the AI plan.
 *
 * @example
 * parseTimedExercise("45s per leg")
 * → { isTimeBased: true, totalSeconds: 45, isPerSide: true, side1Label: "Left leg", side2Label: "Right leg" }
 *
 * parseTimedExercise("60s")
 * → { isTimeBased: true, totalSeconds: 60, isPerSide: false, side1Label: "", side2Label: "" }
 *
 * parseTimedExercise("60s legs")
 * → { isTimeBased: true, totalSeconds: 60, isPerSide: false, ... }  // both legs together
 *
 * parseTimedExercise("10 reps")
 * → { isTimeBased: false, ... }
 */
export function parseTimedExercise(reps: number | string): ParsedExerciseDuration {
  if (typeof reps === "number" || !reps) return NOT_TIMED;

  const raw = String(reps);
  const totalSeconds = parseSeconds(raw);

  if (totalSeconds <= 0) return NOT_TIMED;

  const { found, side1, side2 } = detectPerSide(raw);

  return {
    isTimeBased: true,
    totalSeconds,
    isPerSide: found,
    side1Label: found ? side1 : "",
    side2Label: found ? side2 : "",
  };
}

/**
 * Convenience: returns true for any timed exercise (no side info needed).
 * Drop-in replacement / complement to the old isTimeHold() in SetLogModal.
 */
export function isTimedExercise(reps: number | string): boolean {
  return parseTimedExercise(reps).isTimeBased;
}

/**
 * Format seconds as M:SS display string.
 * 90 → "1:30", 45 → "0:45", 5 → "0:05"
 */
export function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
