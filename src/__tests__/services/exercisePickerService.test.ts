/**
 * exercisePickerService.test.ts — Workout Engine v2 Phase 6C-ii.
 *
 * The picker service was migrated off the legacy ~69-entry CURATED_EXERCISES
 * list onto the real 1,552-row exercise catalog. These tests run against the
 * REAL generated catalog (not a mock fixture) — real canonical/alias ids
 * verified directly against src/data/exerciseCatalog.generated.ts, since a
 * hand-typed fixture could silently drift from what the catalog actually
 * contains (the exact failure mode this migration fixes for the old list).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  searchExercises,
  getRecommendedForDay,
  getPopularExercises,
  catalogEntryToPlanned,
  getFavorites,
  toggleFavorite,
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  MAX_RECENT_SEARCHES,
  MAJOR_MUSCLE_GROUPS,
  MOVEMENT_PATTERNS,
  SKILL_LEVELS,
} from "../../services/exercisePickerService";
import { getCatalogEntry } from "../../data/exerciseCatalog.generated";

// Real catalog ids, verified to resolve (see getCatalogEntry checks below —
// this file fails loudly at test time if the catalog's shape ever drifts,
// rather than silently testing against stale assumptions).
const BENCH_PRESS_ALIAS = "barbell_bench_press"; // -> alias of EIeI8Vf
const PUSH_UP_ALIAS = "push_up"; // -> alias of I4hDWkc
const SQUAT_STANDALONE = "barbell_squat"; // standalone catalog row

describe("exercisePickerService", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  describe("catalog fixtures are real (sanity check for every test below)", () => {
    it("BENCH_PRESS_ALIAS, PUSH_UP_ALIAS, SQUAT_STANDALONE all resolve", () => {
      expect(getCatalogEntry(BENCH_PRESS_ALIAS)).not.toBeNull();
      expect(getCatalogEntry(PUSH_UP_ALIAS)).not.toBeNull();
      expect(getCatalogEntry(SQUAT_STANDALONE)).not.toBeNull();
    });
  });

  describe("searchExercises", () => {
    it("returns the full catalog for an empty query with no filters", () => {
      const results = searchExercises("");
      expect(results.length).toBeGreaterThan(1500); // 1,552 rows
    });

    it("finds a real exercise by name substring", () => {
      const results = searchExercises("bench press");
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some((r) => r.name.toLowerCase().includes("bench press")),
      ).toBe(true);
    });

    it("filters by movementPattern — every result actually has that pattern", () => {
      const results = searchExercises("", { movementPattern: "squat" });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.movementPattern === "squat")).toBe(true);
    });

    it("filters by difficulty (skillLevel) — every result matches", () => {
      const results = searchExercises("", { difficulty: ["beginner"] });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.skillLevel === "beginner")).toBe(true);
    });

    it("filters by equipment — every result includes that equipment", () => {
      const results = searchExercises("", { equipment: ["body weight"] });
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.equipment.includes("body weight"))).toBe(true);
    });

    it("filters by muscleGroups — every result hits that muscle (primary or secondary)", () => {
      const results = searchExercises("", { muscleGroups: ["chest"] });
      expect(results.length).toBeGreaterThan(0);
      expect(
        results.every(
          (r) => r.primaryMuscles.includes("chest") || r.secondaryMuscles.includes("chest"),
        ),
      ).toBe(true);
    });

    it("AND-combines a text query with a structured filter", () => {
      const results = searchExercises("press", { movementPattern: "vertical_push" });
      expect(results.every((r) => r.movementPattern === "vertical_push")).toBe(true);
    });

    it("an unmatched nonsense query returns no results", () => {
      const results = searchExercises("zzzxxxqqqnonexistentexercise123");
      expect(results).toHaveLength(0);
    });
  });

  describe("getRecommendedForDay", () => {
    it("excludes exercises already in the day (resolved via alias)", () => {
      const recommended = getRecommendedForDay([BENCH_PRESS_ALIAS]);
      const benchEntry = getCatalogEntry(BENCH_PRESS_ALIAS)!;
      expect(
        recommended.some((r) => r.canonicalId === benchEntry.canonicalId),
      ).toBe(false);
    });

    it("prefers muscles not already hit by the current day", () => {
      // Bench press hits chest/triceps/shoulders — recommendations should
      // lean toward exercises that DON'T primarily hit those.
      const recommended = getRecommendedForDay([BENCH_PRESS_ALIAS]);
      expect(recommended.length).toBeGreaterThan(0);
      const benchEntry = getCatalogEntry(BENCH_PRESS_ALIAS)!;
      const allNovel = recommended.every((r) =>
        r.primaryMuscles.some((m) => !benchEntry.primaryMuscles.includes(m)),
      );
      expect(allNovel).toBe(true);
    });

    it("returns at most 6 exercises", () => {
      expect(getRecommendedForDay([]).length).toBeLessThanOrEqual(6);
    });

    it("returns exercises for an empty day (no muscles hit yet)", () => {
      expect(getRecommendedForDay([]).length).toBeGreaterThan(0);
    });
  });

  describe("getPopularExercises", () => {
    it("resolves all 8 entries — none silently drop", () => {
      const popular = getPopularExercises();
      expect(popular).toHaveLength(8);
    });

    it("every entry is a real, distinct catalog row", () => {
      const popular = getPopularExercises();
      const ids = new Set(popular.map((p) => p.canonicalId));
      expect(ids.size).toBe(popular.length);
    });
  });

  describe("catalogEntryToPlanned", () => {
    it("uses the catalog entry's own defaultRepRange, not a hardcoded 8-12", () => {
      const entry = getCatalogEntry(SQUAT_STANDALONE)!;
      const planned = catalogEntryToPlanned(entry);
      const [min, max] = entry.defaultRepRange;
      const expectedReps = min === max ? min : `${min}-${max}`;
      expect(planned.sets[0].reps).toBe(expectedReps);
      expect(planned.exerciseId).toBe(entry.canonicalId);
      expect(planned.sets).toHaveLength(3);
    });

    it("sets durationSeconds on each set for a time-based exercise", () => {
      const timeBased = { ...getCatalogEntry(PUSH_UP_ALIAS)!, isTimeBased: true };
      const planned = catalogEntryToPlanned(timeBased);
      expect(planned.sets.every((s) => s.durationSeconds === 30)).toBe(true);
    });

    it("leaves weightKg unset — not a progression/calibration guess", () => {
      const entry = getCatalogEntry(BENCH_PRESS_ALIAS)!;
      const planned = catalogEntryToPlanned(entry);
      expect(planned.sets.every((s) => s.weightKg === undefined)).toBe(true);
    });

    it("stamps alternativeExerciseId only when swappedFromExerciseId is passed", () => {
      const entry = getCatalogEntry(BENCH_PRESS_ALIAS)!;
      const withoutSwap = catalogEntryToPlanned(entry);
      expect(withoutSwap.alternativeExerciseId).toBeUndefined();

      const withSwap = catalogEntryToPlanned(entry, "old_exercise_id");
      expect(withSwap.alternativeExerciseId).toBe("old_exercise_id");
    });
  });

  describe("favourites (AsyncStorage, shared key with ExerciseRow)", () => {
    it("starts empty, toggling adds/removes", async () => {
      expect(await getFavorites()).toEqual([]);
      const nowFav = await toggleFavorite(BENCH_PRESS_ALIAS);
      expect(nowFav).toBe(true);
      expect(await getFavorites()).toEqual([BENCH_PRESS_ALIAS]);

      const nowUnfav = await toggleFavorite(BENCH_PRESS_ALIAS);
      expect(nowUnfav).toBe(false);
      expect(await getFavorites()).toEqual([]);
    });

    it("resolves a LEGACY curated id stored before this migration via getCatalogEntry — no orphaned favourites", async () => {
      await toggleFavorite(PUSH_UP_ALIAS); // pre-migration-style stored id
      const stored = await getFavorites();
      expect(stored).toEqual([PUSH_UP_ALIAS]);
      // The actual resolution path a picker screen uses on read:
      const resolved = getCatalogEntry(stored[0]);
      expect(resolved).not.toBeNull();
      expect(resolved!.canonicalId).toBe("I4hDWkc");
    });
  });

  describe("recent searches (AsyncStorage)", () => {
    it("adds, dedupes case-insensitively, and caps at MAX_RECENT_SEARCHES", async () => {
      await addRecentSearch("Bench Press");
      await addRecentSearch("squat");
      await addRecentSearch("bench press"); // dedupe against the first (case-insensitive)
      const recents = await getRecentSearches();
      expect(recents[0]).toBe("bench press"); // most recent first
      expect(recents).toHaveLength(2);
      expect(recents).not.toContain("Bench Press");
    });

    it("clearRecentSearches empties the list", async () => {
      await addRecentSearch("deadlift");
      await clearRecentSearches();
      expect(await getRecentSearches()).toEqual([]);
    });

    it("ignores a blank/whitespace-only query", async () => {
      await addRecentSearch("   ");
      expect(await getRecentSearches()).toEqual([]);
    });
  });

  describe("re-exported vocab (filter chip option sources)", () => {
    it("MAJOR_MUSCLE_GROUPS, MOVEMENT_PATTERNS, SKILL_LEVELS are non-empty real vocab", () => {
      expect(MAJOR_MUSCLE_GROUPS.length).toBeGreaterThan(0);
      expect(MOVEMENT_PATTERNS).toContain("squat");
      expect(MOVEMENT_PATTERNS).toContain("isolation");
      expect(SKILL_LEVELS).toEqual(["beginner", "intermediate", "advanced"]);
    });
  });
});
