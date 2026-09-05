/**
 * Shared exercise-ID → display-metadata resolver.
 *
 * Plan exercise IDs come from two disjoint ID spaces depending on how the
 * plan was generated: the real exercise DB (exercisedb.dev, AI-generated
 * plans — ids like "aXcUyKb") or the small legacy curated list (custom/manual
 * builder plans — ids like "push_up"). Every screen that needs to turn an
 * exerciseId into a name/muscle-groups/equipment/difficulty must go through
 * this one resolver instead of re-implementing the same two-lookup-plus-map
 * chain — this used to be duplicated (and had silently drifted) between
 * WorkoutDetailScreen and BuilderAnalyticsPanel: one warned on an unresolved
 * ID and fell back through both lookups, the other only tried the curated
 * list and silently contributed zero muscle-group data for any AI-plan
 * exercise outside that small legacy set.
 *
 * As of Workout Engine v2 Phase 1, both exports below check the generated
 * canonical exercise catalog (src/data/exerciseCatalog.generated.ts) FIRST —
 * it already unifies both ID spaces (curated IDs that exactly matched a DB
 * exercise are stored as aliases) and carries pre-computed classification.
 * The original DB→curated dual lookup below it is kept as a safety net for
 * an exerciseId that postdates the last `node scripts/generate-exercise-
 * catalog.mjs` run, not as the primary path.
 */
import { exerciseFilterService } from "../services/exerciseFilterService";
import { CURATED_EXERCISES } from "../data/curatedExercises";
import { titleCaseExerciseName } from "./textFormat";
import classificationVocab from "../data/exerciseClassificationVocab.json";
import { getCatalogEntry } from "../data/exerciseCatalog.generated";

// ExerciseDB (exercisedb.dev API) target-muscle vocab → heatmap group vocab.
// NOTE: the DB's actual vocab (verified against the full 1500-exercise
// dataset) is larger than this map covers — "quadriceps" (not just "quads"),
// "calves", "adductors"/"abductors"/"hip flexors" all appear as real
// targetMuscles/secondaryMuscles values and previously mapped to nothing,
// silently contributing zero credit to both the muscle heatmap and (via
// deriveExerciseClassification below) the lower-body progression increment.
// SINGLE SOURCE: shared with scripts/generate-exercise-catalog.mjs via
// exerciseClassificationVocab.json — edit the JSON, not this reference.
const DB_MUSCLE_TO_GROUP: Record<string, string> = classificationVocab.dbMuscleToGroup;

// Muscle-group vocab (already normalized by DB_MUSCLE_TO_GROUP / curated
// CuratedExercise.muscleGroups) that count as "lower body" for progression
// weight-increment selection.
const LOWER_BODY_GROUPS = new Set(classificationVocab.lowerBodyMuscleGroups);

// ExerciseDB (exercisedb.dev) carries no explicit "time-based" flag, unlike
// the curated set's isTimeBased field — so hash-ID exercises are classified
// by matching keywords against the resolved DISPLAY NAME (not the ID, which
// is an opaque hash). Only used by the dual-lookup fallback path — the
// catalog stores a real is_time_based attribute computed the same way at
// generation time.
const TIME_BASED_NAME_KEYWORDS = classificationVocab.timeBasedNameKeywords;

export interface ResolvedExerciseMeta {
  name: string | null;
  muscleGroups: string[];
  equipment: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
}

const EMPTY_META: ResolvedExerciseMeta = {
  name: null,
  muscleGroups: [],
  equipment: [],
  difficulty: "intermediate",
};

/** Resolve display metadata for an exerciseId — catalog first, then the
 * real exercise DB (AI-plan ids), falling back to the curated list (legacy
 * builder ids). */
export function resolveExerciseMeta(
  exerciseId: string | undefined,
): ResolvedExerciseMeta {
  if (!exerciseId) return EMPTY_META;

  const catalogEntry = getCatalogEntry(exerciseId);
  if (catalogEntry) {
    return {
      name: titleCaseExerciseName(catalogEntry.name),
      muscleGroups: [...catalogEntry.primaryMuscles, ...catalogEntry.secondaryMuscles],
      equipment: catalogEntry.equipment,
      difficulty: catalogEntry.skillLevel,
    };
  }

  const db = exerciseFilterService.getExerciseById(exerciseId);
  if (db) {
    const groups = new Set<string>();
    for (const muscle of [...db.targetMuscles, ...db.secondaryMuscles]) {
      const group = DB_MUSCLE_TO_GROUP[muscle.toLowerCase()];
      if (group && group !== "cardio") groups.add(group);
    }
    return {
      name: titleCaseExerciseName(db.name),
      muscleGroups: [...groups],
      equipment: db.equipments,
      difficulty: db.difficulty,
    };
  }

  const curated = CURATED_EXERCISES.find((c) => c.id === exerciseId);
  if (curated) {
    return {
      name: curated.name,
      muscleGroups: curated.muscleGroups,
      equipment: curated.equipment,
      difficulty: curated.difficulty,
    };
  }

  // Resolved nowhere — it would otherwise silently contribute zero sets to
  // every muscle-heatmap bucket, which reads as "this muscle group wasn't
  // worked" even when the plan legitimately targeted it. Surfacing this
  // makes an AI-plan-generation ID mismatch debuggable instead of showing up
  // only as an unexplained gap.
  console.warn(
    `[resolveExerciseMeta] exerciseId "${exerciseId}" not found in the exercise catalog, DB, or curated list — contributing zero muscle-group/equipment data for this exercise.`,
  );
  return EMPTY_META;
}

export interface ExerciseClassification {
  isBodyweight: boolean;
  isTimeBased: boolean;
  isLowerBody: boolean;
}

const DEFAULT_CLASSIFICATION: ExerciseClassification = {
  isBodyweight: false,
  isTimeBased: false,
  isLowerBody: false,
};

/**
 * Resolve the progression-relevant classification for an exerciseId —
 * bodyweight / time-based / lower-body. This is the SINGLE SOURCE for these
 * three flags: progressionService and warmupService both need them but
 * cannot answer for hash IDs on their own (their internal keyword Sets only
 * recognize the small legacy curated ID list). Every call site that feeds
 * progressionService.suggestNextWeight or warmupService.classifyExercise
 * with a real (possibly hash-ID) exerciseId MUST resolve through here first
 * and pass the results as overrides — see the override note on
 * suggestNextWeight in progressionService.ts.
 */
export function deriveExerciseClassification(
  exerciseId: string | undefined,
): ExerciseClassification {
  if (!exerciseId) return DEFAULT_CLASSIFICATION;

  const catalogEntry = getCatalogEntry(exerciseId);
  if (catalogEntry) {
    return {
      isBodyweight: catalogEntry.isBodyweight,
      isTimeBased: catalogEntry.isTimeBased,
      isLowerBody: [...catalogEntry.primaryMuscles, ...catalogEntry.secondaryMuscles].some(
        (g) => LOWER_BODY_GROUPS.has(g),
      ),
    };
  }

  // Fallback path — only reached for an exerciseId that postdates the last
  // catalog generation run. Curated entries already carry authoritative
  // isBodyweight/isTimeBased flags plus a muscleGroups list — prefer this
  // over any keyword matching.
  const curated = CURATED_EXERCISES.find((c) => c.id === exerciseId);
  if (curated) {
    return {
      isBodyweight: curated.isBodyweight,
      isTimeBased: curated.isTimeBased,
      isLowerBody: curated.muscleGroups.some((g) => LOWER_BODY_GROUPS.has(g)),
    };
  }

  const db = exerciseFilterService.getExerciseById(exerciseId);
  if (db) {
    const nameLower = db.name.toLowerCase();
    const allMuscles = [...db.targetMuscles, ...db.secondaryMuscles].map((m) =>
      m.toLowerCase(),
    );
    return {
      isBodyweight: db.equipments.some((e) => e.toLowerCase() === "body weight"),
      isTimeBased: TIME_BASED_NAME_KEYWORDS.some((k) => nameLower.includes(k)),
      isLowerBody: allMuscles.some(
        (m) => DB_MUSCLE_TO_GROUP[m] && LOWER_BODY_GROUPS.has(DB_MUSCLE_TO_GROUP[m]),
      ),
    };
  }

  // Unresolved — resolveExerciseMeta already warns about this ID elsewhere
  // in the same render path, so this stays silent to avoid double-logging.
  return DEFAULT_CLASSIFICATION;
}
