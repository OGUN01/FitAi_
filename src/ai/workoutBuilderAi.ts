/**
 * Workout Builder AI Service (Phase 9)
 *
 * Client-side wrapper around the 6 builder-AI worker endpoints. Mirrors the
 * transform pattern of src/ai/index.ts: build a minimal worker profile from
 * the user's onboarding data, POST via fitaiWorkersClient, return camelCase
 * shapes, and cache suggestions in workoutBuilderStore.aiSuggestions.
 *
 * Error handling per CLAUDE.md §5: console.error on failures, no silent
 * catches, callers receive a structured { success, error } result.
 */

import {
  fitaiWorkersClient,
  AuthenticationError,
  WorkersAPIError,
  NetworkError,
} from "../services/fitaiWorkersClient";
import { useWorkoutBuilderStore } from "../stores/workoutBuilderStore";
import { useProfileStore } from "../stores/profileStore";
import { useFitnessStore } from "../stores/fitnessStore";
import type { PersonalInfoData } from "../types/onboarding/personal-info";
import type { WorkoutPreferencesData } from "../types/onboarding/workout-preferences";
import type { BodyAnalysisData } from "../types/onboarding/body-analysis";
import type { WeeklyWorkoutPlan, AIResponse } from "../types/ai";
import type {
  PlannedExercise,
  AiSuggestion,
  ValidationWarning,
} from "../types/workout";
import {
  computeAllVolumeLandmarks,
  countWeeklySetsByMuscleFromCatalog,
  resolveTrainingEmphasis,
  classifyVolumeZone,
  type TrainingAge,
} from "../services/volumeLandmarksService";
import { getWeekTarget } from "../services/periodizationService";

// ----------------------------------------------------------------------------
// COACH CONTEXT (Workout Engine v2 Phase 6A)
// ----------------------------------------------------------------------------
// Design decision: computed CLIENT-side, not re-derived in the worker. The
// worker is a separate runtime with no access to the client's Zustand stores
// or TS services — reimplementing volumeLandmarksService/periodizationService
// there would duplicate business logic in two places with real drift risk
// (this file already mirrors the "build a minimal worker profile from
// onboarding stores, POST it" pattern for priorPerformance-style derived
// data). The worker schema fields (SuggestDayRequestSchema.
// volumeLandmarkContext/mesocycleContext) are optional/additive specifically
// so a client that can't compute this (or an older client) degrades to
// pre-6A prompt behavior, never a hard failure.

interface VolumeLandmarkContextEntry {
  muscle: string;
  currentSets: number;
  mev: number;
  mav: number;
  mrv: number;
  zone: "under_mev" | "mev_to_mav" | "mav_to_mrv" | "over_mrv";
}

interface MesocycleContextPayload {
  weekInBlock: number;
  isDeloadWeek: boolean;
  targetRir: number;
  volumeMultiplier: number;
}

/**
 * Builds the optional volume-landmark + mesocycle-week context sent to
 * suggest-day/generate-full-week. Reads the FULL draft week (not just the
 * current day) from workoutBuilderStore — volume landmarks are a WEEKLY
 * concept, and the current day's exercises alone aren't enough to know a
 * muscle's total weekly set count. Mirrors buildWorkerProfile()'s existing
 * pattern of reaching into store getState() directly from this service.
 * Returns {} (both fields undefined) on any missing prerequisite rather than
 * fabricating a value — the worker prompt renders nothing when absent.
 */
function buildCoachContext(trainingAge: TrainingAge): {
  volumeLandmarkContext?: VolumeLandmarkContextEntry[];
  mesocycleContext?: MesocycleContextPayload;
} {
  const draft = useWorkoutBuilderStore.getState().draft;
  const primaryGoals =
    (useProfileStore.getState().workoutPreferences as { primary_goals?: string[] } | null)
      ?.primary_goals ?? undefined;

  let volumeLandmarkContext: VolumeLandmarkContextEntry[] | undefined;
  if (draft) {
    const emphasis = resolveTrainingEmphasis(primaryGoals);
    const landmarks = computeAllVolumeLandmarks(trainingAge, emphasis);
    const plannedExercises = draft.workouts.flatMap((w) =>
      (w.plannedExercises ?? []).map((e) => ({ exerciseId: e.exerciseId, setCount: e.sets.length })),
    );
    const currentSets = countWeeklySetsByMuscleFromCatalog(plannedExercises);

    volumeLandmarkContext = Object.entries(landmarks).map(([muscle, l]) => {
      const sets = currentSets[muscle] ?? 0;
      return {
        muscle,
        currentSets: sets,
        mev: l.mev,
        mav: l.mav,
        mrv: l.mrv,
        zone: classifyVolumeZone(sets, l),
      };
    });
  }

  let mesocycleContext: MesocycleContextPayload | undefined;
  const mesocycleWeek = useFitnessStore.getState().getMesocycleWeek?.();
  if (mesocycleWeek != null) {
    const target = getWeekTarget(mesocycleWeek);
    mesocycleContext = {
      weekInBlock: target.weekInBlock,
      isDeloadWeek: target.isDeloadWeek,
      targetRir: target.targetRir,
      volumeMultiplier: target.volumeMultiplier,
    };
  }

  return { volumeLandmarkContext, mesocycleContext };
}

// ----------------------------------------------------------------------------
// TYPES (client-facing camelCase shapes)
// ----------------------------------------------------------------------------

/**
 * Re-export of the shared AIResponse<T> envelope (src/types/ai.ts) under the
 * name already used throughout this file. Previously a hand-rolled duplicate
 * of the same {success, data, error, retryable} shape — CLAUDE.md single-
 * source-of-truth: reusing AIResponse means fields added there (timedOut,
 * confidence, generationTime, tokensUsed) automatically propagate here too.
 */
export type AiServiceResult<T> = AIResponse<T>;

export interface SuggestDayParams {
  dayIndex: number;
  currentExercises: PlannedExercise[];
  goals?: string[];
  weekNumber?: number;
  skipCache?: boolean;
}

export interface SuggestDayResult {
  suggestions: AiSuggestion[];
  confidence: number;
  reasoning: string;
}

export interface ValidatePlanParams {
  plan: WeeklyWorkoutPlan;
  skipCache?: boolean;
}

export interface ValidatePlanResult {
  warnings: ValidationWarning[];
  fixActions: Array<{
    label: string;
    type: "add_exercise" | "remove_exercise" | "replace_exercise" | "adjust_volume";
    dayIndex?: number;
    payload?: Record<string, unknown>;
  }>;
}

export interface EditNaturalLanguageParams {
  plan: WeeklyWorkoutPlan;
  instruction: string;
  skipCache?: boolean;
}

export interface EditNaturalLanguageResult {
  updatedPlan: WeeklyWorkoutPlan;
  summary: string;
}

export interface GenerateFullWeekParams {
  partialPlan: WeeklyWorkoutPlan;
  skipCache?: boolean;
}

export interface GenerateFullWeekResult {
  completePlan: WeeklyWorkoutPlan;
  daysGenerated: number;
}

export interface ApplyProgressionParams {
  plan: WeeklyWorkoutPlan;
  priorPerformance: Array<{
    exerciseId: string;
    exerciseName?: string;
    lastSession?: {
      completedAt: string;
      sets: Array<{
        setNumber: number;
        weightKg: number | null;
        reps: number | null;
        rpe?: 1 | 2 | 3 | null;
        rpe10?: number | null;
      }>;
    };
  }>;
  skipCache?: boolean;
}

export interface ApplyProgressionResult {
  updatedPlan: WeeklyWorkoutPlan;
  changes: Array<{
    exerciseId: string;
    dayIndex: number;
    action: "increase" | "hold" | "deload";
    reason: string;
  }>;
}

export interface DeloadParams {
  plan: WeeklyWorkoutPlan;
  skipCache?: boolean;
}

export interface DeloadResult {
  deloadPlan: WeeklyWorkoutPlan;
  volumeReductionPercent: number;
}

// ----------------------------------------------------------------------------
// PROFILE BUILDER
// ----------------------------------------------------------------------------

/**
 * Build a minimal worker-compatible profile from onboarding stores. The
 * worker UserProfileSchema requires age/gender/fitnessGoal/experienceLevel/
 * availableEquipment + workoutDuration. We pull these from profileStore
 * (personalInfo + fitnessGoals + bodyAnalysis). Returns null if the minimum
 * required fields are missing — the caller should treat that as a soft-fail.
 *
 * Per CLAUDE.md §8: no hardcoded fallbacks for user data. Missing required
 * fields surface as null and the caller logs a warning.
 */
function buildWorkerProfile():
  | {
      age: number;
      gender: "male" | "female" | "other" | "prefer_not_to_say";
      weight: number | null;
      height: number | null;
      fitnessGoal: string;
      experienceLevel: "beginner" | "intermediate" | "advanced";
      availableEquipment: string[];
      workoutDuration: number | undefined;
      workoutsPerWeek: number | undefined;
      injuries?: string[];
      medicalConditions?: string[];
      pregnancyStatus?: boolean;
      pregnancyTrimester?: 1 | 2 | 3;
    }
  | null {
  const state = useProfileStore.getState();
  const personalInfo = state.personalInfo as (PersonalInfoData & { age?: number; gender?: "male" | "female" | "other" | "prefer_not_to_say" }) | null;
  const workoutPreferences = state.workoutPreferences as (WorkoutPreferencesData & {
    primary_goals?: string[];
    intensity?: "beginner" | "intermediate" | "advanced";
    available_equipment?: string[];
    equipment?: string[];
    time_preference?: number;
    workout_frequency_per_week?: number;
  }) | null;
  const bodyAnalysis = state.bodyAnalysis as (BodyAnalysisData & {
    medical_conditions?: string[];
    physical_limitations?: string[];
    pregnancy_status?: boolean;
    pregnancy_trimester?: 1 | 2 | 3;
  }) | null;

  if (!personalInfo || !workoutPreferences) {
    console.warn("[workoutBuilderAi] Missing personalInfo or workoutPreferences — cannot build worker profile");
    return null;
  }

  // MIN_VALID_AGE = 13 — the worker Zod schema enforces age >= 13
  // (fitai-workers UserProfileSchema). Rejecting below this here avoids a
  // wasted round-trip and surfaces the profile-incomplete state to the caller.
  const MIN_VALID_AGE = 13;
  const age = personalInfo.age ?? 0;
  if (!age || age < MIN_VALID_AGE) {
    console.warn("[workoutBuilderAi] Missing or invalid age — worker profile incomplete");
    return null;
  }

  const gender = personalInfo.gender ?? "prefer_not_to_say";
  const rawGoal = workoutPreferences.primary_goals?.[0] ?? "general_fitness";
  const fitnessGoal = mapFitnessGoal(rawGoal);
  const experienceLevel = mapExperienceLevel(
    workoutPreferences.intensity ?? "beginner",
  );
  const availableEquipment = mapEquipment(
    workoutPreferences.available_equipment ?? workoutPreferences.equipment ?? ["body weight"],
  );

  // Per CLAUDE.md §8: no hardcoded fallbacks for user data. Surface real
  // values from workoutPreferences; warn when missing so the developer sees
  // the gap. The worker treats workoutDuration/workoutsPerWeek as optional
  // on the profile object, so undefined is the correct "missing" signal.
  const workoutDuration = workoutPreferences.time_preference;
  if (workoutDuration === undefined) {
    console.warn("[workoutBuilderAi] time_preference missing on workoutPreferences — workoutDuration will be undefined");
  }
  const workoutsPerWeek = workoutPreferences.workout_frequency_per_week;
  if (workoutsPerWeek === undefined) {
    console.warn("[workoutBuilderAi] workout_frequency_per_week missing on workoutPreferences — workoutsPerWeek will be undefined");
  }

  return {
    age,
    gender,
    weight: bodyAnalysis?.current_weight_kg ?? null,
    height: bodyAnalysis?.height_cm ?? null,
    fitnessGoal,
    experienceLevel,
    availableEquipment,
    workoutDuration,
    workoutsPerWeek,
    injuries: bodyAnalysis?.physical_limitations,
    medicalConditions: bodyAnalysis?.medical_conditions,
    pregnancyStatus: bodyAnalysis?.pregnancy_status,
    pregnancyTrimester: bodyAnalysis?.pregnancy_trimester,
  };
}

function mapFitnessGoal(raw: string): string {
  const map: Record<string, string> = {
    weight_loss: "weight_loss",
    lose_weight: "weight_loss",
    muscle_gain: "muscle_gain",
    build_muscle: "muscle_gain",
    maintenance: "maintenance",
    general_fitness: "maintenance",
    strength: "strength",
    endurance: "endurance",
    flexibility: "flexibility",
    athletic_performance: "athletic_performance",
  };
  return map[raw] ?? "maintenance";
}

function mapExperienceLevel(
  raw: string,
): "beginner" | "intermediate" | "advanced" {
  const lower = raw.toLowerCase();
  if (lower.includes("adv")) return "advanced";
  if (lower.includes("inter")) return "intermediate";
  return "beginner";
}

/**
 * Onboarding equipment slug → worker EquipmentSchema enum term.
 *
 * BUG FIX: `buildWorkerProfile` previously just lowercased the raw onboarding
 * slugs (WorkoutPreferencesConstants.EQUIPMENT_OPTIONS: "bodyweight",
 * "dumbbells", "resistance-bands", "kettlebells", "pull-up-bar", "yoga-mat",
 * "treadmill", "stationary-bike", ...) and sent them straight to the worker.
 * Only "barbell" happened to already match the worker's EquipmentSchema
 * (fitai-workers/src/utils/validation.ts — singular terms with spaces, e.g.
 * "dumbbell", "resistance band", "stationary bike"), so EVERY other value
 * failed 400 validation — breaking suggest-day, natural-language edit, and
 * every other builder-AI endpoint for any user who selected equipment beyond
 * barbell. This is the same class of enum-boundary gap CLAUDE.md documents
 * for activity_level/diet_type, just missing for equipment.
 *
 * "pull-up-bar" and "yoga-mat" have no equipment-schema equivalent at all
 * (ExerciseDB's own vocabulary — which EquipmentSchema mirrors — doesn't tag
 * either as loadable/machine equipment); "treadmill" likewise has no direct
 * match (the schema's cardio machines are elliptical/stepmill/skierg/
 * stationary bike, not treadmill). Rather than mis-map these to something
 * misleading, they're dropped — the worker profile still correctly reflects
 * every OTHER piece of equipment the user has.
 */
export function mapEquipment(raw: string[]): string[] {
  const map: Record<string, string> = {
    bodyweight: "body weight",
    dumbbells: "dumbbell",
    "resistance-bands": "resistance band",
    kettlebells: "kettlebell",
    barbell: "barbell",
    "stationary-bike": "stationary bike",
  };
  const mapped = raw
    .map((e) => map[e.toLowerCase()])
    .filter((e): e is string => Boolean(e));
  // Schema requires >=1 entry (.min(1)) — fall back to its own documented
  // default rather than sending an empty array if nothing mapped.
  return mapped.length > 0 ? mapped : ["body weight"];
}

// ----------------------------------------------------------------------------
// ERROR HANDLER
// ----------------------------------------------------------------------------

function handleError(error: unknown, context: string): AiServiceResult<never> {
  console.error(`[workoutBuilderAi] ${context} failed:`, error);

  // A session-expired user retrying a 401 endlessly can never succeed without
  // re-authenticating — mark it non-retryable so the UI offers a re-sign-in
  // affordance instead of a "try again" loop. Mirrors src/ai/index.ts's
  // handleError, which all six builder-AI endpoints previously did NOT share.
  if (error instanceof AuthenticationError) {
    return {
      success: false,
      error: "Authentication required. Please sign in to use AI features.",
      retryable: false,
    };
  }

  if (error instanceof WorkersAPIError) {
    const retryable = error.statusCode >= 500 || error.statusCode === 429;
    const friendlyMessage =
      error.statusCode === 401 || error.statusCode === 403
        ? "Authentication required. Please sign in again."
        : error.statusCode === 429
          ? "You're sending requests too quickly. Please wait a moment and try again."
          : error.statusCode >= 500
            ? "Our servers are having trouble right now. Please try again shortly."
            : "Something about that request was invalid. Please try again.";
    return {
      success: false,
      error: friendlyMessage,
      retryable,
    };
  }

  if (error instanceof NetworkError) {
    return {
      success: false,
      error: "Network error. Please check your connection and try again.",
      retryable: true,
    };
  }

  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return {
    success: false,
    error: message,
    retryable: true,
  };
}

/**
 * Derive `retryable` for a `!response.success` WorkersResponse.
 *
 * makeRequest() (fitaiWorkersClient.ts) only returns a `success: false`
 * response (rather than throwing, which handleError() above already marks
 * retryable) in two cases: `isOffline` (transport fault, retries exhausted —
 * transient) or a 200-status backend business-logic failure (e.g. plan
 * validation rejected the request — not transient). This mirrors the
 * retryable classification already established in src/ai/index.ts's
 * handleError() for WorkersAPIError/NetworkError.
 */
function isRetryableFailure(response: { isOffline?: boolean }): boolean {
  return response.isOffline === true;
}

// ----------------------------------------------------------------------------
// SERVICE
// ----------------------------------------------------------------------------

class WorkoutBuilderAiService {
  /**
   * Suggest complementary exercises for a day. Caches results in
   * workoutBuilderStore.aiSuggestions so the picker can render them without
   * a refetch on every open.
   */
  async suggestDay(params: SuggestDayParams): Promise<AiServiceResult<SuggestDayResult>> {
    try {
      const profile = buildWorkerProfile();
      if (!profile) {
        return {
          success: false,
          error: "Complete your profile (age, gender, goal, experience) to use AI suggestions.",
        };
      }

      const { volumeLandmarkContext, mesocycleContext } = buildCoachContext(profile.experienceLevel);

      const response = await fitaiWorkersClient.suggestDay({
        dayIndex: params.dayIndex,
        // BUG FIX: this used to reshape each exercise into an ad-hoc
        // {exerciseId, name, targetMuscles, bodyParts, sets: number, reps,
        // restSeconds} object — targetMuscles/bodyParts don't exist on the
        // worker's PlannedExerciseSchema at all, and `sets` was sent as the
        // SET COUNT where the schema expects the actual PlannedSet[] array,
        // so every suggest-day call failed 400 validation
        // ("currentExercises.0.sets: Invalid input: expected array,
        // received number"). params.currentExercises is already
        // PlannedExercise[] (src/types/workout.ts), which mirrors
        // PlannedExerciseSchema field-for-field — pass it through as-is.
        currentExercises: params.currentExercises,
        profile,
        goals: params.goals,
        weekNumber: params.weekNumber,
        volumeLandmarkContext,
        mesocycleContext,
        skipCache: params.skipCache,
      });

      if (!response.success || !response.data) {
        console.error("[workoutBuilderAi] suggest-day worker error:", response.error);
        return {
          success: false,
          error: response.error ?? "Failed to get suggestions",
          retryable: isRetryableFailure(response),
        };
      }

      const suggestions: AiSuggestion[] = (response.data.suggestedExercises ?? []).map((s) => ({
        exerciseId: s.exerciseId,
        name: s.name,
        reason: s.reason,
        confidence: s.confidence,
        muscleGroup: s.muscleGroup,
        sets: s.sets,
        reps: s.reps,
        restSeconds: s.restSeconds,
      }));

      // Cache in the store so the picker panel can read them.
      useWorkoutBuilderStore.getState().setAiSuggestions(suggestions);

      return {
        success: true,
        data: {
          suggestions,
          confidence: response.data.confidence,
          reasoning: response.data.reasoning,
        },
      };
    } catch (error) {
      return handleError(error, "suggestDay");
    }
  }

  /**
   * Validate a plan — returns warnings + fixActions. Does NOT mutate the store
   * (the WeeklyBuilderScreen owns the validation effect that pushes warnings
   * to the store; this is the server-side reinforcement).
   */
  async validatePlan(params: ValidatePlanParams): Promise<AiServiceResult<ValidatePlanResult>> {
    try {
      const profile = buildWorkerProfile();

      const response = await fitaiWorkersClient.validateWorkoutPlan({
        plan: params.plan,
        profile: profile ?? undefined,
        skipCache: params.skipCache,
      });

      if (!response.success || !response.data) {
        console.error("[workoutBuilderAi] validate worker error:", response.error);
        return {
          success: false,
          error: response.error ?? "Failed to validate plan",
          retryable: isRetryableFailure(response),
        };
      }

      return {
        success: true,
        data: {
          warnings: (response.data.warnings ?? []) as ValidationWarning[],
          fixActions: (response.data.fixActions ?? []) as ValidatePlanResult["fixActions"],
        },
      };
    } catch (error) {
      return handleError(error, "validatePlan");
    }
  }

  /**
   * Apply a natural-language edit instruction to the plan. Returns the full
   * updated plan + a 1-sentence summary of changes.
   */
  async editNaturalLanguage(
    params: EditNaturalLanguageParams,
  ): Promise<AiServiceResult<EditNaturalLanguageResult>> {
    try {
      const profile = buildWorkerProfile();

      const response = await fitaiWorkersClient.editWorkoutNaturalLanguage({
        plan: params.plan,
        instruction: params.instruction,
        profile: profile ?? undefined,
        skipCache: params.skipCache,
      });

      if (!response.success || !response.data) {
        console.error("[workoutBuilderAi] edit-nl worker error:", response.error);
        return {
          success: false,
          error: response.error ?? "Failed to apply edit",
          retryable: isRetryableFailure(response),
        };
      }

      return {
        success: true,
        data: {
          updatedPlan: response.data.updatedPlan as WeeklyWorkoutPlan,
          summary: response.data.summary,
        },
      };
    } catch (error) {
      return handleError(error, "editNaturalLanguage");
    }
  }

  /**
   * Generate a full week from a partial plan (≥2 filled days). Fills empty
   * days with complementary workouts.
   */
  async generateFullWeek(
    params: GenerateFullWeekParams,
  ): Promise<AiServiceResult<GenerateFullWeekResult>> {
    try {
      const profile = buildWorkerProfile();
      if (!profile) {
        return {
          success: false,
          error: "Complete your profile to use AI week generation.",
        };
      }

      const { volumeLandmarkContext, mesocycleContext } = buildCoachContext(profile.experienceLevel);

      const response = await fitaiWorkersClient.generateFullWeek({
        partialPlan: params.partialPlan,
        profile,
        weekNumber: params.partialPlan.weekNumber,
        volumeLandmarkContext,
        mesocycleContext,
        skipCache: params.skipCache,
      });

      if (!response.success || !response.data) {
        console.error("[workoutBuilderAi] generate-full-week worker error:", response.error);
        return {
          success: false,
          error: response.error ?? "Failed to generate full week",
          retryable: isRetryableFailure(response),
        };
      }

      return {
        success: true,
        data: {
          completePlan: response.data.completePlan as WeeklyWorkoutPlan,
          daysGenerated: response.data.daysGenerated,
        },
      };
    } catch (error) {
      return handleError(error, "generateFullWeek");
    }
  }

  /**
   * Apply Double Progression based on prior performance. The worker implements
   * the same logic as progressionService.ts server-side.
   */
  async applyProgression(
    params: ApplyProgressionParams,
  ): Promise<AiServiceResult<ApplyProgressionResult>> {
    try {
      const response = await fitaiWorkersClient.applyProgression({
        plan: params.plan,
        priorPerformance: params.priorPerformance,
        skipCache: params.skipCache,
      });

      if (!response.success || !response.data) {
        console.error("[workoutBuilderAi] apply-progression worker error:", response.error);
        return {
          success: false,
          error: response.error ?? "Failed to apply progression",
          retryable: isRetryableFailure(response),
        };
      }

      return {
        success: true,
        data: {
          updatedPlan: response.data.updatedPlan as WeeklyWorkoutPlan,
          changes: response.data.changes,
        },
      };
    } catch (error) {
      return handleError(error, "applyProgression");
    }
  }

  /**
   * Apply a deload week (≈40% volume reduction — matches
   * deloadService.checkProactiveDeload's advisory banner and
   * generateDeloadPlan's reductionFactor). The actual reduction logic runs
   * server-side in the Worker; deloadService's client-side functions are
   * advisory/estimate-only, not the enforced source of truth for what the
   * Worker computes.
   */
  async deloadPlan(params: DeloadParams): Promise<AiServiceResult<DeloadResult>> {
    try {
      const response = await fitaiWorkersClient.deloadWorkoutPlan({
        plan: params.plan,
        skipCache: params.skipCache,
      });

      if (!response.success || !response.data) {
        console.error("[workoutBuilderAi] deload worker error:", response.error);
        return {
          success: false,
          error: response.error ?? "Failed to deload plan",
          retryable: isRetryableFailure(response),
        };
      }

      return {
        success: true,
        data: {
          deloadPlan: response.data.deloadPlan as WeeklyWorkoutPlan,
          volumeReductionPercent: response.data.volumeReductionPercent,
        },
      };
    } catch (error) {
      return handleError(error, "deloadPlan");
    }
  }
}

export const workoutBuilderAi = new WorkoutBuilderAiService();
export default workoutBuilderAi;
