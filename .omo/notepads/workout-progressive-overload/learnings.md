# Phase 1 Foundation Learnings

## Exercise ID Systems (CRITICAL)
- **Frontend** (`src/data/exercises.ts`): 18 curated exercises with snake_case IDs (`push_up`, `squat`, `dumbbell_bench_press`)
- **Workers** (`fitai-workers/src/data/exerciseDatabase.json`): 1500 exercises from ExerciseDB API with random hash IDs (`VPPtusI`, `I4hDWkc`)
- These are **completely different ID systems** with only ~5 exact name matches
- Mapped exercises: push_up↔I4hDWkc, burpee↔dK9394r, dumbbell_bench_press↔SpYC0Kp, dumbbell_row↔BJ0Hz5L, mountain_climbers↔RJgzwny
- Unmapped (no worker equivalent): squat, plank, jumping_jacks, downward_dog, child_pose, sun_salutation, warrior_pose, high_knees, battle_ropes

## Migration Conventions
- Existing `workout_sessions` uses `uuid_generate_v4()`, new tables use `gen_random_uuid()` (both valid, gen_random_uuid is newer PostgreSQL built-in)
- Existing table uses `TIMESTAMP WITH TIME ZONE`, we use `TIMESTAMPTZ` (equivalent alias)
- RLS pattern: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY ... FOR ALL USING (auth.uid() = user_id)`
- All FKs reference `profiles(id)` not `auth.users(id)`

## Test Mock Patterns
- Existing tests use inline `jest.mock('../../services/supabase', ...)` with per-test mock setup
- New shared factory at `src/__tests__/helpers/supabaseMock.ts` provides reusable chainable mock
- Key pattern: query builder must be thenable (implement `.then`) for `await` to work
- `_tables` map is lazy-initialized on first `.from(table)` call

## DB Schema Decisions
- `exercise_id` is TEXT (not UUID) to accommodate both ID systems
- `weight_kg` is DECIMAL(6,2) — supports up to 9999.99 kg
- `exercise_prs.value` is DECIMAL(8,2) — supports estimated 1RM values
- `set_type` uses CHECK constraint enum: normal, warmup, failure, drop
- `workout_templates.exercises` is JSONB for flexible exercise configuration

## Phase 7 — Deload System (2026-03-26)

### Patterns
- `deloadService.ts` is pure logic — no Supabase, no store imports. Same pattern as `progressionService.ts`.
- `RecentSessionForDeload` type mirrors shape from `progressionService.evaluateFailure` but independently defined to avoid coupling.
- Mesocycle week derived via `getMesocycleWeek()` computed getter — NOT stored as state. Formula: `Math.floor((Date.now() - startDate) / weekMs) + 1`.
- `mesocycleStartDate` persisted via Zustand `partialize`, cleared on `reset()`.
- DeloadModal is pure presentation — callbacks only, no side effects, no store imports.

### Decisions
- Volume reduction: `Math.round(currentSets * 0.5)` with `Math.max(1, ...)` floor.
- Early mesocycle (week 1-2) passed as optional param to `checkReactiveDeload`, keeping function pure.
- Snooze tracking is caller responsibility, not in modal.
- `generateDeloadPlan` returns `keepExercises: true` / `keepWeight: true` flags for caller.

### Test Results: 38 tests all passing (20 + 7 + 11)

## Phase 8 — Rest Timer (2026-03-26)

### Patterns
- `restTimerService.ts` is 100% pure math (Date.now() comparisons) — zero side effects, no setInterval, no state.
- `RestTimer.tsx` owns all side effects: setInterval tick, Vibration.vibrate, cleanup on unmount.
- Separation makes the service trivially testable and backgrounding-safe (Date.now() comparison correct on app resume).

### Testing Gotchas
- `jest.mock()` is hoisted — variables defined before it may be undefined in the factory. Use `jest.fn()` directly inside factory, then import mocked module for assertions.
- `@testing-library/react-native` calls `StyleSheet.flatten` internally — any RN mock MUST include `flatten` alongside `create`.

### Decisions
- No separate `settingsStore` — `restTimerEnabled: boolean` added to `FitnessState` in `fitnessStore.ts`.
- Persisted via `partialize()`, NOT reset on logout (user preference survives).
- `useRef` guard prevents duplicate `onExpire()` calls across interval ticks after expiry.

### Test Results: 19 tests all passing (12 service + 7 component)

## Phase 9 — Integration Testing + Polish (2026-03-26)

### Jest Mock Pattern (Critical)
- Variables used inside `jest.mock()` factory must be prefixed with `mock` (case insensitive)
- e.g. `let mockSupabase` works, `let supabaseMock` does NOT
- Established pattern: `let mockSupabase` + getter-based mock, reassign in `beforeEach`

### ExerciseCard Locations
- `src/components/workout/ExerciseCard.tsx` — display-only (no TextInput)
- `src/components/fitness/ExerciseCard.tsx` — expanded details (no TextInput)
- `src/features/workouts/components/ExerciseCard.tsx` — actual workout session card with weight/reps TextInput, already has `testID` props

### Error Handling Fixes
- `completionTracking.ts` had silent `.catch(() => {})` on `_writeExerciseSets` — fixed to log errors
- `workoutTemplateService.ts` `getTemplates()` was throwing on query errors — changed to return `[]`

### Performance Benchmarks (mocked)
- `getHistory()` 90 sessions × 4 sets: ~3-5ms (threshold: 200ms)
- `getLastSession()` 30 sessions × 5 sets: ~1ms (threshold: 500ms)
- `checkForPR()`: < 0.01ms/call (threshold: 50ms)

### Deferred Items
- Unit conversion display (kg/lbs), loading states, retry+toast — UI-layer concerns beyond scope

### Test Results: 14 integration tests all passing (5 flow + 6 edge + 3 perf)
