# Wave B2-02 — Pre-flight Body-Data Guard for Workout Generation

**Agent:** Wave B2 code-fix agent (flat). **Date:** 2026-06-24.
**Scope:** Closes the out-of-scope gap flagged by Wave B-02 — the worker Zod schema requires `age` (`.min(13)`, no `.optional()`), so after B-02 stopped fabricating `0`, a truly missing `age` still rejects with a raw "profile.age: Required" error and there was no friendly user-facing prompt. This adds the audit's recommendation #2: a pre-flight guard in `useFitnessLogic.ts`.
**Method:** code-review-graph MCP (`query_graph` callers_of) + Read/Grep. FLAT agent, no sub-agents. No device.

---

## Where the guard lives

**File:** `D:\FitAi\FitAI\src\hooks\useFitnessLogic.ts`
**Function:** `generateWeeklyWorkoutPlan` (the workout-generation entry point — `useFitnessLogic.ts:398`).
**Position:** Inserted at lines 414-443, AFTER the existing profile-completeness check (`legacyPersonalInfo` + `mergedFitnessGoals.primary_goals`, lines 405-412) and BEFORE the subscription gate (`canUseFeature("ai_generation")`, line 446). This ordering matches the existing guard sequence (auth → profile completeness → body data → subscription → generation).

## What it checks

Before calling `aiService.generateWeeklyWorkoutPlan`, the guard verifies the user has the body data the worker schema requires / the rule engine needs:

- **Age present and valid** — `legacyPersonalInfo.age` is truthy AND `>= 13` (the worker schema's `z.number().int().min(13).max(120)` floor).
- **Weight resolvable** — `resolveCurrentWeightFromStores({ bodyAnalysisWeight: bodyAnalysis?.current_weight_kg }).value` is non-null. The worker schema makes `weight` `.nullable().optional()` (so `undefined` passes Zod), but the rule engine's MET-based calorie calc reads `profile.weight` with `|| 0` guards — a missing weight silently yields `0` calories. Guarding weight here prevents a degraded (zero-calorie) plan from being generated rather than surfacing the raw Zod error.
- **Height:** NOT guarded as a hard block — the worker schema makes `height` `.nullable().optional()` and the rule engine logs a warn + continues on missing height (`workoutGeneration.ts:181-189`, per the B-02 audit). Height is mentioned in the user-facing message for completeness, but its absence does not block generation (matches the worker contract).

## What it surfaces

A friendly `crossPlatformAlert` (NOT `Alert.alert`) titled **"Body Analysis Required"** with message *"Please complete your body analysis (age, weight, and height) in onboarding to generate a personalized workout plan."* and an OK button — then `return` (abort generation, never call the worker). No technical/Zod error string reaches the user.

## Existing pattern it follows

The exact pattern already established in this codebase for "you need to do X first" generation gates:
- `useFitnessLogic.ts:405-412` — the adjacent "Profile Incomplete" alert (same function).
- `src/hooks/useAIMealGeneration.ts:1277, 1404` — `crossPlatformAlert("Profile Incomplete", "Please complete your profile.")` then `return`.
- `src/hooks/useMealPlanning.ts:352` — same pattern.

The guard reuses `crossPlatformAlert` (already imported at `useFitnessLogic.ts:3`) and the same alert-then-return shape. No new pattern invented.

## Single source of truth it reads body data from

- **Age:** `legacyPersonalInfo.age` — where `legacyPersonalInfo` is built by `buildLegacyPersonalInfo` (`src/utils/profileLegacyAdapter.ts:45-71`) from `useProfileStore().personalInfo` (the SSOT for onboarding personal-info data, per `FITAI_DATA_ARCHITECTURE.md`). This is the **exact same value** passed to `aiService.generateWeeklyWorkoutPlan` as the first arg (`useFitnessLogic.ts:431`) and ultimately read by `transformForWorkoutRequest` (`aiRequestTransformers.ts:581`). Reading from `legacyPersonalInfo` (not a duplicate store field) ensures the guard's check and the transformer's input are byte-identical — no drift.
- **Weight:** `resolveCurrentWeightFromStores({ bodyAnalysisWeight: bodyAnalysis?.current_weight_kg }).value` — the canonical SSOT weight resolver (`src/services/currentWeight.ts:195`), priority `manual_log > body_analysis > none`. This is the **same resolver** the transformer calls internally (`aiRequestTransformers.ts:554` via `resolveCurrentWeight`) and the same one used by the existing backfill effect in this file (`useFitnessLogic.ts:273`). `bodyAnalysis` comes from `useProfileStore().bodyAnalysis` (line 90) — the SSOT for body-analysis data. No duplicate read.

No fabricated defaults (CLAUDE.md Principle 8). The guard's entire purpose is to PREVENT fabrication.

## Happy path unchanged

Users WITH body data: `legacyPersonalInfo.age >= 13` and `resolvedWeightForGuard != null` → the `if` condition is false → falls through to the subscription gate → generation proceeds exactly as before. Two extra synchronous reads (one `useProfileStore.getState()` inside the resolver, already cached by Zustand) — negligible, non-blocking.

## Exact diff

**Before** (`useFitnessLogic.ts:412-415`):
```ts
      return;
    }

    // Check subscription gate before hitting the server
    if (!canUseFeature("ai_generation")) {
```

**After** (`useFitnessLogic.ts:412-446`):
```ts
      return;
    }

    // P0-1 pre-flight guard: the worker Zod schema (fitai-workers/src/utils/
    // validation.ts) REQUIRES `age` (`.min(13)`, no `.optional()`) and the
    // rule engine needs a real weight for MET-based calorie calc. Wave B-02
    // stopped fabricating `0` for these fields (see wave-b-02 fix doc), so a
    // truly missing `age` now reaches the worker as `undefined` and is
    // rejected with a raw "profile.age: Required" error. Guard here instead —
    // surface a friendly prompt and abort before calling the service. This
    // follows the existing "Profile Incomplete" alert pattern above and in
    // useAIMealGeneration/useMealPlanning. Reads the SSOT: age from
    // legacyPersonalInfo (built from profileStore.personalInfo — the exact
    // value transformForWorkoutRequest receives) and weight from
    // resolveCurrentWeightFromStores (manual_log > body_analysis > none), the
    // same resolver used by the backfill effect below + the transformer. No
    // fabricated defaults (CLAUDE.md Principle 8). See
    // src/docs/wave-a-03-workout-plan-audit.md P0-1 recommendation #2.
    const resolvedWeightForGuard = resolveCurrentWeightFromStores({
      bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
    }).value;
    if (
      !legacyPersonalInfo.age ||
      legacyPersonalInfo.age < 13 ||
      resolvedWeightForGuard == null
    ) {
      crossPlatformAlert(
        "Body Analysis Required",
        "Please complete your body analysis (age, weight, and height) in onboarding to generate a personalized workout plan.",
        [{ text: "OK" }],
      );
      return;
    }

    // Check subscription gate before hitting the server
    if (!canUseFeature("ai_generation")) {
```

No new imports needed — `crossPlatformAlert` (line 3) and `resolveCurrentWeightFromStores` (line 36) are already imported. `bodyAnalysis` (line 90) and `legacyPersonalInfo` (line 95) are already in scope and in the `useCallback` dep array (`bodyAnalysis` at line 535; `legacyPersonalInfo` already implicitly covered).

## tsc gate

```
$ npx tsc --noEmit 2>&1 | grep "useFitnessLogic"
(empty)

$ npx tsc --noEmit 2>&1 | grep -c "error TS"
0
```

**Exit 0.** `useFitnessLogic.ts` introduces zero new errors. A transient `useMealPlanning.ts` error surfaced on the first run (the parallel Wave C agent's in-flight `dietPreferences` consolidation — task #30, out of this agent's file scope); it cleared on the second run. No errors attributable to this change.

## Files touched

1. `D:\FitAi\FitAI\src\hooks\useFitnessLogic.ts` — added pre-flight body-data guard (lines 414-443).

## Files NOT touched (out of scope, owned by other agents)

- `src/services/aiRequestTransformers.ts` — B-02's `?? undefined` fix stands.
- `src/services/fitaiWorkersClient.ts` — B-02's type alignment stands.
- `fitai-workers/src/utils/validation.ts` — worker schema unchanged; the worker still correctly rejects a truly missing `age`, but this guard now prevents that call from ever happening.
- Any `src/components/*` — device agent + parallel agents own those.

## Verification status

Code-only: guard placed at the generation entry point, reads the SSOT, follows the existing alert pattern, happy path unchanged, tsc clean. End-to-end device verification (generate workout with missing body_analysis → confirm friendly "Body Analysis Required" alert instead of raw Zod error; generate WITH body data → confirm unblocked) is the Wave B2 device agent's task (#29).
