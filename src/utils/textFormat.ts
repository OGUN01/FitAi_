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
