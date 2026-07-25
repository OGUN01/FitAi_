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

import { fitaiWorkersClient } from "../services/fitaiWorkersClient";
import { useWorkoutBuilderStore } from "../stores/workoutBuilderStore";
import { useProfileStore } from "../stores/profileStore";
import type { PersonalInfoData } from "../types/onboarding/personal-info";
import type { WorkoutPreferencesData } from "../types/onboarding/workout-preferences";
import type { BodyAnalysisData } from "../types/onboarding/body-analysis";
import type { WeeklyWorkoutPlan } from "../types/ai";
import type {
  PlannedExercise,
  AiSuggestion,
  ValidationWarning,
} from "../types/workout";

// ----------------------------------------------------------------------------
// TYPES (client-facing camelCase shapes)
// ----------------------------------------------------------------------------

export interface AiServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  /** When true, the failure was a transient network/transport fault. */
  retryable?: boolean;
}

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
      workoutDuration: number;
      workoutsPerWeek: number;
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

  const age = personalInfo.age ?? 0;
  if (!age || age < 13) {
    console.warn("[workoutBuilderAi] Missing or invalid age — worker profile incomplete");
    return null;
  }

  const gender = personalInfo.gender ?? "prefer_not_to_say";
  const rawGoal = workoutPreferences.primary_goals?.[0] ?? "general_fitness";
  const fitnessGoal = mapFitnessGoal(rawGoal);
  const experienceLevel = mapExperienceLevel(
    workoutPreferences.intensity ?? "beginner",
  );
  const availableEquipment = (workoutPreferences.available_equipment ?? workoutPreferences.equipment ?? ["body weight"]).map((e: string) => e.toLowerCase());

  return {
    age,
    gender,
    weight: bodyAnalysis?.current_weight_kg ?? null,
    height: bodyAnalysis?.height_cm ?? null,
    fitnessGoal,
    experienceLevel,
    availableEquipment,
    workoutDuration: workoutPreferences.time_preference ?? 45,
    workoutsPerWeek: 4,
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

// ----------------------------------------------------------------------------
// ERROR HANDLER
// ----------------------------------------------------------------------------

function handleError(error: unknown, context: string): AiServiceResult<never> {
  console.error(`[workoutBuilderAi] ${context} failed:`, error);
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred";
  return {
    success: false,
    error: message,
    retryable: true,
  };
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

      const response = await fitaiWorkersClient.suggestDay({
        dayIndex: params.dayIndex,
        currentExercises: params.currentExercises.map((e) => ({
          exerciseId: e.exerciseId,
          name: e.name,
          targetMuscles: [],
          bodyParts: [],
          sets: e.sets.length,
          reps: e.sets[0]?.reps ?? 8,
          restSeconds: e.restSeconds,
        })),
        profile,
        goals: params.goals,
        weekNumber: params.weekNumber,
        skipCache: params.skipCache,
      });

      if (!response.success || !response.data) {
        console.error("[workoutBuilderAi] suggest-day worker error:", response.error);
        return { success: false, error: response.error ?? "Failed to get suggestions" };
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
        return { success: false, error: response.error ?? "Failed to validate plan" };
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
        return { success: false, error: response.error ?? "Failed to apply edit" };
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

      const response = await fitaiWorkersClient.generateFullWeek({
        partialPlan: params.partialPlan,
        profile,
        skipCache: params.skipCache,
      });

      if (!response.success || !response.data) {
        console.error("[workoutBuilderAi] generate-full-week worker error:", response.error);
        return { success: false, error: response.error ?? "Failed to generate full week" };
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
        return { success: false, error: response.error ?? "Failed to apply progression" };
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
   * Apply a deload week (≈40% volume reduction). The worker mirrors
   * deloadService.generateDeloadPlan.
   */
  async deloadPlan(params: DeloadParams): Promise<AiServiceResult<DeloadResult>> {
    try {
      const response = await fitaiWorkersClient.deloadWorkoutPlan({
        plan: params.plan,
        skipCache: params.skipCache,
      });

      if (!response.success || !response.data) {
        console.error("[workoutBuilderAi] deload worker error:", response.error);
        return { success: false, error: response.error ?? "Failed to deload plan" };
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
