/**
 * workoutAdapters.test.ts — Phase 11 QA (Part C, deliverable 11).
 *
 * Unit tests for the PlannedExercise boundary adapters in
 * `src/types/workout.ts`:
 *   - toWorkoutSet       (PlannedExercise → WorkoutSet, session execution)
 *   - toTemplateExercise (PlannedExercise → TemplateExercise, template save)
 *   - fromTemplateExercise (TemplateExercise → PlannedExercise, builder load)
 *   - toAiExercise        (PlannedExercise → AI WorkoutExercise, re-generation)
 *
 * Round-trip (fromTemplateExercise → toTemplateExercise) is asserted to
 * preserve the data shape. Pure functions — no mocks required.
 */
import {
  toWorkoutSet,
  toTemplateExercise,
  fromTemplateExercise,
  toAiExercise,
  type PlannedExercise,
  type PlannedSet,
} from "../../types/workout";
import type { TemplateExercise } from "../../services/workoutTemplateService";

// ----------------------------------------------------------------------------
// HELPERS — build a PlannedExercise with sensible defaults
// ----------------------------------------------------------------------------

function makeSet(overrides: Partial<PlannedSet> = {}): PlannedSet {
  return {
    setNumber: overrides.setNumber ?? 1,
    reps: overrides.reps ?? 10,
    weightKg: overrides.weightKg ?? 60,
    setType: overrides.setType ?? "normal",
    dropWeightKg: overrides.dropWeightKg,
    dropReps: overrides.dropReps,
    durationSeconds: overrides.durationSeconds,
  };
}

function makePlanned(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    exerciseId: overrides.exerciseId ?? "bench_press",
    name: overrides.name ?? "Bench Press",
    sets: overrides.sets ?? [makeSet({ setNumber: 1 }), makeSet({ setNumber: 2 }), makeSet({ setNumber: 3 })],
    restSeconds: overrides.restSeconds ?? 90,
    notes: overrides.notes,
    tempo: overrides.tempo ?? "3-1-2-0",
    targetRpe: overrides.targetRpe ?? 7,
    supersetId: overrides.supersetId,
    circuitId: overrides.circuitId,
    blockIndex: overrides.blockIndex,
    alternativeExerciseId: overrides.alternativeExerciseId,
  };
}

// ----------------------------------------------------------------------------
// toWorkoutSet
// ----------------------------------------------------------------------------

describe("toWorkoutSet", () => {
  it("sets count = sets.length", () => {
    const planned = makePlanned({
      sets: [makeSet({ setNumber: 1 }), makeSet({ setNumber: 2 }), makeSet({ setNumber: 3 }), makeSet({ setNumber: 4 })],
    });
    expect(toWorkoutSet(planned).sets).toBe(4);
  });

  it("aggregates reps as a single value when all sets share the same reps (number)", () => {
    const planned = makePlanned({
      sets: [
        makeSet({ setNumber: 1, reps: 10 }),
        makeSet({ setNumber: 2, reps: 10 }),
      ],
    });
    expect(toWorkoutSet(planned).reps).toBe(10);
  });

  it("aggregates reps as a single value when all sets share the same reps (range string)", () => {
    const planned = makePlanned({
      sets: [
        makeSet({ setNumber: 1, reps: "8-12" }),
        makeSet({ setNumber: 2, reps: "8-12" }),
      ],
    });
    expect(toWorkoutSet(planned).reps).toBe("8-12");
  });

  it("joins reps with commas when sets differ", () => {
    const planned = makePlanned({
      sets: [
        makeSet({ setNumber: 1, reps: 10 }),
        makeSet({ setNumber: 2, reps: 8 }),
        makeSet({ setNumber: 3, reps: 6 }),
      ],
    });
    expect(toWorkoutSet(planned).reps).toBe("10,8,6");
  });

  it("maps weight + duration from the first set", () => {
    const planned = makePlanned({
      sets: [
        makeSet({ setNumber: 1, weightKg: 80, durationSeconds: 30 }),
        makeSet({ setNumber: 2, weightKg: 80, durationSeconds: 30 }),
      ],
    });
    const result = toWorkoutSet(planned);
    expect(result.weight).toBe(80);
    expect(result.duration).toBe(30);
  });

  it("maps restTime, tempo, rpe, notes, name from the planned exercise", () => {
    const planned = makePlanned({
      name: "Overhead Press",
      restSeconds: 120,
      tempo: "2-0-2-0",
      targetRpe: 8,
      notes: "Keep core tight",
    });
    const result = toWorkoutSet(planned);
    expect(result.restTime).toBe(120);
    expect(result.tempo).toBe("2-0-2-0");
    expect(result.rpe).toBe(8);
    expect(result.notes).toBe("Keep core tight");
    expect(result.name).toBe("Overhead Press");
    expect(result.exerciseName).toBe("Overhead Press");
  });

  it("handles a single-set exercise", () => {
    const planned = makePlanned({
      sets: [makeSet({ setNumber: 1, reps: 12, weightKg: 50 })],
    });
    const result = toWorkoutSet(planned);
    expect(result.sets).toBe(1);
    expect(result.reps).toBe(12);
    expect(result.weight).toBe(50);
  });
});

// ----------------------------------------------------------------------------
// toTemplateExercise
// ----------------------------------------------------------------------------

describe("toTemplateExercise", () => {
  it("sets count = sets.length", () => {
    const planned = makePlanned({
      sets: [makeSet(), makeSet({ setNumber: 2 }), makeSet({ setNumber: 3 })],
    });
    expect(toTemplateExercise(planned).sets).toBe(3);
  });

  it("parses a reps range string into [low, high]", () => {
    const planned = makePlanned({
      sets: [makeSet({ setNumber: 1, reps: "8-12" })],
    });
    expect(toTemplateExercise(planned).repRange).toEqual([8, 12]);
  });

  it("parses a reps range string with spaces", () => {
    const planned = makePlanned({
      sets: [makeSet({ setNumber: 1, reps: "8 - 12" })],
    });
    expect(toTemplateExercise(planned).repRange).toEqual([8, 12]);
  });

  it("parses a numeric reps value into [n, n]", () => {
    const planned = makePlanned({
      sets: [makeSet({ setNumber: 1, reps: 5 })],
    });
    expect(toTemplateExercise(planned).repRange).toEqual([5, 5]);
  });

  it("falls back to [8, 12] when reps is an unparseable string", () => {
    const planned = makePlanned({
      sets: [makeSet({ setNumber: 1, reps: "failure" as unknown as number })],
    });
    // parseRepRange returns [8,12] for any non-"a-b" string.
    expect(toTemplateExercise(planned).repRange).toEqual([8, 12]);
  });

  it("falls back to [8, 12] when reps is missing (firstSet?.reps ?? 8 → 8; then [8,12])", () => {
    // Build a PlannedSet with NO reps field (bypass makeSet's `reps ?? 10` default).
    const setNoReps: PlannedSet = {
      setNumber: 1,
      weightKg: 60,
      setType: "normal",
    };
    const planned = makePlanned({ sets: [setNoReps] });
    // toTemplateExercise: `firstReps = planned.sets[0]?.reps` → undefined;
    // `typeof undefined === "string"` is false → `[undefined ?? 8, undefined ?? 12]` = [8, 12].
    expect(toTemplateExercise(planned).repRange).toEqual([8, 12]);
  });

  it("maps restSeconds + targetWeightKg", () => {
    const planned = makePlanned({
      restSeconds: 60,
      sets: [makeSet({ setNumber: 1, weightKg: 100 })],
    });
    const result = toTemplateExercise(planned);
    expect(result.restSeconds).toBe(60);
    expect(result.targetWeightKg).toBe(100);
  });

  it("maps exerciseId + name", () => {
    const planned = makePlanned({ exerciseId: "squat", name: "Squat" });
    const result = toTemplateExercise(planned);
    expect(result.exerciseId).toBe("squat");
    expect(result.name).toBe("Squat");
  });
});

// ----------------------------------------------------------------------------
// fromTemplateExercise
// ----------------------------------------------------------------------------

describe("fromTemplateExercise", () => {
  it("generates PlannedSet[] with the correct count", () => {
    const template: TemplateExercise = {
      exerciseId: "deadlift",
      name: "Deadlift",
      sets: 5,
      repRange: [3, 5],
      restSeconds: 180,
      targetWeightKg: 140,
    };
    const planned = fromTemplateExercise(template);
    expect(planned.sets).toHaveLength(5);
    expect(planned.sets.map((s) => s.setNumber)).toEqual([1, 2, 3, 4, 5]);
  });

  it("uses a range string when low !== high", () => {
    const template: TemplateExercise = {
      exerciseId: "bench_press",
      name: "Bench Press",
      sets: 3,
      repRange: [8, 12],
      restSeconds: 90,
      targetWeightKg: 60,
    };
    const planned = fromTemplateExercise(template);
    planned.sets.forEach((s) => {
      expect(s.reps).toBe("8-12");
    });
  });

  it("uses a numeric rep value when low === high", () => {
    const template: TemplateExercise = {
      exerciseId: "ohp",
      name: "Overhead Press",
      sets: 4,
      repRange: [5, 5],
      restSeconds: 120,
      targetWeightKg: 40,
    };
    const planned = fromTemplateExercise(template);
    planned.sets.forEach((s) => {
      expect(s.reps).toBe(5);
    });
  });

  it("sets all sets to 'normal' type", () => {
    const template: TemplateExercise = {
      exerciseId: "row",
      name: "Row",
      sets: 3,
      repRange: [10, 10],
      restSeconds: 60,
      targetWeightKg: 50,
    };
    const planned = fromTemplateExercise(template);
    planned.sets.forEach((s) => {
      expect(s.setType).toBe("normal");
    });
  });

  it("maps weightKg from targetWeightKg", () => {
    const template: TemplateExercise = {
      exerciseId: "curl",
      name: "Curl",
      sets: 3,
      repRange: [10, 12],
      restSeconds: 45,
      targetWeightKg: 20,
    };
    const planned = fromTemplateExercise(template);
    planned.sets.forEach((s) => {
      expect(s.weightKg).toBe(20);
    });
  });

  it("handles undefined targetWeightKg", () => {
    const template: TemplateExercise = {
      exerciseId: "pushup",
      name: "Push-Up",
      sets: 3,
      repRange: [15, 20],
      restSeconds: 60,
    };
    const planned = fromTemplateExercise(template);
    planned.sets.forEach((s) => {
      expect(s.weightKg).toBeUndefined();
    });
  });
});

// ----------------------------------------------------------------------------
// toAiExercise
// ----------------------------------------------------------------------------

describe("toAiExercise", () => {
  it("maps sets count, first reps, restSeconds, notes, tempo", () => {
    const planned = makePlanned({
      exerciseId: "squat",
      sets: [
        makeSet({ setNumber: 1, reps: 5 }),
        makeSet({ setNumber: 2, reps: 5 }),
        makeSet({ setNumber: 3, reps: 5 }),
      ],
      restSeconds: 180,
      notes: "Brace hard",
      tempo: "2-1-2-0",
    });
    const result = toAiExercise(planned);
    expect(result.exerciseId).toBe("squat");
    expect(result.sets).toBe(3);
    expect(result.reps).toBe(5);
    expect(result.restSeconds).toBe(180);
    expect(result.notes).toBe("Brace hard");
    expect(result.tempo).toBe("2-1-2-0");
  });

  it("falls back to reps=8 when sets is empty", () => {
    const planned = makePlanned({ sets: [] });
    const result = toAiExercise(planned);
    expect(result.sets).toBe(0);
    expect(result.reps).toBe(8);
  });

  it("preserves a range-string reps value", () => {
    const planned = makePlanned({
      sets: [makeSet({ setNumber: 1, reps: "8-12" })],
    });
    expect(toAiExercise(planned).reps).toBe("8-12");
  });

  it("copies notes/tempo from the planned exercise (faithful pass-through)", () => {
    const planned = makePlanned({ notes: "Brace hard", tempo: "2-1-2-0" });
    const result = toAiExercise(planned);
    expect(result.notes).toBe("Brace hard");
    expect(result.tempo).toBe("2-1-2-0");
  });

  it("returns undefined notes/tempo when the planned exercise omits them", () => {
    // Build a planned exercise without notes/tempo (bypass the helper default).
    const planned: PlannedExercise = {
      exerciseId: "squat",
      name: "Squat",
      sets: [makeSet({ setNumber: 1, reps: 5 })],
      restSeconds: 120,
    };
    const result = toAiExercise(planned);
    expect(result.notes).toBeUndefined();
    expect(result.tempo).toBeUndefined();
  });
});

// ----------------------------------------------------------------------------
// ROUND-TRIP — fromTemplateExercise → toTemplateExercise preserves data
// ----------------------------------------------------------------------------

describe("round-trip: fromTemplateExercise → toTemplateExercise", () => {
  it("preserves exerciseId, name, sets, restSeconds for a range template", () => {
    const original: TemplateExercise = {
      exerciseId: "bench_press",
      name: "Bench Press",
      sets: 4,
      repRange: [6, 8],
      restSeconds: 120,
      targetWeightKg: 80,
    };
    const planned = fromTemplateExercise(original);
    const result = toTemplateExercise(planned);
    expect(result.exerciseId).toBe(original.exerciseId);
    expect(result.name).toBe(original.name);
    expect(result.sets).toBe(original.sets);
    expect(result.restSeconds).toBe(original.restSeconds);
    expect(result.targetWeightKg).toBe(original.targetWeightKg);
    // repRange round-trips: [6,8] → "6-8" → [6,8]
    expect(result.repRange).toEqual([6, 8]);
  });

  it("preserves a fixed-rep template (low === high)", () => {
    const original: TemplateExercise = {
      exerciseId: "deadlift",
      name: "Deadlift",
      sets: 3,
      repRange: [5, 5],
      restSeconds: 240,
      targetWeightKg: 150,
    };
    const planned = fromTemplateExercise(original);
    const result = toTemplateExercise(planned);
    expect(result.sets).toBe(3);
    expect(result.repRange).toEqual([5, 5]);
    expect(result.restSeconds).toBe(240);
    expect(result.targetWeightKg).toBe(150);
  });

  it("preserves a template without a target weight", () => {
    const original: TemplateExercise = {
      exerciseId: "pushup",
      name: "Push-Up",
      sets: 3,
      repRange: [12, 15],
      restSeconds: 60,
    };
    const planned = fromTemplateExercise(original);
    const result = toTemplateExercise(planned);
    expect(result.targetWeightKg).toBeUndefined();
    expect(result.repRange).toEqual([12, 15]);
  });
});
