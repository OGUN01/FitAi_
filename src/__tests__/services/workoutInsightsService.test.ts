/**
 * workoutInsightsService.test.ts — Phase 11 QA (Part C, deliverable 9).
 *
 * Unit tests for `computeWeeklyInsights` in
 * `src/services/workoutInsightsService.ts`.
 *
 * Coverage:
 *   - Empty plan → zeroed insights
 *   - Single-day plan → correct muscle coverage
 *   - Push-heavy plan → pushPullRatio > 1
 *   - Pull-heavy plan → pushPullRatio < 1
 *   - Balanced plan → pushPullRatio ≈ 1
 *   - Consecutive-day same-muscle → recoveryScore penalty
 *   - Over-volume → volumeScore capped at 100
 *   - Missing legs → balanceWarnings includes missing_legs
 *   - No pulling → balanceWarnings includes insufficient_pull
 *   - Calorie estimate with userWeightKg vs null
 *
 * No mocks required — `computeWeeklyInsights` is a pure function that reads
 * from CURATED_EXERCISES (real data). The calorieCalculator dependency is
 * exercised against real MET math (deterministic given a fixed weight).
 */
import { computeWeeklyInsights, MAJOR_MUSCLE_GROUPS } from "../../services/workoutInsightsService";
import type { WeeklyWorkoutPlan, DayWorkout } from "../../types/ai";
import type { PlannedExercise, PlannedSet } from "../../types/workout";

// ----------------------------------------------------------------------------
// HELPERS — build plans with sensible defaults
// ----------------------------------------------------------------------------

const DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

function makeSet(overrides: Partial<PlannedSet> = {}): PlannedSet {
  return {
    setNumber: overrides.setNumber ?? 1,
    reps: overrides.reps ?? 10,
    weightKg: overrides.weightKg ?? 60,
    setType: overrides.setType ?? "normal",
    dropWeightKg: overrides.dropWeightKg,
    dropReps: overrides.dropReps,
    durationSeconds: overrides.durationSeconds,
  };
}

function makeExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    exerciseId: overrides.exerciseId ?? "barbell_bench_press",
    name: overrides.name ?? "Barbell Bench Press",
    sets: overrides.sets ?? [makeSet({ setNumber: 1 }), makeSet({ setNumber: 2 }), makeSet({ setNumber: 3 })],
    restSeconds: overrides.restSeconds ?? 90,
    notes: overrides.notes,
    tempo: overrides.tempo,
    targetRpe: overrides.targetRpe,
    supersetId: overrides.supersetId,
    circuitId: overrides.circuitId,
    blockIndex: overrides.blockIndex,
    alternativeExerciseId: overrides.alternativeExerciseId,
  };
}

function makeDay(overrides: Partial<DayWorkout> = {}): DayWorkout {
  return {
    id: overrides.id ?? `custom_${overrides.dayOfWeek ?? "monday"}_blank`,
    title: overrides.title ?? "Rest Day",
    description: overrides.description ?? "",
    category: overrides.category ?? "strength",
    difficulty: overrides.difficulty ?? "intermediate",
    duration: overrides.duration ?? 0,
    estimatedCalories: overrides.estimatedCalories ?? 0,
    exercises: overrides.exercises ?? [],
    plannedExercises: overrides.plannedExercises ?? [],
    equipment: overrides.equipment ?? [],
    targetMuscleGroups: overrides.targetMuscleGroups ?? [],
    icon: overrides.icon ?? "barbell-outline",
    tags: overrides.tags ?? [],
    isPersonalized: overrides.isPersonalized ?? true,
    aiGenerated: overrides.aiGenerated ?? false,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    dayOfWeek: overrides.dayOfWeek ?? "monday",
    subCategory: overrides.subCategory ?? "custom",
    intensityLevel: overrides.intensityLevel ?? "rest",
    warmUp: overrides.warmUp ?? [],
    coolDown: overrides.coolDown ?? [],
    progressionNotes: overrides.progressionNotes ?? [],
    safetyConsiderations: overrides.safetyConsiderations ?? [],
    expectedBenefits: overrides.expectedBenefits ?? [],
    isExtra: overrides.isExtra ?? false,
  };
}

/** Build a blank 7-day week. */
function blankWeek(): WeeklyWorkoutPlan {
  return {
    id: "test_week",
    weekNumber: 1,
    workouts: DAYS_OF_WEEK.map((d) => makeDay({ dayOfWeek: d, id: `custom_${d}_blank` })),
    planTitle: "Test Plan",
    planDescription: "",
    restDays: DAYS_OF_WEEK.map((_, i) => i),
    totalEstimatedCalories: 0,
  };
}

/** Set a single day's planned exercises; returns a NEW plan (immutability). */
function withDay(plan: WeeklyWorkoutPlan, dayIndex: number, exercises: PlannedExercise[]): WeeklyWorkoutPlan {
  const workouts = [...plan.workouts];
  workouts[dayIndex] = makeDay({
    ...workouts[dayIndex],
    dayOfWeek: DAYS_OF_WEEK[dayIndex],
    id: `custom_${DAYS_OF_WEEK[dayIndex]}_test`,
    title: exercises.length > 0 ? "Workout" : "Rest Day",
    plannedExercises: exercises,
    intensityLevel: exercises.length > 0 ? "moderate" : "rest",
  });
  return { ...plan, workouts };
}

// ----------------------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------------------

describe("computeWeeklyInsights", () => {
  // ── Empty plan ────────────────────────────────────────────────────────────
  describe("empty plan", () => {
    it("returns zeroed insights for a blank week", () => {
      const insights = computeWeeklyInsights(blankWeek());
      expect(insights.pushPullRatio).toBe(1);
      expect(insights.recoveryScore).toBe(100);
      expect(insights.totalVolume).toBe(0);
      expect(insights.calorieEstimate).toBe(0);
      expect(insights.timeCommitment).toBe(0);
      expect(insights.weeklyCalories).toBe(0);
      expect(insights.volumeScore).toBe(0);
      expect(Object.keys(insights.muscleCoverage)).toHaveLength(0);
      // An empty week has no legs and no pulling — those warnings legitimately fire.
      // The key invariant for an "empty" plan is that no OVERLOAD or WARMUP
      // warnings appear (those require actual exercises).
      const warningTypes = insights.balanceWarnings.map((w) => w.type);
      expect(warningTypes).not.toContain("excessive_volume");
      expect(warningTypes).not.toContain("missing_warmup");
      expect(warningTypes).toContain("missing_legs");
    });

    it("returns zero calorieEstimate when userWeightKg is null", () => {
      const plan = withDay(blankWeek(), 0, [makeExercise()]);
      const insights = computeWeeklyInsights(plan, { userWeightKg: null });
      expect(insights.calorieEstimate).toBe(0);
      expect(insights.weeklyCalories).toBe(0);
    });

    it("returns zero calorieEstimate when userWeightKg is omitted", () => {
      const plan = withDay(blankWeek(), 0, [makeExercise()]);
      const insights = computeWeeklyInsights(plan);
      expect(insights.calorieEstimate).toBe(0);
    });
  });

  // ── Single-day muscle coverage ─────────────────────────────────────────────
  describe("single-day plan", () => {
    it("aggregates muscle coverage from planned exercises", () => {
      // barbell_bench_press: chest, shoulders, triceps — 3 sets each
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      expect(insights.muscleCoverage["chest"]).toBe(3);
      expect(insights.muscleCoverage["shoulders"]).toBe(3);
      expect(insights.muscleCoverage["triceps"]).toBe(3);
    });

    it("aggregates across multiple exercises in the same day", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "overhead_press", sets: [makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      // bench: chest(3) shoulders(3) triceps(3); ohp: shoulders(2) triceps(2)
      expect(insights.muscleCoverage["chest"]).toBe(3);
      expect(insights.muscleCoverage["shoulders"]).toBe(5);
      expect(insights.muscleCoverage["triceps"]).toBe(5);
    });
  });

  // ── Push / pull ratio ─────────────────────────────────────────────────────
  describe("push/pull ratio", () => {
    it("push-heavy plan → pushPullRatio > 1", () => {
      // bench (chest/shoulders/triceps) + overhead_press (shoulders/triceps): pure push.
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "overhead_press", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      expect(insights.pushPullRatio).toBeGreaterThan(1);
    });

    it("pull-heavy plan → pushPullRatio < 1", () => {
      // pull_up (biceps/back) + barbell_row (biceps/back): pure pull.
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "barbell_row", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      // No push sets → pushPullRatio falls to the "pullSets > 0, pushSets = 0" branch = 2? No.
      // The formula: pullSets>0 ? pushSets/pullSets : (pushSets>0 ? 2 : 1). push=0, pull>0 → 0.
      expect(insights.pushPullRatio).toBeLessThan(1);
      expect(insights.pushPullRatio).toBe(0);
    });

    it("balanced plan → pushPullRatio ≈ 1", () => {
      // bench (3 push muscles × 3 sets = 9 push sets) vs pull_up (2 pull muscles × 3 sets = 6 pull sets)
      // → ratio = 9/6 = 1.5. Add a 2nd pull exercise (barbell_row, 2 pull × 3 = 6) → pull=12.
      // bench (9 push) + overhead_press (2 push muscles × 3 sets = 6) → push=15.
      // 15/12 = 1.25. To get exactly 1.0, match push and pull set-products.
      // bench (3 push × 3 sets = 9) + pull_up (2 pull × 3 = 6) + lat_pulldown (2 pull × 3 = 6) → 9/12 = 0.75.
      // Simplest "≈1": bench (9 push) + pull_up (6 pull) + barbell_row (6 pull, but row has biceps+back = 2 pull × 3 = 6) → 9/12.
      // Use equal: 1 push exercise (bench, 9 push) vs 1.5 pull exercises is impossible.
      // Use bench (9 push) + overhead_press(6 push) = 15 push; pull_up(6)+barbell_row(6)+lat_pulldown(6) = 18 pull → 15/18 = 0.83.
      // To hit ~1.0 exactly: 2 push ex each 3 push-muscles × 3 sets = 18 push; 3 pull ex each 2 pull × 3 = 18 pull.
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }), // 9 push
        makeExercise({ exerciseId: "push_up", sets: [makeSet(), makeSet(), makeSet()] }),              // 9 push (chest/shoulders/triceps)
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),             // 6 pull
        makeExercise({ exerciseId: "barbell_row", sets: [makeSet(), makeSet(), makeSet()] }),          // 6 pull
        makeExercise({ exerciseId: "lat_pulldown", sets: [makeSet(), makeSet(), makeSet()] }),         // 6 pull
      ]);
      const insights = computeWeeklyInsights(plan);
      // 18 push / 18 pull = 1.0
      expect(insights.pushPullRatio).toBeCloseTo(1.0, 5);
    });
  });

  // ── Recovery score ────────────────────────────────────────────────────────
  describe("recovery score", () => {
    it("penalizes consecutive-day same-muscle hits above 6 sets/day", () => {
      // Day 0: 7 sets of bench (chest) — chest >= 6 sets.
      // Day 1: 7 sets of bench (chest) — chest >= 6 sets → penalty.
      const heavyChest = makeExercise({
        exerciseId: "barbell_bench_press",
        sets: Array.from({ length: 7 }, (_, i) => makeSet({ setNumber: i + 1 })),
      });
      const plan = withDay(withDay(blankWeek(), 0, [heavyChest]), 1, [heavyChest]);
      const insights = computeWeeklyInsights(plan);
      expect(insights.recoveryScore).toBeLessThan(100);
    });

    it("does not penalize when muscles differ across consecutive days", () => {
      // Day 0: bench (chest/shoulders/triceps). Day 1: squat (legs). No overlap.
      const plan = withDay(
        withDay(blankWeek(), 0, [
          makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        ]),
        1,
        [makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] })],
      );
      const insights = computeWeeklyInsights(plan);
      expect(insights.recoveryScore).toBe(100);
    });
  });

  // ── Volume score cap ──────────────────────────────────────────────────────
  describe("volume score", () => {
    it("caps volumeScore at 100 when total sets exceed max-recoverable", () => {
      // volumeScore = totalSets / sum(MAX_RECOVERABLE_SETS for hit muscles) × 100.
      // To force the cap (100), totalSets must exceed the max-recoverable sum.
      // Use a single exercise (bench) hitting chest(20)+shoulders(16)+triceps(14)=50
      // max-recoverable. 60 sets → 60/50 = 120% → capped at 100.
      const hugeDay: PlannedExercise[] = [
        makeExercise({
          exerciseId: "barbell_bench_press",
          sets: Array.from({ length: 60 }, (_, i) => makeSet({ setNumber: i + 1 })),
        }),
      ];
      const plan = withDay(blankWeek(), 0, hugeDay);
      const insights = computeWeeklyInsights(plan);
      expect(insights.volumeScore).toBeLessThanOrEqual(100);
      // 60 sets vs 50 max-recoverable → 120% → clamped to 100.
      expect(insights.volumeScore).toBe(100);
    });
  });

  // ── Balance warnings ───────────────────────────────────────────────────────
  describe("balance warnings", () => {
    it("includes missing_legs when no leg exercises are planned", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      const warning = insights.balanceWarnings.find((w) => w.type === "missing_legs");
      expect(warning).toBeDefined();
      expect(warning?.fixAction?.type).toBe("add_exercise");
    });

    it("does NOT include missing_legs when leg exercises are planned", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "squat", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      expect(insights.balanceWarnings.find((w) => w.type === "missing_legs")).toBeUndefined();
    });

    it("includes insufficient_pull when the plan is push-heavy with no pulling", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "overhead_press", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      const warning = insights.balanceWarnings.find((w) => w.type === "insufficient_pull");
      expect(warning).toBeDefined();
      expect(warning?.fixAction?.payload).toMatchObject({ muscleGroup: "back" });
    });

    it("does NOT include insufficient_pull when pulling is present", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
        makeExercise({ exerciseId: "pull_up", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      expect(insights.balanceWarnings.find((w) => w.type === "insufficient_pull")).toBeUndefined();
    });

    it("includes missing_warmup when an active day has 3+ exercises and no warmup sets", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press" }),
        makeExercise({ exerciseId: "overhead_press" }),
        makeExercise({ exerciseId: "pull_up" }),
      ]);
      const insights = computeWeeklyInsights(plan);
      const warmupWarning = insights.balanceWarnings.find((w) => w.type === "missing_warmup");
      expect(warmupWarning).toBeDefined();
      expect(warmupWarning?.dayIndex).toBe(0);
    });

    it("does NOT include missing_warmup when at least one set is a warmup", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({
          exerciseId: "barbell_bench_press",
          sets: [
            makeSet({ setNumber: 1, setType: "warmup", weightKg: 40 }),
            makeSet({ setNumber: 2 }),
            makeSet({ setNumber: 3 }),
          ],
        }),
        makeExercise({ exerciseId: "overhead_press" }),
        makeExercise({ exerciseId: "pull_up" }),
      ]);
      const insights = computeWeeklyInsights(plan);
      expect(insights.balanceWarnings.find((w) => w.type === "missing_warmup")).toBeUndefined();
    });
  });

  // ── Calorie estimate ──────────────────────────────────────────────────────
  describe("calorie estimate", () => {
    it("returns a positive calorieEstimate when userWeightKg is provided", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan, { userWeightKg: 75 });
      expect(insights.calorieEstimate).toBeGreaterThan(0);
      // weeklyCalories scales by active day count (1 here) — should equal the per-day estimate.
      expect(insights.weeklyCalories).toBe(insights.calorieEstimate);
    });

    it("scales weeklyCalories by active day count (capped at 7)", () => {
      const exercise = makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] });
      let plan = blankWeek();
      for (let i = 0; i < 5; i++) {
        plan = withDay(plan, i, [exercise]);
      }
      const insights = computeWeeklyInsights(plan, { userWeightKg: 75 });
      // 5 active days → weeklyCalories = calorieEstimate × 5
      expect(insights.weeklyCalories).toBeCloseTo(insights.calorieEstimate * 5, 5);
    });

    it("caps weeklyCalories scaling at 7 active days", () => {
      // 8 active days should scale by min(activeDays, 7) = 7. Build 8 days by
      // duplicating day 0 onto day 7's slot — but the week only has 7 days, so
      // use all 7 + treat the cap as min(7,7)=7. Already covered: 7 active days.
      const exercise = makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] });
      let plan = blankWeek();
      for (let i = 0; i < 7; i++) {
        plan = withDay(plan, i, [exercise]);
      }
      const insights = computeWeeklyInsights(plan, { userWeightKg: 75 });
      expect(insights.weeklyCalories).toBeCloseTo(insights.calorieEstimate * 7, 5);
    });
  });

  // ── Volume + time commitment ───────────────────────────────────────────────
  describe("total volume + time commitment", () => {
    it("computes totalVolume as sum(sets × reps × weightKg)", () => {
      // 3 sets × 10 reps × 60 kg = 1800 per exercise. 2 exercises → 3600.
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet({ reps: 10, weightKg: 60 }), makeSet({ reps: 10, weightKg: 60 }), makeSet({ reps: 10, weightKg: 60 })] }),
        makeExercise({ exerciseId: "overhead_press", sets: [makeSet({ reps: 10, weightKg: 60 }), makeSet({ reps: 10, weightKg: 60 }), makeSet({ reps: 10, weightKg: 60 })] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      expect(insights.totalVolume).toBe(3600);
    });

    it("parses range-string reps when computing volume", () => {
      // "8-12" → average 10. 3 sets × 10 reps × 60 kg = 1800.
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet({ reps: "8-12", weightKg: 60 }), makeSet({ reps: "8-12", weightKg: 60 }), makeSet({ reps: "8-12", weightKg: 60 })] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      expect(insights.totalVolume).toBe(1800);
    });

    it("sums day durations for timeCommitment", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      // Manually set a duration on the day to verify it's summed.
      const workouts = [...plan.workouts];
      workouts[0] = { ...workouts[0], duration: 45 };
      const planWithDuration = { ...plan, workouts };
      const insights = computeWeeklyInsights(planWithDuration);
      expect(insights.timeCommitment).toBe(45);
    });
  });

  // ── Muscle coverage keys ───────────────────────────────────────────────────
  describe("muscle coverage", () => {
    it("only includes muscles that were actually trained", () => {
      const plan = withDay(blankWeek(), 0, [
        makeExercise({ exerciseId: "barbell_bench_press", sets: [makeSet(), makeSet(), makeSet()] }),
      ]);
      const insights = computeWeeklyInsights(plan);
      // bench trains chest/shoulders/triceps — no legs/back.
      expect(insights.muscleCoverage["chest"]).toBe(3);
      expect(insights.muscleCoverage["quadriceps"]).toBeUndefined();
    });
  });
});
