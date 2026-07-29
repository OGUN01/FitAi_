# Custom Workouts + Progressive Overloading — Work Plan

## Overview
Build a comprehensive custom workout system with progressive overloading for FitAI.

## TODOs

### PHASE 1: Foundation (DB + Shared Test Infra)

- [x] 1.1 Create shared Supabase mock factory at `src/__tests__/helpers/supabaseMock.ts`
- [x] 1.2 Validate exercise ID consistency between Workers exerciseDatabase.json and exercises table
- [x] 1.3 Migration: Create `exercise_sets` table with indexes on (user_id, exercise_id, completed_at DESC)
- [x] 1.4 Migration: Create `exercise_prs` table for weight PR and estimated_1rm PR per user per exercise
- [x] 1.5 Migration: Create `workout_templates` table for user-saved reusable workouts
- [x] 1.6 Update `src/services/completionTracking.ts` — dual-write to exercise_sets; keep existing JSONB unchanged

### PHASE 2: Engine Updates (Splits + Mesocycle)

- [x] 2.1 Fix weekNumber hardcode in `fitai-workers/src/handlers/workoutGenerationRuleBased.ts` line 147
- [x] 2.2 Wire prefers_variety into split scoring at `fitai-workers/src/utils/workoutSplits.ts` line 592
- [x] 2.3 Fix stress_level and activityLevel hardcodes in `fitai-workers/src/utils/workoutSplits.ts` lines 551-569
- [x] 2.4 Add FULL_BODY_2X split to `fitai-workers/src/utils/workoutSplits.ts`
- [x] 2.5 Update 5-day split to UL/PPL Hybrid in `fitai-workers/src/utils/workoutSplits.ts`
- [x] 2.6 Update split scoring weights — beginners never get PPL 6x; 6-day requires advanced

### PHASE 3: Workout Session UI (Weight Input + PREVIOUS Column)

- [x] 3.1 Create `src/services/exerciseHistoryService.ts` — getLastSession(), getHistory(days=90), getPersonalRecords()
- [x] 3.2 Create `src/features/workouts/components/ExerciseCard.tsx` — per-set weight+reps input, numeric keyboard, kg/lbs toggle
- [x] 3.3 Add PREVIOUS column to ExerciseCard — greyed last-session data, tap to copy, "First time" if no history
- [x] 3.4 Add set type selector to ExerciseCard — Normal/Warmup/Failure/Drop Set per row
- [x] 3.5 Persist session state to fitnessStore — currentWorkoutSession with per-set data, write on checkmark

### PHASE 4: Progressive Overloading Logic

- [x] 4.1 Create `src/services/progressionService.ts` — suggestNextWeight() double progression + isBodyweightExercise() + isTimeBased()
- [x] 4.2 Create `src/utils/oneRepMax.ts` — Brzycki formula + Epley formula with unit tests
- [x] 4.3 Integrate progression suggestions into ExerciseCard — pre-fill weight, green up arrow if increase suggested
- [x] 4.4 Add evaluateFailure() to progressionService — consecutive failures logic, configurable threshold

### PHASE 5: Custom Workout Builder + Templates

- [x] 5.1 Create `src/data/curatedExercises.ts` — getCuratedExercises(equipment[], location) filtered ~200 subset
- [x] 5.2 Create `src/services/workoutTemplateService.ts` — CRUD for workout_templates table
- [x] 5.3 Create `src/screens/workouts/CreateWorkoutScreen.tsx` — exercise picker, add/reorder, save as template
- [x] 5.4 Create `src/screens/workouts/TemplateLibraryScreen.tsx` — list templates, tap to start, edit/delete menu
- [x] 5.5 Enable plan modification in workout detail screen — swap exercises, change sets/reps/weight
- [x] 5.6 Template-plan coexistence in fitnessStore — template sessions use is_extra=true

### PHASE 6: Exercise History + PR Detection

- [x] 6.1 Create `src/services/prDetectionService.ts` — checkForPR() + recordPR() upsert exercise_prs
- [x] 6.2 Integrate real-time PR detection in workout session — on checkmark: check PR, celebration animation, record DB
- [x] 6.3 Create `src/screens/workouts/ExerciseHistoryScreen.tsx` — 90-day history, 1RM trend chart, volume chart, PR markers
- [x] 6.4 Create `src/utils/volumeCalculator.ts` — totalVolume(sets[]) = sum(weight * reps)

### PHASE 7: Deload System

- [x] 7.1 Create `src/services/deloadService.ts` — checkProactiveDeload(week>=5) + checkReactiveDeload(2+ failures)
- [x] 7.2 Track mesocycle week in fitnessStore — mesocycleStartDate + mesocycleWeek, reset on new plan
- [x] 7.3 Create deload suggestion modal — proactive and reactive variants; Accept/Dismiss (snooze 2 sessions)

### PHASE 8: Rest Timer

- [x] 8.1 Create `src/services/restTimerService.ts` — Date.now()-based timer, backgrounding-safe
- [x] 8.2 Create `src/features/workouts/components/RestTimer.tsx` — countdown overlay, vibrate+tone, settings toggle

### PHASE 9: Integration Testing + Polish

- [x] 9.1 End-to-end flow tests — full workout log, progression suggestion, template is_extra tracking
- [x] 9.2 Edge case tests — bodyweight, abandoned session, date boundary, long gap, first-time exercise
- [x] 9.3 Performance validation — history <200ms, PREVIOUS <500ms, PR detection <50ms
- [x] 9.4 Polish — unit conversion, loading states, error handling with retry+toast, accessibility labels

---

## Final Verification Wave

- [x] F1 All migrations push cleanly with `npx supabase db push`
- [x] F2 All TDD tests pass — `bun test` exits 0
- [x] F3 Weight input, PREVIOUS column, and progression suggestion work end-to-end
- [x] F4 TypeScript builds clean — `bun run typecheck` exits 0

---

## Architecture Clarification

**Two workout generation paths exist:**

1. **Local Quick Workout Engine** (`src/features/workouts/WorkoutEngine.ts → _buildLocalQuickWorkout()`)
   - No network call. Uses local `EXERCISES` database from `src/data/exercises.ts`
   - Generates instantly. Derives sets/reps/rest from user profile.
   - This is what the user refers to as "the engine"

2. **Cloudflare Workers (Weekly Plans)** (`fitai-workers/`)
   - LLM path (Gemini 2.5 Flash) — currently at 100% for weekly plans
   - Rule-based path (workoutSplits.ts + exerciseSelection.ts) — at 0% rollout via `RULE_BASED_ROLLOUT_PERCENTAGE`
   - The rule-based engine has split scoring, exercise classification, and parameter assignment — but it's dormant

**Implication for this feature:**
- Phase 2 split scoring updates target the **Workers rule-based engine** (currently dormant)
- The local WorkoutEngine also needs updates for custom workout building
- Progressive overloading and weight tracking work regardless of which path generated the workout

## Phases
1. Foundation (DB + Services)
2. Engine Updates (Splits + Mesocycle)
3. Workout Session UI (Weight Input + PREVIOUS)
4. Progressive Overloading Logic
5. Custom Workout Builder + Templates
6. Exercise History + PR Detection
7. Deload System
8. Rest Timer
9. Integration Testing + Polish

---

## Pre-Implementation: Decisions to Lock Down

Before any code, these must be answered:

1. **Exercise ID stability**: Validate that AI-generated exerciseId values match `exercises.exercise_id` in DB. If not, build a normalization layer.
2. **Unit system**: Store all weights in kg internally. Display in user's preferred unit (from `profiles.units`). Conversion is display-only.
3. **Bodyweight exercises**: Progression is rep-only. Weight field hidden. 1RM estimation skipped.
4. **Time-based exercises** (planks, cardio): Progression is duration-based. No weight suggestion.
5. **First-time exercise**: PREVIOUS column shows "First time" — user enters their starting weight.
6. **Multiple sessions/day**: PREVIOUS column shows the most recent completed session for that exercise.
7. **Abandoned sessions**: Partial data written to exercise_sets with `is_completed = false`. Included in history, flagged as partial.
8. **Date boundary**: Use `started_at` date for all tracking.
9. **Rule-based engine**: Enable at 5% rollout, with LLM fallback on failure.

## Guardrails

- MUST NOT refactor exercises_completed JSONB — add normalized table alongside (dual-write)
- MUST NOT touch the LLM generation path — only modify rule-based engine
- MUST use exercises.exercise_id as canonical identifier for all tracking
- MUST store weights in kg internally, convert for display
- Deload suggestions are toast/modal — NOT auto-applied plan modifications
- PR detection: weight PR + estimated 1RM PR only
- Exercise history: last 90 days default, simple line chart
- No user-created exercises in V1
- No per-exercise rest timer customization in V1

---

## PHASE 1: Foundation (DB + Shared Test Infra)

### 1.1 Create shared Supabase mock factory
- **File**: `src/__tests__/helpers/supabaseMock.ts`
- **Why**: TDD requires a reusable mock. Current tests inline their own — unsustainable for 50+ new test files.
- **What**: Factory functions for mocking `supabase.from().select()`, `.insert()`, `.upsert()`, `.eq()` chains. Include mock data builders for workout_sessions, exercise_sets, etc.
- **Tests**: Self-test the mock factory with a simple query chain.

### 1.2 Validate exercise ID consistency
- **What**: Query `exerciseDatabase.json` (Workers) and `exercises` table for the top 50 common exercises. Compare IDs.
- **Output**: A mapping file `src/data/exerciseIdMap.ts` if normalization is needed, or confirmation that IDs match.
- **Why**: Entire progression system depends on stable IDs across sessions. CRITICAL blocker.

### 1.3 Migration: Create `exercise_sets` table (normalized)
- **File**: `supabase/migrations/YYYYMMDD_create_exercise_sets.sql`
- **Schema**:
  ```sql
  CREATE TABLE exercise_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    session_id UUID NOT NULL REFERENCES workout_sessions(id),
    exercise_id TEXT NOT NULL,
    set_number INTEGER NOT NULL,
    weight_kg DECIMAL(6,2),
    reps INTEGER,
    duration_seconds INTEGER,
    set_type TEXT DEFAULT 'normal' CHECK (set_type IN ('normal','warmup','failure','drop')),
    is_completed BOOLEAN DEFAULT true,
    completed_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX idx_exercise_sets_user_exercise
    ON exercise_sets(user_id, exercise_id, completed_at DESC);
  CREATE INDEX idx_exercise_sets_session
    ON exercise_sets(session_id);
  ```
- **RLS**: `auth.uid() = user_id` for all operations.

### 1.4 Migration: Create `exercise_prs` table
- **File**: `supabase/migrations/YYYYMMDD_create_exercise_prs.sql`
- **Schema**:
  ```sql
  CREATE TABLE exercise_prs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    exercise_id TEXT NOT NULL,
    pr_type TEXT NOT NULL CHECK (pr_type IN ('weight','estimated_1rm')),
    value DECIMAL(8,2) NOT NULL,
    reps INTEGER,
    session_id UUID REFERENCES workout_sessions(id),
    achieved_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, exercise_id, pr_type)
  );
  ```
- **RLS**: `auth.uid() = user_id` for all operations.

### 1.5 Migration: Create `workout_templates` table
- **File**: `supabase/migrations/YYYYMMDD_create_workout_templates.sql`
- **Schema**:
  ```sql
  CREATE TABLE workout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    exercises JSONB NOT NULL DEFAULT '[]',
    target_muscle_groups TEXT[],
    estimated_duration_minutes INTEGER,
    is_public BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
  CREATE INDEX idx_workout_templates_user
    ON workout_templates(user_id);
  ```
- **RLS**: `auth.uid() = user_id` for all operations. Public templates readable by all authenticated.
- **Template exercises JSONB shape**: Same as plan exercises — `{exerciseId, name, sets, repRange, restSeconds, targetWeight}`

### 1.6 Update completionTracking.ts — dual-write to exercise_sets
- **File**: `src/services/completionTracking.ts`
- **What**: After existing `workout_sessions` insert, also insert rows into `exercise_sets` for each set completed. Keep existing JSONB write unchanged.
- **Tests**: TDD — write test first asserting both tables receive correct data on completion.
- **Edge case**: Partial sessions (abandoned) — write what was completed with `is_completed = false` for incomplete sets.

---

## PHASE 2: Engine Updates (Splits + Mesocycle)

### 2.1 Fix weekNumber hardcode
- **File**: `fitai-workers/src/handlers/workoutGenerationRuleBased.ts` line ~147
- **What**: Replace `weekNumber: 1` with actual user week number. Compute from `weekly_workout_plans.created_at` → weeks elapsed, modulo 4.
- **Tests**: TDD — test that week 1/2/3/4 produce different exercise selections via the rotation offset.

### 2.2 Wire prefers_variety into split scoring
- **File**: `fitai-workers/src/utils/workoutSplits.ts` line ~592
- **What**: Replace `const prefersVariety = false; // TODO` with actual value from request. Feed into the 10-point variety scoring.
- **Tests**: TDD — test that `prefers_variety = true` boosts splits with higher exercise variation.

### 2.3 Fix stress_level and activityLevel hardcodes
- **File**: `fitai-workers/src/utils/workoutSplits.ts` lines ~551-569
- **What**: Wire actual `stress_level` from body_analysis and `activity_level` from workout_preferences into recovery capacity scoring.
- **Tests**: TDD — test that high stress + sedentary activity reduces recovery score.

### 2.4 Add 2-day Full Body split
- **File**: `fitai-workers/src/utils/workoutSplits.ts`
- **What**: Add `FULL_BODY_2X` split definition. Structure: Full Body A (Mon) + Full Body B (Thu). Each hits all major muscle groups. Optimal for beginners with limited time.
- **Scoring**: High score for frequency=2, beginner experience, any equipment.
- **Tests**: TDD — test that 2-day frequency + beginner → Full Body 2x wins.

### 2.5 Update 5-day split to UL/PPL Hybrid
- **File**: `fitai-workers/src/utils/workoutSplits.ts`
- **What**: Replace or update existing 5-day handling. Structure: Upper/Lower/Push/Pull/Legs. Each muscle 2-3x/week. S-tier per research.
- **Scoring**: High score for frequency=5, intermediate+, gym equipment.
- **Tests**: TDD — test that 5-day + intermediate + gym → UL/PPL Hybrid wins.

### 2.6 Update split scoring weights
- **File**: `fitai-workers/src/utils/workoutSplits.ts`
- **What**: Review all 100-point scoring criteria against research. Ensure: beginners never get PPL 6x or Bro Split. 6-day always requires advanced. 2-3 day always prefers Full Body for beginners.
- **Tests**: TDD — parametric tests covering all (frequency x experience x goal) combos.

---

## PHASE 3: Workout Session UI (Weight Input + PREVIOUS Column)

### 3.1 Create ExerciseHistoryService
- **File**: `src/services/exerciseHistoryService.ts`
- **What**: Service that queries `exercise_sets` for a given (user_id, exercise_id). Returns:
  - `getLastSession(exerciseId)` — last session's sets with weight/reps
  - `getHistory(exerciseId, days=90)` — all sessions in date range
  - `getPersonalRecords(exerciseId)` — current PRs from exercise_prs
- **Tests**: TDD — mock Supabase, test data shaping, test empty history.

### 3.2 Add weight input per set to ExerciseCard
- **File**: `src/features/workouts/components/ExerciseCard.tsx`
- **What**: Each set row: `[weight input] x [reps input] [checkmark]`. Numeric keyboard. kg/lbs toggle from `profiles.units`.
- **Store**: On checkmark tap, write to hook AND fitnessStore for persistence.
- **Tests**: Component test — renders set rows, captures weight/reps.

### 3.3 Add PREVIOUS column to set rows
- **What**: Greyed text left of current input showing last session weight x reps. Tap to copy.
- **Data**: `exerciseHistoryService.getLastSession()`. No history = "First time".
- **Tests**: Shows previous data or "First time" appropriately.

### 3.4 Add set type selector
- **What**: Per-set icon: Normal / Warmup / Failure / Drop Set. Default: Normal.
- **Tests**: Set type changes reflected in stored data.

### 3.5 Persist session state to store (crash recovery)
- **Files**: `src/stores/fitnessStore.ts` + `src/hooks/useWorkoutSession.ts`
- **What**: Add `currentWorkoutSession` to fitnessStore with per-set weight/reps/type. Write on every set completion. Clear on session end.
- **Tests**: State persists across hook unmount/remount.

---

## PHASE 4: Progressive Overloading Logic

### 4.1 Create ProgressionService (core algorithm)
- **File**: `src/services/progressionService.ts`
- **What**: Pure-logic service implementing double progression:
  - `suggestNextWeight(exerciseId, lastSets[], repRange)`:
    - If ALL sets hit top of repRange → return currentWeight + increment
    - If NOT all sets hit top → return same weight
    - Increment: +2.5kg upper body, +5kg lower body (determined by exercise muscle group)
  - `isBodyweightExercise(exercise)` → rep-only progression, no weight suggestion
  - `isTimeBased(exercise)` → duration progression
- **Tests**: TDD — extensive unit tests:
  - All sets at top of range → weight increase
  - Partial reps → keep same weight
  - Bodyweight → rep suggestion only
  - Time-based → duration suggestion
  - Edge: single set, zero weight, first time

### 4.2 Create 1RM estimation utility
- **File**: `src/utils/oneRepMax.ts`
- **What**: Brzycki formula: `1RM = weight / (1.0278 - 0.0278 * reps)`. Also Epley for comparison.
- **Tests**: Known values — 100kg x 10 = ~133kg 1RM.

### 4.3 Integrate progression suggestions into UI
- **File**: `src/features/workouts/components/ExerciseCard.tsx`
- **What**: When session starts, call `progressionService.suggestNextWeight()` for each exercise. Pre-fill weight input with suggestion. Show indicator arrow (green up = increase suggested, grey = same).
- **Tests**: UI shows suggestion, user can override.

### 4.4 Rep failure tracking logic
- **File**: `src/services/progressionService.ts`
- **What**: Add `evaluateFailure(exerciseId, recentSessions[])`:
  - Count sessions where reps < repRange floor
  - If consecutive failures >= threshold (default 2) → return `{ action: 'deload', suggestedWeight: current * 0.9 }`
  - If 1 failure → return `{ action: 'hold' }`
  - Threshold configurable via user settings
- **Tests**: TDD — 0 failures, 1 failure, 2+ consecutive, threshold config.

---

## PHASE 5: Custom Workout Builder + Templates

### 5.1 Create curated exercise subset
- **File**: `src/data/curatedExercises.ts`
- **What**: Filter top ~200 exercises from the 1500+ DB. Organized by: muscle group, equipment, location (home/gym). Filter criteria based on onboarding data (equipment available, location).
- **Function**: `getCuratedExercises(equipment[], location)` → filtered list.
- **Tests**: Filtering by equipment and location produces correct subset.

### 5.2 Create WorkoutTemplateService
- **File**: `src/services/workoutTemplateService.ts`
- **What**: CRUD for workout_templates table:
  - `createTemplate(template)` → insert
  - `getTemplates(userId)` → list
  - `updateTemplate(id, updates)` → update
  - `deleteTemplate(id)` → delete
  - `duplicateTemplate(id)` → copy with new name
  - `incrementUsageCount(id)` → on use
- **Tests**: TDD — CRUD operations with mocked Supabase.

### 5.3 Create Workout Builder screen
- **File**: `src/screens/workouts/CreateWorkoutScreen.tsx`
- **What**: Screen where user builds a workout from scratch:
  - Exercise picker: search/filter from curated subset by muscle group + equipment
  - Add exercise → set number of sets, rep range, target weight, rest time
  - Reorder exercises (drag/drop or up/down arrows)
  - Save as template or start immediately
- **Navigation**: Accessible from workout tab (+ button).
- **Tests**: Screen renders, exercises can be added/removed/reordered.

### 5.4 Create Template Library screen
- **File**: `src/screens/workouts/TemplateLibraryScreen.tsx`
- **What**: List of user's saved templates. Each shows: name, muscle groups, exercise count, last used.
  - Tap → start workout from template
  - Long press or menu → edit, duplicate, delete
- **Tests**: Lists templates, handles empty state.

### 5.5 Enable plan modification (edit engine-generated workouts)
- **File**: Modify existing workout detail/preview screen
- **What**: On an engine-generated plan day, user can: swap exercises (pick replacement from curated list), change sets/reps/weight, save modifications. Modified plan persists in weekly_workout_plans JSONB.
- **Tests**: Modification saves correctly, doesn't break plan structure.

### 5.6 Template-plan coexistence logic
- **File**: `src/stores/fitnessStore.ts`
- **What**: When user starts a template workout while an engine plan is active:
  - Template session tracked as `is_extra = true`
  - Engine plan workout NOT auto-completed
  - Both appear in daily view with clear labeling
- **Tests**: Starting template doesn't affect plan state.

---

## PHASE 6: Exercise History + PR Detection

### 6.1 Create PR detection service
- **File**: `src/services/prDetectionService.ts`
- **What**: Pure-logic service:
  - `checkForPR(exerciseId, newSet, currentPRs)`:
    - Compare `newSet.weight_kg` vs current weight PR
    - Compare estimated 1RM (Brzycki) vs current 1RM PR
    - Return `{ isWeightPR: bool, is1RMPR: bool, newValues }` or null
  - `recordPR(userId, exerciseId, prType, value, sessionId)` → upsert exercise_prs
- **Tests**: TDD — weight PR, 1RM PR, no PR, bodyweight (skip), edge cases.

### 6.2 Integrate real-time PR detection in workout session
- **File**: Modify ExerciseCard / WorkoutSessionScreen
- **What**: On set completion checkmark:
  1. Call `prDetectionService.checkForPR()`
  2. If PR detected → trigger celebration animation
  3. Record PR in exercise_prs table
- **Animation**: Confetti or badge overlay, auto-dismiss after 3s.
- **Tests**: PR triggers animation, non-PR does not.

### 6.3 Create Exercise History screen
- **File**: `src/screens/workouts/ExerciseHistoryScreen.tsx`
- **What**: Accessible by tapping exercise name during workout or from exercise list:
  - All sessions containing this exercise (last 90 days)
  - Per-session: date, sets x reps x weight, estimated 1RM
  - Line chart: estimated 1RM trend over time
  - Volume chart: total volume (weight x reps x sets) trend
  - PRs highlighted on chart with markers
  - Empty state: "No history yet — complete your first workout!"
- **Tests**: Renders history, chart, handles empty state.

### 6.4 Add volume calculation utility
- **File**: `src/utils/volumeCalculator.ts`
- **What**: `totalVolume(sets[]) = sum(weight * reps)` per session. Used by history charts.
- **Tests**: Known inputs → expected volume.

---

## PHASE 7: Deload System

### 7.1 Create DeloadService
- **File**: `src/services/deloadService.ts`
- **What**:
  - `checkProactiveDeload(mesocycleWeek)`: If week >= 5, suggest deload.
  - `checkReactiveDeload(exerciseId, recentSessions[])`: If 2+ consecutive sessions failed rep floor, suggest deload.
  - `generateDeloadPlan(currentPlan)`: Reduce volume 40-50% — fewer sets, same exercises.
  - Early mesocycle failure (week 1-2): Suggest weight reduction, NOT deload protocol.
- **Tests**: TDD — proactive at week 5, reactive at 2 failures, early failure = weight reduction.

### 7.2 Track mesocycle week count
- **File**: `src/stores/fitnessStore.ts`
- **What**: Add `mesocycleStartDate` and `mesocycleWeek` computed from plan creation date. Reset on new plan generation.
- **Tests**: Week count increments correctly, resets on new plan.

### 7.3 Deload suggestion UI
- **File**: Modal/toast component
- **What**: When deload triggered, show modal:
  - Proactive: "Week 5 — time for a recovery week! Reduce volume by 40%?"
  - Reactive: "Bench Press struggling for 2 sessions — consider reducing by 10%"
  - Actions: "Accept" (auto-applies) or "Dismiss" (snoozes for 2 sessions)
- **Tests**: Modal shows for correct triggers, dismiss snoozes correctly.

---

## PHASE 8: Rest Timer

### 8.1 Create RestTimerService
- **File**: `src/services/restTimerService.ts`
- **What**: Timer logic using `Date.now()` comparison (NOT setInterval — handles backgrounding):
  - `startTimer(durationSeconds)` → returns target end time
  - `getRemainingTime(targetEndTime)` → seconds remaining
  - `isExpired(targetEndTime)` → boolean
- **Tests**: Timer calculates correctly, handles app background.

### 8.2 Rest timer UI component
- **File**: `src/features/workouts/components/RestTimer.tsx`
- **What**: Overlay (not blocking exercise card) showing countdown. Visible after set completion if enabled in settings. Vibrate + tone on expiry. Auto-dismiss.
- **Settings toggle**: `src/stores/settingsStore.ts` — `restTimerEnabled: boolean`, default false.
- **Tests**: Timer appears when enabled, hidden when disabled, countdown displays correctly.

---

## PHASE 9: Integration Testing + Polish

### 9.1 End-to-end flow tests
- Full workout flow: start session → log sets with weight → complete → verify exercise_sets + exercise_prs written
- Progressive overload: complete session at top of range → start next session → verify weight suggestion
- Custom template: create template → start from template → log → verify is_extra = true

### 9.2 Edge case testing
- Bodyweight exercise: no weight field, rep-only progression
- Abandoned session: partial data saved correctly
- Date boundary: workout started 11:55PM, completed 12:05AM → uses start date
- Long gap (14+ days): weight reduction suggested
- First-time exercise: "First time" label, blank weight input

### 9.3 Performance validation
- Exercise history query: < 200ms for 90 days of data
- Session start: PREVIOUS column data loads < 500ms
- PR detection: < 50ms per set completion

### 9.4 Polish
- Unit conversion display (kg/lbs) across all weight inputs
- Loading states for history data
- Error handling for failed Supabase writes (retry + toast)
- Accessibility: screen reader labels for weight inputs

---

## Acceptance Criteria Summary

### Progressive Overloading
- AC-PO-1: User completed 3x8 @ 60kg (range 8-12) → PREVIOUS shows "60 x 8", suggestion = 60kg
- AC-PO-2: User completed 3x12 @ 60kg (ALL hit top) → suggestion = 62.5kg
- AC-PO-3: User completed 4x12 @ 100kg squat (ALL hit top) → suggestion = 105kg
- AC-PO-4: User overrides 62.5kg to 65kg → 65kg recorded
- AC-PO-5: Push-ups (bodyweight) → rep suggestion only, no weight

### PR Detection
- AC-PR-1: Set beats all-time best 1RM → celebration fires immediately
- AC-PR-2: Set below current 1RM → no celebration
- AC-PR-3: Deload week → PR detection still runs, unlikely to trigger

### Deload
- AC-DL-1: Failed rep floor 2 consecutive sessions → deload modal with 10% reduction
- AC-DL-2: Week 5 of mesocycle → proactive deload suggestion
- AC-DL-3: User dismisses → snooze 2 sessions

### Custom Workouts
- AC-CW-1: Builder screen: search/filter from ~200 exercises, add with sets/reps/weight
- AC-CW-2: Save as template → appears in Template Library → can start immediately
- AC-CW-3: Template on active plan day → tracked as is_extra, plan not affected

### Rest Timer
- AC-RT-1: Enabled + set completed → countdown starts with exercise restTime
- AC-RT-2: Timer reaches 0 → vibrate + tone, auto-dismiss
- AC-RT-3: Disabled in settings → no timer appears
