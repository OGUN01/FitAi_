import {
  parseTimedExercise,
  isTimedExercise,
  formatDuration,
  ParsedExerciseDuration,
} from "../../utils/exerciseDuration";

const NOT_TIMED: ParsedExerciseDuration = {
  isTimeBased: false,
  totalSeconds: 0,
  isPerSide: false,
  side1Label: "",
  side2Label: "",
};

describe("exerciseDuration", () => {
  describe("parseTimedExercise", () => {
    describe("number / non-string / empty inputs", () => {
      it("returns NOT_TIMED for number input", () => {
        // The guard `typeof reps === "number"` short-circuits before parsing.
        expect(parseTimedExercise(10)).toEqual(NOT_TIMED);
      });

      it("returns NOT_TIMED for empty string", () => {
        expect(parseTimedExercise("")).toEqual(NOT_TIMED);
      });

      it("returns NOT_TIMED for null (guard: !reps)", () => {
        // Accepting the cast because the runtime guard is `!reps`.
        expect(parseTimedExercise(null as unknown as string)).toEqual(NOT_TIMED);
      });

      it("returns NOT_TIMED for undefined (guard: !reps)", () => {
        expect(parseTimedExercise(undefined as unknown as string)).toEqual(
          NOT_TIMED
        );
      });
    });

    describe("seconds formats", () => {
      it('parses "45s" → 45 seconds, not per-side', () => {
        expect(parseTimedExercise("45s")).toEqual({
          isTimeBased: true,
          totalSeconds: 45,
          isPerSide: false,
          side1Label: "",
          side2Label: "",
        });
      });

      it('parses "45 sec" → 45 seconds', () => {
        expect(parseTimedExercise("45 sec").totalSeconds).toBe(45);
        expect(parseTimedExercise("45 sec").isTimeBased).toBe(true);
      });

      it('parses "45 seconds" → 45 seconds', () => {
        expect(parseTimedExercise("45 seconds").totalSeconds).toBe(45);
      });

      it('parses "30secs" → 30 seconds (note: no space before "secs")', () => {
        // Regex: /(\d+(?:\.\d+)?)\s*(?:s|sec|secs|second|seconds)\b/
        // \s* is zero-or-more, so "30secs" matches with secs.
        expect(parseTimedExercise("30secs").totalSeconds).toBe(30);
      });

      it("rounds decimal seconds: 12.5s → Math.round(12.5) = 13", () => {
        expect(parseTimedExercise("12.5s").totalSeconds).toBe(13);
      });
    });

    describe("minute formats", () => {
      it('parses "1 min" → 60 seconds', () => {
        expect(parseTimedExercise("1 min").totalSeconds).toBe(60);
      });

      it('parses "2 mins" → 120 seconds', () => {
        expect(parseTimedExercise("2 mins").totalSeconds).toBe(120);
      });

      it('parses "1 minute" → 60 seconds', () => {
        expect(parseTimedExercise("1 minute").totalSeconds).toBe(60);
      });

      it('parses "1.5 minutes" → Math.round(1.5 * 60) = 90 seconds', () => {
        expect(parseTimedExercise("1.5 minutes").totalSeconds).toBe(90);
      });
    });

    describe("M:SS format", () => {
      it('parses "1:30" → 90 seconds', () => {
        expect(parseTimedExercise("1:30").totalSeconds).toBe(90);
      });

      it('parses "1:05" → 65 seconds (single-digit seconds)', () => {
        expect(parseTimedExercise("1:05").totalSeconds).toBe(65);
      });

      it('parses "0:45" → 45 seconds', () => {
        expect(parseTimedExercise("0:45").totalSeconds).toBe(45);
      });
    });

    describe("per-side detection", () => {
      it('detects "45s per leg" → Left leg / Right leg', () => {
        expect(parseTimedExercise("45s per leg")).toEqual({
          isTimeBased: true,
          totalSeconds: 45,
          isPerSide: true,
          side1Label: "Left leg",
          side2Label: "Right leg",
        });
      });

      it('detects "45s each arm" → Left arm / Right arm', () => {
        const result = parseTimedExercise("45s each arm");
        expect(result.isPerSide).toBe(true);
        expect(result.side1Label).toBe("Left arm");
        expect(result.side2Label).toBe("Right arm");
      });

      it('detects "60s per foot" → Left foot / Right foot', () => {
        const result = parseTimedExercise("60s per foot");
        expect(result.isPerSide).toBe(true);
        expect(result.side1Label).toBe("Left foot");
        expect(result.side2Label).toBe("Right foot");
      });

      it('detects "60s per side" → Left side / Right side', () => {
        const result = parseTimedExercise("60s per side");
        expect(result.isPerSide).toBe(true);
        expect(result.side1Label).toBe("Left side");
        expect(result.side2Label).toBe("Right side");
      });

      it('does NOT treat "60s legs" as per-side (no "per"/"each" keyword)', () => {
        const result = parseTimedExercise("60s legs");
        expect(result.isTimeBased).toBe(true);
        expect(result.totalSeconds).toBe(60);
        expect(result.isPerSide).toBe(false);
        expect(result.side1Label).toBe("");
        expect(result.side2Label).toBe("");
      });

      it('falls back to "Side A"/"Side B" for unknown body part', () => {
        const result = parseTimedExercise("60s per unknownbodypart");
        expect(result.isPerSide).toBe(true);
        expect(result.side1Label).toBe("Side A");
        expect(result.side2Label).toBe("Side B");
      });
    });

    describe("non-time strings", () => {
      it('returns NOT_TIMED for "10 reps"', () => {
        expect(parseTimedExercise("10 reps")).toEqual(NOT_TIMED);
      });

      it('returns NOT_TIMED for "8-12" (range, no time pattern)', () => {
        expect(parseTimedExercise("8-12")).toEqual(NOT_TIMED);
      });

      it('returns NOT_TIMED for "failure"', () => {
        expect(parseTimedExercise("failure")).toEqual(NOT_TIMED);
      });
    });
  });

  describe("isTimedExercise", () => {
    it('returns true for "45s"', () => {
      expect(isTimedExercise("45s")).toBe(true);
    });

    it('returns false for "10 reps"', () => {
      expect(isTimedExercise("10 reps")).toBe(false);
    });

    it("returns false for number input (10)", () => {
      expect(isTimedExercise(10)).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isTimedExercise("")).toBe(false);
    });
  });

  describe("formatDuration", () => {
      it("formats 90 → 1:30", () => {
      expect(formatDuration(90)).toBe("1:30");
    });

    it("formats 45 → 0:45", () => {
      expect(formatDuration(45)).toBe("0:45");
    });

    it("formats 5 → 0:05 (verifies padding)", () => {
      expect(formatDuration(5)).toBe("0:05");
    });

    it("formats 0 → 0:00", () => {
      expect(formatDuration(0)).toBe("0:00");
    });

    it("formats 60 → 1:00", () => {
      expect(formatDuration(60)).toBe("1:00");
    });

    it("formats 125 → 2:05", () => {
      expect(formatDuration(125)).toBe("2:05");
    });
  });
});
