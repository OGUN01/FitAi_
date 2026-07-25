# Custom Workout Builder Redesign — End-to-End Plan

**Date:** 2026-07-25
**Branch:** `codex/diet-ui-overhaul` → cut `feat/workout-builder-redesign`
**Vision:** Premium custom workout creation. Apple + Linear + Notion + WHOOP + NTC + Superset feel. Dark premium, glass, generous whitespace, orange accent, large type, spring motion. Build a workout = building intelligent training system, not CRUD.

**Source investigations:** 3 parallel Plan-agent audits (current state, design system, data+AI). Findings consolidated below.

---

## 0. Foundational Truths (what already exists — REUSE, do not rebuild)

| Asset | Path | Why reuse |
|---|---|---|
| Aurora design tokens | `src/theme/aurora-tokens.ts` | SSOT for color/spacing/radius/type/shadow/glass. Every new primitive imports here. |
| `GlassCard`, `GlassView`, `GlassButton`, `AnimatedPressable`, `GlassHeader`, `AuroraBackground`, `EmptyState`, `AuroraSpinner`, `SegmentedControl`, `DynamicTabBar` | `src/components/ui/aurora/*` | The premium surface layer. Already Apple/Linear-tier. |
| `BottomSheet` (drag-dismiss, Reanimated, haptics, safe-area, KAV) | `src/components/ui/aurora/BottomSheet.tsx:94` | Exercise picker, set editor, rest timer — all sheets. |
| `ProgressRing`, `LargeProgressRing`, `GradientBarChart`, `AnimatedChart`, `AnimatedNumber`, `ParticleBurst` | `src/components/ui/*`, `src/components/charts/*` | Summary card rings, volume bars, PR confetti. |
| `useDragToReorder` (long-press+pan, haptics, snap) | `src/gestures/handlers.ts:232` | Powers drag-reorder of days, exercises, sets. Currently wired to CreateWorkoutScreen only. |
| `useSwipeToDelete`, `usePinchToZoom`, `createDoubleTapGesture`, `createLongPressGesture` | `src/gestures/handlers.ts` | DORMANT. Swipe-to-remove exercise, double-tap favorite, pinch-collapse-all. Free wins. |
| `haptics` semantic helpers (`buttonPress`, `dragStart`, `dragDrop`, `celebration`, `swipeAction`, etc.) | `src/utils/haptics.ts` | Every interaction gets a haptic. Already wired into primitives. |
| `ExerciseValidationService` (Jaro-Winkler fuzzy + pregnancy/injury safety + replacements) | `src/ai/exerciseValidationService.ts` | Smart Validation engine. UI missing. |
| `validateMuscleBalance` / `rebalanceMuscleBalance` | `fitai-workers/src/utils/exerciseSelection.ts:719,751` | Worker-side. Basis for client port + weekly insights. |
| `calorieCalculator.calculateWorkoutCalories` + `estimateExerciseDuration` | `src/services/calorieCalculator.ts:88,171` | MET × weight × hours. Powers summary card calories + duration. |
| `progressionService` (Double Progression, RPE 1-3 logic) + `deloadService` | `src/services/progressionService.ts`, `deloadService.ts` | Progressive overload + deload math. Surfaces in editor + insights. |
| `workoutBuilders.buildDayWorkoutFromTemplate/Exercises` | `src/utils/workoutBuilders.ts` | Stable deterministic `DayWorkout.id` (e.g. `custom_monday_<hash>`). Slot identity preserved. |
| `is_public` + "Public templates readable by all" RLS | `supabase/migrations/20260326000003_create_workout_templates.sql:21` | Community templates. DB-ready. UI missing. |
| `@shopify/react-native-skia` `v2.0.0-next.4` | `package.json` | INSTALLED, ZERO usages in `src/`. Biggest greenfield lever for radar chart. |
| `exercise_sets` table + `set_type` CHECK | `supabase/migrations/20260326000001` | Per-set tracking. Needs widening for superset/circuit. |
| Overlay-session router | `src/components/navigation/MainNavigation.tsx:128` | New builder sub-steps register as overlay sessions. No react-navigation stack. |

---

## 1. Architecture Decisions

### 1.1 Single Source of Truth

The redesign writes through ONE store field: `fitnessStore.customWeeklyPlan` (existing SSOT for user-built plans). A new `workoutBuilderStore` holds ONLY transient draft/edit/drag/validation state — never a parallel plan object.

```
workoutBuilderStore (transient, NON-persisted)
├── draft: WeeklyWorkoutPlan | null          ← mirror of customWeeklyPlan during edit session
├── draftDirty: boolean                       ← unsaved changes flag
├── selectedDayIndex: number
├── expandedDayIndex: number | null
├── pickerOpen: boolean + pickerContext {dayIndex, slotIndex?}
├── editorOpen: boolean + editorContext {dayIndex, exerciseIndex}
├── dragState: {activeId, fromDay, toDay, fromIndex, toIndex} | null
├── validationWarnings: ValidationWarning[]
├── aiSuggestions: AiSuggestion[]            ← per-day AI fill candidates
└── insights: WeeklyInsights | null          ← derived/cached

fitnessStore (persisted, existing)
├── weeklyWorkoutPlan: WeeklyWorkoutPlan | null     ← AI plan (untouched)
├── customWeeklyPlan: WeeklyWorkoutPlan | null       ← USER BUILT (SSOT — builder writes here)
└── activePlanSource: 'ai' | 'custom'               ← unchanged
```

**Rule:** `workoutBuilderStore.draft` hydrates FROM `customWeeklyPlan` on builder open. On save, writes THROUGH to `customWeeklyPlan` via `saveCustomWeeklyPlan`. Never a third plan object.

### 1.2 Canonical Planned Exercise Type

Three incompatible shapes today: `WorkoutSet`, `TemplateExercise`, AI `WorkoutExerciseSchema`. Redesign introduces ONE canonical planned type with adapters:

```typescript
// src/types/workout.ts — NEW canonical type
interface PlannedExercise {
  exerciseId: string;
  name: string;
  sets: PlannedSet[];
  restSeconds: number;
  notes?: string;
  tempo?: string;                 // e.g. "3-1-2-0"
  targetRpe?: number;             // 1-10 (industry standard)
  supersetId?: string;            // groups exercises into superset
  circuitId?: string;             // groups into circuit
  blockIndex?: number;            // ordering within superset/circuit
  alternativeExerciseId?: string;
}

interface PlannedSet {
  setNumber: number;
  reps: number | string;          // number or "8-12" range
  weightKg?: number;
  setType: 'normal' | 'warmup' | 'failure' | 'drop' | 'superset' | 'circuit';
  dropWeightKg?: number;           // for drop sets
  dropReps?: number;
  durationSeconds?: number;        // for time-based
}

// Adapters at boundaries:
// - toWorkoutSet(planned) → WorkoutSet        (for session execution)
// - toTemplateExercise(planned) → TemplateExercise  (for template save)
// - toAiSchema(planned) → WorkoutExercise      (for AI re-generation)
```

### 1.3 RPE Standardization

DB `exercise_sets.rpe` is `SMALLINT CHECK IN (1,2,3)` (3-tap). `WorkoutSet.rpe` is `number` 1-10. **Standardize on 1-10.** Migration widens CHECK. The 3-tap session UI (RPE 1=easy, 2=moderate, 3=hard) is preserved as a SESSION-time simplification; the builder uses full 1-10 scale.

### 1.4 Exercise Library SSOT

Dual SSOT today: `exercises` DB table (unused at runtime) vs Worker `exerciseDatabase.json` vs client `exerciseFilterService`. **Decision:** seed `exercises` table from `exerciseDatabase.json` once, both Worker + client read from Supabase with KV/cache fallback. Picker queries `exercises` table with full-text search + filter indexes. Out of scope for v1 builder launch — picker continues reading `CURATED_EXERCISES` client-side; migration to DB read is Phase 6.

---

## 2. Phased Rollout

Each phase is a parallel-agent-ready unit. Phases are SEQUENTIAL (later phases depend on earlier foundations), but work UNITS within a phase run in parallel.

### Phase 0 — Foundation: Types, Store, Migration [BLOCKER for all]
### Phase 1 — Premium Primitives (radar, drag polish, magnetic button, superset connector)
### Phase 2 — Navigation Shell + Empty States + Build Method Landing
### Phase 3 — Weekly Schedule Builder (collapsible day blocks, drag, summary footer)
### Phase 4 — Exercise Picker Bottom Sheet (search, chips, AI suggestions, favorites)
### Phase 5 — Exercise Editor Modal (sets/reps/RPE/tempo/superset/notes/PR/history)
### Phase 6 — Smart Validation + Weekly Insights (radar, push/pull, recovery)
### Phase 7 — Template Library Redesign (grid/list, community, AI-generated)
### Phase 8 — Workout Detail Screen + Micro-interactions + Gestures
### Phase 9 — AI Features (NL edits, generate week, deload, progressive overload)
### Phase 10 — Community Features (browse, clone, share, rate)
### Phase 11 — Analytics integration + Accessibility polish + QA

---

## 3. Phase Detail

### Phase 0 — Foundation [BLOCKER]

**Goal:** Types, store, migration. Everything else depends on this.

**Work units (sequential):**

0.1 **Types** (`src/types/workout.ts`)
- Add `PlannedExercise`, `PlannedSet`, `SupersetGroup`, `CircuitGroup`
- Add `ValidationWarning { id, type, severity, message, exerciseId?, dayIndex?, fixAction? }`
- Add `WeeklyInsights { pushPullRatio, muscleCoverage: Record<MuscleGroup, number>, recoveryScore, totalVolume, calorieEstimate, balanceWarnings[], timeCommitment, weeklyCalories }`
- Add `AiSuggestion { exerciseId, name, reason, confidence, muscleGroup, sets, reps, restSeconds }`
- Extend `DayWorkout` with `exercises: PlannedExercise[]` (replacing mixed shape) + `supersetGroups?: SupersetGroup[]`
- Adapters: `toWorkoutSet`, `toTemplateExercise`, `fromTemplateExercise`, `toAiExercise`

0.2 **Builder store** (`src/stores/workoutBuilderStore.ts` — NEW)
- Zustand, NON-persisted (transient session state)
- Actions: `hydrateFromCustomPlan()`, `updateDay(index, day)`, `addExercise(dayIndex, exercise)`, `removeExercise(dayIndex, exerciseIndex)`, `reorderExercise(dayIndex, from, to)`, `moveExerciseBetweenDays(fromDay, fromIdx, toDay, toIdx)`, `duplicateDay(fromIdx, toIdx)`, `setExpandedDay(index|null)`, `openPicker(ctx)`, `closePicker()`, `openEditor(ctx)`, `closeEditor()`, `setDragState(state|null)`, `setValidationWarnings(w)`, `setAiSuggestions(s)`, `computeInsights()`, `save()`, `discard()`
- `save()` calls `fitnessStore.saveCustomWeeklyPlan(draft)` then `discard()`
- `computeInsights()` runs client-side muscle-balance/volume/recovery math, caches in `insights`

0.3 **Migration** (`supabase/migrations/20260725XXXXXX_workout_builder_foundation.sql` — NEW, append-only, IF NOT EXISTS)
```sql
-- exercise_sets: widen for superset/circuit/dropset/tempo/RPE-10
ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS tempo TEXT;
ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS superset_id UUID;
ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS circuit_id UUID;
ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS block_index INTEGER;
ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS drop_weight_kg DECIMAL(6,2);
ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS drop_reps INTEGER;
-- Add rpe_10 alongside existing rpe (1-3) to preserve session UI
ALTER TABLE exercise_sets ADD COLUMN IF NOT EXISTS rpe_10 SMALLINT CHECK (rpe_10 BETWEEN 1 AND 10);
-- Widen set_type to include superset/circuit
ALTER TABLE exercise_sets DROP CONSTRAINT IF EXISTS exercise_sets_set_type_check;
ALTER TABLE exercise_sets ADD CONSTRAINT exercise_sets_set_type_check
  CHECK (set_type IN ('normal','warmup','failure','drop','superset','circuit'));

-- workout_templates: community + categorization
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS difficulty TEXT;
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS rating_avg DECIMAL(3,2) DEFAULT 0;
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS fork_count INTEGER DEFAULT 0;
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES workout_templates(id);
ALTER TABLE workout_templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Template ratings
CREATE TABLE IF NOT EXISTS template_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_template_ratings_template ON template_ratings(template_id);

-- Draft persistence (crash-safe)
ALTER TABLE weekly_workout_plans ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false;

-- Insights cache
ALTER TABLE weekly_workout_plans ADD COLUMN IF NOT EXISTS insights_jsonb JSONB;

-- RLS for new table
ALTER TABLE template_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can rate templates" ON template_ratings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can read ratings" ON template_ratings
  FOR SELECT USING (true);
```

0.4 **Service additions**
- `workoutTemplateService.getPublicTemplates({category?, difficulty?, sort:'trending'|'top'|'new', limit, offset})` — browse community
- `workoutTemplateService.rateTemplate(templateId, rating, review?)`
- `workoutTemplateService.forkTemplate(templateId)` — clone public to user's library
- `workoutTemplateService.saveDraft(draft)` / `loadDraft()` — crash-safe

0.5 **Insights computation** (`src/services/workoutInsightsService.ts` — NEW)
- `computeWeeklyInsights(plan: WeeklyWorkoutPlan, profile): WeeklyInsights`
- Push/pull ratio: count push exercises (chest/triceps/front-delts) vs pull (back/biceps/rear-delts)
- Muscle coverage: aggregate `targetMuscleGroups` across all days → `{group: weeklySets}`
- Recovery score: inverse of consecutive-day same-muscle-group hits + total volume vs max-recoverable-volume
- Total volume: sum(sets × reps × weightKg) per exercise
- Calorie estimate: `sum(calculateWorkoutCalories(day, profile))` per day
- Time commitment: `sum(duration)`

**Phase 0 deliverable:** Types compile, store works in isolation, migration applies cleanly, `computeWeeklyInsights` returns valid shape from a sample plan. No UI yet.

---

### Phase 1 — Premium Primitives (parallel)

**Goal:** Build the missing premium primitives the new design needs. All in `src/components/ui/aurora/` and `src/components/charts/`.

1.1 **MuscleBalanceRadar** (`src/components/charts/MuscleBalanceRadar.tsx` — NEW)
- Skia-based radar/spider chart, 8 axes (Chest/Back/Shoulders/Biceps/Triceps/Legs/Core/Glutes)
- Gradient fill (orange→transparent), animated draw-in (spring), tap-axis tooltip
- Props: `data: Record<MuscleGroup, number>`, `size`, `gradientColors?`, `onAxisPress?`
- Reduce-motion guard

1.2 **MagneticTabIndicator** (`src/components/ui/aurora/MagneticTabIndicator.tsx` — NEW)
- Day picker (Mon-Sun) with indicator that tracks finger via `Gesture.Pan`, springs to nearest tab on release
- Built on `DynamicTabBar` pattern

1.3 **DragHandleRow** (`src/components/ui/aurora/DragHandleRow.tsx` — NEW)
- Wraps `useDragToReorder`. Adds: grabber glyph (Ionicons `reorder-three`), sibling reflow via `Layout` animation (`useAnimatedStyle` translateY on neighbors as dragged item passes), elevation shadow during drag, haptic tier on threshold cross

1.4 **SupersetConnector** (`src/components/ui/aurora/SupersetConnector.tsx` — NEW)
- SVG curved dashed connector between grouped exercise rows
- Animated stroke draw, color = purple accent

1.5 **DetentBottomSheet** (`src/components/ui/aurora/DetentBottomSheet.tsx` — NEW)
- Extends `BottomSheet` with snap points array `[0.3, 0.6, 0.95]`, `withSpring` between detents, drag-handle tracks finger
- WHOOP/Apple style. Used by picker + editor.

1.6 **Confetti** (port `AchievementCelebration` confetti to Reanimated OR extend `ParticleBurst`)
- Add gravity, rotation, physics settling
- Trigger on: save template, PR set, workout complete from builder

1.7 **LiveVolumeRing** (`src/components/ui/aurora/LiveVolumeRing.tsx` — NEW)
- `ProgressRing` driven by `useDerivedValue` over the builder store's `insights.totalVolume`
- Fills live as user adds sets

1.8 **RestTimerRadial** (`src/components/ui/aurora/RestTimerRadial.tsx` — NEW)
- Skia arc countdown, `useFrameCallback` clock, haptic on each 10s, completion chime + celebration burst

**Phase 1 deliverable:** All primitives exist, demoed in isolation. No wiring yet.

---

### Phase 2 — Navigation Shell + Empty States + Landing (parallel)

**Goal:** Replace FitnessScreen custom-plan empty CTA + ScheduleBuilder 2-mode toggle with the new flow.

2.1 **My Plan empty state redesign** (`src/components/fitness/CustomPlanEmptyState.tsx` — NEW)
- GlassCard with animated icon disc (AuroraBackground mini), headline "No Custom Schedule", explanation, two CTAs (Build Schedule primary, Browse Templates secondary)
- Below: MY LIBRARY preview card (8 templates / 24 workouts / 120 exercises / Last edited Yesterday) — pulls from `workoutTemplateService.getTemplates` + `getAllTimeWorkoutStats`
- If library empty: "Create First Template" / "Browse Community" / "Generate with AI"
- Replace `FitnessScreen.tsx:478-505` hand-rolled dashed Pressable

2.2 **BuildMethodLanding screen** (`src/screens/workouts/BuildMethodLandingScreen.tsx` — NEW)
- Headline "How would you like to build your program?"
- 4 feature cards (GlassCard, depth, accent per option):
  - **Use Templates** (purple) — Beginner/Upper-Lower/PPL/Bro Split/Hybrid, "Recommended" badge
  - **Build From Scratch** (orange) — "3 min estimated build", drag&drop, supersets
  - **Duplicate Existing** — copy previous schedule
  - **Import Community** (premium badge) — trending templates
- Each card: `AnimatedPressable`, spring lift, haptic, navigates to next step
- Registers as overlay session in `MainNavigation.tsx`

2.3 **Navigation wiring** (`src/components/navigation/MainNavigation.tsx`)
- Add overlay sessions: `buildMethodLandingSession`, `workoutDetailSession`
- Route: My Plan empty → `BuildMethodLanding` → (Templates | Scratch | Duplicate | Community) → `ScheduleBuilder`
- Back chain preserved

2.4 **Aurora background + header** for all builder screens
- Reuse `AuroraBackground theme="space"`, `GlassHeader` with back chevron + title + save action

**Phase 2 deliverable:** User opens My Plan, sees premium empty state, taps Build Schedule, sees landing with 4 options. Tap any → routes to existing ScheduleBuilder (which Phase 3 replaces).

---

### Phase 3 — Weekly Schedule Builder (parallel)

**Goal:** Replace `ScheduleBuilderScreen.tsx` (1000 lines) with premium collapsible day blocks + drag + summary footer.

3.1 **WeeklyBuilderScreen** (`src/screens/workouts/WeeklyBuilderScreen.tsx` — NEW, replaces ScheduleBuilderScreen)
- 7 day blocks, each collapsible
- Collapsed: day name, workout title, duration, exercise count, intensity color chip, progress chip, expand chevron
- Expanded: exercise list (warmup → main → superset indicators → cooldown), Add Exercise button, Notes, Rest timer, duplicate-day action
- Long-press day header → drag reorder days (use `DragHandleRow`)
- Swipe day → copy to another day / duplicate whole week

3.2 **DayBlock component** (`src/components/fitness/builder/DayBlock.tsx` — NEW)
- GlassCard, expand/collapse spring (`FadeInUp`/`SlideInRight` Reanimated layout anims)
- Expanded content: exercise list, superset connectors, Add Exercise `GlassButton` (orange accent)
- Long-press header = drag mode (haptic `longPress`)

3.3 **ExerciseRow component** (`src/components/fitness/builder/ExerciseRow.tsx` — NEW)
- Premium compact card: thumbnail (or icon disc), GIF preview indicator (placeholder for now — no GIFs in CURATED_EXERCISES), exercise name, primary muscles chips, equipment, difficulty, sets × reps, favourite icon, more menu, Quick Add button
- Long-press = drag (DragHandleRow), swipe = duplicate/replace/delete (useSwipeToDelete wired), double-tap = favourite (createDoubleTapGesture wired)
- Tap row = open Exercise Editor (Phase 5)

3.4 **BuilderSummaryFooter** (`src/components/fitness/builder/BuilderSummaryFooter.tsx` — NEW)
- Floating glass footer, sticky bottom
- Shows: exercises count, estimated duration (sum), estimated calories (sum), total volume, muscle balance % (mini radar preview), difficulty
- Live updates as user edits (subscribes to `workoutBuilderStore.draft`)
- Save button (GlassButton primary, spring, success haptic + confetti on save)

3.5 **Day-to-day drag** (`useMoveExerciseBetweenDays` in `src/gestures/handlers.ts` — NEW)
- Extends `useDragToReorder` to support cross-list drag (pan over different day's expanded list → drop into new day)
- Haptic tier on day-cross

3.6 **Bulk actions**
- Copy Monday to Thursday, Copy whole week, Bulk replace exercises — `workoutBuilderStore` actions + footer menu

**Phase 3 deliverable:** User builds a week: collapses/expands days, drags exercises within and between days, sees live summary footer, saves. Replaces ScheduleBuilderScreen.

---

### Phase 4 — Exercise Picker Bottom Sheet (parallel)

**Goal:** Redesign the picker as near-fullscreen `DetentBottomSheet` with chips, AI suggestions, favorites.

4.1 **ExercisePickerSheet** (`src/components/fitness/builder/ExercisePickerSheet.tsx` — NEW)
- `DetentBottomSheet` snap points [0.3, 0.6, 0.95], default 0.95
- Top: search bar (voice search icon — placeholder, no real voice yet), filter button
- Below: horizontal chips — Muscle groups / Equipment / Difficulty / Movement pattern / Goals
- Body: exercise cards grid (2-col on tablet, 1-col list on phone), infinite scroll (FlatList onEndReached), lazy load
- Sections: Recent searches / Popular / Recommended (AI) / Pinned favourites / All
- Multi-select mode (long-press first card → multi-add)
- Tap card → Quick Add to current day (haptic + spring morph)

4.2 **ExercisePickerCard** (`src/components/fitness/builder/ExercisePickerCard.tsx` — NEW)
- Thumbnail (icon disc placeholder), GIF preview indicator, name, primary muscles, equipment, difficulty, est. time, sets × reps, favourite icon, more menu, Quick Add button
- Animated press (spring scale), haptic on add

4.3 **PickerService** (`src/services/exercisePickerService.ts` — NEW)
- `searchExercises(query, filters): Exercise[]` — wraps CURATED_EXERCISES filter + Jaro-Winkler fuzzy via `ExerciseValidationService`
- `getRecentSearches()`, `addRecentSearch(query)` — AsyncStorage
- `getFavorites()`, `toggleFavorite(exerciseId)` — AsyncStorage (no DB table yet)
- `getRecommendedForDay(dayIndex, currentExercises): Exercise[]` — uses `ExerciseValidationService.generateValidationReport` inverse — finds exercises that balance current day's muscle coverage

4.4 **AI suggestions panel** (within picker)
- "AI Suggests for Chest Day" — shows recommended exercises with confidence %, balanced volume, recovery score
- "Apply AI Recommendation" button — one-tap fills day
- Calls new worker endpoint (Phase 9 — for v1, uses client-side `getRecommendedForDay`)

**Phase 4 deliverable:** User taps Add Exercise → premium sheet opens → search/filter/AI-suggest → quick-add to day. Replaces existing bottom-sheet picker in ScheduleBuilderScreen.

---

### Phase 5 — Exercise Editor Modal (parallel)

**Goal:** One beautiful scrollable sheet to edit everything.

5.1 **ExerciseEditorSheet** (`src/components/fitness/builder/ExerciseEditorSheet.tsx` — NEW)
- `DetentBottomSheet` snap points [0.5, 0.95], default 0.95
- Sections (collapsible):
  - Sets: list of set rows (set number, reps input, weight input, set-type selector via `SegmentedControl`, drop-weight/reps if drop set)
  - Add Set button (spring morph + haptic)
  - Rest timer: `Slider` + `RestTimerRadial` preview
  - RPE: `Slider` 1-10
  - Tempo: 4-digit input (e.g. "3-1-2-0") with explanation tooltip
  - Intensity: `SegmentedControl` (normal/warmup/failure/drop/superset/circuit)
  - Superset/Circuit: picker to group with another exercise in same day (sets `supersetId`)
  - Notes: multiline TextInput
  - Alternative exercise: picker (opens nested ExercisePickerSheet)
  - Personal record: read-only display from `exercise_prs` table
  - History: mini `AnimatedChart` of last 10 sessions volume

5.2 **SetRow** (`src/components/fitness/builder/SetRow.tsx` — NEW)
- Drag handle (DragHandleRow), set number, reps, weight, set-type chip, delete (swipe)
- Animated add/remove (Reanimated layout)

5.3 **Editor wiring**
- Reads from `workoutBuilderStore.editorContext`
- Writes via `updateExerciseInDay(dayIndex, exerciseIndex, updated)` action
- Confetti on PR-set save (if weight > existing PR)

**Phase 5 deliverable:** User taps exercise row → editor sheet opens → edit sets/reps/RPE/tempo/superset/notes → save → day updates live.

---

### Phase 6 — Smart Validation + Weekly Insights (parallel)

**Goal:** Surface `ExerciseValidationService` + new `computeWeeklyInsights` in builder UI.

6.1 **ValidationEngine client wrapper** (`src/services/builderValidationService.ts` — NEW)
- `validatePlan(plan): ValidationWarning[]`
- Checks: too much chest volume, not enough pulling, missing legs, too many compounds, no warmup, recovery conflict (same muscle group consecutive days above threshold)
- Uses `ExerciseValidationService.validateExerciseSafety` for pregnancy/injury constraints
- Returns warnings with `fixAction` (e.g. `{type:'add_pull', suggestedExercises:[...]}`)

6.2 **InlineValidationBanner** (`src/components/fitness/builder/InlineValidationBanner.tsx` — NEW)
- Elegant inline card (not popup) above day block or in footer
- Color: warning amber / info blue / error red
- Tap → expands with fix action button ("Add back exercise" → opens picker filtered)

6.3 **WeeklyInsightsPanel** (`src/components/fitness/builder/WeeklyInsightsPanel.tsx` — NEW)
- Top of builder or as collapsible card
- `MuscleBalanceRadar` (Skia) — 8 axes, animated
- Stats: Push/Pull ratio (circular indicator), Volume Score (number + bar), Recovery Score (number + bar), Time Commitment, Weekly Calories, Muscle Coverage %
- Updates live as user edits

6.4 **Insights caching**
- On save, `workoutBuilderStore.save()` calls `computeWeeklyInsights` and persists to `weekly_workout_plans.insights_jsonb` column
- On load, hydrate from cache if plan unchanged

**Phase 6 deliverable:** As user builds, inline validation appears, weekly insights panel shows live radar + stats. No annoying popups.

---

### Phase 7 — Template Library Redesign (parallel)

**Goal:** Apple Photos feel. Grid/list, community, AI-generated.

7.1 **TemplateLibraryScreen redesign** (`src/screens/workouts/TemplateLibraryScreen.tsx` — REWRITE)
- Top: search bar, grid/list toggle, folder tabs (Recently Used / Pinned / My Templates / Community / AI Generated / Collections)
- Collections: Upper-Lower / PPL / Strength / Powerlifting / Athlete / Fat Loss / Home / Travel
- Grid: minimal cards with thumbnail (gradient + icon), name, exercise count, duration, difficulty
- List: richer rows with muscle badges
- Long-press = multi-select (delete/share/export)

7.2 **CommunityTab** (`src/components/fitness/builder/CommunityTemplatesTab.tsx` — NEW)
- Calls `workoutTemplateService.getPublicTemplates({sort:'trending'})`
- Sort chips: Trending / Top Rated / New
- Cards: thumbnail, name, author, rating avg, fork count, downloads
- Tap → preview sheet → "Fork to my library" (calls `forkTemplate`)

7.3 **TemplateDetailSheet** (`src/components/fitness/builder/TemplateDetailSheet.tsx` — NEW)
- Full preview: exercises, muscle balance radar, difficulty, duration, calories
- Actions: Fork / Use in Schedule / Share

**Phase 7 deliverable:** User browses templates Apple-Photos-style, including community templates (DB already supports it).

---

### Phase 8 — Workout Detail Screen + Micro-interactions + Gestures (parallel)

8.1 **WorkoutDetailScreen** (`src/screens/workouts/WorkoutDetailScreen.tsx` — NEW)
- Replaces `WorkoutDetailsDialog` modal
- Sections: Warm-up / Main Workout / Supersets / Finisher / Cooldown — each collapsible
- Sticky progress indicator at top
- Workout statistics: volume, calories, duration, muscle heatmap, difficulty
- Exercise list with thumbnails, sets × reps, RPE target

8.2 **Micro-interactions polish**
- Card hover: soft lift (AnimatedPressable already does — verify)
- Button spring: GlassButton spring scale (verify config = `springConfig.snappy`)
- Add exercise: morph animation (Reanimated layout)
- Complete: confetti (ParticleBurst extended in Phase 1.6)
- Save: checkmark morph (new `CheckmarkMorph` primitive — small Reanimated component)
- Delete: smooth collapse (Reanimated `SlideOutUp` + `Layout`)
- Expansion: physics animation (spring)

8.3 **Gestures**
- Swipe exercise: duplicate / replace / delete / favourite — wire `useSwipeToDelete` + custom swipe-left for duplicate
- Long press: drag (already via DragHandleRow)
- Pinch: collapse all days (use `usePinchToZoom` repurposed — pinch in = collapse all)
- Pull: refresh (use `usePullToRefresh` — wire to recompute insights)
- Double tap: favourite (wire `createDoubleTapGesture` to ExerciseRow favourite icon)
- Swipe day: copy day (swipe-left on day header → "Copy to..." bottom sheet)

8.4 **Haptic tier audit**
- Every interaction gets a semantic haptic from `src/utils/haptics.ts`
- Drag start/drop/boundary already wired; add: validation warning = `warning`, AI suggestion apply = `success`, save = `celebration`

**Phase 8 deliverable:** Workout detail is a real screen. Every interaction feels premium.

---

### Phase 9 — AI Features (parallel, future-ready)

9.1 **Worker endpoints** (`fitai-workers/src/handlers/workoutBuilderAi.ts` — NEW)
- `POST /workout/suggest-day` — input: `{dayIndex, currentExercises[], profile, goals}` → `{suggestedExercises[], confidence, reasoning}`
- `POST /workout/validate` — input: `{plan, profile}` → `{warnings[], fixActions[]}`
- `POST /workout/edit-natural-language` — input: `{plan, instruction, profile}` → `{updatedPlan}`. Instruction examples: "Make Friday heavier", "Reduce workout to 45 minutes", "Replace barbell with dumbbells"
- `POST /workout/generate-full-week` — input: `{partialPlan (2+ days), profile}` → `{completePlan}`
- `POST /workout/apply-progression` — input: `{plan, priorPerformance}` → `{updatedPlan}` (uses `progressionService` server-side)
- `POST /workout/deload` — input: `{plan}` → `{deloadPlan}` (uses `deloadService` server-side)
- All use `withDeduplication`, 3-tier cache, Zod schemas

9.2 **Zod schemas** (`fitai-workers/src/utils/validation.ts`)
- `SuggestDayRequestSchema`, `ValidatePlanRequestSchema`, `EditNaturalLanguageRequestSchema`, `GenerateFullWeekRequestSchema`, `ApplyProgressionRequestSchema`, `DeloadRequestSchema`
- Response schemas mirror `PlannedExercise` / `WeeklyWorkoutPlan` / `ValidationWarning`

9.3 **Client service** (`src/ai/workoutBuilderAi.ts` — NEW)
- Wraps `fitaiWorkersClient` calls
- Returns camelCase shapes
- Caches suggestions in `workoutBuilderStore.aiSuggestions`

9.4 **Builder UI affordances**
- "AI Fill Day" button on each empty day block
- "Fix Imbalance" action in InlineValidationBanner (calls `/workout/validate` fixAction)
- "Generate Full Week" in footer menu (calls `/workout/generate-full-week` from partial draft)
- "Apply Progressive Overload" in footer menu (calls `/workout/apply-progression`)
- "Deload Week" in footer menu (calls `/workout/deload`)
- NL edit bar (voice/text input) at top: type instruction → plan updates

9.5 **Voice workout builder** (v2 — placeholder UI in v1)
- Voice search icon in picker (Phase 4) wired to nothing yet
- NL edit bar accepts typed instructions in v1

**Phase 9 deliverable:** AI assists at every step. NL edits work. Progressive overload + deload one-tap.

---

### Phase 10 — Community Features (parallel, future-ready)

10.1 **Save publicly flow**
- In editor: toggle "Share to Community" → sets `is_public=true` on save
- Prompt for category, difficulty, tags

10.2 **Clone workout** — `forkTemplate` already in Phase 0.4. Wire UI button in TemplateDetailSheet.

10.3 **Share template** — deep link generation (`expo-sharing` or Linking.createURL)
- Recipient opens link → app imports template

10.4 **Like / Bookmark** — `template_ratings` table covers rating. Add `template_bookmarks` table (Phase 10 migration) OR store bookmarks in AsyncStorage for v1.

10.5 **Creator profile** (v2)
- Tap author name → creator profile sheet with their public templates

10.6 **Ratings / Downloads / Trending**
- `rating_avg` / `rating_count` from `template_ratings` (Phase 0.3)
- `fork_count` incremented on fork
- "Trending" sort = `ORDER BY fork_count DESC, rating_count DESC LIMIT 50`

10.7 **Verified coaches** (v2)
- `profiles.is_verified_coach` column + badge in UI

**Phase 10 deliverable:** Community templates browseable, forkable, rateable, shareable.

---

### Phase 11 — Analytics + Accessibility + QA (parallel)

11.1 **Analytics integration**
- Weekly volume chart (reuse `AnimatedChart`) — last 12 weeks
- Muscle heatmap (reuse `GradientBarChart` per body part)
- Recovery score trend (reuse `AnimatedChart`)
- Consistency + workout streak (already in `analyticsStore`)
- Estimated growth (calculated from volume trend)
- Time invested (sum `total_duration_minutes`)
- Exercise frequency (top 10 most-performed)
- PRs list (from `exercise_prs`)

11.2 **Accessibility**
- Large tap targets (min 44×44 — verify all AnimatedPressable)
- Thumb-friendly: sticky footer actions, swipe gestures reachable one-handed
- High contrast: verify all text on glass meets WCAG AA (tokens already dark-premium)
- Haptic feedback: every interaction (already wired)
- Dynamic font scaling: use `PixelRatio.getFontScale()` in type tokens
- Screen reader: `accessibilityRole`/`Label`/`Hint` on all pressables, drag gestures get `accessibilityHint="Double tap to enter reorder mode, then swipe up/down to move"`
- Reduce motion: `useReducedMotion` guard on all continuous motion

11.3 **QA**
- E2E flow test: empty state → build → save → execute workout → completion
- Crash recovery: kill app mid-builder-edit → reopen → draft restored
- Offline: builder works offline (CURATED_EXERCISES client-side), save queues to `offlineService`
- Performance: 60fps during drag (Skia off UI thread, Reanimated on UI thread)
- Tests: unit tests for `computeWeeklyInsights`, `builderValidationService`, adapters; component tests for DayBlock, ExerciseRow, ExercisePickerSheet

**Phase 11 deliverable:** Polished, accessible, tested. Ready for launch.

---

## 4. Parallel Agent Execution Plan

After Phase 0 (foundation — must be sequential and merged first), each phase launches 3-5 parallel agents:

| Phase | Agents (parallel) | Est. files |
|---|---|---|
| 0 | (sequential, no parallel) | 5 |
| 1 | radar / drag-polish / magnetic-button / detent-sheet / confetti-port / volume-ring / rest-timer / superset-connector | 8 |
| 2 | empty-state / landing-screen / nav-wiring / aurora-bg | 4 |
| 3 | weekly-builder-screen / day-block / exercise-row / summary-footer / day-to-day-drag / bulk-actions | 6 |
| 4 | picker-sheet / picker-card / picker-service / ai-suggestions-panel | 4 |
| 5 | editor-sheet / set-row / editor-wiring | 3 |
| 6 | validation-engine / inline-banner / insights-panel / insights-cache | 4 |
| 7 | library-rewrite / community-tab / template-detail-sheet | 3 |
| 8 | detail-screen / micro-interactions / gestures / haptic-audit | 4 |
| 9 | worker-endpoints / zod-schemas / client-service / builder-ui-affordances | 4 |
| 10 | save-publicly / clone-fork / share / ratings-trending | 4 |
| 11 | analytics / accessibility / qa-tests | 3 |

**Total: ~52 files new/rewritten.** Phases 0-6 = MVP (launchable). Phases 7-11 = polish + future.

---

## 5. Risk Register

| Risk | Mitigation |
|---|---|
| Third parallel plan object in store | Builder writes THROUGH `customWeeklyPlan` via `saveCustomWeeklyPlan`. Draft is transient only. |
| Exercise library dual SSOT | v1 keeps CURATED_EXERCISES client-side. Phase 6 (later) migrates to DB. |
| `WorkoutSet` vs `TemplateExercise` vs AI shape divergence | ONE canonical `PlannedExercise` type + adapters at boundaries. |
| RPE enum mismatch (1-3 vs 1-10) | Add `rpe_10` column alongside. Session UI keeps 3-tap; builder uses 1-10. |
| Skia unused — learning curve | Radar is only Skia usage in v1. Fall back to SVG if Skia proves brittle. |
| Drag perf during cross-day pan | Reanimated on UI thread, Skia off UI thread. Profile with Flipper. |
| Worker AI endpoints latency | 3-tier cache (KV+DB+Fresh) already pattern. Add per-endpoint cache keys. |
| Migration safety | All `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`. Append-only per CLAUDE.md. |
| Draft loss on crash | `is_draft` column on `weekly_workout_plans` + autosave on every change (debounced 2s). |
| Community template spam/abuse | v1: no user upload of images, name/desc sanitized, rate-limit fork RPC. Report flow = v2. |

---

## 6. Launch Sequence

1. Cut branch `feat/workout-builder-redesign` from `master` (not from `codex/diet-ui-overhaul`)
2. Phase 0 — merge to a `feat/wb-foundation` sub-branch, PR review, merge to main feature branch
3. Phases 1-2 in parallel — merge to feature branch
4. Phase 3 — merge to feature branch (this is the MVP user-facing change)
5. Phases 4-6 in parallel — merge
6. **MVP LAUNCH** — Phases 0-6 complete. User can build a premium workout end-to-end.
7. Phases 7-11 — post-MVP, merge in sequence
8. Full launch after Phase 11 QA pass

---

## 7. Definition of Done

- [ ] User opens My Plan → sees premium empty state with library preview
- [ ] Taps Build Schedule → sees 4-option landing
- [ ] Builds from scratch → weekly builder with collapsible days, drag, live summary footer
- [ ] Adds exercise via premium picker sheet with chips + AI suggestions
- [ ] Edits exercise via editor sheet (sets/reps/RPE/tempo/superset/notes/PR/history)
- [ ] Sees inline validation warnings (no popups) + weekly insights radar
- [ ] Saves → confetti + checkmark morph → plan persisted to `customWeeklyPlan` + DB
- [ ] Crash recovery: kill app mid-edit → reopen → draft restored
- [ ] Browses template library Apple-Photos-style incl. community templates
- [ ] Workout detail screen shows sections + sticky progress + stats
- [ ] Every interaction has haptic + spring motion
- [ ] 60fps during drag, reduce-motion respected
- [ ] WCAG AA contrast, 44×44 tap targets, screen reader hints on gestures
- [ ] Unit tests pass for `computeWeeklyInsights`, `builderValidationService`, adapters
