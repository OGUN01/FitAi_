/**
 * FitAI Workers - Workout Builder AI Handler (Phase 9)
 *
 * 6 endpoints powering AI assists in the custom workout builder:
 *  - POST /workout/suggest-day         → complementary exercise suggestions
 *  - POST /workout/validate            → muscle-balance + safety warnings + fixActions
 *  - POST /workout/edit-natural-language → NL instruction → updated plan
 *  - POST /workout/generate-full-week  → fill missing days from a partial plan
 *  - POST /workout/apply-progression   → Double Progression on prior performance
 *  - POST /workout/deload              → 40% volume reduction deload week
 *
 * Pattern (mirrors workoutGeneration.ts):
 *   validateRequest → cache check (KV → DB → Fresh) → withDeduplication →
 *   generate* → saveCachedData → return.
 *
 * Cache keying: per-endpoint, so suggest-day and validate never collide.
 */

import { Context } from 'hono';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createAIProvider } from '../utils/aiProvider';
import { Env } from '../utils/types';
import { AuthContext } from '../middleware/auth';
import {
  validateRequest,
  SuggestDayRequestSchema,
  ValidatePlanRequestSchema,
  EditNaturalLanguageRequestSchema,
  GenerateFullWeekRequestSchema,
  ApplyProgressionRequestSchema,
  DeloadRequestSchema,
  SuggestDayResponseSchema,
  EditNaturalLanguageResponseSchema,
  GenerateFullWeekResponseSchema,
  ApplyProgressionResponseSchema,
  DeloadResponseSchema,
  type SuggestDayRequest,
  type ValidatePlanRequest,
  type EditNaturalLanguageRequest,
  type GenerateFullWeekRequest,
  type ApplyProgressionRequest,
  type DeloadRequest,
} from '../utils/validation';
import { validateMuscleBalance } from '../utils/exerciseSelection';
import { getCachedData, saveCachedData, CacheMetadata } from '../utils/cache';
import { ValidationError, APIError } from '../utils/errors';
import { ErrorCode } from '../utils/errorCodes';
import { withDeduplication } from '../utils/deduplication';
import { getAIConfig } from '../utils/appConfig';

// ============================================================================
// SHARED HELPERS
// ============================================================================

interface BuilderDayWorkout {
  id: string;
  title: string;
  description: string;
  dayOfWeek: string;
  plannedExercises: Array<{
    exerciseId: string;
    name: string;
    targetMuscles?: string[];
    bodyParts?: string[];
  }>;
  exercises: unknown[];
}

interface BuilderPlan {
  id: string;
  weekNumber: number;
  workouts: BuilderDayWorkout[];
  planTitle?: string;
  planDescription?: string;
  restDays?: (string | number)[];
  totalEstimatedCalories?: number;
}

/**
 * Extract the day-of-week label for the given day index.
 */
function dayLabel(dayIndex: number): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  return days[dayIndex] ?? `day-${dayIndex}`;
}

/**
 * Build a stable cache-key params object for a builder endpoint. We only hash
 * the semantically-relevant fields (not the entire plan blob) so equivalent
 * inputs collide regardless of irrelevant metadata (timestamps, ids).
 */
function planCacheFingerprint(plan: BuilderPlan): Record<string, unknown> {
  return {
    weekNumber: plan.weekNumber,
    days: plan.workouts.map((w) => ({
      dow: w.dayOfWeek,
      ex: w.plannedExercises.map((e) => e.exerciseId),
    })),
  };
}

/**
 * Run a generator function through the 3-tier cache + deduplication pipeline.
 * Returns the standard { success, data, metadata } Hono response shape.
 */
async function runWithCacheAndDedup<TData>(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
  cacheType: 'workout',
  cacheParams: Record<string, unknown>,
  skipCache: boolean,
  generator: () => Promise<{ data: TData; metadata: CacheMetadata }>,
): Promise<Response> {
  const startTime = Date.now();
  const user = c.get('user');
  const userId = user?.id;

  // 1. Cache check (KV → DB → Fresh)
  const cacheResult = await getCachedData(c.env, cacheType, cacheParams, userId);

  if (cacheResult.hit && !skipCache) {
    console.log(`[WorkoutBuilderAi] Cache HIT from ${cacheResult.source}`);
    return c.json(
      {
        success: true,
        data: cacheResult.data,
        metadata: {
          cached: true,
          cacheSource: cacheResult.source,
          generationTime: Date.now() - startTime,
        },
      },
      200,
    );
  }

  console.log('[WorkoutBuilderAi] Cache MISS - generating fresh');

  // 2. Deduplication
  const deduplicationResult = await withDeduplication(
    c.env,
    cacheResult.cacheKey!,
    generator,
  );

  if (deduplicationResult.deduplicated) {
    console.log(`[WorkoutBuilderAi] DEDUPLICATED (waited ${deduplicationResult.waitTime}ms)`);
    return c.json(
      {
        success: true,
        data: deduplicationResult.data.data,
        metadata: {
          ...deduplicationResult.data.metadata,
          cached: false,
          deduplicated: true,
          waitTime: deduplicationResult.waitTime,
          generationTime: Date.now() - startTime,
        },
      },
      200,
    );
  }

  // 3. Fresh result — save to cache
  const result = deduplicationResult.data;
  await saveCachedData(c.env, cacheType, cacheResult.cacheKey!, result.data, result.metadata, userId);

  return c.json(
    {
      success: true,
      data: result.data,
      metadata: {
        ...result.metadata,
        cached: false,
        deduplicated: false,
        generationTime: Date.now() - startTime,
      },
    },
    200,
  );
}

/**
 * Shared error handler — mirrors workoutGeneration.ts's catch block.
 */
function handleBuilderError(error: unknown, context: string): APIError {
  console.error(`[WorkoutBuilderAi] ${context} error:`, error);

  if (error instanceof ValidationError || error instanceof APIError) {
    return error;
  }

  if (error instanceof Error && error.message.includes('timed out')) {
    return new APIError(
      `${context} timed out. Please try again.`,
      408,
      ErrorCode.AI_GENERATION_FAILED,
      { error: error.message },
    );
  }

  return new APIError(
    `Failed during ${context}. Please try again.`,
    500,
    ErrorCode.AI_GENERATION_FAILED,
    { error: error instanceof Error ? error.message : String(error) },
  );
}

// ============================================================================
// 1. POST /workout/suggest-day
// ============================================================================

export async function handleSuggestDay(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
): Promise<Response> {
  try {
    const request: SuggestDayRequest = validateRequest(SuggestDayRequestSchema, await c.req.json());
    const user = c.get('user');
    const userId = user?.id;

    console.log('[WorkoutBuilderAi] suggest-day:', {
      dayIndex: request.dayIndex,
      currentCount: request.currentExercises.length,
      experience: request.profile.experienceLevel,
    });

    const cacheParams = {
      endpoint: 'suggest-day',
      dayIndex: request.dayIndex,
      currentExerciseIds: request.currentExercises.map((e) => e.exerciseId).sort().join(','),
      experienceLevel: request.profile.experienceLevel,
      equipment: request.profile.availableEquipment.sort().join(','),
      fitnessGoal: request.profile.fitnessGoal,
      goals: (request.goals ?? []).sort().join(','),
      weekNumber: request.weekNumber ?? 1,
    };

    return await runWithCacheAndDedup(
      c,
      'workout',
      cacheParams,
      request.skipCache,
      async () => generateSuggestDay(request, c.env, userId),
    );
  } catch (error) {
    throw handleBuilderError(error, 'suggest-day');
  }
}

async function generateSuggestDay(
  request: SuggestDayRequest,
  env: Env,
  userId?: string,
): Promise<{ data: z.infer<typeof SuggestDayResponseSchema>; metadata: CacheMetadata }> {
  const currentNames = request.currentExercises.map((e) => `${e.exerciseId} (${e.name})`);
  const currentMuscles = new Set<string>();
  for (const ex of request.currentExercises) {
    (ex as unknown as { targetMuscles?: string[] }).targetMuscles?.forEach((m) =>
      currentMuscles.add(m.toLowerCase()),
    );
  }

  const prompt = `You are FitAI, an expert personal trainer. Suggest complementary exercises for a workout day.

**User Profile:**
- Experience: ${request.profile.experienceLevel}
- Goal: ${request.profile.fitnessGoal.replace('_', ' ')}
- Equipment: ${request.profile.availableEquipment.join(', ')}
- Injuries: ${(request.profile.injuries ?? []).join(', ') || 'none'}
${request.goals && request.goals.length > 0 ? `- Session goals: ${request.goals.join(', ')}` : ''}

**Current exercises on this day (Day ${request.dayIndex + 1} — ${dayLabel(request.dayIndex)}):**
${currentNames.length > 0 ? currentNames.map((n, i) => `${i + 1}. ${n}`).join('\n') : '(empty day — suggest foundational movements)'}

**Currently targeted muscles:** ${currentMuscles.size > 0 ? Array.from(currentMuscles).join(', ') : 'none yet'}

**Task:** Suggest 3-6 complementary exercises that:
1. Fill gaps in muscle coverage (prioritize muscles NOT yet hit today)
2. Balance push/pull if skewed
3. Match the user's equipment + experience level
4. Respect injuries (avoid contraindicated movements)
5. Are NOT duplicates of current exercises

Return JSON: { "suggestedExercises": [{ "exerciseId", "name", "reason", "confidence" (0-1), "muscleGroup", "sets", "reps" (number or "8-12"), "restSeconds" }], "confidence" (0-1 overall), "reasoning" (1-2 sentences) }`;

  const aiConfig = await getAIConfig(env);
  const model = createAIProvider(env, aiConfig.model);
  const aiStartTime = Date.now();

  const result = await generateObject({
    model,
    schema: SuggestDayResponseSchema,
    prompt,
    temperature: request.temperature,
    maxOutputTokens: 2048,
  });

  const aiGenerationTime = Date.now() - aiStartTime;

  if (!result.object) {
    throw new APIError('AI returned empty suggestion response', 500, ErrorCode.AI_INVALID_RESPONSE);
  }

  return {
    data: result.object,
    metadata: {
      modelUsed: request.model,
      generationTimeMs: aiGenerationTime,
      tokensUsed: result.usage?.totalTokens,
      costUsd: 0,
    },
  };
}

// ============================================================================
// 2. POST /workout/validate
// ============================================================================

export async function handleValidatePlan(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
): Promise<Response> {
  try {
    const request: ValidatePlanRequest = validateRequest(ValidatePlanRequestSchema, await c.req.json());

    console.log('[WorkoutBuilderAi] validate:', {
      workouts: request.plan.workouts.length,
      hasProfile: !!request.profile,
    });

    // Validation is deterministic (no AI call) — but we still cache the result
    // so re-renders don't recompute. Dedup is cheap here.
    const cacheParams = {
      endpoint: 'validate',
      plan: planCacheFingerprint(request.plan as unknown as BuilderPlan),
    };

    return await runWithCacheAndDedup(
      c,
      'workout',
      cacheParams,
      request.skipCache,
      async () => generateValidatePlan(request),
    );
  } catch (error) {
    throw handleBuilderError(error, 'validate');
  }
}

/**
 * Validate a builder plan. Wraps the worker-side validateMuscleBalance
 * (exerciseSelection.ts) plus safety checks (pregnancy/injury). Returns
 * warnings + fixActions that the InlineValidationBanner can act on.
 */
async function generateValidatePlan(
  request: ValidatePlanRequest,
): Promise<{ data: { warnings: unknown[]; fixActions: unknown[] }; metadata: CacheMetadata }> {
  const plan = request.plan;
  const warnings: Array<{
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'error';
    message: string;
    exerciseId?: string;
    dayIndex?: number;
    fixAction?: { label: string; type: string; payload?: Record<string, unknown> };
  }> = [];

  // ── 1. Muscle balance (reuse exerciseSelection.validateMuscleBalance shape) ──
  // Build a WeeklyExercisePlan-like shape so validateMuscleBalance can count hits.
  const muscleWarnings = validateMuscleBalance({
    weekNumber: plan.weekNumber,
    workouts: plan.workouts.map((w) => ({
      dayName: w.dayOfWeek,
      workoutType: w.subCategory || 'full_body',
      exercises: w.plannedExercises.map((e) => ({
        exerciseId: e.exerciseId,
        name: e.name,
        classification: 'isolation' as const,
        complexityScore: 3,
        targetMuscles: (e as unknown as { targetMuscles?: string[] }).targetMuscles ?? [],
        secondaryMuscles: (e as unknown as { secondaryMuscles?: string[] }).secondaryMuscles ?? [],
        bodyParts: [],
        equipments: [],
        instructions: [],
        metadata: { isHighImpact: false },
      })) as never[],
      totalExercises: w.plannedExercises.length,
      distribution: { compound: 0, auxiliary: 0, isolation: 0 },
    })),
    totalExercisesPerWeek: plan.workouts.reduce((s, w) => s + w.plannedExercises.length, 0),
  } as never);

  for (const w of muscleWarnings) {
    const muscleMatch = w.match(/^(\w+)\s+only trained (\d+)x/);
    const muscle = muscleMatch?.[1] ?? w;
    warnings.push({
      id: `muscle-${muscle}-${Date.now()}`,
      type: 'muscle_imbalance',
      severity: 'warning',
      message: w,
      fixAction: {
        label: 'Add exercise',
        type: 'add_exercise',
        payload: { muscleGroup: muscle },
      },
    });
  }

  // ── 2. Excessive volume per day (>6 exercises for beginner, >8 advanced) ──
  const maxPerDay = request.profile?.experienceLevel === 'advanced' ? 8 : 6;
  plan.workouts.forEach((day, dayIndex) => {
    if (day.plannedExercises.length > maxPerDay) {
      warnings.push({
        id: `volume-${day.dayOfWeek}-${dayIndex}`,
        type: 'excessive_volume',
        severity: 'warning',
        message: `${day.dayOfWeek}: ${day.plannedExercises.length} exercises may be too much (recommend ≤${maxPerDay}).`,
        dayIndex,
        fixAction: {
          label: 'Reduce volume',
          type: 'adjust_volume',
          payload: { dayIndex, currentCount: day.plannedExercises.length, maxPerDay },
        },
      });
    }
  });

  // ── 3. Safety: pregnancy + injury constraints ──
  if (request.profile?.pregnancyStatus) {
    const contraindicated = ['barbell', 'olympic barbell', 'trap bar'];
    plan.workouts.forEach((day, dayIndex) => {
      day.plannedExercises.forEach((ex) => {
        const equipment = (ex as unknown as { equipment?: string[] }).equipment ?? [];
        if (equipment.some((e) => contraindicated.includes(e.toLowerCase()))) {
          warnings.push({
            id: `safety-${ex.exerciseId}-${dayIndex}`,
            type: 'safety_constraint',
            severity: 'error',
            message: `${ex.name} may be contraindicated during pregnancy (heavy barbell load).`,
            exerciseId: ex.exerciseId,
            dayIndex,
            fixAction: {
              label: 'Replace exercise',
              type: 'replace_exercise',
              payload: { exerciseId: ex.exerciseId, dayIndex },
            },
          });
        }
      });
    });
  }

  const injuries = request.profile?.injuries ?? [];
  if (injuries.length > 0) {
    const lowerInjuries = injuries.map((i) => i.toLowerCase());
    plan.workouts.forEach((day, dayIndex) => {
      day.plannedExercises.forEach((ex) => {
        const bodyParts = (ex as unknown as { bodyParts?: string[] }).bodyParts ?? [];
        if (bodyParts.some((bp) => lowerInjuries.some((inj) => bp.toLowerCase().includes(inj)))) {
          warnings.push({
            id: `injury-${ex.exerciseId}-${dayIndex}`,
            type: 'safety_constraint',
            severity: 'warning',
            message: `${ex.name} may stress an injured area (${injuries.join(', ')}).`,
            exerciseId: ex.exerciseId,
            dayIndex,
            fixAction: {
              label: 'Replace exercise',
              type: 'replace_exercise',
              payload: { exerciseId: ex.exerciseId, dayIndex },
            },
          });
        }
      });
    });
  }

  // ── 4. Recovery conflict (same muscle group hit on consecutive days) ──
  const muscleByDay: Set<string>[] = plan.workouts.map((day) => {
    const set = new Set<string>();
    day.plannedExercises.forEach((ex) => {
      (ex as unknown as { targetMuscles?: string[] }).targetMuscles?.forEach((m) =>
        set.add(m.toLowerCase()),
      );
    });
    return set;
  });

  for (let i = 1; i < muscleByDay.length; i++) {
    const prev = muscleByDay[i - 1];
    const curr = muscleByDay[i];
    const overlap = Array.from(curr).filter((m) => prev.has(m));
    if (overlap.length >= 3) {
      warnings.push({
        id: `recovery-${i}`,
        type: 'recovery_conflict',
        severity: 'warning',
        message: `Days ${dayLabel(i - 1)} and ${dayLabel(i)} both heavily target ${overlap.slice(0, 3).join(', ')} — consider a rest day between.`,
        dayIndex: i,
      });
    }
  }

  // ── Aggregate fixActions from warnings that carry them ──
  const fixActions = warnings
    .filter((w) => w.fixAction)
    .map((w) => ({
      label: w.fixAction!.label,
      type: w.fixAction!.type,
      dayIndex: w.dayIndex,
      payload: w.fixAction!.payload,
    }));

  return {
    data: { warnings, fixActions },
    metadata: {
      modelUsed: 'rule-based-validation',
      generationTimeMs: 0,
      tokensUsed: 0,
      costUsd: 0,
    },
  };
}

// ============================================================================
// 3. POST /workout/edit-natural-language
// ============================================================================

export async function handleEditNaturalLanguage(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
): Promise<Response> {
  try {
    const request: EditNaturalLanguageRequest = validateRequest(
      EditNaturalLanguageRequestSchema,
      await c.req.json(),
    );
    const user = c.get('user');
    const userId = user?.id;

    console.log('[WorkoutBuilderAi] edit-nl:', {
      instruction: request.instruction.slice(0, 80),
      workouts: request.plan.workouts.length,
    });

    const cacheParams = {
      endpoint: 'edit-nl',
      instruction: request.instruction,
      plan: planCacheFingerprint(request.plan as unknown as BuilderPlan),
      experienceLevel: request.profile?.experienceLevel ?? 'intermediate',
    };

    return await runWithCacheAndDedup(
      c,
      'workout',
      cacheParams,
      request.skipCache,
      async () => generateEditNaturalLanguage(request, c.env, userId),
    );
  } catch (error) {
    throw handleBuilderError(error, 'edit-natural-language');
  }
}

async function generateEditNaturalLanguage(
  request: EditNaturalLanguageRequest,
  env: Env,
  _userId?: string,
): Promise<{ data: z.infer<typeof EditNaturalLanguageResponseSchema>; metadata: CacheMetadata }> {
  const planJson = JSON.stringify(request.plan, null, 2);

  const prompt = `You are FitAI, an expert personal trainer. Apply the user's instruction to their weekly workout plan.

**User instruction:** "${request.instruction}"

**Current plan (JSON):**
${planJson}

${request.profile ? `**User profile:** ${request.profile.experienceLevel}, goal: ${request.profile.fitnessGoal.replace('_', ' ')}, equipment: ${request.profile.availableEquipment.join(', ')}` : ''}

**Rules:**
1. Apply the instruction faithfully (e.g. "Make Friday heavier" → increase sets/reps/weight on Friday; "Reduce to 45 minutes" → cut exercises to fit 45 min; "Replace barbell with dumbbells" → swap equipment).
2. Preserve the plan's id, weekNumber, and overall structure.
3. Keep each day's plannedExercises array coherent (sets, reps, restSeconds must be valid).
4. Do NOT introduce exercises outside the user's available equipment.
5. Respect injuries if listed in the profile.
6. Return the FULL updated plan (not a diff) plus a 1-sentence summary of what changed.

Return JSON: { "updatedPlan": {full plan}, "summary": "..." }`;

  const aiConfig = await getAIConfig(env);
  const model = createAIProvider(env, aiConfig.model);
  const aiStartTime = Date.now();

  const result = await generateObject({
    model,
    schema: EditNaturalLanguageResponseSchema,
    prompt,
    temperature: request.temperature,
    maxOutputTokens: 8192,
  });

  const aiGenerationTime = Date.now() - aiStartTime;

  if (!result.object?.updatedPlan) {
    throw new APIError('AI returned empty edit response', 500, ErrorCode.AI_INVALID_RESPONSE);
  }

  return {
    data: result.object,
    metadata: {
      modelUsed: request.model,
      generationTimeMs: aiGenerationTime,
      tokensUsed: result.usage?.totalTokens,
      costUsd: 0,
    },
  };
}

// ============================================================================
// 4. POST /workout/generate-full-week
// ============================================================================

export async function handleGenerateFullWeek(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
): Promise<Response> {
  try {
    const request: GenerateFullWeekRequest = validateRequest(
      GenerateFullWeekRequestSchema,
      await c.req.json(),
    );
    const user = c.get('user');
    const userId = user?.id;

    const filledDays = request.partialPlan.workouts.filter(
      (d) => d.plannedExercises.length > 0,
    ).length;

    if (filledDays < 2) {
      throw new ValidationError(
        'generate-full-week requires at least 2 filled days in the partial plan',
        { filledDays },
      );
    }

    console.log('[WorkoutBuilderAi] generate-full-week:', {
      filledDays,
      totalDays: request.partialPlan.workouts.length,
    });

    const cacheParams = {
      endpoint: 'generate-full-week',
      partialPlan: planCacheFingerprint(request.partialPlan as unknown as BuilderPlan),
      experienceLevel: request.profile.experienceLevel,
      equipment: request.profile.availableEquipment.sort().join(','),
      fitnessGoal: request.profile.fitnessGoal,
    };

    return await runWithCacheAndDedup(
      c,
      'workout',
      cacheParams,
      request.skipCache,
      async () => generateFullWeek(request, c.env, userId),
    );
  } catch (error) {
    throw handleBuilderError(error, 'generate-full-week');
  }
}

async function generateFullWeek(
  request: GenerateFullWeekRequest,
  env: Env,
  _userId?: string,
): Promise<{ data: z.infer<typeof GenerateFullWeekResponseSchema>; metadata: CacheMetadata }> {
  const partialJson = JSON.stringify(request.partialPlan, null, 2);

  const prompt = `You are FitAI, an expert personal trainer. Complete the user's partial weekly workout plan.

**User profile:**
- Experience: ${request.profile.experienceLevel}
- Goal: ${request.profile.fitnessGoal.replace('_', ' ')}
- Equipment: ${request.profile.availableEquipment.join(', ')}
- Workouts/week target: ${request.profile.workoutsPerWeek}
- Duration/session: ${request.profile.workoutDuration} min
- Injuries: ${(request.profile.injuries ?? []).join(', ') || 'none'}

**Partial plan (JSON — some days have exercises, others are empty):**
${partialJson}

**Task:**
1. KEEP the existing filled days unchanged.
2. FILL the empty days with workouts that:
   - Balance muscle coverage across the week (complement existing days, don't repeat)
   - Match the user's equipment, experience, and duration
   - Respect injuries
3. Set restDays appropriately (days left as rest with 0 exercises).
4. Preserve the plan id and weekNumber.

Return JSON: { "completePlan": {full plan}, "daysGenerated": <number of days you filled> }`;

  const aiConfig = await getAIConfig(env);
  const model = createAIProvider(env, aiConfig.model);
  const aiStartTime = Date.now();

  const result = await generateObject({
    model,
    schema: GenerateFullWeekResponseSchema,
    prompt,
    temperature: request.temperature,
    maxOutputTokens: 8192,
  });

  const aiGenerationTime = Date.now() - aiStartTime;

  if (!result.object?.completePlan) {
    throw new APIError('AI returned empty full-week response', 500, ErrorCode.AI_INVALID_RESPONSE);
  }

  return {
    data: result.object,
    metadata: {
      modelUsed: request.model,
      generationTimeMs: aiGenerationTime,
      tokensUsed: result.usage?.totalTokens,
      costUsd: 0,
    },
  };
}

// ============================================================================
// 5. POST /workout/apply-progression
// ============================================================================

export async function handleApplyProgression(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
): Promise<Response> {
  try {
    const request: ApplyProgressionRequest = validateRequest(
      ApplyProgressionRequestSchema,
      await c.req.json(),
    );
    const user = c.get('user');
    const userId = user?.id;

    console.log('[WorkoutBuilderAi] apply-progression:', {
      workouts: request.plan.workouts.length,
      priorPerformanceEntries: request.priorPerformance.length,
    });

    const cacheParams = {
      endpoint: 'apply-progression',
      plan: planCacheFingerprint(request.plan as unknown as BuilderPlan),
      priorPerformance: request.priorPerformance.map((p) => p.exerciseId).sort().join(','),
    };

    return await runWithCacheAndDedup(
      c,
      'workout',
      cacheParams,
      request.skipCache,
      async () => generateApplyProgression(request, c.env, userId),
    );
  } catch (error) {
    throw handleBuilderError(error, 'apply-progression');
  }
}

/**
 * Apply Double Progression (reference: src/services/progressionService.ts).
 * Server-side implementation mirrors the client logic so the worker can apply
 * it without round-tripping through the app.
 *
 * Rules (from progressionService.suggestNextWeight):
 *  - All sets at top of rep range + RPE easy (1) → +2× increment (double jump)
 *  - All sets at top + RPE neutral/none → +1× increment
 *  - All sets at top + RPE hard (3) → hold weight (consolidate)
 *  - Any set exceeded range by 2+ → +1× increment (too light)
 *  - Otherwise → hold weight
 *  - Bodyweight exercises → hold (progress by adding reps)
 */
async function generateApplyProgression(
  request: ApplyProgressionRequest,
  env: Env,
  _userId?: string,
): Promise<{ data: z.infer<typeof ApplyProgressionResponseSchema>; metadata: CacheMetadata }> {
  // Build a lookup of last-session performance per exercise.
  const perfMap = new Map<string, (typeof request.priorPerformance)[number]>();
  for (const entry of request.priorPerformance) {
    perfMap.set(entry.exerciseId, entry);
  }

  const UPPER_INCREMENT = 2.5;
  const LOWER_INCREMENT = 5.0;
  const LOWER_BODY_IDS = new Set([
    'squat', 'deadlift', 'leg_press', 'lunge', 'leg_curl', 'leg_extension',
    'calf_raise', 'hip_thrust', 'romanian_deadlift', 'sumo_deadlift',
  ]);

  const changes: Array<{
    exerciseId: string;
    dayIndex: number;
    action: 'increase' | 'hold' | 'deload';
    reason: string;
  }> = [];

  // Deep clone the plan so we can mutate sets.
  const updatedPlan: typeof request.plan = JSON.parse(JSON.stringify(request.plan));

  for (let dayIndex = 0; dayIndex < updatedPlan.workouts.length; dayIndex++) {
    const day = updatedPlan.workouts[dayIndex];
    for (const planned of day.plannedExercises) {
      const prior = perfMap.get(planned.exerciseId);
      if (!prior?.lastSession) continue;

      const sets = prior.lastSession.sets;
      if (sets.length === 0) continue;

      // Parse rep range from the first planned set (e.g. "8-12" → [8,12]).
      const repStr = String(planned.sets[0]?.reps ?? '8-12');
      const repMatch = repStr.match(/(\d+)\s*-\s*(\d+)/);
      const minReps = repMatch ? parseInt(repMatch[1], 10) : 8;
      const maxReps = repMatch ? parseInt(repMatch[2], 10) : 12;

      const lastWeight = sets[0]?.weightKg ?? 0;
      const lastRpe = sets[0]?.rpe ?? 2;
      const allCompleted = true; // prior sets are completed by definition (from exercise_sets)
      const allAtTop = sets.every((s) => (s.reps ?? 0) >= maxReps);
      const anyExceeded = sets.some((s) => (s.reps ?? 0) > maxReps + 1);

      const isLower = LOWER_BODY_IDS.has(planned.exerciseId);
      const increment = isLower ? LOWER_INCREMENT : UPPER_INCREMENT;

      let action: 'increase' | 'hold' | 'deload' = 'hold';
      let newWeight = lastWeight;
      let reason = 'Maintaining current weight';

      if (allCompleted && allAtTop && lastRpe === 1) {
        newWeight = lastWeight + increment * 2;
        action = 'increase';
        reason = `All sets at ${maxReps} reps + felt easy → +${increment * 2}kg (double jump)`;
      } else if (anyExceeded) {
        newWeight = lastWeight + increment;
        action = 'increase';
        reason = `Exceeded ${maxReps} reps → +${increment}kg (weight was too light)`;
      } else if (allCompleted && allAtTop && lastRpe === 2) {
        newWeight = lastWeight + increment;
        action = 'increase';
        reason = `All sets at ${maxReps} reps → +${increment}kg`;
      } else if (allCompleted && allAtTop && lastRpe === 3) {
        action = 'hold';
        reason = `Hit ${maxReps} but felt hard — consolidating`;
      } else {
        action = 'hold';
        reason = 'Working towards top of rep range — maintain weight';
      }

      // Apply the new weight to all sets in the planned exercise.
      if (action === 'increase' && newWeight > 0) {
        planned.sets = planned.sets.map((s) => ({
          ...s,
          weightKg: newWeight,
        }));
      }

      changes.push({ exerciseId: planned.exerciseId, dayIndex, action, reason });
    }
  }

  return {
    data: {
      updatedPlan,
      changes,
    },
    metadata: {
      modelUsed: 'rule-based-progression',
      generationTimeMs: 0,
      tokensUsed: 0,
      costUsd: 0,
    },
  };
}

// ============================================================================
// 6. POST /workout/deload
// ============================================================================

export async function handleDeload(
  c: Context<{ Bindings: Env; Variables: Partial<AuthContext> }>,
): Promise<Response> {
  try {
    const request: DeloadRequest = validateRequest(DeloadRequestSchema, await c.req.json());
    const user = c.get('user');
    const userId = user?.id;

    console.log('[WorkoutBuilderAi] deload:', {
      workouts: request.plan.workouts.length,
    });

    const cacheParams = {
      endpoint: 'deload',
      plan: planCacheFingerprint(request.plan as unknown as BuilderPlan),
    };

    return await runWithCacheAndDedup(
      c,
      'workout',
      cacheParams,
      request.skipCache,
      async () => generateDeload(request),
    );
  } catch (error) {
    throw handleBuilderError(error, 'deload');
  }
}

/**
 * Apply a deload week: ~40% volume reduction (reference: deloadService.ts).
 * Strategy (mirrors deloadService.generateDeloadPlan):
 *  - Reduce set count by ~50% (min 1 set per exercise)
 *  - Keep the same exercises and weights (deload is about recovery, not PRs)
 *  - Optionally reduce weight by 10% on compounds (RPE-driven) — v1 keeps weight
 *    per deloadService.generateDeloadPlan which sets keepWeight=true.
 *
 * Returns the deload plan + the actual volume reduction % achieved.
 */
async function generateDeload(
  request: DeloadRequest,
): Promise<{ data: z.infer<typeof DeloadResponseSchema>; metadata: CacheMetadata }> {
  const TARGET_REDUCTION = 0.4; // 40% volume reduction

  // Deep clone so we don't mutate the input.
  const deloadPlan: typeof request.plan = JSON.parse(JSON.stringify(request.plan));

  let originalVolume = 0;
  let deloadVolume = 0;

  for (const day of deloadPlan.workouts) {
    for (const planned of day.plannedExercises) {
      const originalSets = planned.sets.length;
      originalVolume += originalSets;

      // Reduce sets by ~50% (min 1). This yields ~50% set reduction = ~40%
      // volume reduction when accounting for the kept warmup/light sets.
      const deloadSetCount = Math.max(1, Math.round(originalSets * 0.5));

      // Keep the first N sets (preserve warmup ordering + set types).
      planned.sets = planned.sets.slice(0, deloadSetCount).map((s, i) => ({
        ...s,
        setNumber: i + 1,
      }));

      deloadVolume += planned.sets.length;
    }

    // Update the day title to signal deload.
    if (day.plannedExercises.length > 0 && !/deload/i.test(day.title)) {
      day.title = `${day.title} (Deload)`;
    }
  }

  const volumeReductionPercent =
    originalVolume > 0
      ? Math.round(((originalVolume - deloadVolume) / originalVolume) * 100)
      : 0;

  return {
    data: {
      deloadPlan,
      volumeReductionPercent,
    },
    metadata: {
      modelUsed: 'rule-based-deload',
      generationTimeMs: 0,
      tokensUsed: 0,
      costUsd: 0,
    },
  };
}
