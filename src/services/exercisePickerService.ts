/**
 * Exercise Picker Service — pure data layer for the exercise picker.
 *
 * Workout Engine v2 Phase 6C-ii: migrated off the legacy ~69-entry
 * CURATED_EXERCISES list onto the canonical 1,552-row exercise catalog
 * (src/data/exerciseCatalog.generated.ts). Behavior contract preserved:
 *  - searchExercises: filter the catalog by free-text (Jaro-Winkler fuzzy)
 *    + structured filters (muscle groups / equipment / difficulty / movement
 *    pattern — renamed from "category": the old field was body-region text
 *    borrowed from the curated list's ad hoc vocab; the catalog's own
 *    `movementPattern` is a real, consistent 10-value enum, so the picker's
 *    "Pattern" filter chip row now finally means what it says).
 *  - getRecommendedForDay: inverse muscle-balance — surface exercises whose
 *    primary muscles are NOT already hit by the day's current exercises.
 *  - AsyncStorage-backed recent-search list + favourite list.
 *
 * STORAGE KEYS (shared with ExerciseRow) — UNCHANGED, so existing users' data
 * isn't orphaned by this migration:
 *  - "favorite_exercises"      → string[] of exerciseIds (array form).
 *  - "exercise_picker_recent"  → string[] of recent free-text queries (max 10).
 * IDs stored under either key may be legacy curated snake_case ids (from
 * before this migration) OR canonical hash ids (after). Both resolve
 * correctly via getCatalogEntry(), which checks canonical id then the
 * catalog's alias map — so a user's existing favourites keep working with NO
 * migration step needed on the stored data itself.
 *
 * ERROR POLICY (CLAUDE.md §5): every AsyncStorage op is wrapped in try/catch
 * with console.error — no silent failures. Pure functions never throw.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EXERCISE_CATALOG,
  getCatalogEntry,
  type CatalogEntry,
  type MovementPattern,
  type SkillLevel,
} from "../data/exerciseCatalog.generated";
import { MAJOR_MUSCLE_GROUPS } from "./workoutInsightsService";
import type { PlannedExercise, PlannedSet } from "../types/workout";

// Mirrors workoutBuilderStore.DEFAULT_REST_SECONDS — not imported directly to
// avoid a service→store layering dependency for one constant; keep both in
// sync if either changes.
const DEFAULT_REST_SECONDS = 60;

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

/**
 * Structured filters for the picker. `movementPattern` replaces the old
 * `category` field name — see file header.
 */
export interface ExercisePickerFilter {
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: SkillLevel[];
  movementPattern?: MovementPattern;
}

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

const RECENT_STORAGE_KEY = "exercise_picker_recent";
const FAV_STORAGE_KEY = "favorite_exercises";
export const MAX_RECENT_SEARCHES = 10;

/** Below this similarity score, a fuzzy match is discarded. */
const MIN_FUZZY_SCORE = 0.72;

// Re-exported so callers (the picker sheet's filter chip rows) build their
// option lists from the same source this service filters against, instead
// of hand-typed lists that can silently drift from the catalog's real vocab.
export { MAJOR_MUSCLE_GROUPS };
export const MOVEMENT_PATTERNS: MovementPattern[] = [
  "squat", "hinge", "lunge", "carry", "rotation",
  "horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull",
  "isolation",
];
export const SKILL_LEVELS: SkillLevel[] = ["beginner", "intermediate", "advanced"];
/** Common gym equipment strings actually present in the catalog's `equipment`
 * vocab (confirmed against exerciseDatabase.min.json's metadata this session)
 * — a curated subset for the filter UI, not the full ~28-value raw list. */
export const COMMON_EQUIPMENT: string[] = [
  "body weight", "dumbbell", "barbell", "cable", "machine", "band", "kettlebell",
];

// ----------------------------------------------------------------------------
// JARO-WINKLER (local copy — lifted from exerciseValidationService.ts, see
// the original service's deviation note; unchanged by this migration)
// ----------------------------------------------------------------------------

function getCommonPrefixLength(a: string, b: string): number {
  const minLen = Math.min(a.length, b.length);
  let prefix = 0;
  for (let i = 0; i < minLen; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return prefix;
}

function jaroWinkler(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  const len1 = str1.length;
  const len2 = str2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchWindow < 0) return 0.0;

  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  let matches = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0.0;

  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro =
    (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  const prefix = Math.min(4, getCommonPrefixLength(str1, str2));
  return jaro + prefix * 0.1 * (1 - jaro);
}

// ----------------------------------------------------------------------------
// SEARCH
// ----------------------------------------------------------------------------

/**
 * Filter + fuzzy-rank the full exercise catalog (1,552 rows).
 *
 * Scoring:
 *  - Substring contains (name OR muscle) → rank by Jaro-Winkler on name.
 *  - Otherwise → Jaro-Winkler on name; keep if ≥ MIN_FUZZY_SCORE.
 *  - Structured filters are AND-ed on top of the text match. Empty query +
 *    empty filters → full catalog.
 */
export function searchExercises(
  query: string,
  filters: ExercisePickerFilter = {},
): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  const hasText = q.length > 0;
  const hasFilters =
    (filters.muscleGroups?.length ?? 0) > 0 ||
    (filters.equipment?.length ?? 0) > 0 ||
    (filters.difficulty?.length ?? 0) > 0 ||
    Boolean(filters.movementPattern);

  if (!hasText && !hasFilters) {
    return [...EXERCISE_CATALOG];
  }

  const filtered = EXERCISE_CATALOG.filter((ex) => passesFilters(ex, filters));

  if (!hasText) {
    return filtered;
  }

  const scored = filtered
    .map((ex) => ({ ex, score: scoreMatch(ex, q) }))
    .filter((row) => row.score >= MIN_FUZZY_SCORE || hasSubstringMatch(row.ex, q))
    .sort((a, b) => b.score - a.score);

  return scored.map((row) => row.ex);
}

function passesFilters(ex: CatalogEntry, filters: ExercisePickerFilter): boolean {
  if (filters.muscleGroups?.length) {
    const hit = filters.muscleGroups.some(
      (m) => ex.primaryMuscles.includes(m) || ex.secondaryMuscles.includes(m),
    );
    if (!hit) return false;
  }
  if (filters.equipment?.length) {
    const hit = filters.equipment.some((eq) => ex.equipment.includes(eq));
    if (!hit) return false;
  }
  if (filters.difficulty?.length) {
    if (!filters.difficulty.includes(ex.skillLevel)) return false;
  }
  if (filters.movementPattern && ex.movementPattern !== filters.movementPattern) {
    return false;
  }
  return true;
}

function hasSubstringMatch(ex: CatalogEntry, q: string): boolean {
  if (ex.name.toLowerCase().includes(q)) return true;
  if (ex.primaryMuscles.some((m) => m.toLowerCase().includes(q))) return true;
  if (ex.secondaryMuscles.some((m) => m.toLowerCase().includes(q))) return true;
  if (ex.equipment.some((eq) => eq.toLowerCase().includes(q))) return true;
  return false;
}

/** Best Jaro-Winkler score across name + each primary/secondary muscle. */
function scoreMatch(ex: CatalogEntry, q: string): number {
  const nameScore = jaroWinkler(q, ex.name.toLowerCase());
  let best = nameScore;
  for (const m of [...ex.primaryMuscles, ...ex.secondaryMuscles]) {
    const s = jaroWinkler(q, m.toLowerCase());
    if (s > best) best = s;
  }
  if (hasSubstringMatch(ex, q)) {
    best = Math.max(best, 0.85);
  }
  return best;
}

// ----------------------------------------------------------------------------
// RECOMMENDED (inverse muscle-balance)
// ----------------------------------------------------------------------------

/**
 * Surface exercises whose primary muscles are NOT already hit by the current
 * day's exercises. Returns the top 6, diversified across movement patterns
 * (the closest catalog-native analogue to the old "category" diversification
 * — squat/hinge/push/pull/etc. is a more meaningful spread than the old
 * ad hoc body-region categories) so the user sees varied options rather than
 * 6 isolation exercises.
 *
 * Resolves currentExerciseIds via getCatalogEntry — works for both canonical
 * hash ids (AI-plan exercises already in the day) and legacy curated ids.
 */
export function getRecommendedForDay(currentExerciseIds: string[]): CatalogEntry[] {
  const hitMuscles = new Set<string>();
  const currentCanonicalIds = new Set<string>();
  for (const id of currentExerciseIds) {
    const entry = getCatalogEntry(id);
    if (entry) {
      entry.primaryMuscles.forEach((m) => hitMuscles.add(m));
      currentCanonicalIds.add(entry.canonicalId);
    }
  }

  const scored = EXERCISE_CATALOG.filter(
    (ex) => !currentCanonicalIds.has(ex.canonicalId),
  )
    .map((ex) => {
      const novel = ex.primaryMuscles.filter((m) => !hitMuscles.has(m)).length;
      return { ex, novel };
    })
    .filter((row) => row.novel > 0)
    .sort((a, b) => b.novel - a.novel);

  const byPattern = new Map<MovementPattern, typeof scored>();
  for (const row of scored) {
    const list = byPattern.get(row.ex.movementPattern) ?? [];
    list.push(row);
    byPattern.set(row.ex.movementPattern, list);
  }

  const picked: CatalogEntry[] = [];
  const usedIds = new Set<string>();

  for (const list of byPattern.values()) {
    if (list.length === 0) continue;
    const top = list[0];
    picked.push(top.ex);
    usedIds.add(top.ex.canonicalId);
    if (picked.length >= 6) break;
  }

  for (const row of scored) {
    if (picked.length >= 6) break;
    if (usedIds.has(row.ex.canonicalId)) continue;
    picked.push(row.ex);
    usedIds.add(row.ex.canonicalId);
  }

  return picked.slice(0, 6);
}

// ----------------------------------------------------------------------------
// POPULAR — a deterministic "trending" list of well-known compound lifts.
// ----------------------------------------------------------------------------

// Legacy curated snake_case ids. Verified against the generated catalog
// (node getCatalogEntry check, not assumed): barbell_bench_press → alias of
// EIeI8Vf, pull_up → alias of lBDjFxJ, push_up → alias of I4hDWkc; the other
// five (barbell_squat, deadlift, overhead_press, dumbbell_row, plank) never
// exact-name-matched a DB row so they remain standalone catalog rows under
// their own id. All 8 resolve either way — getCatalogEntry checks canonical
// id first, then the alias map. Kept as human-readable curated ids rather
// than switched to opaque hash ids.
const POPULAR_IDS: readonly string[] = [
  "barbell_bench_press",
  "barbell_squat",
  "deadlift",
  "pull_up",
  "overhead_press",
  "dumbbell_row",
  "plank",
  "push_up",
];

export function getPopularExercises(): CatalogEntry[] {
  return POPULAR_IDS.map((id) => getCatalogEntry(id)).filter(
    (c): c is CatalogEntry => Boolean(c),
  );
}

// ----------------------------------------------------------------------------
// RECENT SEARCHES (AsyncStorage) — unchanged by this migration
// ----------------------------------------------------------------------------

export async function getRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT_SEARCHES);
  } catch (error) {
    console.error("[exercisePickerService] getRecentSearches failed:", error);
    return [];
  }
}

export async function addRecentSearch(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const current = await getRecentSearches();
    const deduped = [trimmed, ...current.filter((c) => c.toLowerCase() !== trimmed.toLowerCase())];
    const next = deduped.slice(0, MAX_RECENT_SEARCHES);
    await AsyncStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.error("[exercisePickerService] addRecentSearch failed:", error);
  }
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(RECENT_STORAGE_KEY);
  } catch (error) {
    console.error("[exercisePickerService] clearRecentSearches failed:", error);
  }
}

// ----------------------------------------------------------------------------
// FAVOURITES (AsyncStorage — key shared with ExerciseRow, unchanged)
// ----------------------------------------------------------------------------

export async function getFavorites(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(FAV_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string");
  } catch (error) {
    console.error("[exercisePickerService] getFavorites failed:", error);
    return [];
  }
}

export async function toggleFavorite(exerciseId: string): Promise<boolean> {
  try {
    const current = await getFavorites();
    const exists = current.includes(exerciseId);
    const next = exists
      ? current.filter((id) => id !== exerciseId)
      : [...current, exerciseId];
    await AsyncStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(next));
    return !exists;
  } catch (error) {
    console.error("[exercisePickerService] toggleFavorite failed:", error);
    return false;
  }
}

// ----------------------------------------------------------------------------
// CATALOG → PLANNED ADAPTER
// ----------------------------------------------------------------------------

/**
 * Convert a CatalogEntry into a PlannedExercise, using the catalog's own
 * per-exercise defaults (defaultRepRange, isTimeBased) instead of the old
 * hardcoded `3×"8-12"×60s` every curated exercise got regardless of type.
 * weightKg is deliberately left unset — a starting weight is a progression/
 * calibration concern (see progressionService, calibrationService), not
 * something this adapter should guess.
 *
 * `swappedFromExerciseId`: when this call is servicing a Phase 6C-i replace
 * (or a future 6C-iii runtime swap), pass the exercise being replaced so its
 * id is recorded on `alternativeExerciseId` — the first producer of that
 * field (previously declared with zero producers anywhere in the app).
 */
export function catalogEntryToPlanned(
  entry: CatalogEntry,
  swappedFromExerciseId?: string,
): PlannedExercise {
  const [repMin, repMax] = entry.defaultRepRange;
  const reps: PlannedSet["reps"] =
    entry.isTimeBased || repMin == null || repMax == null
      ? "8-12" // time-based exercises use durationSeconds below, not reps
      : repMin === repMax
        ? repMin
        : `${repMin}-${repMax}`;

  const sets: PlannedSet[] = Array.from({ length: 3 }, (_, i) => ({
    setNumber: i + 1,
    reps,
    setType: "normal" as const,
    ...(entry.isTimeBased ? { durationSeconds: 30 } : {}),
  }));

  return {
    exerciseId: entry.canonicalId,
    name: entry.name,
    sets,
    restSeconds: DEFAULT_REST_SECONDS,
    ...(swappedFromExerciseId ? { alternativeExerciseId: swappedFromExerciseId } : {}),
  };
}
