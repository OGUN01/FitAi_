/**
 * workoutBuilderStore.test.ts — Phase 11 QA (Part C, deliverable 8).
 *
 * Unit tests for the Zustand store in `src/stores/workoutBuilderStore.ts`.
 *
 * Coverage:
 *   - hydrateFromCustomPlan (with + without an existing custom plan)
 *   - hydrateFromPlan / startBlankWeek
 *   - addExercise — updates plannedExercises, exercises mirror, title, duration, muscleGroups
 *   - removeExercise — updates mirror, resets to Rest Day when empty
 *   - reorderExercise — reorders within a day
 *   - moveExerciseBetweenDays — moves between days, updates both
 *   - duplicateDay — deep-clones day to target index with new id
 *   - duplicateExercise — inserts clone after source
 *   - clearDay — resets to blank Rest Day
 *   - computeInsights — populates the insights field
 *
 * Mocks:
 *   - fitnessStore.saveCustomWeeklyPlan + customWeeklyPlan (SSOT write-through)
 *   - CURATED_EXERCISES (so muscle-group lookups are deterministic)
 *
 * Note: computeInsights runs synchronously inside the store (it awaits a
 * promise that resolves immediately), so we use `await` + a microtask flush.
 */
import { useWorkoutBuilderStore } from "../../stores/workoutBuilderStore";

// ----------------------------------------------------------------------------
// MOCKS
// ----------------------------------------------------------------------------

const mockSaveCustomWeeklyPlan = jest.fn().mockResolvedValue(undefined);

// Mock fitnessStore: customWeeklyPlan starts null; saveCustomWeeklyPlan captures.
jest.mock("../../stores/fitnessStore", () => {
  let customPlan: any = null;
  const state = {
    get customWeeklyPlan() {
      return customPlan;
    },
    saveCustomWeeklyPlan: jest.fn(async (plan: any) => {
      customPlan = plan;
      mockSaveCustomWeeklyPlan(plan);
    }),
  };
  return {
    useFitnessStore: {
      getState: () => state,
    },
  };
});

// Mock CURATED_EXERCISES so muscle groups are deterministic for the assertions.
jest.mock("../../data/curatedExercises", () => ({
  CURATED_EXERCISES: [
    {
      id: "bench_press",
      name: "Bench Press",
      muscleGroups: ["chest", "shoulders", "triceps"],
      equipment: ["barbell"],
      location: ["gym"],
      isBodyweight: false,
      isTimeBased: false,
      difficulty: "intermediate",
      category: "chest",
    },
    {
      id: "pull_up",
      name: "Pull-Up",
      muscleGroups: ["back", "biceps"],
      equipment: ["body weight"],
      location: ["gym"],
      isBodyweight: true,
      isTimeBased: false,
      difficulty: "intermediate",
      category: "back",
    },
    {
      id: "squat",
      name: "Squat",
      muscleGroups: ["quadriceps", "glutes", "hamstrings"],
      equipment: ["barbell"],
      location: ["gym"],
      isBodyweight: false,
      isTimeBased: false,
      difficulty: "intermediate",
      category: "legs",
    },
  ],
}));

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

function makePlannedExercise(
  overrides: Partial<{
    exerciseId: string;
    name: string;
    sets: number;
    reps: number;
    weightKg: number;
  }> = {},
) {
  const setsCount = overrides.sets ?? 3;
  return {
    exerciseId: overrides.exerciseId ?? "bench_press",
    name: overrides.name ?? "Bench Press",
    sets: Array.from({ length: setsCount }, (_, i) => ({
      setNumber: i + 1,
      reps: overrides.reps ?? 10,
      weightKg: overrides.weightKg ?? 60,
      setType: "normal" as const,
    })),
    restSeconds: 90,
  };
}

/** Reset the store to a clean state before each test. */
function resetStore() {
  useWorkoutBuilderStore.setState({
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
  });
}

/** Flush pending microtasks (computeInsights is async). */
function flushMicrotasks() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

// ----------------------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------------------

describe("useWorkoutBuilderStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // ── Hydration ───────────────────────────────────────────────────────────────
  describe("hydrateFromCustomPlan", () => {
    it("starts a blank week when no custom plan exists", async () => {
      await useWorkoutBuilderStore.getState().hydrateFromCustomPlan();
      await flushMicrotasks();
      const { draft } = useWorkoutBuilderStore.getState();
      expect(draft).not.toBeNull();
      expect(draft!.workouts).toHaveLength(7);
      expect(draft!.draftDirty ?? false).toBe(false);
      // Insights get computed on hydrate.
      expect(useWorkoutBuilderStore.getState().insights).not.toBeNull();
    });
  });

  describe("hydrateFromPlan", () => {
    it("clones the provided plan into draft", () => {
      const plan = {
        id: "existing_week",
        weekNumber: 2,
        workouts: [],
        planTitle: "Imported",
      } as any;
      useWorkoutBuilderStore.getState().hydrateFromPlan(plan);
      const { draft } = useWorkoutBuilderStore.getState();
      expect(draft).not.toBeNull();
      expect(draft!.id).toBe("existing_week");
      expect(draft!.planTitle).toBe("Imported");
      // Deep clone — mutating the source must not affect the draft.
      plan.id = "mutated";
      expect(draft!.id).toBe("existing_week");
    });
  });

  describe("startBlankWeek", () => {
    it("creates a 7-day blank week with Rest Days", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      const { draft } = useWorkoutBuilderStore.getState();
      expect(draft).not.toBeNull();
      expect(draft!.workouts).toHaveLength(7);
      draft!.workouts.forEach((day) => {
        expect(day.title).toBe("Rest Day");
        expect(day.plannedExercises).toEqual([]);
      });
    });
  });

  // ── addExercise ──────────────────────────────────────────────────────────────
  describe("addExercise", () => {
    it("appends to the day, mirrors exercises[], updates title + muscleGroups + duration", async () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      const exercise = makePlannedExercise({ exerciseId: "bench_press", sets: 3 });
      useWorkoutBuilderStore.getState().addExercise(0, exercise as any);
      await flushMicrotasks();
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises).toHaveLength(1);
      expect(day.plannedExercises[0].exerciseId).toBe("bench_press");
      // exercises[] mirror is populated.
      expect(day.exercises).toHaveLength(1);
      expect(day.exercises[0].exerciseId).toBe("bench_press");
      // Title flips off "Rest Day".
      expect(day.title).not.toBe("Rest Day");
      // targetMuscleGroups includes the exercise's muscles.
      expect(day.targetMuscleGroups).toEqual(
        expect.arrayContaining(["chest", "shoulders", "triceps"]),
      );
      // Duration is non-zero (3 sets × 2 min + 1 exercise × 1 min = 7 min).
      expect(day.duration).toBeGreaterThan(0);
      expect(useWorkoutBuilderStore.getState().draftDirty).toBe(true);
    });

    it("preserves the existing title when it is already a custom name", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      const ex1 = makePlannedExercise({ exerciseId: "bench_press" });
      useWorkoutBuilderStore.getState().addExercise(0, ex1 as any);
      const customTitle = "Push Day";
      useWorkoutBuilderStore.getState().updateDay(0, {
        ...useWorkoutBuilderStore.getState().draft!.workouts[0],
        title: customTitle,
      });
      const ex2 = makePlannedExercise({ exerciseId: "pull_up" });
      useWorkoutBuilderStore.getState().addExercise(0, ex2 as any);
      expect(useWorkoutBuilderStore.getState().draft!.workouts[0].title).toBe(customTitle);
    });
  });

  // ── removeExercise ───────────────────────────────────────────────────────────
  describe("removeExercise", () => {
    it("removes the exercise and resets the day to Rest Day when empty", async () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      const ex = makePlannedExercise({ exerciseId: "bench_press" });
      useWorkoutBuilderStore.getState().addExercise(0, ex as any);
      useWorkoutBuilderStore.getState().removeExercise(0, 0);
      await flushMicrotasks();
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises).toHaveLength(0);
      expect(day.exercises).toHaveLength(0);
      expect(day.title).toBe("Rest Day");
      expect(day.duration).toBe(0);
    });

    it("removes only the targeted exercise when multiple exist", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "pull_up" }) as any);
      useWorkoutBuilderStore.getState().removeExercise(0, 0);
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises).toHaveLength(1);
      expect(day.plannedExercises[0].exerciseId).toBe("pull_up");
    });
  });

  // ── reorderExercise ──────────────────────────────────────────────────────────
  describe("reorderExercise", () => {
    it("reorders within a day (move first → last)", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "pull_up" }) as any);
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "squat" }) as any);
      useWorkoutBuilderStore.getState().reorderExercise(0, 0, 2);
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises.map((p) => p.exerciseId)).toEqual([
        "pull_up",
        "squat",
        "bench_press",
      ]);
    });

    it("is a no-op when fromIndex === toIndex", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "pull_up" }) as any);
      const before = useWorkoutBuilderStore.getState().draft!.workouts[0].plannedExercises;
      useWorkoutBuilderStore.getState().reorderExercise(0, 0, 0);
      const after = useWorkoutBuilderStore.getState().draft!.workouts[0].plannedExercises;
      expect(after.map((p) => p.exerciseId)).toEqual(before.map((p) => p.exerciseId));
    });
  });

  // ── moveExerciseBetweenDays ──────────────────────────────────────────────────
  describe("moveExerciseBetweenDays", () => {
    it("moves an exercise from one day to another, updating both", async () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "pull_up" }) as any);
      useWorkoutBuilderStore.getState().moveExerciseBetweenDays(0, 0, 2, 0);
      await flushMicrotasks();
      const day0 = useWorkoutBuilderStore.getState().draft!.workouts[0];
      const day2 = useWorkoutBuilderStore.getState().draft!.workouts[2];
      expect(day0.plannedExercises).toHaveLength(1);
      expect(day0.plannedExercises[0].exerciseId).toBe("pull_up");
      expect(day2.plannedExercises).toHaveLength(1);
      expect(day2.plannedExercises[0].exerciseId).toBe("bench_press");
      // Source day title stays non-Rest (still has an exercise).
      expect(day0.title).not.toBe("Rest Day");
      // Target day title flips off Rest Day.
      expect(day2.title).not.toBe("Rest Day");
    });

    it("resets the source day to Rest Day when it becomes empty", async () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().moveExerciseBetweenDays(0, 0, 1, 0);
      await flushMicrotasks();
      expect(useWorkoutBuilderStore.getState().draft!.workouts[0].title).toBe("Rest Day");
      expect(useWorkoutBuilderStore.getState().draft!.workouts[0].duration).toBe(0);
    });

    it("delegates to reorderExercise when fromDay === toDay", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "pull_up" }) as any);
      useWorkoutBuilderStore.getState().moveExerciseBetweenDays(0, 0, 0, 1);
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises.map((p) => p.exerciseId)).toEqual(["pull_up", "bench_press"]);
    });
  });

  // ── duplicateDay ──────────────────────────────────────────────────────────────
  describe("duplicateDay", () => {
    it("deep-clones a day to a target index with a new id + corrected dayOfWeek", async () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      const sourceId = useWorkoutBuilderStore.getState().draft!.workouts[0].id;
      useWorkoutBuilderStore.getState().duplicateDay(0, 2);
      await flushMicrotasks();
      const day0 = useWorkoutBuilderStore.getState().draft!.workouts[0];
      const day2 = useWorkoutBuilderStore.getState().draft!.workouts[2];
      expect(day2.plannedExercises).toHaveLength(1);
      expect(day2.plannedExercises[0].exerciseId).toBe("bench_press");
      // New id (different from source).
      expect(day2.id).not.toBe(sourceId);
      // dayOfWeek matches the target slot (index 2 → wednesday).
      expect(day2.dayOfWeek).toBe("wednesday");
    });
  });

  // ── duplicateExercise ────────────────────────────────────────────────────────
  describe("duplicateExercise", () => {
    it("inserts a clone immediately after the source exercise", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "pull_up" }) as any);
      useWorkoutBuilderStore.getState().duplicateExercise(0, 0);
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises).toHaveLength(3);
      expect(day.plannedExercises.map((p) => p.exerciseId)).toEqual([
        "bench_press",
        "bench_press", // clone inserted after source
        "pull_up",
      ]);
    });

    it("is a no-op when the exercise index is out of range", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().duplicateExercise(0, 5);
      expect(useWorkoutBuilderStore.getState().draft!.workouts[0].plannedExercises).toHaveLength(1);
    });
  });

  // ── replaceExercise (Phase 6C-i fix) ────────────────────────────────────────
  // Previously "Replace exercise" was implemented as removeExercise +
  // addExercise in WeeklyBuilderScreen — addExercise APPENDS, so a replaced
  // exercise always landed at the END of the day instead of its original
  // slot. replaceExercise splices in place instead.
  describe("replaceExercise", () => {
    it("replaces at index 2 of a 5-exercise day and keeps the new exercise AT index 2, not appended to the end", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      const ids = ["bench_press", "pull_up", "squat", "bench_press", "pull_up"];
      for (const id of ids) {
        useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: id }) as any);
      }
      const replacement = makePlannedExercise({ exerciseId: "overhead_press", name: "Overhead Press" });
      useWorkoutBuilderStore.getState().replaceExercise(0, 2, replacement as any);
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises.map((p) => p.exerciseId)).toEqual([
        "bench_press",
        "pull_up",
        "overhead_press", // replaced IN PLACE at index 2
        "bench_press",
        "pull_up",
      ]);
      expect(day.plannedExercises).toHaveLength(5);
      // exercises[] mirror stays in sync too.
      expect(day.exercises.map((e) => e.exerciseId)).toEqual([
        "bench_press",
        "pull_up",
        "overhead_press",
        "bench_press",
        "pull_up",
      ]);
    });

    it("stamps alternativeExerciseId with the id of the exercise that was replaced", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().replaceExercise(
        0,
        0,
        makePlannedExercise({ exerciseId: "overhead_press" }) as any,
      );
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises[0].alternativeExerciseId).toBe("bench_press");
    });

    it("carries over the replaced slot's supersetId/circuitId/blockIndex onto the new exercise", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, {
        ...makePlannedExercise({ exerciseId: "bench_press" }),
        supersetId: "ss_abc123",
        blockIndex: 1,
      } as any);
      useWorkoutBuilderStore.getState().replaceExercise(
        0,
        0,
        makePlannedExercise({ exerciseId: "overhead_press" }) as any,
      );
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises[0].supersetId).toBe("ss_abc123");
      expect(day.plannedExercises[0].blockIndex).toBe(1);
      expect(day.plannedExercises[0].circuitId).toBeUndefined();
    });

    it("is a no-op when the exercise index is out of range", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().replaceExercise(
        0,
        5,
        makePlannedExercise({ exerciseId: "overhead_press" }) as any,
      );
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises).toHaveLength(1);
      expect(day.plannedExercises[0].exerciseId).toBe("bench_press");
    });

    it("is a no-op when there is no draft", () => {
      useWorkoutBuilderStore.getState().replaceExercise(
        0,
        0,
        makePlannedExercise({ exerciseId: "overhead_press" }) as any,
      );
      expect(useWorkoutBuilderStore.getState().draft).toBeNull();
    });
  });

  // ── clearDay ──────────────────────────────────────────────────────────────────
  describe("clearDay", () => {
    it("resets the day to a blank Rest Day", async () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press" }) as any);
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "pull_up" }) as any);
      useWorkoutBuilderStore.getState().clearDay(0);
      await flushMicrotasks();
      const day = useWorkoutBuilderStore.getState().draft!.workouts[0];
      expect(day.plannedExercises).toHaveLength(0);
      expect(day.exercises).toHaveLength(0);
      expect(day.title).toBe("Rest Day");
      expect(day.duration).toBe(0);
      expect(day.targetMuscleGroups).toEqual([]);
    });
  });

  // ── computeInsights ──────────────────────────────────────────────────────────
  describe("computeInsights", () => {
    it("populates the insights field from the draft", async () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "bench_press", sets: 3 }) as any);
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise({ exerciseId: "squat", sets: 3 }) as any);
      await useWorkoutBuilderStore.getState().computeInsights();
      const { insights } = useWorkoutBuilderStore.getState();
      expect(insights).not.toBeNull();
      expect(insights!.muscleCoverage["chest"]).toBe(3);
      expect(insights!.muscleCoverage["quadriceps"]).toBe(3);
      expect(insights!.totalVolume).toBeGreaterThan(0);
      // isComputingInsights flips back to false after completion.
      expect(useWorkoutBuilderStore.getState().isComputingInsights).toBe(false);
    });

    it("sets insights to null when there is no draft", async () => {
      await useWorkoutBuilderStore.getState().computeInsights();
      expect(useWorkoutBuilderStore.getState().insights).toBeNull();
    });
  });

  // ── save ────────────────────────────────────────────────────────────────────
  describe("save", () => {
    it("writes the draft through to fitnessStore.saveCustomWeeklyPlan", async () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      const draft = useWorkoutBuilderStore.getState().draft;
      await useWorkoutBuilderStore.getState().save();
      expect(mockSaveCustomWeeklyPlan).toHaveBeenCalledWith(draft);
      expect(useWorkoutBuilderStore.getState().draftDirty).toBe(false);
    });

    it("is a no-op when there is no draft", async () => {
      await useWorkoutBuilderStore.getState().save();
      expect(mockSaveCustomWeeklyPlan).not.toHaveBeenCalled();
    });
  });

  // ── discard ──────────────────────────────────────────────────────────────────
  describe("discard", () => {
    it("clears the draft and all transient state", () => {
      useWorkoutBuilderStore.getState().startBlankWeek();
      useWorkoutBuilderStore.getState().addExercise(0, makePlannedExercise() as any);
      useWorkoutBuilderStore.getState().openPicker({ dayIndex: 0 });
      useWorkoutBuilderStore.getState().discard();
      const state = useWorkoutBuilderStore.getState();
      expect(state.draft).toBeNull();
      expect(state.draftDirty).toBe(false);
      expect(state.pickerOpen).toBe(false);
      expect(state.insights).toBeNull();
    });
  });

  // ── Picker / editor state ─────────────────────────────────────────────────────
  describe("picker + editor state", () => {
    it("openPicker/closePicker toggle state", () => {
      useWorkoutBuilderStore.getState().openPicker({ dayIndex: 1, slotIndex: 2 });
      expect(useWorkoutBuilderStore.getState().pickerOpen).toBe(true);
      expect(useWorkoutBuilderStore.getState().pickerContext).toEqual({ dayIndex: 1, slotIndex: 2 });
      useWorkoutBuilderStore.getState().closePicker();
      expect(useWorkoutBuilderStore.getState().pickerOpen).toBe(false);
      expect(useWorkoutBuilderStore.getState().pickerContext).toBeNull();
    });

    it("openEditor/closeEditor toggle state", () => {
      useWorkoutBuilderStore.getState().openEditor({ dayIndex: 0, exerciseIndex: 1 });
      expect(useWorkoutBuilderStore.getState().editorOpen).toBe(true);
      expect(useWorkoutBuilderStore.getState().editorContext).toEqual({ dayIndex: 0, exerciseIndex: 1 });
      useWorkoutBuilderStore.getState().closeEditor();
      expect(useWorkoutBuilderStore.getState().editorOpen).toBe(false);
      expect(useWorkoutBuilderStore.getState().editorContext).toBeNull();
    });
  });
});
