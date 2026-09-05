import { suggestNext, selectScheme } from "../../../services/progression";
import type { ProgressionContext, ProgressionSet } from "../../../services/progression/types";

function makeSets(count: number, reps: number, weight: number, completed = true): ProgressionSet[] {
  return Array.from({ length: count }, () => ({ reps, weight, setType: "normal", completed }));
}

function baseCtx(overrides: Partial<ProgressionContext> = {}): ProgressionContext {
  return {
    exerciseId: "test_exercise",
    lastSets: [],
    repRange: [8, 12],
    ...overrides,
  };
}

describe("progression registry", () => {
  describe("selectScheme", () => {
    it("an explicit override always wins", () => {
      expect(
        selectScheme({ isBodyweight: false, isTimeBased: false, override: "off" }),
      ).toBe("off");
    });

    it("time-based exercises always get the time scheme", () => {
      expect(selectScheme({ isBodyweight: false, isTimeBased: true })).toBe("time");
      // even if also flagged bodyweight — time-based takes priority
      expect(selectScheme({ isBodyweight: true, isTimeBased: true })).toBe("time");
    });

    it("bodyweight (non-time) exercises get rep_only", () => {
      expect(selectScheme({ isBodyweight: true, isTimeBased: false })).toBe("rep_only");
    });

    it("beginners on weighted exercises get linear", () => {
      expect(
        selectScheme({ isBodyweight: false, isTimeBased: false, trainingAge: "beginner" }),
      ).toBe("linear");
    });

    it("intermediate/advanced weighted exercises default to double", () => {
      expect(
        selectScheme({ isBodyweight: false, isTimeBased: false, trainingAge: "intermediate" }),
      ).toBe("double");
      expect(selectScheme({ isBodyweight: false, isTimeBased: false })).toBe("double");
    });

    it("never auto-selects greyskull_lp or off — both are opt-in only", () => {
      const params = [
        { isBodyweight: false, isTimeBased: false, trainingAge: "beginner" as const },
        { isBodyweight: false, isTimeBased: false, trainingAge: "advanced" as const },
        { isBodyweight: true, isTimeBased: false },
        { isBodyweight: false, isTimeBased: true },
      ];
      for (const p of params) {
        const scheme = selectScheme(p);
        expect(scheme).not.toBe("greyskull_lp");
        expect(scheme).not.toBe("off");
      }
    });

    // Goal binding (Workout Engine v2 Phase 5) — emphasis is optional and
    // additive; the cases above (no emphasis passed) already prove omitting
    // it preserves the exact pre-Phase-5 selection.
    it("a strength emphasis selects linear for a non-beginner weighted exercise", () => {
      expect(
        selectScheme({
          isBodyweight: false,
          isTimeBased: false,
          trainingAge: "intermediate",
          emphasis: "strength",
        }),
      ).toBe("linear");
    });

    it("a hypertrophy emphasis selects double (goalBindingService's bound default)", () => {
      expect(
        selectScheme({
          isBodyweight: false,
          isTimeBased: false,
          trainingAge: "intermediate",
          emphasis: "hypertrophy",
        }),
      ).toBe("double");
    });

    it("beginner training age wins over emphasis — novice linear progression regardless of goal", () => {
      expect(
        selectScheme({
          isBodyweight: false,
          isTimeBased: false,
          trainingAge: "beginner",
          emphasis: "hypertrophy",
        }),
      ).toBe("linear");
    });

    it("time-based and bodyweight still win over emphasis", () => {
      expect(
        selectScheme({ isBodyweight: false, isTimeBased: true, emphasis: "strength" }),
      ).toBe("time");
      expect(
        selectScheme({ isBodyweight: true, isTimeBased: false, emphasis: "strength" }),
      ).toBe("rep_only");
    });

    it("an explicit override still wins over emphasis", () => {
      expect(
        selectScheme({
          isBodyweight: false,
          isTimeBased: false,
          emphasis: "strength",
          override: "off",
        }),
      ).toBe("off");
    });
  });

  describe("linear", () => {
    it("increases by the upper-body increment when every set hits the top of the range", () => {
      const ctx = baseCtx({ lastSets: makeSets(3, 12, 60), isLowerBody: false });
      const result = suggestNext("linear", ctx);
      expect(result.action).toBe("increase");
      expect(result.suggestedWeightKg).toBe(62.5);
    });

    it("uses the lower-body increment for lower-body exercises", () => {
      const ctx = baseCtx({ lastSets: makeSets(3, 12, 100), isLowerBody: true });
      const result = suggestNext("linear", ctx);
      expect(result.suggestedWeightKg).toBe(105);
    });

    it("holds when any set misses the target", () => {
      const ctx = baseCtx({ lastSets: [...makeSets(2, 12, 60), { reps: 9, weight: 60, setType: "normal", completed: true }] });
      const result = suggestNext("linear", ctx);
      expect(result.action).toBe("hold");
      expect(result.suggestedWeightKg).toBe(60);
    });

    it("deloads to 90% after 3 consecutive missed sessions, taking priority over today's numbers", () => {
      // Even a session that DID hit every set defers to the deload once the
      // failure streak hits 3 — the streak reflects the sessions before this one.
      const ctx = baseCtx({ lastSets: makeSets(3, 12, 100), consecutiveFailures: 3 });
      const result = suggestNext("linear", ctx);
      expect(result.action).toBe("deload");
      expect(result.suggestedWeightKg).toBe(90);
    });

    it("does not deload on 2 consecutive failures — that's still a hold", () => {
      const ctx = baseCtx({ lastSets: makeSets(3, 9, 100), consecutiveFailures: 2 });
      const result = suggestNext("linear", ctx);
      expect(result.action).toBe("hold");
    });

    it("returns action 'none' with no history — never fabricates a starting weight", () => {
      const result = suggestNext("linear", baseCtx({ lastSets: [] }));
      expect(result.action).toBe("none");
      expect(result.suggestedWeightKg).toBe(0);
    });
  });

  describe("greyskull_lp", () => {
    it("increases when 2 straight sets + AMRAP all hit the target", () => {
      const ctx = baseCtx({
        repRange: [5, 5],
        lastSets: [
          { reps: 5, weight: 60, setType: "normal", completed: true },
          { reps: 5, weight: 60, setType: "normal", completed: true },
          { reps: 6, weight: 60, setType: "normal", completed: true }, // AMRAP, < 2x target
        ],
      });
      const result = suggestNext("greyskull_lp", ctx);
      expect(result.action).toBe("increase");
      expect(result.doubleJump).toBeFalsy();
      expect(result.suggestedWeightKg).toBe(62.5);
    });

    it("double-jumps when the AMRAP set doubles the target", () => {
      const ctx = baseCtx({
        repRange: [5, 5],
        lastSets: [
          { reps: 5, weight: 60, setType: "normal", completed: true },
          { reps: 5, weight: 60, setType: "normal", completed: true },
          { reps: 10, weight: 60, setType: "normal", completed: true }, // 2x target
        ],
      });
      const result = suggestNext("greyskull_lp", ctx);
      expect(result.action).toBe("increase");
      expect(result.doubleJump).toBe(true);
      expect(result.suggestedWeightKg).toBe(65);
    });

    it("deloads immediately on a single failure — no failure-streak grace", () => {
      const ctx = baseCtx({
        repRange: [5, 5],
        lastSets: [
          { reps: 5, weight: 60, setType: "normal", completed: true },
          { reps: 4, weight: 60, setType: "normal", completed: true }, // missed
          { reps: 5, weight: 60, setType: "normal", completed: true },
        ],
      });
      const result = suggestNext("greyskull_lp", ctx);
      expect(result.action).toBe("deload");
      expect(result.suggestedWeightKg).toBe(54);
    });

    it("returns action 'none' with fewer than 3 sets — cannot evaluate straight sets + AMRAP", () => {
      const ctx = baseCtx({ repRange: [5, 5], lastSets: makeSets(2, 5, 60) });
      const result = suggestNext("greyskull_lp", ctx);
      expect(result.action).toBe("none");
    });
  });

  describe("time", () => {
    it("adds 5 seconds when every set holds the full target duration", () => {
      const ctx = baseCtx({
        isTimeBased: true,
        targetDurationSec: 30,
        lastSets: makeSets(3, 30, 0),
      });
      const result = suggestNext("time", ctx);
      expect(result.action).toBe("increase");
      expect(result.suggestedDurationSec).toBe(35);
      expect(result.suggestedWeightKg).toBe(0);
    });

    it("holds the same target when any set falls short", () => {
      const ctx = baseCtx({
        isTimeBased: true,
        targetDurationSec: 30,
        lastSets: [...makeSets(2, 30, 0), { reps: 20, weight: 0, setType: "normal", completed: true }],
      });
      const result = suggestNext("time", ctx);
      expect(result.action).toBe("hold");
      expect(result.suggestedDurationSec).toBe(30);
    });

    it("preserves load on a WEIGHTED timed hold (e.g. farmer's hold) — weight isn't always 0", () => {
      const ctx = baseCtx({
        isTimeBased: true,
        targetDurationSec: 30,
        lastSets: makeSets(3, 30, 24), // 24kg farmer's hold
      });
      const result = suggestNext("time", ctx);
      expect(result.suggestedWeightKg).toBe(24);
      expect(result.suggestedDurationSec).toBe(35);
    });

    it("deloads duration by 10% after 3 consecutive missed sessions", () => {
      const ctx = baseCtx({
        isTimeBased: true,
        targetDurationSec: 30,
        consecutiveFailures: 3,
        lastSets: makeSets(3, 30, 0),
      });
      const result = suggestNext("time", ctx);
      expect(result.action).toBe("deload");
      expect(result.suggestedDurationSec).toBe(27);
    });
  });

  describe("rep_only", () => {
    it("climbs the rep target by 1 when every set hits the top of the range", () => {
      const ctx = baseCtx({ isBodyweight: true, repRange: [8, 15], lastSets: makeSets(3, 15, 0) });
      const result = suggestNext("rep_only", ctx);
      expect(result.action).toBe("increase");
      expect(result.suggestedReps).toBe(16);
      expect(result.suggestedWeightKg).toBe(0);
    });

    it("hints at added load or a harder variation once the ceiling is reached", () => {
      const ctx = baseCtx({ isBodyweight: true, repRange: [8, 20], lastSets: makeSets(3, 20, 0) });
      const result = suggestNext("rep_only", ctx);
      expect(result.action).toBe("increase");
      expect(result.reason).toMatch(/harder variation|added load/);
    });

    it("holds the same target when reps aren't all at the top", () => {
      const ctx = baseCtx({ isBodyweight: true, repRange: [8, 15], lastSets: makeSets(3, 12, 0) });
      const result = suggestNext("rep_only", ctx);
      expect(result.action).toBe("hold");
      expect(result.suggestedReps).toBe(15);
    });
  });

  describe("off", () => {
    it("always holds at the last known weight regardless of performance", () => {
      const ctx = baseCtx({ lastSets: makeSets(3, 20, 999) });
      const result = suggestNext("off", ctx);
      expect(result.action).toBe("hold");
      expect(result.suggestedWeightKg).toBe(999);
    });

    it("returns 0 with no history rather than fabricating a weight", () => {
      const result = suggestNext("off", baseCtx());
      expect(result.suggestedWeightKg).toBe(0);
    });
  });

  describe("double (wraps progressionService.suggestNextWeight)", () => {
    it("matches progressionService's own double-progression behavior exactly", () => {
      const ctx = baseCtx({ lastSets: makeSets(3, 12, 60), isLowerBody: false, isBodyweight: false });
      const result = suggestNext("double", ctx);
      expect(result.scheme).toBe("double");
      expect(result.action).toBe("increase");
      expect(result.suggestedWeightKg).toBe(62.5);
    });
  });
});
