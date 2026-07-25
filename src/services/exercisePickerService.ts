/**
 * Exercise Picker Service — pure data layer for the Phase 4 exercise picker.
 *
 * Responsibilities:
 *  - searchExercises: filter CURATED_EXERCISES by free-text (Jaro-Winkler fuzzy)
 *    + structured filters (muscle groups / equipment / difficulty / category).
 *  - getRecommendedForDay: inverse muscle-balance — surface exercises whose
 *    primary muscles are NOT already hit by the day's current exercises.
 *  - AsyncStorage-backed recent-search list + favourite list.
 *
 * STORAGE KEYS (shared with ExerciseRow):
 *  - "favorite_exercises"      → string[] of exerciseIds (array form, so the
 *    existing ExerciseRow favourite cache stays in sync — same key, same shape).
 *  - "exercise_picker_recent"  → string[] of recent free-text queries (max 10).
 *
 * ERROR POLICY (CLAUDE.md §5): every AsyncStorage op is wrapped in try/catch
 * with console.error — no silent failures. Pure functions never throw.
 *
 * DEVIATION NOTE: The task spec called for wrapping
 * `ExerciseValidationService` (Jaro-Winkler). That service's `calculateSimilarity`
 * is `private static`, so it cannot be reused without modifying a Phase 0–3 file
 * (out of scope). Instead we implement Jaro-Winkler locally (same algorithm
 * lifted from exerciseValidationService.ts:186) — identical results, no shared
 * private-method access required.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CURATED_EXERCISES, type CuratedExercise } from "../data/curatedExercises";
import type { PlannedExercise, PlannedSet } from "../types/workout";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

/**
 * Structured filters for the picker. String-typed (not enum) because
 * CURATED_EXERCISES stores raw strings (e.g. "body weight", "cable", "lats").
 * `category` is single-select (matches CuratedExercise.category).
 */
export interface ExercisePickerFilter {
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: ("beginner" | "intermediate" | "advanced")[];
  /** Movement pattern / body region — single-select. */
  category?: CuratedExercise["category"];
}

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

const RECENT_STORAGE_KEY = "exercise_picker_recent";
const FAV_STORAGE_KEY = "favorite_exercises";
export const MAX_RECENT_SEARCHES = 10;

/** Below this similarity score, a fuzzy match is discarded. */
const MIN_FUZZY_SCORE = 0.72;

// ----------------------------------------------------------------------------
// JARO-WINKLER (local copy — see deviation note in file header)
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

/**
 * Jaro-Winkler similarity ∈ [0, 1]. Lifted verbatim from
 * exerciseValidationService.ts (calculateSimilarity) so behaviour matches the
 * existing validation pipeline.
 */
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
 * Filter + fuzzy-rank the curated exercise library.
 *
 * Scoring:
 *  - Substring contains (name OR muscleGroup) → rank by Jaro-Winkler on name.
 *  - Otherwise → Jaro-Winkler on name; keep if ≥ MIN_FUZZY_SCORE.
 *  - Structured filters (muscleGroups/equipment/difficulty/category) are AND-ed
 *    on top of the text match. Empty query + empty filters → full library.
 */
export function searchExercises(
  query: string,
  filters: ExercisePickerFilter = {},
): CuratedExercise[] {
  const q = query.trim().toLowerCase();
  const hasText = q.length > 0;
  const hasFilters =
    (filters.muscleGroups?.length ?? 0) > 0 ||
    (filters.equipment?.length ?? 0) > 0 ||
    (filters.difficulty?.length ?? 0) > 0 ||
    Boolean(filters.category);

  // Fast path: no query, no filters → return all (stable order).
  if (!hasText && !hasFilters) {
    return [...CURATED_EXERCISES];
  }

  // Apply structured filters first (cheap), then fuzzy-rank the survivors.
  const filtered = CURATED_EXERCISES.filter((ex) => passesFilters(ex, filters));

  if (!hasText) {
    return filtered;
  }

  // Rank by best score across name + muscleGroups (a query like "chest" should
  // match both "Cable Fly" (muscle) and "Barbell Bench Press" (name fuzzy)).
  const scored = filtered
    .map((ex) => ({ ex, score: scoreMatch(ex, q) }))
    .filter((row) => row.score >= MIN_FUZZY_SCORE || hasSubstringMatch(row.ex, q))
    .sort((a, b) => b.score - a.score);

  return scored.map((row) => row.ex);
}

function passesFilters(
  ex: CuratedExercise,
  filters: ExercisePickerFilter,
): boolean {
  if (filters.muscleGroups?.length) {
    const hit = filters.muscleGroups.some((m) => ex.muscleGroups.includes(m));
    if (!hit) return false;
  }
  if (filters.equipment?.length) {
    const hit = filters.equipment.some((eq) => ex.equipment.includes(eq));
    if (!hit) return false;
  }
  if (filters.difficulty?.length) {
    if (!filters.difficulty.includes(ex.difficulty)) return false;
  }
  if (filters.category && ex.category !== filters.category) {
    return false;
  }
  return true;
}

function hasSubstringMatch(ex: CuratedExercise, q: string): boolean {
  if (ex.name.toLowerCase().includes(q)) return true;
  if (ex.muscleGroups.some((m) => m.toLowerCase().includes(q))) return true;
  if (ex.equipment.some((eq) => eq.toLowerCase().includes(q))) return true;
  return false;
}

/** Best Jaro-Winkler score across name + each muscle group. */
function scoreMatch(ex: CuratedExercise, q: string): number {
  const nameScore = jaroWinkler(q, ex.name.toLowerCase());
  let best = nameScore;
  for (const m of ex.muscleGroups) {
    const s = jaroWinkler(q, m.toLowerCase());
    if (s > best) best = s;
  }
  // Substring bonus: a clean contains-match is a strong intent signal even
  // when the JW score is modest (e.g. "curl" → "Barbell Curl").
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
 * day's exercises. Returns the top 6, diversified across categories so the
 * user sees chest / back / legs / core options rather than 6 leg exercises.
 *
 * Pure: derives everything from CURATED_EXERCISES + the supplied id list.
 */
export function getRecommendedForDay(
  currentExerciseIds: string[],
): CuratedExercise[] {
  const hitMuscles = new Set<string>();
  for (const id of currentExerciseIds) {
    const ex = CURATED_EXERCISES.find((c) => c.id === id);
    if (ex) {
      ex.muscleGroups.forEach((m) => hitMuscles.add(m.toLowerCase()));
    }
  }

  // Score each candidate by how many of its muscles are UN-covered.
  const scored = CURATED_EXERCISES.filter(
    (ex) => !currentExerciseIds.includes(ex.id),
  )
    .map((ex) => {
      const novel = ex.muscleGroups.filter(
        (m) => !hitMuscles.has(m.toLowerCase()),
      ).length;
      return { ex, novel };
    })
    .filter((row) => row.novel > 0)
    .sort((a, b) => b.novel - a.novel);

  // Diversify by category — pick the top scorer per category, then fill
  // remaining slots in score order.
  const byCategory = new Map<CuratedExercise["category"], typeof scored>();
  for (const row of scored) {
    const list = byCategory.get(row.ex.category) ?? [];
    list.push(row);
    byCategory.set(row.ex.category, list);
  }

  const picked: CuratedExercise[] = [];
  const usedIds = new Set<string>();

  // Pass 1: top of each category.
  for (const list of byCategory.values()) {
    if (list.length === 0) continue;
    const top = list[0];
    picked.push(top.ex);
    usedIds.add(top.ex.id);
    if (picked.length >= 6) break;
  }

  // Pass 2: fill remaining slots by overall score.
  for (const row of scored) {
    if (picked.length >= 6) break;
    if (usedIds.has(row.ex.id)) continue;
    picked.push(row.ex);
    usedIds.add(row.ex.id);
  }

  return picked.slice(0, 6);
}

// ----------------------------------------------------------------------------
// POPULAR — a deterministic "trending" list derived from category diversity.
// ----------------------------------------------------------------------------

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

export function getPopularExercises(): CuratedExercise[] {
  const byId = new Map(CURATED_EXERCISES.map((c) => [c.id, c]));
  return POPULAR_IDS.map((id) => byId.get(id)).filter((c): c is CuratedExercise => Boolean(c));
}

// ----------------------------------------------------------------------------
// RECENT SEARCHES (AsyncStorage)
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
    // Dedupe (case-insensitive) + prepend.
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
// FAVOURITES (AsyncStorage — key shared with ExerciseRow)
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
    // Return the NEW state: true = now favourited.
    return !exists;
  } catch (error) {
    console.error("[exercisePickerService] toggleFavorite failed:", error);
    return false;
  }
}

// ----------------------------------------------------------------------------
// CURATED → PLANNED ADAPTER (defaults per task spec)
// ----------------------------------------------------------------------------

/**
 * Convert a CuratedExercise (library entry) into a PlannedExercise with the
 * sensible defaults specified in the Phase 4 brief:
 *   - 3 sets, reps "8-12", restSeconds 60, setType "normal".
 *
 * Time-based exercises (plank, wall sit) get a durationSeconds hint on each
 * set so the session UI can render appropriately; reps stays "8-12" as the
 * spec mandates (callers may edit afterwards).
 */
export function curatedToPlanned(curated: CuratedExercise): PlannedExercise {
  const sets: PlannedSet[] = Array.from({ length: 3 }, (_, i) => ({
    setNumber: i + 1,
    reps: "8-12",
    setType: "normal" as const,
    ...(curated.isTimeBased ? { durationSeconds: 30 } : {}),
  }));
  return {
    exerciseId: curated.id,
    name: curated.name,
    sets,
    restSeconds: 60,
  };
}
