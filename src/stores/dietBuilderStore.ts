/**
 * Diet Builder Store — transient (non-persisted) state for the custom Meal
 * Builder flow.
 *
 * SINGLE SOURCE OF TRUTH RULE (CLAUDE.md §1), mirroring
 * `workoutBuilderStore.ts`'s architecture exactly:
 * The builder NEVER holds a parallel plan object. `draft` is a working mirror
 * of `nutritionStore.customWeeklyMealPlan`. On save, this store writes
 * THROUGH to `nutritionStore.saveCustomWeeklyMealPlan`, which persists to
 * Supabase. Draft is discarded after save.
 *
 * Unlike a workout day (a flat list of exercises), `WeeklyMealPlan.meals` is
 * ALREADY a flat array of `DayMeal` — each one tagged with `dayOfWeek` and
 * `type` (breakfast/lunch/dinner/snack). So "day → meal slot" is a UI-level
 * grouping over that flat array, not a separate nested data structure: a
 * "meal slot" IS a `DayMeal`, and this store's mutation actions operate on
 * individual `DayMeal`s and their `items` (foods) directly.
 *
 * Draft loss protection: built for real (see `mealPlanDraftService.ts`) —
 * unlike the workout builder's version, which is documented in its own
 * header comment but has zero call sites (`is_draft` is a dead column
 * there). `scheduleAutosave()` debounces a write to `weekly_meal_plans` with
 * `is_draft=true`; `restoreDraftIfExists()` checks for one before falling
 * back to the active custom plan / AI plan / blank week.
 */
import { create } from "zustand";
import type { WeeklyMealPlan, DayMeal, MealItem } from "../ai";
import { useNutritionStore } from "./nutritionStore";
import { getSyncableUserId } from "../services/authUtils";
import {
  saveDietBuilderDraft,
  loadDietBuilderDraft,
  clearDietBuilderDraft,
} from "../services/mealPlanDraftService";
import type { ValidationResult } from "../services/validation/types";
import type { CustomDietProjectionResult } from "../services/validation/customDietProjection";
import { generateUUID } from "../utils/uuid";

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export type MealSlotType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOT_TYPES: MealSlotType[] = ["breakfast", "lunch", "dinner", "snack"];

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export interface DietPickerContext {
  dayOfWeek: string;
  mealType: MealSlotType;
  /** Existing meal to add into. Undefined = create a new DayMeal of `mealType`
   * for this day on first food add. */
  mealId?: string;
  mode: "add" | "replace";
  /** Index into the meal's `items` array being replaced, when mode === 'replace'. */
  replaceItemIndex?: number;
}

export interface DietDragState {
  mealId: string | null;
  fromIndex: number | null;
  toIndex: number | null;
}

/** On-target / under / over — used for the day-strip adherence dot and the
 * DayMealBlock header chip. Computed the same way in both places. */
export type DayAdherence = "on" | "under" | "over" | "empty";

export interface DietBuilderState {
  draft: WeeklyMealPlan | null;
  draftDirty: boolean;

  selectedDayIndex: number; // index into WEEKDAYS
  expandedDayIndex: number | null;
  expandedSlotType: MealSlotType | null;

  pickerOpen: boolean;
  pickerContext: DietPickerContext | null;

  dragState: DietDragState | null;

  // Derived state — computed by the SCREEN (which has profileStore access)
  // via mealBuilderValidation.ts / customDietProjection.ts, and only HELD
  // here. Mirrors workoutBuilderStore's documented split exactly.
  validationWarnings: ValidationResult[];
  hasValidationRun: boolean;
  projection: CustomDietProjectionResult | null;
  isComputingProjection: boolean;

  isRestoringDraft: boolean;

  // ── Hydration ─────────────────────────────────────────────────────────
  /** Hydrate draft from customWeeklyMealPlan (the existing custom plan). */
  hydrateFromCustomPlan: () => void;
  /** Seed the draft from the user's current AI-generated plan — the
   * dual-source-specific "Start from your AI Plan" method. */
  hydrateFromAiPlan: () => void;
  /** Hydrate from an explicit plan (templates, saved-meal combinations). */
  hydrateFromPlan: (plan: WeeklyMealPlan) => void;
  startBlankWeek: () => void;
  /** Checks for a saved draft row before the caller falls back to one of the
   * hydrate* methods above. Returns true if a draft was restored. */
  restoreDraftIfExists: () => Promise<boolean>;

  // ── Meal-level mutations ─────────────────────────────────────────────
  /** Create a new empty DayMeal of `mealType` for `dayOfWeek`, returns its id. */
  addMeal: (dayOfWeek: string, mealType: MealSlotType) => string;
  removeMeal: (mealId: string) => void;

  // ── Food-item mutations (within one meal) ───────────────────────────
  addFoodItem: (mealId: string, item: MealItem) => void;
  updateFoodItem: (mealId: string, itemIndex: number, item: MealItem) => void;
  removeFoodItem: (mealId: string, itemIndex: number) => void;
  duplicateFoodItem: (mealId: string, itemIndex: number) => void;
  reorderFoodItem: (mealId: string, fromIndex: number, toIndex: number) => void;

  // ── Day-level actions (mirror DayBlock's kebab menu) ────────────────
  copyDayToWeekdays: (fromDayOfWeek: string, toDayOfWeeks: string[]) => void;
  copyDayToAll: (fromDayOfWeek: string) => void;
  clearDay: (dayOfWeek: string) => void;
  /** Insert a pre-built meal (a saved meal or a traditional-combination
   * template component) as a new DayMeal for the given day/slot. */
  applyMealTemplate: (
    dayOfWeek: string,
    mealType: MealSlotType,
    template: { name: string; items: MealItem[] }
  ) => void;

  // ── UI state ─────────────────────────────────────────────────────────
  setSelectedDay: (index: number) => void;
  setExpandedDay: (index: number | null) => void;
  setExpandedSlot: (slot: MealSlotType | null) => void;
  openPicker: (context: DietPickerContext) => void;
  closePicker: () => void;
  setDragState: (state: DietDragState | null) => void;

  setValidationWarnings: (warnings: ValidationResult[]) => void;
  setProjection: (projection: CustomDietProjectionResult | null) => void;
  setIsComputingProjection: (loading: boolean) => void;

  // ── Persistence ──────────────────────────────────────────────────────
  /** Persist draft to nutritionStore.customWeeklyMealPlan + Supabase. */
  save: () => Promise<void>;
  /** Save, then immediately activate the custom source — the footer's
   * "Save & Activate" one-tap close of the toggle loop. */
  saveAndActivate: () => Promise<void>;
  /** Discard draft without saving. */
  discard: () => void;
  /** Debounced (1.5s) autosave of the current draft as an is_draft=true row. */
  scheduleAutosave: () => void;
}

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function emptyMacros() {
  return { protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
}

function blankMeal(dayOfWeek: string, mealType: MealSlotType): DayMeal {
  const label = mealType.charAt(0).toUpperCase() + mealType.slice(1);
  return {
    id: `custom_${dayOfWeek}_${mealType}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: mealType,
    name: label,
    description: "",
    items: [],
    totalCalories: 0,
    totalMacros: emptyMacros(),
    preparationTime: 0,
    difficulty: "easy",
    tags: ["custom"],
    dayOfWeek,
    isPersonalized: true,
    aiGenerated: false,
    createdAt: new Date().toISOString(),
  };
}

function blankWeek(): WeeklyMealPlan {
  return {
    id: `custom_meal_week_${Date.now()}`,
    weekNumber: 1,
    meals: [],
    planTitle: "My Custom Meal Plan",
    planDescription: "Build your own weekly meals",
    totalEstimatedCalories: 0,
  };
}

/** Deep clone a plan (structured clone for plain JSON-serializable data). */
function clonePlan(plan: WeeklyMealPlan): WeeklyMealPlan {
  return JSON.parse(JSON.stringify(plan));
}

/** Sum a DayMeal's items into its totalCalories/totalMacros. Recomputed
 * after every item mutation — never authored/stored independently
 * (Principle 1: single source of truth for a derived value). */
function recomputeMealTotals(meal: DayMeal): DayMeal {
  const totals = meal.items.reduce(
    (acc, item) => ({
      calories: acc.calories + (item.calories || 0),
      protein: acc.protein + (item.macros?.protein || 0),
      carbohydrates: acc.carbohydrates + (item.macros?.carbohydrates || 0),
      fat: acc.fat + (item.macros?.fat || 0),
      fiber: acc.fiber + (item.macros?.fiber || 0),
      sugar: acc.sugar + (item.macros?.sugar || 0),
      sodium: acc.sodium + (item.macros?.sodium || 0),
    }),
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  );
  return {
    ...meal,
    totalCalories: Math.round(totals.calories),
    totalMacros: {
      protein: Math.round(totals.protein * 10) / 10,
      carbohydrates: Math.round(totals.carbohydrates * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      fiber: Math.round(totals.fiber * 10) / 10,
      sugar: Math.round(totals.sugar * 10) / 10,
      sodium: Math.round(totals.sodium),
    },
  };
}

/** Recompute the whole plan's totalEstimatedCalories from its meals — the
 * plan-level equivalent of recomputeMealTotals, same derive-don't-store rule. */
function withPlanTotals(plan: WeeklyMealPlan): WeeklyMealPlan {
  const total = plan.meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  return { ...plan, totalEstimatedCalories: Math.round(total) };
}

function findMealIndex(plan: WeeklyMealPlan, mealId: string): number {
  return plan.meals.findIndex((m) => m.id === mealId);
}

/**
 * On-target / under / over classification for a day's planned calories vs a
 * target, shared by the day-strip dot and DayMealBlock's header chip so they
 * never disagree. ±10% = on target, ±10-25% = under/over, beyond = the same
 * bucket (still under/over, just further out) — a day with zero meals is
 * its own "empty" state rather than a false "under".
 */
export function getDayAdherence(
  dayTotalCalories: number,
  targetCalories: number | null
): DayAdherence {
  if (dayTotalCalories <= 0) return "empty";
  if (!targetCalories || targetCalories <= 0) return "empty";
  const ratio = dayTotalCalories / targetCalories;
  if (ratio >= 0.9 && ratio <= 1.1) return "on";
  return ratio < 0.9 ? "under" : "over";
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTOSAVE_DEBOUNCE_MS = 1500;

// ----------------------------------------------------------------------------
// STORE
// ----------------------------------------------------------------------------

export const useDietBuilderStore = create<DietBuilderState>((set, get) => ({
  draft: null,
  draftDirty: false,
  selectedDayIndex: new Date().getDay(),
  expandedDayIndex: new Date().getDay(),
  expandedSlotType: null,
  pickerOpen: false,
  pickerContext: null,
  dragState: null,
  validationWarnings: [],
  hasValidationRun: false,
  projection: null,
  isComputingProjection: false,
  isRestoringDraft: false,

  hydrateFromCustomPlan: () => {
    const customPlan = useNutritionStore.getState().customWeeklyMealPlan;
    set({
      draft: customPlan ? clonePlan(customPlan) : blankWeek(),
      draftDirty: false,
    });
  },

  hydrateFromAiPlan: () => {
    const aiPlan = useNutritionStore.getState().weeklyMealPlan;
    if (!aiPlan) {
      set({ draft: blankWeek(), draftDirty: false });
      return;
    }
    // Seed from the AI plan but strip its identity/databaseId — this becomes
    // a NEW custom plan, not an edit-in-place of the AI row.
    const seeded: WeeklyMealPlan = {
      ...clonePlan(aiPlan),
      id: `custom_meal_week_${Date.now()}`,
      databaseId: undefined,
      planTitle: "My Custom Meal Plan",
      planDescription: "Started from my AI plan",
    };
    set({ draft: seeded, draftDirty: true });
  },

  hydrateFromPlan: (plan) => {
    set({ draft: clonePlan(plan), draftDirty: true });
  },

  startBlankWeek: () => {
    set({ draft: blankWeek(), draftDirty: false });
  },

  restoreDraftIfExists: async () => {
    const userId = getSyncableUserId();
    if (!userId) return false;
    set({ isRestoringDraft: true });
    try {
      const draft = await loadDietBuilderDraft(userId);
      if (draft) {
        set({ draft, draftDirty: true });
        return true;
      }
      return false;
    } finally {
      set({ isRestoringDraft: false });
    }
  },

  addMeal: (dayOfWeek, mealType) => {
    const { draft } = get();
    if (!draft) return "";
    const meal = blankMeal(dayOfWeek, mealType);
    const nextPlan = withPlanTotals({ ...draft, meals: [...draft.meals, meal] });
    set({ draft: nextPlan, draftDirty: true });
    get().scheduleAutosave();
    return meal.id;
  },

  removeMeal: (mealId) => {
    const { draft } = get();
    if (!draft) return;
    const nextPlan = withPlanTotals({
      ...draft,
      meals: draft.meals.filter((m) => m.id !== mealId),
    });
    set({ draft: nextPlan, draftDirty: true });
    get().scheduleAutosave();
  },

  addFoodItem: (mealId, item) => {
    const { draft } = get();
    if (!draft) return;
    const idx = findMealIndex(draft, mealId);
    if (idx === -1) return;
    const meals = [...draft.meals];
    meals[idx] = recomputeMealTotals({ ...meals[idx], items: [...meals[idx].items, item] });
    set({ draft: withPlanTotals({ ...draft, meals }), draftDirty: true });
    get().scheduleAutosave();
  },

  updateFoodItem: (mealId, itemIndex, item) => {
    const { draft } = get();
    if (!draft) return;
    const idx = findMealIndex(draft, mealId);
    if (idx === -1) return;
    const meals = [...draft.meals];
    const items = [...meals[idx].items];
    items[itemIndex] = item;
    meals[idx] = recomputeMealTotals({ ...meals[idx], items });
    set({ draft: withPlanTotals({ ...draft, meals }), draftDirty: true });
    get().scheduleAutosave();
  },

  removeFoodItem: (mealId, itemIndex) => {
    const { draft } = get();
    if (!draft) return;
    const idx = findMealIndex(draft, mealId);
    if (idx === -1) return;
    const meals = [...draft.meals];
    meals[idx] = recomputeMealTotals({
      ...meals[idx],
      items: meals[idx].items.filter((_, i) => i !== itemIndex),
    });
    set({ draft: withPlanTotals({ ...draft, meals }), draftDirty: true });
    get().scheduleAutosave();
  },

  duplicateFoodItem: (mealId, itemIndex) => {
    const { draft } = get();
    if (!draft) return;
    const idx = findMealIndex(draft, mealId);
    if (idx === -1) return;
    const source = draft.meals[idx].items[itemIndex];
    if (!source) return;
    const clone: MealItem = { ...JSON.parse(JSON.stringify(source)), id: generateUUID() };
    const items = [...draft.meals[idx].items];
    items.splice(itemIndex + 1, 0, clone);
    const meals = [...draft.meals];
    meals[idx] = recomputeMealTotals({ ...meals[idx], items });
    set({ draft: withPlanTotals({ ...draft, meals }), draftDirty: true });
    get().scheduleAutosave();
  },

  reorderFoodItem: (mealId, fromIndex, toIndex) => {
    const { draft } = get();
    if (!draft || fromIndex === toIndex) return;
    const idx = findMealIndex(draft, mealId);
    if (idx === -1) return;
    const items = [...draft.meals[idx].items];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    const meals = [...draft.meals];
    meals[idx] = { ...meals[idx], items }; // reorder doesn't change totals
    set({ draft: { ...draft, meals }, draftDirty: true });
    get().scheduleAutosave();
  },

  copyDayToWeekdays: (fromDayOfWeek, toDayOfWeeks) => {
    const { draft } = get();
    if (!draft) return;
    const sourceMeals = draft.meals.filter((m) => m.dayOfWeek === fromDayOfWeek);
    if (sourceMeals.length === 0) return;
    const newMeals: DayMeal[] = [];
    for (const targetDay of toDayOfWeeks) {
      for (const source of sourceMeals) {
        const clone: DayMeal = JSON.parse(JSON.stringify(source));
        clone.id = `custom_${targetDay}_${clone.type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        clone.dayOfWeek = targetDay;
        newMeals.push(clone);
      }
    }
    // Replace any existing meals on the target days (a copy overwrites, it
    // doesn't append duplicates on top of whatever was already there).
    const targetSet = new Set(toDayOfWeeks);
    const survivors = draft.meals.filter((m) => !targetSet.has(m.dayOfWeek));
    set({
      draft: withPlanTotals({ ...draft, meals: [...survivors, ...newMeals] }),
      draftDirty: true,
    });
    get().scheduleAutosave();
  },

  copyDayToAll: (fromDayOfWeek) => {
    get().copyDayToWeekdays(
      fromDayOfWeek,
      WEEKDAYS.filter((d) => d !== fromDayOfWeek)
    );
  },

  clearDay: (dayOfWeek) => {
    const { draft } = get();
    if (!draft) return;
    set({
      draft: withPlanTotals({
        ...draft,
        meals: draft.meals.filter((m) => m.dayOfWeek !== dayOfWeek),
      }),
      draftDirty: true,
    });
    get().scheduleAutosave();
  },

  applyMealTemplate: (dayOfWeek, mealType, template) => {
    const { draft } = get();
    if (!draft) return;
    const meal = recomputeMealTotals({
      ...blankMeal(dayOfWeek, mealType),
      name: template.name,
      items: template.items,
    });
    set({
      draft: withPlanTotals({ ...draft, meals: [...draft.meals, meal] }),
      draftDirty: true,
    });
    get().scheduleAutosave();
  },

  setSelectedDay: (index) => set({ selectedDayIndex: index }),
  setExpandedDay: (index) => set({ expandedDayIndex: index, expandedSlotType: null }),
  setExpandedSlot: (slot) => set({ expandedSlotType: slot }),

  openPicker: (context) => set({ pickerOpen: true, pickerContext: context }),
  closePicker: () => set({ pickerOpen: false, pickerContext: null }),

  setDragState: (state) => set({ dragState: state }),

  setValidationWarnings: (warnings) =>
    set({ validationWarnings: warnings, hasValidationRun: true }),
  setProjection: (projection) => set({ projection }),
  setIsComputingProjection: (loading) => set({ isComputingProjection: loading }),

  save: async () => {
    const { draft } = get();
    if (!draft) return;
    await useNutritionStore.getState().saveCustomWeeklyMealPlan(draft);
    const saved = useNutritionStore.getState().customWeeklyMealPlan;
    if (saved?.databaseId && !draft.databaseId) {
      set({ draft: { ...draft, databaseId: saved.databaseId } });
    }
    set({ draftDirty: false });
    const userId = getSyncableUserId();
    if (userId) {
      // Best-effort — a failed clear just leaves a stale draft row that the
      // next hydrate will silently overwrite; never block the save on it.
      void clearDietBuilderDraft(userId).catch(() => {});
    }
  },

  saveAndActivate: async () => {
    await get().save();
    useNutritionStore.getState().setActiveDietSource("custom");
  },

  discard: () => {
    if (autosaveTimer) {
      clearTimeout(autosaveTimer);
      autosaveTimer = null;
    }
    set({
      draft: null,
      draftDirty: false,
      selectedDayIndex: new Date().getDay(),
      expandedDayIndex: new Date().getDay(),
      expandedSlotType: null,
      pickerOpen: false,
      pickerContext: null,
      dragState: null,
      validationWarnings: [],
      hasValidationRun: false,
      projection: null,
      isComputingProjection: false,
    });
  },

  scheduleAutosave: () => {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      const { draft } = get();
      const userId = getSyncableUserId();
      // Guests: local Zustand state (via nutritionStore's own persist) is
      // sufficient — never queue a draft write for a guest id.
      if (!draft || !userId) return;
      void saveDietBuilderDraft(userId, draft).catch((error) => {
        console.error("[dietBuilderStore] Autosave failed:", error);
      });
    }, AUTOSAVE_DEBOUNCE_MS);
  },
}));
