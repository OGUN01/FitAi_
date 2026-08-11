/**
 * Shared workout-category resolution logic.
 *
 * Previously duplicated between src/ai/index.ts's `resolveWorkoutCategory`
 * (weekly-plan path) and services/aiRequestTransformers.ts's
 * `mapWorkoutCategory` (single-workout path) — the two hand-written keyword
 * lists had already drifted once (the transformers copy was missing
 * pilates/hybrid/circuit/metabolic/mobility handling and silently defaulted
 * every non-matching title to 'strength'). Extracted here so both call sites
 * share one implementation and can't drift again.
 */

export type WorkoutCategory =
  | 'strength'
  | 'cardio'
  | 'flexibility'
  | 'hiit'
  | 'yoga'
  | 'pilates'
  | 'hybrid';

const WORKOUT_CATEGORY_WHITELIST: Record<string, WorkoutCategory> = {
  strength: 'strength',
  cardio: 'cardio',
  flexibility: 'flexibility',
  hiit: 'hiit',
  yoga: 'yoga',
  pilates: 'pilates',
  hybrid: 'hybrid',
};

/**
 * Resolve the real workout category instead of hardcoding 'strength'.
 *
 * Prefers an explicit `category` field (whitelisted, same pattern as
 * difficultyMap) if the backend ever starts sending one. Today the worker's
 * rule-based generator does not emit `category`, but it does bake the real
 * type into the title (e.g. "Full Body HIIT - ...", "Lower Body Circuit -
 * ..." — see fitai-workers/src/handlers/workoutGenerationRuleBased.ts), so we
 * infer from title keywords rather than silently discarding a cardio/HIIT/
 * flexibility day as 'strength'.
 */
export function resolveWorkoutCategory(workoutPlan: {
  title?: string;
  category?: string;
}): WorkoutCategory {
  const explicit = WORKOUT_CATEGORY_WHITELIST[(workoutPlan.category ?? '').toLowerCase()];
  if (explicit) return explicit;

  const title = (workoutPlan.title ?? '').toLowerCase();
  const hasUnambiguousStrengthKeyword =
    title.includes('strength') ||
    title.includes('push day') ||
    title.includes('pull day') ||
    title.includes('leg day') ||
    title.includes('push/pull') ||
    title.includes('powerlifting') ||
    title.includes('hypertrophy');
  // Unambiguous strength keywords are checked before the generic 'circuit'/
  // 'metabolic' → 'hybrid' branch below: a title like "Upper Body Circuit
  // Strength" or "Metabolic Push Day" would otherwise match 'hybrid' first,
  // since first-match-wins can't weigh co-occurrence. But when the title ALSO
  // carries an explicit hiit/cardio cue (e.g. "HIIT Strength Circuit"), that
  // more specific session-format cue wins instead — matching the ordering
  // that existed before this strength pre-check was added, so a HIIT session
  // that happens to use strength moves isn't reclassified as a plain
  // strength day. See index.test.ts for both cases pinned.
  if (hasUnambiguousStrengthKeyword && !title.includes('hiit') && !title.includes('cardio')) {
    return 'strength';
  }
  if (title.includes('hiit')) return 'hiit';
  if (title.includes('cardio')) return 'cardio';
  if (title.includes('yoga')) return 'yoga';
  if (title.includes('pilates')) return 'pilates';
  if (title.includes('mobility') || title.includes('flexibility')) return 'flexibility';
  if (title.includes('circuit') || title.includes('metabolic')) return 'hybrid';
  return 'strength';
}
