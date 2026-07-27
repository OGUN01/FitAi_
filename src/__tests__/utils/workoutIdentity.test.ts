import {
  getWorkoutDayKey,
  getWorkoutSlotKey,
  getCompletedSessionDayKey,
  getCompletedSessionWeekStart,
  findCompletedSessionForWorkout,
  hasCompletedSessionForDay,
  getCompletedSessionsForDate,
  getPlanIdentityForWorkoutId,
  findPlanWorkoutBySessionIdentity,
} from "../../utils/workoutIdentity";
import type { DayWorkout, WeeklyWorkoutPlan } from "../../ai";
import type { CompletedSession } from "../../stores/fitness/types";
import { getLocalDateString, getWeekStartForDate } from "../../utils/weekUtils";

// ============================================================================
// FIXTURE BUILDERS
// ============================================================================

function makeWorkout(overrides: Partial<DayWorkout> & { id: string }): DayWorkout {
  return {
    title: "Test Workout",
    description: "",
    category: "strength",
    difficulty: "intermediate",
    duration: 30,
    estimatedCalories: 200,
    exercises: [],
    warmup: [],
    cooldown: [],
    equipment: [],
    targetMuscleGroups: [],
    icon: "fitness",
    tags: [],
    isPersonalized: true,
    aiGenerated: true,
    subCategory: "general",
    intensityLevel: "moderate",
    warmUp: [],
    coolDown: [],
    progressionNotes: [],
    safetyConsiderations: [],
    expectedBenefits: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as unknown as DayWorkout;
}

function makeSession(
  overrides: Partial<CompletedSession> & { sessionId: string; workoutId: string },
): CompletedSession {
  return {
    type: "planned",
    caloriesBurned: 250,
    durationMinutes: 30,
    completedAt: "2026-01-15T10:00:00.000Z",
    weekStart: "2026-01-12",
    workoutSnapshot: {
      title: "Session",
      category: "strength",
      duration: 30,
      exercises: [],
    },
    ...overrides,
  } as CompletedSession;
}

function makePlan(workouts: DayWorkout[]): WeeklyWorkoutPlan {
  return {
    id: "plan-1",
    weekNumber: 1,
    workouts,
    planTitle: "Test Plan",
  };
}

// ============================================================================
// getWorkoutDayKey
// ============================================================================

describe("getWorkoutDayKey", () => {
  it("lowercases dayOfWeek", () => {
    const w = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    expect(getWorkoutDayKey(w)).toBe("monday");
  });

  it("returns 'unknown' when dayOfWeek is null", () => {
    const w = makeWorkout({ id: "w1", dayOfWeek: null as unknown as string });
    expect(getWorkoutDayKey(w)).toBe("unknown");
  });

  it("returns 'unknown' when workout is undefined", () => {
    expect(getWorkoutDayKey(undefined)).toBe("unknown");
  });

  it("returns 'unknown' when workout is null", () => {
    expect(getWorkoutDayKey(null)).toBe("unknown");
  });
});

// ============================================================================
// getWorkoutSlotKey
// ============================================================================

describe("getWorkoutSlotKey", () => {
  it("returns 'monday:0' for a single workout on a day (array form)", () => {
    const w = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    expect(getWorkoutSlotKey(w, [w])).toBe("monday:0");
  });

  it("returns 'monday:1' for the second workout on monday (array form)", () => {
    const w0 = makeWorkout({ id: "w0", dayOfWeek: "Monday" });
    const w1 = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    expect(getWorkoutSlotKey(w1, [w0, w1])).toBe("monday:1");
  });

  it("clamps not-found index to 0 (Math.max(-1, 0))", () => {
    const w0 = makeWorkout({ id: "w0", dayOfWeek: "Monday" });
    const missing = makeWorkout({ id: "missing", dayOfWeek: "Monday" });
    expect(getWorkoutSlotKey(missing, [w0])).toBe("monday:0");
  });

  it("accepts the plan form ({ workouts: [...] })", () => {
    const w = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([w]);
    expect(getWorkoutSlotKey(w, plan)).toBe("monday:0");
  });

  it("returns '<day>:0' when no array/plan is provided", () => {
    const w = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    expect(getWorkoutSlotKey(w)).toBe("monday:0");
  });
});

// ============================================================================
// getCompletedSessionDayKey
// ============================================================================

describe("getCompletedSessionDayKey", () => {
  it("uses plannedDayKey when present", () => {
    const s = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      plannedDayKey: "tuesday",
    });
    expect(getCompletedSessionDayKey(s)).toBe("tuesday");
  });

  it("falls back to getDayNameForDate(completedAt) when plannedDayKey is missing", () => {
    // 2026-01-15 is a Thursday
    const s = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      completedAt: "2026-01-15T10:00:00.000Z",
      plannedDayKey: undefined,
    });
    expect(getCompletedSessionDayKey(s)).toBe("thursday");
  });
});

// ============================================================================
// getCompletedSessionWeekStart
// ============================================================================

describe("getCompletedSessionWeekStart", () => {
  it("uses weekStart when present", () => {
    const s = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      weekStart: "2026-01-12",
    });
    expect(getCompletedSessionWeekStart(s)).toBe("2026-01-12");
  });

  it("falls back to getWeekStartForDate(completedAt) when weekStart is missing", () => {
    // 2026-01-15 is a Thursday; week-start Monday is 2026-01-12
    const s = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      completedAt: "2026-01-15T10:00:00.000Z",
      weekStart: undefined,
    });
    expect(getCompletedSessionWeekStart(s)).toBe("2026-01-12");
    // Cross-check against the real weekUtils function
    expect(getCompletedSessionWeekStart(s)).toBe(
      getWeekStartForDate("2026-01-15T10:00:00.000Z"),
    );
  });
});

// ============================================================================
// findCompletedSessionForWorkout
// ============================================================================

describe("findCompletedSessionForWorkout", () => {
  it("returns the matching planned session (same week, day, slotKey)", () => {
    const workout = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([workout]);
    const matching = makeSession({
      sessionId: "s-match",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "monday",
      planSlotKey: "monday:0",
      weekStart: "2026-01-12",
      completedAt: "2026-01-12T09:00:00.000Z",
    });
    const other = makeSession({
      sessionId: "s-other",
      workoutId: "w2",
      type: "planned",
      plannedDayKey: "tuesday",
      planSlotKey: "tuesday:0",
      weekStart: "2026-01-12",
      completedAt: "2026-01-13T09:00:00.000Z",
    });

    const result = findCompletedSessionForWorkout({
      completedSessions: [other, matching],
      workout,
      plan,
      weekStart: "2026-01-12",
    });
    expect(result).toBe(matching);
  });

  it("returns null when no session matches", () => {
    const workout = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([workout]);
    const wrongType = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      type: "extra",
      plannedDayKey: "monday",
      planSlotKey: "monday:0",
      weekStart: "2026-01-12",
    });
    const wrongWeek = makeSession({
      sessionId: "s2",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "monday",
      planSlotKey: "monday:0",
      weekStart: "2026-01-05",
    });
    const wrongDay = makeSession({
      sessionId: "s3",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "tuesday",
      planSlotKey: "tuesday:0",
      weekStart: "2026-01-12",
    });
    const wrongSlot = makeSession({
      sessionId: "s4",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "monday",
      planSlotKey: "monday:1",
      weekStart: "2026-01-12",
    });

    const result = findCompletedSessionForWorkout({
      completedSessions: [wrongType, wrongWeek, wrongDay, wrongSlot],
      workout,
      plan,
      weekStart: "2026-01-12",
    });
    expect(result).toBeNull();
  });

  it("matches by planSlotKey when session has one", () => {
    const workout = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([workout]);
    const session = makeSession({
      sessionId: "s1",
      workoutId: "DIFFERENT_ID", // workoutId does NOT match — should still match by slot
      type: "planned",
      plannedDayKey: "monday",
      planSlotKey: "monday:0",
      weekStart: "2026-01-12",
    });
    const result = findCompletedSessionForWorkout({
      completedSessions: [session],
      workout,
      plan,
      weekStart: "2026-01-12",
    });
    expect(result).toBe(session);
  });

  it("falls back to workoutId match when session has no planSlotKey", () => {
    const workout = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([workout]);
    const session = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "monday",
      planSlotKey: undefined,
      weekStart: "2026-01-12",
    });
    const result = findCompletedSessionForWorkout({
      completedSessions: [session],
      workout,
      plan,
      weekStart: "2026-01-12",
    });
    expect(result).toBe(session);
  });

  it("returns the most recent match when multiple match (sorts by completedAt desc)", () => {
    const workout = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([workout]);
    const earlier = makeSession({
      sessionId: "s-earlier",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "monday",
      planSlotKey: "monday:0",
      weekStart: "2026-01-12",
      completedAt: "2026-01-12T08:00:00.000Z",
    });
    const later = makeSession({
      sessionId: "s-later",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "monday",
      planSlotKey: "monday:0",
      weekStart: "2026-01-12",
      completedAt: "2026-01-12T18:00:00.000Z",
    });

    // Order in array is earlier-first; result must still be the later one.
    const result = findCompletedSessionForWorkout({
      completedSessions: [earlier, later],
      workout,
      plan,
      weekStart: "2026-01-12",
    });
    expect(result).toBe(later);
  });
});

// ============================================================================
// hasCompletedSessionForDay
// ============================================================================

describe("hasCompletedSessionForDay", () => {
  it("returns true when a planned session exists for the given dayKey + weekStart", () => {
    const session = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "monday",
      weekStart: "2026-01-12",
    });
    expect(
      hasCompletedSessionForDay({
        completedSessions: [session],
        dayKey: "monday",
        weekStart: "2026-01-12",
      }),
    ).toBe(true);
  });

  it("returns false when no session matches", () => {
    const session = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "monday",
      weekStart: "2026-01-12",
    });
    expect(
      hasCompletedSessionForDay({
        completedSessions: [session],
        dayKey: "tuesday",
        weekStart: "2026-01-12",
      }),
    ).toBe(false);
  });

  it("returns false for non-planned sessions (type !== 'planned')", () => {
    const session = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      type: "extra",
      plannedDayKey: "monday",
      weekStart: "2026-01-12",
    });
    expect(
      hasCompletedSessionForDay({
        completedSessions: [session],
        dayKey: "monday",
        weekStart: "2026-01-12",
      }),
    ).toBe(false);
  });

  it("returns false when weekStart does not match", () => {
    const session = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      type: "planned",
      plannedDayKey: "monday",
      weekStart: "2026-01-12",
    });
    expect(
      hasCompletedSessionForDay({
        completedSessions: [session],
        dayKey: "monday",
        weekStart: "2026-01-05",
      }),
    ).toBe(false);
  });
});

// ============================================================================
// getCompletedSessionsForDate
// ============================================================================

describe("getCompletedSessionsForDate", () => {
  it("returns sessions whose completedAt date matches the given date string", () => {
    const match = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      completedAt: "2026-01-15T10:00:00.000Z",
    });
    const other = makeSession({
      sessionId: "s2",
      workoutId: "w2",
      completedAt: "2026-01-14T10:00:00.000Z",
    });
    const result = getCompletedSessionsForDate([match, other], "2026-01-15");
    expect(result).toEqual([match]);
  });

  it("accepts a Date input as well as a string", () => {
    // Use a midday local timestamp so the local calendar date is unambiguous
    // regardless of the test machine's timezone offset.
    const localMidday = new Date(2026, 0, 15, 12, 0, 0);
    const localMiddayIso = localMidday.toISOString();
    const match = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      completedAt: localMiddayIso,
    });
    // Pass a Date object; matching is by local-date string.
    const result = getCompletedSessionsForDate([match], localMidday);
    expect(result).toEqual([match]);
  });

  it("returns an empty array when no session matches", () => {
    const s = makeSession({
      sessionId: "s1",
      workoutId: "w1",
      completedAt: "2026-01-15T10:00:00.000Z",
    });
    expect(getCompletedSessionsForDate([s], "2026-01-14")).toEqual([]);
  });

  it("defaults to today when value is undefined", () => {
    const todayStr = getLocalDateString(new Date());
    const todaySession = makeSession({
      sessionId: "s-today",
      workoutId: "w1",
      completedAt: new Date().toISOString(),
    });
    const yesterdaySession = makeSession({
      sessionId: "s-yesterday",
      workoutId: "w2",
      completedAt: "2020-01-01T10:00:00.000Z",
    });
    const result = getCompletedSessionsForDate(
      [todaySession, yesterdaySession],
      undefined,
    );
    // Must return the today session and match today's local date string.
    expect(result).toEqual([todaySession]);
    expect(getLocalDateString(new Date())).toBe(todayStr);
  });
});

// ============================================================================
// getPlanIdentityForWorkoutId
// ============================================================================

describe("getPlanIdentityForWorkoutId", () => {
  it("returns { plannedDayKey, planSlotKey } for a workout found in the plan", () => {
    const w0 = makeWorkout({ id: "w0", dayOfWeek: "Monday" });
    const w1 = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([w0, w1]);
    expect(getPlanIdentityForWorkoutId("w1", plan)).toEqual({
      plannedDayKey: "monday",
      planSlotKey: "monday:1",
    });
  });

  it("returns {} when workoutId is null", () => {
    const w = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([w]);
    expect(getPlanIdentityForWorkoutId(null, plan)).toEqual({});
  });

  it("returns {} when workoutId is undefined", () => {
    const w = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([w]);
    expect(getPlanIdentityForWorkoutId(undefined, plan)).toEqual({});
  });

  it("returns {} when plan is null", () => {
    expect(getPlanIdentityForWorkoutId("w1", null)).toEqual({});
  });

  it("returns {} when plan is undefined", () => {
    expect(getPlanIdentityForWorkoutId("w1", undefined)).toEqual({});
  });

  it("returns {} when plan has no workouts", () => {
    const plan = makePlan([]);
    expect(getPlanIdentityForWorkoutId("w1", plan)).toEqual({});
  });

  it("returns {} when workoutId is not found in plan", () => {
    const w = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([w]);
    expect(getPlanIdentityForWorkoutId("DOES_NOT_EXIST", plan)).toEqual({});
  });
});

// ============================================================================
// findPlanWorkoutBySessionIdentity
// ============================================================================

describe("findPlanWorkoutBySessionIdentity", () => {
  it("matches by planSlotKey first when present", () => {
    const w0 = makeWorkout({ id: "w0", dayOfWeek: "Monday" });
    const w1 = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([w0, w1]);
    const result = findPlanWorkoutBySessionIdentity({
      plan,
      workoutId: "WRONG_ID",
      plannedDayKey: "tuesday",
      planSlotKey: "monday:1",
    });
    expect(result).toBe(w1);
  });

  it("falls back to plannedDayKey + workoutId matching (same day, matching id)", () => {
    const w0 = makeWorkout({ id: "w0", dayOfWeek: "Monday" });
    const w1 = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([w0, w1]);
    const result = findPlanWorkoutBySessionIdentity({
      plan,
      workoutId: "w1",
      plannedDayKey: "monday",
      planSlotKey: null,
    });
    expect(result).toBe(w1);
  });

  it("returns the single same-day workout even without id match when only 1 workout on that day", () => {
    const only = makeWorkout({ id: "only-id", dayOfWeek: "Monday" });
    const tue = makeWorkout({ id: "tue-id", dayOfWeek: "Tuesday" });
    const plan = makePlan([only, tue]);
    const result = findPlanWorkoutBySessionIdentity({
      plan,
      workoutId: "DOES_NOT_MATCH",
      plannedDayKey: "monday",
      planSlotKey: null,
    });
    expect(result).toBe(only);
  });

  it("does NOT return a same-day workout without id match when multiple workouts share that day", () => {
    const w0 = makeWorkout({ id: "w0", dayOfWeek: "Monday" });
    const w1 = makeWorkout({ id: "w1", dayOfWeek: "Monday" });
    const plan = makePlan([w0, w1]);
    const result = findPlanWorkoutBySessionIdentity({
      plan,
      workoutId: "DOES_NOT_MATCH",
      plannedDayKey: "monday",
      planSlotKey: null,
    });
    // Falls through to the global id-only lookup, which also doesn't match.
    expect(result).toBeUndefined();
  });

  it("falls back to matching by workoutId alone (no day/slot info)", () => {
    const w0 = makeWorkout({ id: "w0", dayOfWeek: "Monday" });
    const w1 = makeWorkout({ id: "w1", dayOfWeek: "Tuesday" });
    const plan = makePlan([w0, w1]);
    const result = findPlanWorkoutBySessionIdentity({
      plan,
      workoutId: "w1",
      plannedDayKey: null,
      planSlotKey: null,
    });
    expect(result).toBe(w1);
  });

  it("returns undefined when plan is null", () => {
    expect(
      findPlanWorkoutBySessionIdentity({
        plan: null,
        workoutId: "w1",
        plannedDayKey: "monday",
        planSlotKey: "monday:0",
      }),
    ).toBeUndefined();
  });

  it("returns undefined when no match exists", () => {
    const w = makeWorkout({ id: "w0", dayOfWeek: "Monday" });
    const plan = makePlan([w]);
    expect(
      findPlanWorkoutBySessionIdentity({
        plan,
        workoutId: "NOPE",
        plannedDayKey: "friday",
        planSlotKey: "friday:0",
      }),
    ).toBeUndefined();
  });
});
