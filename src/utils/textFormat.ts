/**
 * Text formatting utilities for display strings.
 */

/**
 * Title-case an exercise name for display.
 *
 * The bundled exercise database (src/data/exerciseDatabase.min.json) stores
 * 1500 exercises with lowercase names (e.g. "dumbbell clean",
 * "barbell reverse grip incline bench row"). This helper title-cases them at
 * the render boundary so the UI always shows "Dumbbell Clean" without mutating
 * the source data (which the filter service relies on being lowercase for
 * `getExerciseByName` fuzzy matching — see exerciseFilterService.ts).
 *
 * Preserves short words ("of", "and", "the", "with", "on", "to", "a", "an",
 * "in", "for", "via", "vs") as lowercase when they appear mid-string, matching
 * standard title-case conventions. Roman numerals and acronyms are left
 * untouched if already uppercase.
 *
 * @param name Raw exercise name (any case).
 * @returns Title-cased name safe for display.
 */
const TITLE_CASE_SMALL_WORDS = new Set([
  'of',
  'and',
  'the',
  'with',
  'on',
  'to',
  'a',
  'an',
  'in',
  'for',
  'via',
  'vs',
  'or',
  'nor',
  'but',
  'so',
  'yet',
]);

/**
 * Normalize a raw muscle-group token for display.
 *
 * `CuratedExercise.muscleGroups` (src/data/curatedExercises.ts) mixes plain
 * words ("core", "back") with underscore_case values ("full_body",
 * "rear_delts", "hip_flexors"). CSS/RN `textTransform: 'capitalize'` does not
 * treat `_` as a word boundary, so applying it directly to these values
 * renders broken strings like "Full_body". This helper replaces underscores
 * with spaces first so any capitalize/title-case applied on top of it (or the
 * raw lowercase string, if the caller wants it unstyled) reads correctly.
 *
 * @param muscleGroup Raw muscle-group token (any case, may contain `_`).
 * @returns Space-separated, display-safe string.
 */
export function formatMuscleGroup(muscleGroup: string | null | undefined): string {
  if (!muscleGroup) return '';
  return muscleGroup.replace(/_/g, ' ').trim();
}

export function titleCaseExerciseName(name: string | null | undefined): string {
  if (!name) return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  const words = trimmed.split(/\s+/);
  const result = words.map((word, i) => {
    // Keep tokens that are already all-uppercase (acronyms like "RPE", "BMI").
    if (word.length > 1 && word === word.toUpperCase()) {
      return word;
    }
    // First word is always capitalized, even if it's a "small word".
    if (i === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    const lower = word.toLowerCase();
    if (TITLE_CASE_SMALL_WORDS.has(lower)) {
      return lower;
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return result.join(' ');
}
