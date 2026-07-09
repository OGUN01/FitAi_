# Wave B-02 — Fix: Workout Generation P0-1 ("profile.weight: Too small")

**Agent:** Wave B code-fix agent (flat). **Date:** 2026-06-24.
**Scope:** P0-1 from `src/docs/wave-a-03-workout-plan-audit.md` — missing body_analysis fabricates `0` for weight/height/age, which the worker Zod schema rejects, surfacing a raw error to the user.
**Method:** code-review-graph MCP (callers/callees) + Read/Grep. FLAT agent, no sub-agents. No device.

---

## Root cause (re-verified, matches Wave A-03 audit)

`src/services/aiRequestTransformers.ts` `transformForWorkoutRequest` fabricated `0` for missing body-analysis fields:

- `age: personalInfo.age ?? 0` (line 575)
- `weight: resolvedCurrentWeight.value ?? personalInfo.weight ?? 0` (line 577)
- `height: bodyMetrics?.height_cm ?? personalInfo.height ?? 0` (line 578)

The worker Zod schema (`fitai-workers/src/utils/validation.ts` `UserProfileSchema`, embedded in `WorkoutGenerationRequestSchema.profile` at line 204) is:
- `age: z.number().int().min(13).max(120)` — REQUIRED (no `.optional()`/`.nullable()`)
- `weight: z.number().min(30).max(300).nullable().optional()` — accepts `null`/`undefined`
- `height: z.number().min(100).max(250).nullable().optional()` — accepts `null`/`undefined`

`0` is a defined number, so it bypasses `.optional()` and fails `.min(30)`/`.min(100)`/`.min(13)` → `validateRequest` (`validation.ts:677`) builds `"profile.weight: Too small"` → raw error reaches the user via `planError`.

**Secondary enabler (Principle 4 violation):** the client type `WorkoutGenerationRequest.profile` (`src/services/fitaiWorkersClient.ts:282-287`) declared `age/weight/height: number` (required). This stale type is WHY the original author added `?? 0` — to satisfy TypeScript with a fabricated value instead of letting `undefined` flow. The type lied about the worker contract.

---

## Exact diff applied

### 1. `src/services/aiRequestTransformers.ts` (lines 567-584)

Removed the `console.warn` on missing age (prod path) and the `?? 0` fabrications.

**Before:**
```ts
  const advancedReview = options?.advancedReview;
  if (personalInfo.age === undefined || personalInfo.age === null) {
    console.warn('[aiRequestTransformers] personalInfo.age is undefined — using 0 for workout request (AI will receive signal that age is missing)');
  }

  return {
    profile: {
      age: personalInfo.age ?? 0,
      gender: mappedGender,
      weight: resolvedCurrentWeight.value ?? personalInfo.weight ?? 0,
      height: bodyMetrics?.height_cm ?? personalInfo.height ?? 0,
```

**After:**
```ts
  const advancedReview = options?.advancedReview;

  // P0-1: Do NOT fabricate `0` for missing body-analysis fields. The worker Zod
  // schema (validation.ts) makes `weight`/`height` `.nullable().optional()` and
  // `age` required (`.min(13)`). Sending `0` bypasses `.optional()` and fails
  // `.min(...)`, surfacing a raw "profile.weight: Too small" error to the user.
  // Sending `undefined` instead lets optional fields pass cleanly; for `age`
  // (required) the caller MUST gate with a pre-flight check in useFitnessLogic
  // (see src/docs/wave-a-03-workout-plan-audit.md P0-1) — but we still refuse to
  // fabricate a placeholder here (CLAUDE.md Principle 8: no hardcoded fallbacks
  // for user data). No console.warn in this production path.
  return {
    profile: {
      age: personalInfo.age ?? undefined,
      gender: mappedGender,
      weight: resolvedCurrentWeight.value ?? personalInfo.weight ?? undefined,
      height: bodyMetrics?.height_cm ?? personalInfo.height ?? undefined,
```

### 2. `src/services/fitaiWorkersClient.ts` (lines 282-295) — type/schema alignment

Made the client type match the worker Zod schema so the `?? undefined` assignment typechecks (Principle 4: Schema+Code Must Match).

**Before:**
```ts
export interface WorkoutGenerationRequest {
  profile: {
    age: number;
    gender: string;
    weight: number;
    height: number;
    fitnessGoal: string;
```

**After:**
```ts
export interface WorkoutGenerationRequest {
  profile: {
    // P0-1: Align with the worker Zod schema (fitai-workers/src/utils/validation.ts
    // UserProfileSchema). `weight`/`height` are `.nullable().optional()` there, and
    // `age` is `.min(13)` (required) but may be absent at the transformer layer
    // before a pre-flight guard runs. Making these optional here stops callers
    // from fabricating `0` to satisfy a stale required-`number` type (the original
    // P0-1 root cause). The worker still rejects a truly missing `age`; the
    // useFitnessLogic pre-flight guard prevents that call (see wave-a-03 audit).
    age: number | undefined;
    gender: string;
    weight: number | null | undefined;
    height: number | null | undefined;
    fitnessGoal: string;
```

---

## How missing body_analysis now behaves (graceful path)

**Weight/Height (fully fixed in-scope):** When `body_analysis` row is absent and `resolveCurrentWeight().value` is `null` and `personalInfo.weight`/`height` are absent, the transformer now sends `undefined`. The worker Zod schema's `.nullable().optional()` accepts `undefined` → validation passes → the rule-based engine runs. The engine's existing guards (`workoutGeneration.ts:181-189`) log a warn on missing weight/height and continue (don't throw); `estimatedCalories` uses `profile.weight || 0` (display-only — actual calories are recomputed via MET at completion per the audit). **No more raw "Too small" error.**

**Age (partial — needs follow-up):** The worker schema REQUIRES `age` (`.min(13)`, no `.optional()`). With missing age the transformer now sends `undefined` (no fabricated `0`) → the worker rejects with "profile.age: Required" (still a hard failure, but no fabricated user data — Principle 8 compliant). The complete graceful fix for age requires a **pre-flight guard in `useFitnessLogic`** (out of this agent's file scope): before calling generation, if `resolveCurrentWeightFromStores().value` is null OR `personalInfo.age` is missing, surface a friendly `crossPlatformAlert` ("Please complete your body analysis in onboarding to generate a workout") and abort — never call the worker. This is the audit's recommendation #2 and is the remaining Wave B follow-up task.

**No `Alert.alert` introduced.** No `console.log` in prod (the prior `console.warn` for missing age was removed). No new deps.

---

## Consumer impact (traced via code-review-graph callers_of + Grep)

`transformForWorkoutRequest` is called from:
- `src/ai/workoutGeneration.ts:32, 101`
- `src/ai/index.ts:239, 531`
- `src/__tests__/services/aiRequestTransformers.test.ts:170, 183, 198, 230`
- `src/__tests__/services/aiService.workout.integration.test.ts` (via mock)

**No consumer broke from the type widening.** The only runtime read of `.profile.weight` in app code is `aiService.workout.integration.test.ts:150` (`expect(sentRequest.profile.weight).toBe(82)`) — uses a populated profile, value is still `number` at runtime. No app code reads `.profile.height`/`.profile.age` and assumes non-null. The worker reads `profile.weight`/`height`/`age` with `|| 0` guards already in place (`workoutGeneration.ts:181-189, 365, 391`) — `undefined` is handled identically to `0` by those `||` guards, so behavior is unchanged for the rule engine.

**No consumer needed adjustment** beyond the client-type alignment.

---

## tsc gate

```
$ npx tsc --noEmit
EXIT: 0
```

Clean. No pre-existing errors surfaced. The two errors introduced by the initial `?? undefined` edit (`aiRequestTransformers.ts:583, 584` — "Type 'number | undefined' is not assignable to type 'number'") were resolved by the `fitaiWorkersClient.ts` type alignment. Full jest suite NOT run (deferred to the wave-close gate agent per task rules).

---

## Files touched

1. `D:\FitAi\FitAI\src\services\aiRequestTransformers.ts` — removed `?? 0` fabrications + `console.warn`; `?? undefined` for age/weight/height.
2. `D:\FitAi\FitAI\src\services\fitaiWorkersClient.ts` — aligned `WorkoutGenerationRequest.profile.age/weight/height` types with the worker Zod schema.

## Files NOT touched (out of scope, flagged for follow-up)

- `src/hooks/useFitnessLogic.ts` — needs the pre-flight guard for missing age/weight (audit recommendation #2). This is the remaining piece to fully close P0-1 for the age-required case.
- `fitai-workers/src/utils/validation.ts` — no change needed; the worker schema already correctly accepts `undefined` for weight/height and the rule engine already guards missing values gracefully.

---

## Verification status

Code-only: root cause confirmed, fix applied, type/schema aligned, tsc clean, consumers traced-safe. End-to-end device verification (generate workout with missing body_analysis → confirm graceful behavior, no raw error) is the Wave B device agent's task (#20).
