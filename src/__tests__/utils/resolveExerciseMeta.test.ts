import {
  resolveExerciseMeta,
  deriveExerciseClassification,
} from "../../utils/resolveExerciseMeta";

// Real ExerciseDB (exercisedb.dev) hash IDs — the majority of AI-generated
// plan exercises use this ID space, distinct from the ~60 legacy curated
// snake_case IDs (e.g. "push_up", "squat"). deriveExerciseClassification
// must resolve both correctly; this file guards the fix for D2/D3
// (progressionService/warmupService misclassifying hash IDs).
const BARBELL_SQUAT_HASH_ID = "qXTaZnJ"; // "barbell full squat" — barbell, glutes/quads/hamstrings/calves
const BENCH_PRESS_HASH_ID = "EIeI8Vf"; // "barbell bench press" — barbell, pectorals/triceps/shoulders
const PUSH_UP_HASH_ID = "I4hDWkc"; // "push-up" — body weight
const PLANK_HASH_ID = "CosupLu"; // "front plank with twist" — body weight, name-matches "plank"

describe("deriveExerciseClassification", () => {
  it("returns all-false defaults for an undefined exerciseId", () => {
    expect(deriveExerciseClassification(undefined)).toEqual({
      isBodyweight: false,
      isTimeBased: false,
      isLowerBody: false,
    });
  });

  it("returns all-false defaults for an unresolvable exerciseId", () => {
    const result = deriveExerciseClassification("not-a-real-id-xyz");
    expect(result).toEqual({
      isBodyweight: false,
      isTimeBased: false,
      isLowerBody: false,
    });
  });

  describe("ExerciseDB hash IDs (AI-generated plans)", () => {
    it("classifies a barbell squat as lower-body and weighted", () => {
      const result = deriveExerciseClassification(BARBELL_SQUAT_HASH_ID);
      expect(result.isBodyweight).toBe(false);
      expect(result.isLowerBody).toBe(true);
      expect(result.isTimeBased).toBe(false);
    });

    it("classifies a barbell bench press as upper-body and weighted", () => {
      const result = deriveExerciseClassification(BENCH_PRESS_HASH_ID);
      expect(result.isBodyweight).toBe(false);
      expect(result.isLowerBody).toBe(false);
      expect(result.isTimeBased).toBe(false);
    });

    it("classifies a hash-ID push-up as bodyweight — the pre-fix bug this guards against", () => {
      // Before this fix, progressionService.isBodyweightExercise("I4hDWkc")
      // would return false (only "push_up" was recognized), so a hash-ID
      // push-up would be treated as a weighted upper-body lift.
      const result = deriveExerciseClassification(PUSH_UP_HASH_ID);
      expect(result.isBodyweight).toBe(true);
    });

    it("classifies a hash-ID plank variant as time-based via its display name", () => {
      const result = deriveExerciseClassification(PLANK_HASH_ID);
      expect(result.isTimeBased).toBe(true);
    });
  });

  describe("legacy curated snake_case IDs", () => {
    it("uses the curated exercise's authoritative flags for bodyweight/lower/time-based", () => {
      expect(deriveExerciseClassification("push_up")).toEqual({
        isBodyweight: true,
        isTimeBased: false,
        isLowerBody: false,
      });
      expect(deriveExerciseClassification("squat")).toEqual({
        isBodyweight: true,
        isTimeBased: false,
        isLowerBody: true,
      });
      expect(deriveExerciseClassification("plank")).toEqual({
        isBodyweight: true,
        isTimeBased: true,
        isLowerBody: false,
      });
    });
  });
});

describe("resolveExerciseMeta muscle vocab coverage", () => {
  it("maps a calves/quads-targeting hash-ID exercise to real muscle groups (previously silent)", () => {
    const result = resolveExerciseMeta(BARBELL_SQUAT_HASH_ID);
    expect(result.muscleGroups).toEqual(
      expect.arrayContaining(["quadriceps", "glutes", "hamstrings", "calves"]),
    );
  });
});
