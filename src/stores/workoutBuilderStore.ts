/**
 * Workout Builder Store — transient (non-persisted) state for the custom
 * workout builder flow.
 *
 * SINGLE SOURCE OF TRUTH RULE (CLAUDE.md §1):
 * The builder NEVER holds a parallel plan object. `draft` is a working mirror
 * of `fitnessStore.customWeeklyPlan`. On save, this store writes THROUGH to
 * `fitnessStore.saveCustomWeeklyPlan`, which persists to Supabase. Draft is
 * discarded after save.
 *
 * Draft loss protection: on every mutation, a debounced autosave writes the
 * draft to `weekly_workout_plans` with `is_draft=true` (Phase 0.4 migration
 * column). On builder open, `hydrateFromCustomPlan` checks for a draft first;
 * if found, restores it. This survives crashes.
 */
import { create } from "zustand";
import type {
  WeeklyWorkoutPlan,
  DayWorkout,
  PlannedExercise,
  ValidationWarning,
  WeeklyInsights,
  AiSuggestion,
} from "../types/ai";
import type { CardioBlock, CardioIntensity } from "../types/workout";
import { toWorkoutSet } from "../types/workout";
import { useFitnessStore } from "./fitnessStore";
import { computeWeeklyInsights } from "../services/workoutInsightsService";
import { workoutBuilderAi } from "../ai/workoutBuilderAi";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export interface PickerContext {
  dayIndex: number;
  /** When set, the picker's add action calls replaceExercise at this index
   * instead of addExercise (append) — set by WeeklyBuilderScreen's "Replace
   * exercise" action (Phase 6C-i). */
  slotIndex?: number;
}

export interface EditorContext {
  dayIndex: number;
  exerciseIndex: number;
}

export interface DragState {
  activeId: string | null;
  fromDay: number | null;
  toDay: number | null;
  fromIndex: number | null;
  toIndex: number | null;
}

export interface WorkoutBuilderState {
  // Draft mirror of customWeeklyPlan (transient — never persisted by Zustand)
  draft: WeeklyWorkoutPlan | null;
  draftDirty: boolean;

  // UI state
  selectedDayIndex: number;
  expandedDayIndex: number | null;
  pickerOpen: boolean;
  pickerContext: PickerContext | null;
  editorOpen: boolean;
  editorContext: EditorContext | null;

  // Interaction state
  dragState: DragState | null;

  // Derived state
  validationWarnings: ValidationWarning[];
  aiSuggestions: AiSuggestion[];
  insights: WeeklyInsights | null;
  isComputingInsights: boolean;
  /** True after validation has actually run at least once (guards against falsely claiming "balanced" before first check). */
  hasValidationRun: boolean;

  // ── Actions ───────────────────────────────────────────────────────────

  /** Hydrate draft from customWeeklyPlan (or restore a saved draft). */
  hydrateFromCustomPlan: () => Promise<void>;
  /** Hydrate from an explicit plan (e.g. duplicating an existing schedule). */
  hydrateFromPlan: (plan: WeeklyWorkoutPlan) => void;
  /** Start a blank week. */
  startBlankWeek: () => void;

  updateDay: (index: number, day: DayWorkout) => void;
  addExercise: (dayIndex: number, exercise: PlannedExercise) => void;
  removeExercise: (dayIndex: number, exerciseIndex: number) => void;
  /**
   * Duplicate an exercise in-place at the given day/exercise index. The clone
   * is appended immediately after the source (Phase 8 — surfaced by
   * ExerciseRow's swipe-left "Duplicate" action and the kebab menu). Additive —
   * the screen-level inline clone in WeeklyBuilderScreen still works.
   */
  duplicateExercise: (dayIndex: number, exerciseIndex: number) => void;
  updateExercise: (
    dayIndex: number,
    exerciseIndex: number,
    exercise: PlannedExercise,
  ) => void;
  /**
   * Atomic "Replace exercise" — splices newExercise in AT exerciseIndex
   * (Phase 6C-i fix). Previously the builder's Replace action did
   * removeExercise + addExercise, and addExercise APPENDS, so Replace
   * silently reordered the new exercise to the end of the day instead of
   * keeping its slot. Carries over the replaced slot's supersetId/circuitId/
   * blockIndex onto the incoming exercise — replacing one exercise inside a
   * superset/circuit should keep the replacement IN that group, taking over
   * the vacated slot's role, not fall out of it. Also stamps
   * alternativeExerciseId with the exerciseId being replaced — the first
   * producer of that field (previously declared on PlannedExercise with zero
   * producers anywhere in the app).
   */
  replaceExercise: (
    dayIndex: number,
    exerciseIndex: number,
    newExercise: PlannedExercise,
  ) => void;
  reorderExercise: (
    dayIndex: number,
    fromIndex: number,
    toIndex: number,
  ) => void;
  moveExerciseBetweenDays: (
    fromDay: number,
    fromIndex: number,
    toDay: number,
    toIndex: number,
  ) => void;
  duplicateDay: (fromIndex: number, toIndex: number) => void;
  clearDay: (dayIndex: number) => void;

  // ── Cardio blocks + scheduled time (Phase B) ──────────────────────────
  /** Add a cardio block (e.g. "30 min running") to a day's draft. Additive —
   *  existing JSONB plans without cardioBlocks parse fine. */
  addCardioBlock: (dayIndex: number, block: CardioBlock) => void;
  /** Remove a cardio block from a day by its id. */
  removeCardioBlock: (dayIndex: number, blockId: string) => void;
  /** Update a cardio block in place (duration / intensity / name / distance). */
  updateCardioBlock: (dayIndex: number, blockId: string, patch: Partial<CardioBlock>) => void;
  /** Set the per-day scheduled time ("HH:MM") — display/notifications ONLY,
   *  never an energy-math input (adherence is date-based, per the goal-engine
   *  plan). */
  setScheduledTime: (dayIndex: number, time: string | undefined) => void;

  setSelectedDay: (index: number) => void;
  setExpandedDay: (index: number | null) => void;

  openPicker: (context: PickerContext) => void;
  closePicker: () => void;
  openEditor: (context: EditorContext) => void;
  closeEditor: () => void;

  setDragState: (state: DragState | null) => void;

  setValidationWarnings: (warnings: ValidationWarning[]) => void;
  setAiSuggestions: (suggestions: AiSuggestion[]) => void;
  computeInsights: (userWeightKg?: number | null) => Promise<void>;

  /** Persist draft to fitnessStore.customWeeklyPlan + Supabase. */
  save: () => Promise<void>;
  /** Discard draft without saving. */
  discard: () => void;

  // ── Phase 9 AI actions ──────────────────────────────────────────────────
  /** AI loading flag (true during any builder-AI call). */
  aiLoading: boolean;
  setAiLoading: (loading: boolean) => void;

  /** Append AI-suggested exercises to a day (from suggest-day). */
  applyAiSuggestions: (dayIndex: number, suggestions: AiSuggestion[]) => void;
  /** Replace draft with an AI-edited plan (from NL edit / progression / deload). */
  applyAiEdit: (updatedPlan: WeeklyWorkoutPlan) => void;
  /** Generate a full week from the current partial draft (≥2 filled days). */
  generateFullWeek: () => Promise<{ success: boolean; error?: string }>;
  /** Apply Double Progression to the draft based on prior performance. */
  applyProgression: (
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
    }>,
  ) => Promise<{ success: boolean; error?: string }>;
  /** Apply a deload week (≈40% volume reduction) to the draft. */
  deloadWeek: () => Promise<{ success: boolean; error?: string }>;
}

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DEFAULT_REST_SECONDS = 60;

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function blankDay(dayOfWeek: string): DayWorkout {
  return {
    id: `custom_${dayOfWeek}_blank`,
    title: "Rest Day",
    description: "",
    category: "strength",
    difficulty: "intermediate",
    duration: 0,
    estimatedCalories: 0,
    exercises: [],
    plannedExercises: [],
    equipment: [],
    targetMuscleGroups: [],
    icon: "barbell-outline",
    tags: [],
    isPersonalized: true,
    aiGenerated: false,
    createdAt: new Date().toISOString(),
    dayOfWeek,
    subCategory: "custom",
    intensityLevel: "rest",
    warmUp: [],
    coolDown: [],
    progressionNotes: [],
    safetyConsiderations: [],
    expectedBenefits: [],
    isExtra: false,
  };
}

function blankWeek(): WeeklyWorkoutPlan {
  return {
    id: `custom_week_${Date.now()}`,
    weekNumber: 1,
    workouts: DAYS_OF_WEEK.map(blankDay),
    planTitle: "My Custom Schedule",
    planDescription: "Build your own weekly plan",
    restDays: DAYS_OF_WEEK.map((_, i) => i),
    totalEstimatedCalories: 0,
  };
}

/** Deep clone a plan (structured clone for plain JSON-serializable data). */
function clonePlan(plan: WeeklyWorkoutPlan): WeeklyWorkoutPlan {
  return JSON.parse(JSON.stringify(plan));
}

/**
 * restDays is DERIVED state, never authored: a week day is a rest day iff it
 * has zero exercises. Recomputed on every draft mutation so saved custom plans
 * never carry the blank-week default (all 7 days) that would mark real workout
 * days as rest downstream (WeeklyPlanOverview, useFitnessLogic, FullPlanScreen).
 * Indices are Monday-based (0=monday … 6=sunday), matching useFitnessLogic.
 */
function computeRestDays(workouts: DayWorkout[]): number[] {
  return workouts
    .map((w, i) => {
      const hasStrength =
        (w.plannedExercises?.length || w.exercises?.length || 0) > 0;
      const hasCardio = (w.cardioBlocks?.length ?? 0) > 0;
      return hasStrength || hasCardio ? -1 : i;
    })
    .filter((i) => i >= 0);
}

/** Return a copy of the plan with restDays recomputed from its workouts. */
function withRestDays(plan: WeeklyWorkoutPlan): WeeklyWorkoutPlan {
  return { ...plan, restDays: computeRestDays(plan.workouts) };
}

// ----------------------------------------------------------------------------
// STORE
// ----------------------------------------------------------------------------

export const useWorkoutBuilderStore = create<WorkoutBuilderState>((set, get) => ({
  draft: null,
  draftDirty: false,
  selectedDayIndex: 0,
  expandedDayIndex: 0,
  pickerOpen: false,
  pickerContext: null,
  editorOpen: false,
  editorContext: null,
  dragState: null,
  validationWarnings: [],
  aiSuggestions: [],
  insights: null,
  isComputingInsights: false,
  hasValidationRun: false,
  aiLoading: false,

  hydrateFromCustomPlan: async () => {
    const customPlan = useFitnessStore.getState().customWeeklyPlan;
    if (customPlan) {
      // withRestDays also heals legacy saved plans whose restDays went stale.
      set({ draft: withRestDays(clonePlan(customPlan)), draftDirty: false });
    } else {
      // No existing plan — start blank
      set({ draft: blankWeek(), draftDirty: false });
    }
    // Recompute insights on hydrate
    await get().computeInsights();
  },

  hydrateFromPlan: (plan) => {
    set({ draft: withRestDays(clonePlan(plan)), draftDirty: false });
    void get().computeInsights();
  },

  startBlankWeek: () => {
    set({ draft: blankWeek(), draftDirty: false });
    void get().computeInsights();
  },

  updateDay: (index, day) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    workouts[index] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
  },

  addExercise: (dayIndex, exercise) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    const day = { ...workouts[dayIndex] };
    day.plannedExercises = [...(day.plannedExercises ?? []), exercise];
    // toWorkoutSet is the single adapter (src/types/workout.ts) — this used
    // to be 3 independently-drifted inline copies here, each more lossy
    // than the shared adapter (always read set[0]'s reps even when sets
    // varied, and dropped supersetId/circuitId/blockIndex/plannedSets
    // entirely, silently discarding drop-set and per-set-varying data the
    // moment a plan reached session execution).
    day.exercises = day.plannedExercises.map(toWorkoutSet);
    day.title = day.title === "Rest Day" ? "Custom Workout" : day.title;
    day.targetMuscleGroups = Array.from(
      new Set([
        ...day.targetMuscleGroups,
        ...getMuscleGroupsForExercise(exercise.exerciseId),
      ]),
    );
    day.duration = estimateDayDuration(day.plannedExercises);
    workouts[dayIndex] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  removeExercise: (dayIndex, exerciseIndex) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    const day = { ...workouts[dayIndex] };
    day.plannedExercises = (day.plannedExercises ?? []).filter(
      (_, i) => i !== exerciseIndex,
    );
    // toWorkoutSet is the single adapter (src/types/workout.ts) — this used
    // to be 3 independently-drifted inline copies here, each more lossy
    // than the shared adapter (always read set[0]'s reps even when sets
    // varied, and dropped supersetId/circuitId/blockIndex/plannedSets
    // entirely, silently discarding drop-set and per-set-varying data the
    // moment a plan reached session execution).
    day.exercises = day.plannedExercises.map(toWorkoutSet);
    if (day.plannedExercises.length === 0) {
      day.title = "Rest Day";
      day.duration = 0;
    }
    day.targetMuscleGroups = Array.from(
      new Set(
        day.plannedExercises.flatMap((p) =>
          getMuscleGroupsForExercise(p.exerciseId),
        ),
      ),
    );
    day.duration = estimateDayDuration(day.plannedExercises);
    workouts[dayIndex] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  updateExercise: (dayIndex, exerciseIndex, exercise) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    const day = { ...workouts[dayIndex] };
    day.plannedExercises = [...(day.plannedExercises ?? [])];
    day.plannedExercises[exerciseIndex] = exercise;
    // toWorkoutSet is the single adapter (src/types/workout.ts) — this used
    // to be 3 independently-drifted inline copies here, each more lossy
    // than the shared adapter (always read set[0]'s reps even when sets
    // varied, and dropped supersetId/circuitId/blockIndex/plannedSets
    // entirely, silently discarding drop-set and per-set-varying data the
    // moment a plan reached session execution).
    day.exercises = day.plannedExercises.map(toWorkoutSet);
    day.duration = estimateDayDuration(day.plannedExercises);
    workouts[dayIndex] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  replaceExercise: (dayIndex, exerciseIndex, newExercise) => {
    const { draft } = get();
    if (!draft) return;
    const existing = draft.workouts[dayIndex]?.plannedExercises?.[exerciseIndex];
    if (!existing) return;
    const merged: PlannedExercise = {
      ...newExercise,
      supersetId: existing.supersetId,
      circuitId: existing.circuitId,
      blockIndex: existing.blockIndex,
      alternativeExerciseId: existing.exerciseId,
    };
    // Reuses updateExercise's own in-place splice + day-rebuild (toWorkoutSet,
    // targetMuscleGroups, duration, restDays, computeInsights) — same SSOT
    // rule as every other mutator here, no duplicated logic.
    get().updateExercise(dayIndex, exerciseIndex, merged);
  },

  duplicateExercise: (dayIndex, exerciseIndex) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    const day = { ...workouts[dayIndex] };
    const source = (day.plannedExercises ?? [])[exerciseIndex];
    if (!source) return;
    // Deep clone the planned exercise (structured clone for plain JSON data).
    const clone: PlannedExercise = JSON.parse(JSON.stringify(source));
    // Reset set numbers to be sequential within the clone.
    clone.sets = clone.sets.map((s, i) => ({ ...s, setNumber: i + 1 }));
    // Insert immediately after the source so the duplicate is visually adjacent.
    const next = [...(day.plannedExercises ?? [])];
    next.splice(exerciseIndex + 1, 0, clone);
    day.plannedExercises = next;
    day.exercises = next.map(toWorkoutSet);
    day.duration = estimateDayDuration(next);
    day.targetMuscleGroups = Array.from(
      new Set([
        ...day.targetMuscleGroups,
        ...getMuscleGroupsForExercise(source.exerciseId),
      ]),
    );
    workouts[dayIndex] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  reorderExercise: (dayIndex, fromIndex, toIndex) => {
    const { draft } = get();
    if (!draft) return;
    if (fromIndex === toIndex) return;
    const workouts = [...draft.workouts];
    const day = { ...workouts[dayIndex] };
    const exercises = [...(day.plannedExercises ?? [])];
    const [moved] = exercises.splice(fromIndex, 1);
    exercises.splice(toIndex, 0, moved);
    day.plannedExercises = exercises;
    day.exercises = exercises.map(toWorkoutSet);
    workouts[dayIndex] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
  },

  moveExerciseBetweenDays: (fromDay, fromIndex, toDay, toIndex) => {
    const { draft } = get();
    if (!draft) return;
    if (fromDay === toDay) {
      get().reorderExercise(fromDay, fromIndex, toIndex);
      return;
    }
    const workouts = [...draft.workouts];
    const fromDayObj = { ...workouts[fromDay] };
    const toDayObj = { ...workouts[toDay] };
    const fromExercises = [...(fromDayObj.plannedExercises ?? [])];
    const toExercises = [...(toDayObj.plannedExercises ?? [])];
    const [moved] = fromExercises.splice(fromIndex, 1);
    toExercises.splice(toIndex, 0, moved);
    fromDayObj.plannedExercises = fromExercises;
    toDayObj.plannedExercises = toExercises;
    fromDayObj.exercises = fromExercises.map(toWorkoutSet);
    toDayObj.exercises = toExercises.map(toWorkoutSet);
    if (fromExercises.length === 0) {
      fromDayObj.title = "Rest Day";
      fromDayObj.duration = 0;
    } else {
      fromDayObj.duration = estimateDayDuration(fromExercises);
    }
    if (toExercises.length === 1 && toDayObj.title === "Rest Day") {
      toDayObj.title = "Custom Workout";
    }
    toDayObj.duration = estimateDayDuration(toExercises);
    fromDayObj.targetMuscleGroups = Array.from(
      new Set(
        fromExercises.flatMap((p) => getMuscleGroupsForExercise(p.exerciseId)),
      ),
    );
    toDayObj.targetMuscleGroups = Array.from(
      new Set(
        toExercises.flatMap((p) => getMuscleGroupsForExercise(p.exerciseId)),
      ),
    );
    workouts[fromDay] = fromDayObj;
    workouts[toDay] = toDayObj;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  duplicateDay: (fromIndex, toIndex) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    const source = workouts[fromIndex];
    // Deep clone the source day (structured clone for plain JSON-serializable)
    const clone: DayWorkout = JSON.parse(JSON.stringify(source));
    clone.id = `custom_${clone.dayOfWeek}_${Date.now()}`;
    clone.dayOfWeek = DAYS_OF_WEEK[toIndex];
    workouts[toIndex] = clone;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  clearDay: (dayIndex) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    workouts[dayIndex] = blankDay(DAYS_OF_WEEK[dayIndex]);
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  // ── Cardio blocks + scheduled time (Phase B) ──────────────────────────
  addCardioBlock: (dayIndex, block) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    const day = { ...workouts[dayIndex] };
    day.cardioBlocks = [...(day.cardioBlocks ?? []), block];
    // A day with cardio but no strength is no longer a rest day.
    if (day.title === "Rest Day") day.title = "Custom Workout";
    workouts[dayIndex] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  removeCardioBlock: (dayIndex, blockId) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    const day = { ...workouts[dayIndex] };
    day.cardioBlocks = (day.cardioBlocks ?? []).filter((b) => b.id !== blockId);
    if (
      day.cardioBlocks.length === 0 &&
      (day.plannedExercises?.length ?? 0) === 0
    ) {
      day.title = "Rest Day";
    }
    workouts[dayIndex] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  updateCardioBlock: (dayIndex, blockId, patch) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    const day = { ...workouts[dayIndex] };
    day.cardioBlocks = (day.cardioBlocks ?? []).map((b) =>
      b.id === blockId ? { ...b, ...patch } : b,
    );
    workouts[dayIndex] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    void get().computeInsights();
  },

  setScheduledTime: (dayIndex, time) => {
    const { draft } = get();
    if (!draft) return;
    const workouts = [...draft.workouts];
    const day = { ...workouts[dayIndex] };
    // undefined clears the field; otherwise store the "HH:MM" string as-is.
    // Display/notifications ONLY — never read by energy math (planBurn.ts).
    day.scheduledTime = time;
    workouts[dayIndex] = day;
    set({
      draft: { ...draft, workouts, restDays: computeRestDays(workouts) },
      draftDirty: true,
    });
    // scheduledTime is not an energy input, so no computeInsights needed.
  },

  setSelectedDay: (index) => set({ selectedDayIndex: index }),
  setExpandedDay: (index) => set({ expandedDayIndex: index }),

  openPicker: (context) =>
    set({ pickerOpen: true, pickerContext: context }),
  closePicker: () => set({ pickerOpen: false, pickerContext: null }),
  openEditor: (context) => set({ editorOpen: true, editorContext: context }),
  closeEditor: () => set({ editorOpen: false, editorContext: null }),

  setDragState: (state) => set({ dragState: state }),

  setValidationWarnings: (warnings) => set({ validationWarnings: warnings, hasValidationRun: true }),
  setAiSuggestions: (suggestions) => set({ aiSuggestions: suggestions }),
  setAiLoading: (loading) => set({ aiLoading: loading }),

  computeInsights: async (userWeightKg) => {
    const { draft } = get();
    if (!draft) {
      set({ insights: null });
      return;
    }
    set({ isComputingInsights: true });
    try {
      const insights = computeWeeklyInsights(draft, { userWeightKg: userWeightKg ?? null });
      set({ insights });
    } catch (error) {
      console.error("[workoutBuilderStore] computeInsights failed:", error);
    } finally {
      set({ isComputingInsights: false });
    }
  },

  save: async () => {
    const { draft } = get();
    if (!draft) return;
    // Defensive: restDays is derived — never persist a stale copy.
    await useFitnessStore.getState().saveCustomWeeklyPlan(withRestDays(draft));
    // Sync back the databaseId if it was assigned
    const saved = useFitnessStore.getState().customWeeklyPlan;
    if (saved?.databaseId && !draft.databaseId) {
      set({ draft: { ...draft, databaseId: saved.databaseId } });
    }
    set({ draftDirty: false });
  },

  discard: () => {
    set({
      draft: null,
      draftDirty: false,
      selectedDayIndex: 0,
      expandedDayIndex: 0,
      pickerOpen: false,
      pickerContext: null,
      editorOpen: false,
      editorContext: null,
      dragState: null,
      validationWarnings: [],
      aiSuggestions: [],
      insights: null,
      isComputingInsights: false,
      aiLoading: false,
    });
  },

  // ── Phase 9 AI actions ──────────────────────────────────────────────────

  applyAiSuggestions: (dayIndex, suggestions) => {
    const { draft } = get();
    if (!draft) return;
    for (const s of suggestions) {
      const planned: PlannedExercise = {
        exerciseId: s.exerciseId,
        name: s.name,
        sets: Array.from({ length: s.sets }, (_, i) => ({
          setNumber: i + 1,
          reps: s.reps,
          setType: "normal" as const,
        })),
        restSeconds: s.restSeconds,
        notes: s.reason,
      };
      get().addExercise(dayIndex, planned);
    }
    // Clear suggestions after applying so the picker doesn't re-show them.
    set({ aiSuggestions: [] });
  },

  applyAiEdit: (updatedPlan) => {
    set({ draft: withRestDays(clonePlan(updatedPlan)), draftDirty: true });
    void get().computeInsights();
  },

  generateFullWeek: async () => {
    const { draft } = get();
    if (!draft) {
      return { success: false, error: "No draft to generate from" };
    }
    set({ aiLoading: true });
    try {
      const result = await workoutBuilderAi.generateFullWeek({
        partialPlan: draft,
      });
      if (!result.success || !result.data) {
        console.error("[workoutBuilderStore] generateFullWeek failed:", result.error);
        return { success: false, error: result.error };
      }
      set({
        draft: withRestDays(clonePlan(result.data.completePlan)),
        draftDirty: true,
      });
      void get().computeInsights();
      return { success: true };
    } catch (error) {
      console.error("[workoutBuilderStore] generateFullWeek error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      set({ aiLoading: false });
    }
  },

  applyProgression: async (priorPerformance) => {
    const { draft } = get();
    if (!draft) {
      return { success: false, error: "No draft to apply progression to" };
    }
    set({ aiLoading: true });
    try {
      const result = await workoutBuilderAi.applyProgression({
        plan: draft,
        priorPerformance,
      });
      if (!result.success || !result.data) {
        console.error("[workoutBuilderStore] applyProgression failed:", result.error);
        return { success: false, error: result.error };
      }
      set({
        draft: withRestDays(clonePlan(result.data.updatedPlan)),
        draftDirty: true,
      });
      void get().computeInsights();
      return { success: true };
    } catch (error) {
      console.error("[workoutBuilderStore] applyProgression error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      set({ aiLoading: false });
    }
  },

  deloadWeek: async () => {
    const { draft } = get();
    if (!draft) {
      return { success: false, error: "No draft to deload" };
    }
    set({ aiLoading: true });
    try {
      const result = await workoutBuilderAi.deloadPlan({ plan: draft });
      if (!result.success || !result.data) {
        console.error("[workoutBuilderStore] deloadWeek failed:", result.error);
        return { success: false, error: result.error };
      }
      set({
        draft: withRestDays(clonePlan(result.data.deloadPlan)),
        draftDirty: true,
      });
      void get().computeInsights();
      return { success: true };
    } catch (error) {
      console.error("[workoutBuilderStore] deloadWeek error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      set({ aiLoading: false });
    }
  },
}));

// ----------------------------------------------------------------------------
// LOCAL HELPERS (avoid circular import with curatedExercises)
// ----------------------------------------------------------------------------

function getMuscleGroupsForExercise(exerciseId: string): string[] {
  // resolveExerciseMeta checks the real exercise DB first (AI-plan ids), then
  // falls back to the curated list (legacy builder ids). The previous
  // CURATED_EXERCISES-only lookup silently zeroed muscle coverage for any
  // AI-plan exercise outside that ~70-entry list, so targetMuscleGroups on a
  // draft never reflected AI-generated exercises. Lazy-required to avoid a
  // circular import at module load time (resolveExerciseMeta →
  // exerciseFilterService).
  const { resolveExerciseMeta } = require("../utils/resolveExerciseMeta");
  return resolveExerciseMeta(exerciseId).muscleGroups;
}

/** Rough duration estimate: 2 min per set + 1 min per exercise setup. */
function estimateDayDuration(exercises: PlannedExercise[]): number {
  if (exercises.length === 0) return 0;
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  return Math.round(totalSets * 2 + exercises.length);
}

export { DEFAULT_REST_SECONDS, DAYS_OF_WEEK };
