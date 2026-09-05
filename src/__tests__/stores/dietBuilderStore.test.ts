/**
 * dietBuilderStore.test.ts — unit tests for src/stores/dietBuilderStore.ts.
 *
 * Coverage: hydration (custom plan / AI plan / blank week / draft restore),
 * autosave debounce, copy-day, and food-item mutations (add/update/remove/
 * duplicate/reorder + total recomputation).
 *
 * Mocks nutritionStore (SSOT write-through), authUtils.getSyncableUserId,
 * and mealPlanDraftService (autosave I/O) — mirrors workoutBuilderStore.test.ts's
 * pattern: imperative getState() calls, no renderHook.
 */
import { useDietBuilderStore, getDayAdherence } from "../../stores/dietBuilderStore";
import type { DayMeal, MealItem, WeeklyMealPlan } from "../../ai";

// ----------------------------------------------------------------------------
// MOCKS
// ----------------------------------------------------------------------------

const mockSaveCustomWeeklyMealPlan = jest.fn().mockResolvedValue(undefined);
const mockSetActiveDietSource = jest.fn();
let mockCustomPlan: WeeklyMealPlan | null = null;
let mockAiPlan: WeeklyMealPlan | null = null;

jest.mock("../../stores/nutritionStore", () => ({
  useNutritionStore: {
    getState: () => ({
      get customWeeklyMealPlan() {
        return mockCustomPlan;
      },
      get weeklyMealPlan() {
        return mockAiPlan;
      },
      saveCustomWeeklyMealPlan: jest.fn(async (plan: WeeklyMealPlan) => {
        mockCustomPlan = plan;
        mockSaveCustomWeeklyMealPlan(plan);
      }),
      setActiveDietSource: mockSetActiveDietSource,
    }),
  },
}));

let mockSyncableUserId: string | null = "user-1";
jest.mock("../../services/authUtils", () => ({
  getSyncableUserId: () => mockSyncableUserId,
}));

const mockSaveDraft = jest.fn().mockResolvedValue(undefined);
const mockLoadDraft = jest.fn().mockResolvedValue(null);
const mockClearDraft = jest.fn().mockResolvedValue(undefined);
jest.mock("../../services/mealPlanDraftService", () => ({
  saveDietBuilderDraft: (...args: unknown[]) => mockSaveDraft(...args),
  loadDietBuilderDraft: (...args: unknown[]) => mockLoadDraft(...args),
  clearDietBuilderDraft: (...args: unknown[]) => mockClearDraft(...args),
}));

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function makeItem(overrides: Partial<MealItem> = {}): MealItem {
  return {
    id: overrides.id ?? `item_${Math.random().toString(36).slice(2, 8)}`,
    foodId: "food_1",
    food: {
      id: "food_1",
      name: "Roti",
      category: "grains",
      nutrition: { calories: 104, macros: { protein: 3, carbohydrates: 20, fat: 1, fiber: 2 }, servingSize: 40, servingUnit: "piece" },
      allergens: [],
      dietaryLabels: [],
      verified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    name: "Roti",
    quantity: overrides.quantity ?? 2,
    unit: overrides.unit ?? "piece",
    calories: overrides.calories ?? 208,
    macros: overrides.macros ?? { protein: 6, carbohydrates: 40, fat: 2, fiber: 4 },
    ...overrides,
  } as MealItem;
}

function resetStore() {
  useDietBuilderStore.setState({
    draft: null,
    draftDirty: false,
    selectedDayIndex: 0,
    expandedDayIndex: 0,
    expandedSlotType: null,
    pickerOpen: false,
    pickerContext: null,
    dragState: null,
    validationWarnings: [],
    hasValidationRun: false,
    projection: null,
    isComputingProjection: false,
    isRestoringDraft: false,
  });
  mockCustomPlan = null;
  mockAiPlan = null;
  mockSaveCustomWeeklyMealPlan.mockClear();
  mockSetActiveDietSource.mockClear();
  mockSaveDraft.mockClear();
  mockLoadDraft.mockClear().mockResolvedValue(null);
  mockClearDraft.mockClear();
  mockSyncableUserId = "user-1";
}

beforeEach(() => {
  resetStore();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

// ----------------------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------------------

describe("dietBuilderStore", () => {
  describe("hydration", () => {
    it("hydrateFromCustomPlan clones the existing custom plan", () => {
      mockCustomPlan = {
        id: "plan-1",
        weekNumber: 1,
        meals: [],
        planTitle: "Existing",
      } as WeeklyMealPlan;

      useDietBuilderStore.getState().hydrateFromCustomPlan();

      const { draft, draftDirty } = useDietBuilderStore.getState();
      expect(draft?.planTitle).toBe("Existing");
      expect(draft).not.toBe(mockCustomPlan); // cloned, not the same reference
      expect(draftDirty).toBe(false);
    });

    it("hydrateFromCustomPlan falls back to a blank week when no custom plan exists", () => {
      useDietBuilderStore.getState().hydrateFromCustomPlan();
      const { draft } = useDietBuilderStore.getState();
      expect(draft?.meals).toEqual([]);
      expect(draft?.planTitle).toBe("My Custom Meal Plan");
    });

    it("hydrateFromAiPlan seeds from the AI plan but strips its identity/databaseId", () => {
      mockAiPlan = {
        id: "ai-plan-1",
        databaseId: "db-123",
        weekNumber: 1,
        meals: [
          { id: "m1", type: "breakfast", dayOfWeek: "monday", items: [] } as unknown as DayMeal,
        ],
        planTitle: "AI Generated",
      } as WeeklyMealPlan;

      useDietBuilderStore.getState().hydrateFromAiPlan();

      const { draft, draftDirty } = useDietBuilderStore.getState();
      expect(draft?.meals).toHaveLength(1);
      expect(draft?.id).not.toBe("ai-plan-1");
      expect(draft?.databaseId).toBeUndefined();
      expect(draft?.planTitle).toBe("My Custom Meal Plan");
      expect(draftDirty).toBe(true); // seeded content counts as a real edit
    });

    it("hydrateFromAiPlan falls back to blank when there's no AI plan", () => {
      useDietBuilderStore.getState().hydrateFromAiPlan();
      expect(useDietBuilderStore.getState().draft?.meals).toEqual([]);
    });

    it("restoreDraftIfExists returns true and hydrates when a draft row exists", async () => {
      mockLoadDraft.mockResolvedValueOnce({
        id: "draft-1",
        weekNumber: 1,
        meals: [],
        planTitle: "Recovered Draft",
      });

      const restored = await useDietBuilderStore.getState().restoreDraftIfExists();

      expect(restored).toBe(true);
      expect(useDietBuilderStore.getState().draft?.planTitle).toBe("Recovered Draft");
      expect(useDietBuilderStore.getState().draftDirty).toBe(true);
    });

    it("restoreDraftIfExists returns false for guests without hitting Supabase", async () => {
      mockSyncableUserId = null;
      const restored = await useDietBuilderStore.getState().restoreDraftIfExists();
      expect(restored).toBe(false);
      expect(mockLoadDraft).not.toHaveBeenCalled();
    });
  });

  describe("food item mutations", () => {
    beforeEach(() => {
      useDietBuilderStore.getState().startBlankWeek();
      useDietBuilderStore.getState().addMeal("monday", "breakfast");
    });

    function getMeal(): DayMeal {
      return useDietBuilderStore.getState().draft!.meals[0];
    }

    it("addFoodItem appends the item and recomputes meal + plan totals", () => {
      const mealId = getMeal().id;
      useDietBuilderStore.getState().addFoodItem(mealId, makeItem({ calories: 208 }));

      const meal = getMeal();
      expect(meal.items).toHaveLength(1);
      expect(meal.totalCalories).toBe(208);
      expect(useDietBuilderStore.getState().draft!.totalEstimatedCalories).toBe(208);
    });

    it("updateFoodItem replaces the item and recomputes totals", () => {
      const mealId = getMeal().id;
      useDietBuilderStore.getState().addFoodItem(mealId, makeItem({ calories: 208 }));

      useDietBuilderStore
        .getState()
        .updateFoodItem(mealId, 0, makeItem({ calories: 300, quantity: 3 }));

      expect(getMeal().totalCalories).toBe(300);
      expect(getMeal().items[0].quantity).toBe(3);
    });

    it("removeFoodItem drops the item and recomputes totals down to zero", () => {
      const mealId = getMeal().id;
      useDietBuilderStore.getState().addFoodItem(mealId, makeItem({ calories: 208 }));
      useDietBuilderStore.getState().removeFoodItem(mealId, 0);

      expect(getMeal().items).toHaveLength(0);
      expect(getMeal().totalCalories).toBe(0);
    });

    it("duplicateFoodItem inserts a clone immediately after the source with a new id", () => {
      const mealId = getMeal().id;
      const original = makeItem({ id: "orig-1", calories: 208 });
      useDietBuilderStore.getState().addFoodItem(mealId, original);
      useDietBuilderStore.getState().duplicateFoodItem(mealId, 0);

      const items = getMeal().items;
      expect(items).toHaveLength(2);
      expect(items[1].id).not.toBe("orig-1");
      expect(items[1].calories).toBe(208);
      expect(getMeal().totalCalories).toBe(416);
    });

    it("reorderFoodItem moves an item without changing totals", () => {
      const mealId = getMeal().id;
      useDietBuilderStore.getState().addFoodItem(mealId, makeItem({ id: "a", calories: 100 }));
      useDietBuilderStore.getState().addFoodItem(mealId, makeItem({ id: "b", calories: 200 }));

      useDietBuilderStore.getState().reorderFoodItem(mealId, 0, 1);

      const items = getMeal().items;
      expect(items.map((i) => i.id)).toEqual(["b", "a"]);
      expect(getMeal().totalCalories).toBe(300);
    });

    it("removeMeal removes the DayMeal and updates plan totals", () => {
      const mealId = getMeal().id;
      useDietBuilderStore.getState().addFoodItem(mealId, makeItem({ calories: 208 }));
      useDietBuilderStore.getState().removeMeal(mealId);

      expect(useDietBuilderStore.getState().draft!.meals).toHaveLength(0);
      expect(useDietBuilderStore.getState().draft!.totalEstimatedCalories).toBe(0);
    });
  });

  describe("copy-day", () => {
    beforeEach(() => {
      useDietBuilderStore.getState().startBlankWeek();
      const mealId = useDietBuilderStore.getState().addMeal("monday", "breakfast");
      useDietBuilderStore.getState().addFoodItem(mealId, makeItem({ calories: 208 }));
    });

    it("copyDayToWeekdays clones monday's meals onto the target days with fresh ids", () => {
      useDietBuilderStore.getState().copyDayToWeekdays("monday", ["tuesday", "wednesday"]);

      const { draft } = useDietBuilderStore.getState();
      const tuesdayMeals = draft!.meals.filter((m) => m.dayOfWeek === "tuesday");
      const wednesdayMeals = draft!.meals.filter((m) => m.dayOfWeek === "wednesday");
      expect(tuesdayMeals).toHaveLength(1);
      expect(wednesdayMeals).toHaveLength(1);
      expect(tuesdayMeals[0].id).not.toBe(draft!.meals[0].id);
      expect(tuesdayMeals[0].totalCalories).toBe(208);
    });

    it("copyDayToWeekdays overwrites (doesn't append to) existing meals on the target day", () => {
      const mondayMealId = useDietBuilderStore.getState().draft!.meals[0].id;
      useDietBuilderStore.getState().addMeal("tuesday", "lunch");
      expect(
        useDietBuilderStore.getState().draft!.meals.filter((m) => m.dayOfWeek === "tuesday")
      ).toHaveLength(1);

      useDietBuilderStore.getState().copyDayToWeekdays("monday", ["tuesday"]);

      const tuesdayMeals = useDietBuilderStore
        .getState()
        .draft!.meals.filter((m) => m.dayOfWeek === "tuesday");
      expect(tuesdayMeals).toHaveLength(1); // replaced, not appended to 2
      expect(tuesdayMeals[0].type).toBe("breakfast"); // came from monday's meal
      // Monday's original meal is untouched.
      expect(useDietBuilderStore.getState().draft!.meals.find((m) => m.id === mondayMealId)).toBeTruthy();
    });

    it("clearDay removes all meals for that day only", () => {
      useDietBuilderStore.getState().addMeal("tuesday", "lunch");
      useDietBuilderStore.getState().clearDay("monday");

      const { draft } = useDietBuilderStore.getState();
      expect(draft!.meals.filter((m) => m.dayOfWeek === "monday")).toHaveLength(0);
      expect(draft!.meals.filter((m) => m.dayOfWeek === "tuesday")).toHaveLength(1);
    });
  });

  describe("autosave debounce", () => {
    it("debounces rapid mutations into a single saveDietBuilderDraft call", () => {
      useDietBuilderStore.getState().startBlankWeek();
      useDietBuilderStore.getState().addMeal("monday", "breakfast");
      useDietBuilderStore.getState().addMeal("monday", "lunch");
      useDietBuilderStore.getState().addMeal("monday", "dinner");

      expect(mockSaveDraft).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1500);
      expect(mockSaveDraft).toHaveBeenCalledTimes(1);
    });

    it("never queues an autosave for a guest (no syncable user id)", () => {
      mockSyncableUserId = null;
      useDietBuilderStore.getState().startBlankWeek();
      useDietBuilderStore.getState().addMeal("monday", "breakfast");

      jest.advanceTimersByTime(1500);
      expect(mockSaveDraft).not.toHaveBeenCalled();
    });
  });

  describe("save / saveAndActivate / discard", () => {
    it("save writes through to nutritionStore.saveCustomWeeklyMealPlan and clears draftDirty", async () => {
      useDietBuilderStore.getState().startBlankWeek();
      useDietBuilderStore.getState().addMeal("monday", "breakfast");

      await useDietBuilderStore.getState().save();

      expect(mockSaveCustomWeeklyMealPlan).toHaveBeenCalledTimes(1);
      expect(useDietBuilderStore.getState().draftDirty).toBe(false);
      expect(mockClearDraft).toHaveBeenCalledWith("user-1");
    });

    it("saveAndActivate saves then flips activeDietSource to custom", async () => {
      useDietBuilderStore.getState().startBlankWeek();
      await useDietBuilderStore.getState().saveAndActivate();

      expect(mockSaveCustomWeeklyMealPlan).toHaveBeenCalledTimes(1);
      expect(mockSetActiveDietSource).toHaveBeenCalledWith("custom");
    });

    it("discard clears the draft and resets transient UI state", () => {
      useDietBuilderStore.getState().startBlankWeek();
      useDietBuilderStore.getState().addMeal("monday", "breakfast");
      useDietBuilderStore.setState({ pickerOpen: true, draftDirty: true });

      useDietBuilderStore.getState().discard();

      const state = useDietBuilderStore.getState();
      expect(state.draft).toBeNull();
      expect(state.draftDirty).toBe(false);
      expect(state.pickerOpen).toBe(false);
    });
  });

  describe("getDayAdherence", () => {
    it("classifies an empty day as empty, not under", () => {
      expect(getDayAdherence(0, 2000)).toBe("empty");
    });

    it("classifies within ±10% of target as on-target", () => {
      expect(getDayAdherence(2000, 2000)).toBe("on");
      expect(getDayAdherence(2100, 2000)).toBe("on");
      expect(getDayAdherence(1900, 2000)).toBe("on");
    });

    it("classifies beyond ±10% as under/over", () => {
      expect(getDayAdherence(1500, 2000)).toBe("under");
      expect(getDayAdherence(2600, 2000)).toBe("over");
    });

    it("treats a missing/zero target as empty rather than crashing", () => {
      expect(getDayAdherence(1500, null)).toBe("empty");
      expect(getDayAdherence(1500, 0)).toBe("empty");
    });
  });
});
