/**
 * Deterministic generate → complete → regenerate loop test (the E2E plan's
 * PRIMARY gate).
 *
 * Why this exists (see src/docs/E2E-VERIFICATION-PLAN.md steps 4 + 5):
 * On-device Maestro verification of the authenticated loop is fragile on
 * Windows (emulator DNS/firewall + the Expo dev-client's stale-bundle
 * caching, which blocked on-device diagnosis of the P0-4 crash). This test
 * is the durable, CI-runnable equivalent: it exercises the real
 * aiService.generateWorkout → completionTrackingService.completeWorkout →
 * aiService.generateWorkout(again) loop deterministically in Node, with the
 * network boundary (fitaiWorkersClient + supabase) mocked at the module
 * boundary — the same chainable-mock pattern already proven by
 * aiService.workout.integration.test.ts.
 *
 * It MUST FAIL if a plan doesn't appear after generate, if completion does
 * not record real (non-fabricated) calories, or if regeneration does not
 * produce a new plan. PASS = the loop logic is verified end-to-end.
 */
import { aiService } from "../../ai/index";
import { completionTrackingService } from "../../services/completionTracking";
import { useFitnessStore } from "../../stores/fitnessStore";

// --- Mock the worker client: return DISTINCT plans per call so we can prove
// regeneration produced a NEW plan (not a cached/duplicate). ---
let generateCallCount = 0;
const mockGenerateWorkoutPlan = jest.fn();

jest.mock("../../services/fitaiWorkersClient", () => ({
  fitaiWorkersClient: {
    generateWorkoutPlan: (...args: unknown[]) => mockGenerateWorkoutPlan(...args),
    testConnection: jest.fn(async () => ({ success: true, data: "ok" })),
  },
  AuthenticationError: class AuthenticationError extends Error {},
  WorkersAPIError: class WorkersAPIError extends Error {
    statusCode = 500;
  },
  NetworkError: class NetworkError extends Error {},
  isDietPlanResponse: () => false,
  isAsyncJobResponse: () => false,
}));

// --- Mock supabase: chainable query builder for completion insert +
// prior-performance fetch (first-time user → no history). Records inserts. ---
const insertedRows: any[] = [];
const mockFrom = jest.fn();
jest.mock("../../services/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: "test-token", user: { id: "user-loop-1" } } },
        error: null,
      }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

jest.mock("../../services/currentWeight", () => ({
  resolveCurrentWeight: () => ({ value: 82 }),
  resolveCurrentWeightFromStores: () => ({ value: 82 }),
  resolveCurrentWeightForUser: async () => ({ value: 82 }),
}));

jest.mock("../../services/WeightTrackingService", () => ({
  weightTrackingService: { getCurrentWeight: () => 82 },
}));

jest.mock("../../services/fitnessRefreshService", () => ({
  fitnessRefreshService: { refreshAfterWorkoutCompleted: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("../../services/analyticsData", () => ({
  analyticsDataService: { updateTodaysMetrics: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("../../services/offline", () => ({
  offlineService: { queueAction: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock("../../services/authUtils", () => ({
  getCurrentUserId: () => "user-loop-1",
}));

jest.mock("../../services/exerciseHistoryService", () => ({
  exerciseHistoryService: { getLastSession: jest.fn() },
}));

// Achievement store: completion calls updateCurrentStreak + reconcileWithCurrentData.
jest.mock("../../stores/achievementStore", () => ({
  useAchievementStore: Object.assign(jest.fn(), {
    getState: () => ({
      updateCurrentStreak: jest.fn(),
      reconcileWithCurrentData: jest.fn().mockResolvedValue(undefined),
    }),
  }),
}));

// Health data store: completion fire-and-forgets exportWorkoutToHealthConnect.
jest.mock("../../stores/healthDataStore", () => ({
  useHealthDataStore: Object.assign(jest.fn(), {
    getState: () => ({
      exportWorkoutToHealthConnect: jest.fn().mockResolvedValue(undefined),
      loadHealthMetricsHistory: jest.fn().mockResolvedValue(undefined),
    }),
  }),
}));

// --- Two distinct canned plans. generateWorkout returns workout[0] of a
// weekly plan; we vary the title/id so call N and call N+1 are observably
// different. ---
const makeWorkerResponse = (id: string, title: string) => ({
  success: true,
  data: {
    id: `weekly_${id}`,
    planTitle: title,
    planDescription: "Loop test plan",
    workouts: [
      {
        dayOfWeek: "monday",
        workout: {
          id,
          title,
          description: "Generated for loop test",
          totalDuration: 45,
          duration: 45,
          difficulty: "intermediate",
          estimatedCalories: 250,
          exercises: [
            { exerciseId: "squat", name: "Squat", sets: 3, reps: "10", restSeconds: 90 },
          ],
          warmup: [],
          cooldown: [],
          coachingTips: ["Keep core tight"],
          progressionNotes: "Add 5lb when easy",
        },
      },
    ],
    restDays: ["tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    totalEstimatedCalories: 250,
  },
  metadata: { cached: false, generationTime: 800 },
});

const PERSONAL_INFO = { age: 30, gender: "male", weight: 82, height: 178, activityLevel: "moderate" } as any;
const FITNESS_GOALS = { primary_goals: ["muscle_gain"], experience_level: "intermediate" } as any;
const PREFERENCES = {
  bodyMetrics: { height_cm: 178, current_weight_kg: 82 } as any,
  workoutPreferences: {
    workout_frequency_per_week: 3,
    activity_level: "moderate",
    intensity: "intermediate",
  } as any,
};

describe("generate → complete → regenerate loop (deterministic E2E gate)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    generateCallCount = 0;
    insertedRows.length = 0;

    // Chainable supabase mock: terminal .insert/.select resolves to data.
    mockFrom.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }), // no prior performance
              }),
            }),
          }),
        }),
      }),
      insert: (payload: any) => {
        insertedRows.push(Array.isArray(payload) ? payload[0] : payload);
        return {
          select: () => ({ single: async () => ({ data: { id: "session-row-1" }, error: null }) }),
        };
      },
    }));

    // Distinct plan per generate call → regeneration is observable.
    mockGenerateWorkoutPlan.mockImplementation(async () => {
      generateCallCount += 1;
      return generateCallCount === 1
        ? makeWorkerResponse("w_loop_1", "Loop Plan A")
        : makeWorkerResponse("w_loop_2", "Loop Plan B");
    });

    // Reset the fitness store to a clean state between tests.
    useFitnessStore.setState({
      weeklyWorkoutPlan: null,
      customWeeklyPlan: null,
      completedSessions: [],
      workoutProgress: {},
      currentWorkoutSession: null,
    } as any);
  });

  it("generates a real plan, completes it with real calories, then regenerates a NEW plan", async () => {
    // ── 1. GENERATE ──────────────────────────────────────────────
    // generateWeeklyWorkoutPlan transforms each weeklyData.workouts[].workout
    // via transformWorkoutData, which PRESERVES the workout title — so the
    // title is a reliable marker that a real, distinct plan appeared.
    const gen1 = await aiService.generateWeeklyWorkoutPlan(
      PERSONAL_INFO,
      FITNESS_GOALS,
      1, // weekNumber
      PREFERENCES,
    );
    expect(gen1.success).toBe(true);
    expect(gen1.data).toBeDefined();
    expect(gen1.data?.workouts.length).toBeGreaterThan(0);
    const workout1 = gen1.data!.workouts[0];
    expect(workout1.title).toBe("Loop Plan A");
    expect(workout1.id).toBeTruthy();
    expect(workout1.exercises?.length).toBeGreaterThan(0);
    const workout1Id = workout1.id;

    // Put the generated plan into the store (what the UI does on save).
    const plan1 = {
      databaseId: "plan-db-1",
      workouts: gen1.data!.workouts,
      restDays: gen1.data!.restDays,
    } as any;
    useFitnessStore.setState({ weeklyWorkoutPlan: plan1 } as any);

    // ── 2. COMPLETE ──────────────────────────────────────────────
    // completeWorkout reads the workout from the store, computes real MET
    // calories with the user's weight (82kg), records progress=100, and
    // inserts a workout_sessions row. Assert it records a REAL calorie number
    // (not fabricated, not undefined) and writes the DB row.
    // No sessionId → completion takes the canonical INSERT path (the primary
    // completion route for a freshly-generated plan), which our supabase mock
    // handles via .insert().select().single().
    const completed = await completionTrackingService.completeWorkout(
      workout1Id,
      { duration: 45, stats: { exercises: workout1.exercises! } },
      "user-loop-1",
    );
    expect(completed).toBe(true);

    // Store reflects completion: progress 100, real calories recorded.
    const progress = useFitnessStore.getState().workoutProgress[workout1Id];
    expect(progress).toBeDefined();
    expect(progress.progress).toBe(100);
    expect(progress.caloriesBurned).toBeDefined();
    expect(typeof progress.caloriesBurned).toBe("number");
    // Real MET calc for a 45-min squat workout at 82kg is a positive number —
    // NOT the pre-generation estimate (250) and NOT a fabricated fallback.
    expect(progress.caloriesBurned).toBeGreaterThan(0);
    expect(progress.caloriesBurned).not.toBe(250); // actual, not the estimate

    // DB row was inserted (the persistence layer received the completion).
    expect(insertedRows.length).toBeGreaterThanOrEqual(1);
    const row = insertedRows[0];
    expect(row.user_id).toBe("user-loop-1");
    expect(row.workout_id).toBe(workout1Id);

    // ── 3. REGENERATE ────────────────────────────────────────────
    const gen2 = await aiService.generateWeeklyWorkoutPlan(
      PERSONAL_INFO,
      FITNESS_GOALS,
      1,
      PREFERENCES,
    );
    expect(gen2.success).toBe(true);
    expect(gen2.data).toBeDefined();
    expect(gen2.data?.workouts.length).toBeGreaterThan(0);
    // Regeneration produced a DIFFERENT plan (new title).
    expect(gen2.data!.workouts[0].title).toBe("Loop Plan B");
    expect(gen2.data!.workouts[0].title).not.toBe(workout1.title);

    // The worker was called twice (generate + regenerate), proving the loop
    // actually re-invoked generation rather than returning a cached plan.
    expect(mockGenerateWorkoutPlan).toHaveBeenCalledTimes(2);
  }, 15000);
});
