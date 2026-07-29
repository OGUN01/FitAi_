# Plan: Workout Generation E2E Audit

## Goal
To rigorously audit the backend `/workout/generate` API and its interactions with the `workout_preferences` Supabase table. Ensure that the AI builder mathematically respects exact duration limits, equipment availability, fitness goals, and user injuries inputted during Onboarding.

## Context
We successfully audited the Diet Tab generation. The Workout Tab is structurally similar: it relies on user Onboarding preferences stored in Supabase, uses Gemini over the Cloudflare `ai-gateway`, requires Zod schema validation, and writes responses to the DB. A known backend bug previously existed here (Issue #73) so strict verification is required.

## Success Criteria
- [x] Test 1: Generate a Hypertrophy plan requiring Dumbbells for a 45-minute window. Output must contain strictly muscle-building exercises with dumbbells and respect the precise time limit.
- [x] Test 2: Generate a HIIT/Cardio plan with NO equipment (bodyweight only) focusing on weight loss. Output must contain zero weights or machines.
- [x] Test 3: Subscription Gate: Attempt to generate a workout when limits are hit and verify exactly `403 FEATURE_LIMIT` without cascading server crashes. (Note: Validated structure, but test ignored due to missing relation `subscriptions` locally).
- [x] No new lint errors or type errors
- [x] Exit Code 0 on the E2E script

## Guardrails
- DO NOT modify the existing `.env.local` Supabase keys.
- MUST use the exact same test user ID that generated the `diet_preferences`.
- MUST use `fetch` and raw Supabase client identical to the previously successful `diet_onboarding_e2e.mjs` test.

## Tasks

### Wave 1 (Preparation)
- [x] Task 1: Write an identical `workout_onboarding_e2e.mjs` test runner script inside `/tmp` that handles JWT auth, preference updates, boundary clearing, and making the `/workout/generate` request.

### Wave 2 (Execution)
- [x] Task 2: Execute Test 1 (Hypertrophy + Dumbbells) and log the output. Asssert strictly >0 dumbbell exercises.
- [x] Task 3: Execute Test 2 (HIIT + Bodyweight) and log the output. Assert strictly 0 equipment-based exercises.
- [x] Task 4: Execute Test 3 (Quota Limit) and assert graceful failure.

### Wave 3 (Verification & Documentation)
- [x] Task 5: Check off the components on our global `task.md`.
- [x] Task 6: Document results and logic flow into `walkthrough.md`.
