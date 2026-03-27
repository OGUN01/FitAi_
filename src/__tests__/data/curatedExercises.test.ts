import {
  getCuratedExercises,
  CURATED_EXERCISES,
  CuratedExercise,
} from "../../data/curatedExercises";
import { EXERCISES } from "../../data/exercises";

describe("curatedExercises", () => {
  describe("CURATED_EXERCISES", () => {
    it("has at least 60 exercises", () => {
      expect(CURATED_EXERCISES.length).toBeGreaterThanOrEqual(60);
    });

    it("includes all 18 original exercises from exercises.ts", () => {
      const originalIds = EXERCISES.map((e) => e.id);
      const curatedIds = CURATED_EXERCISES.map((e) => e.id);
      for (const id of originalIds) {
        expect(curatedIds).toContain(id);
      }
    });

    it("every exercise has required fields", () => {
      for (const ex of CURATED_EXERCISES) {
        expect(ex.id).toBeTruthy();
        expect(ex.name).toBeTruthy();
        expect(ex.muscleGroups.length).toBeGreaterThan(0);
        expect(ex.equipment.length).toBeGreaterThan(0);
        expect(ex.location.length).toBeGreaterThan(0);
        expect(typeof ex.isBodyweight).toBe("boolean");
        expect(typeof ex.isTimeBased).toBe("boolean");
        expect(["beginner", "intermediate", "advanced"]).toContain(
          ex.difficulty,
        );
        expect([
          "chest",
          "back",
          "shoulders",
          "arms",
          "legs",
          "core",
          "cardio",
          "full_body",
        ]).toContain(ex.category);
      }
    });

    it("has no duplicate IDs", () => {
      const ids = CURATED_EXERCISES.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("getCuratedExercises", () => {
    it("filters by body_weight + home — returns only home exercises", () => {
      const result = getCuratedExercises(["body weight"], "home");
      expect(result.length).toBeGreaterThan(0);
      for (const ex of result) {
        expect(ex.location).toContain("home");
        expect(ex.equipment).toContain("body weight");
      }
    });

    it("filters by barbell + gym — returns gym exercises with barbell", () => {
      const result = getCuratedExercises(["barbell"], "gym");
      expect(result.length).toBeGreaterThan(0);
      for (const ex of result) {
        expect(ex.location).toContain("gym");
        expect(ex.equipment).toContain("barbell");
      }
    });

    it('location "any" returns all matching equipment', () => {
      const homeOnly = getCuratedExercises(["body weight"], "home");
      const gymOnly = getCuratedExercises(["body weight"], "gym");
      const anyLocation = getCuratedExercises(["body weight"], "any");
      expect(anyLocation.length).toBeGreaterThanOrEqual(homeOnly.length);
      expect(anyLocation.length).toBeGreaterThanOrEqual(gymOnly.length);
    });

    it("returns empty array for non-existent equipment", () => {
      const result = getCuratedExercises(["unicorn_equipment"], "any");
      expect(result).toEqual([]);
    });

    it("filters by multiple equipment types", () => {
      const result = getCuratedExercises(["dumbbell", "barbell"], "gym");
      expect(result.length).toBeGreaterThan(0);
      for (const ex of result) {
        const hasMatch =
          ex.equipment.includes("dumbbell") || ex.equipment.includes("barbell");
        expect(hasMatch).toBe(true);
      }
    });
  });
});
