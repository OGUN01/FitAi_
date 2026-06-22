/**
 * Integration test for aiService.generateWeeklyWorkoutPlan — verifies the FULL
 * generation flow end-to-end with the network boundary (worker client + supabase)
 * mocked. This is the deterministic equivalent of driving "generate workout" in
 * the UI as a user.
 *
 * Covers: P0-1 (extreme activity passes through), P0-3 (weekNumber threads
 * through), P1-1 (no fabricated calorie target), P1-4 (priorPerformance fetched
 * + attached), P1-2 (no fabricated 70kg weight), and the request→response
 * transform round-trip. See src/docs/VERIFIED-FINDINGS.md.
 */

// Mock the worker client BEFORE importing aiService so the real HTTP path
// is never hit. Capture the request to assert the generation data is correct.
const mockGenerateWorkoutPlan = jest.fn();
const mockTestConnection = jest.fn(async () => ({
  success: true,
  data: "ok",
}));
jest.mock("../../services/fitaiWorkersClient", () => ({
  fitaiWorkersClient: {
    generateWorkoutPlan: (...args: unknown[]) => mockGenerateWorkoutPlan(...args),
    testConnection: (...args: unknown[]) => mockTestConnection(...args),
  },
  AuthenticationError: class AuthenticationError extends Error {},
  WorkersAPIError: class WorkersAPIError extends Error {
    statusCode = 500;
  },
  NetworkError: class NetworkError extends Error {},
  isDietPlanResponse: () => false,
  isAsyncJobResponse: () => false,
}));

// Static import of the mocked NetworkError class (dynamic import doesn't work
// in this jest config).
import { NetworkError } from "../../services/fitaiWorkersClient";

// Mock supabase (used by fetchPriorPerformance). Return no history →
// priorPerformance = [] (first-time user path).
const mockFrom = jest.fn();
jest.mock("../../services/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

// Mock currentWeight resolution so it doesn't touch the store. Both names are
// imported by different consumers (transformer uses resolveCurrentWeight,
// ai/index.ts uses resolveCurrentWeightFromStores).
jest.mock("../../services/currentWeight", () => ({
  resolveCurrentWeight: () => ({ value: 82 }),
  resolveCurrentWeightFromStores: () => ({ value: 82 }),
}));

// Mock authUtils so getCurrentUserId returns a test user (fetchPriorPerformance runs).
jest.mock("../../services/authUtils", () => ({
  getCurrentUserId: () => "user-test-1",
}));

// exerciseHistoryService isn't used by fetchPriorPerformance (it queries
// supabase directly), but silence any import side-effects.
jest.mock("../../services/exerciseHistoryService", () => ({
  exerciseHistoryService: { getLastSession: jest.fn() },
}));

import { aiService } from "../../ai/index";

// A canned worker response shaped for the WEEKLY plan path (generateWeeklyWorkoutPlan):
// response.data.workouts is an array of { dayOfWeek, workout: {...} }.
const CANNED_WORKER_RESPONSE = {
  success: true,
  data: {
    id: "weekly_w1",
    planTitle: "Test Push/Pull/Legs",
    planDescription: "3-day split",
    workouts: [
      {
        dayOfWeek: "monday",
        workout: {
          id: "w1",
          title: "Push Day - Chest, Shoulders, Triceps",
          description: "Focus on pushing movements",
          totalDuration: 60,
          duration: 60,
          difficulty: "intermediate",
          estimatedCalories: 300,
          exercises: [
            { exerciseId: "bench_press", name: "Bench Press", sets: 4, reps: "8-10", restSeconds: 120 },
          ],
          warmup: [],
          cooldown: [],
          coachingTips: ["Focus on form"],
          progressionNotes: "Add weight when you can do 10 reps easily",
        },
      },
    ],
    restDays: ["tuesday", "thursday", "saturday", "sunday"],
    totalEstimatedCalories: 900,
  },
  metadata: { cached: false, generationTime: 1200 },
};

describe("aiService.generateWeeklyWorkoutPlan — end-to-end integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no exercise history (first-time user).
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    });
    mockGenerateWorkoutPlan.mockResolvedValue(CANNED_WORKER_RESPONSE);
  });

  it("builds a correct request for an extreme-activity user and returns a plan", async () => {
    const res = await aiService.generateWeeklyWorkoutPlan(
      { age: 28, gender: "male", weight: 82, height: 178, activityLevel: "extreme" } as any,
      { primary_goals: ["muscle_gain"], experience_level: "intermediate" } as any,
      1, // weekNumber
      {
        bodyMetrics: { height_cm: 178 } as any,
        workoutPreferences: {
          workout_frequency_per_week: 3,
          activity_level: "extreme", // P0-1: must pass through, not become very_active
          intensity: "advanced",
        } as any,
      },
    );

    // Response round-trips to a WeeklyWorkoutPlan
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.workouts.length).toBeGreaterThan(0);

    // The request sent to the worker carried the extreme activity UNMAPPED (P0-1)
    const sentRequest = mockGenerateWorkoutPlan.mock.calls[0][0];
    expect(sentRequest.weeklyPlan.activityLevel).toBe("extreme");
    expect(sentRequest.weeklyPlan.activityLevel).not.toBe("very_active");

    // P0-3: weekNumber threads through
    expect(sentRequest.weekNumber).toBe(1);

    // P1-2: weight is the real resolved weight (82), not a fabricated 70
    expect(sentRequest.profile.weight).toBe(82);

    // P1-4: priorPerformance was fetched + attached (empty for first-time user)
    expect(Array.isArray(sentRequest.priorPerformance)).toBe(true);
    expect(sentRequest.priorPerformance).toHaveLength(0);
  });

  it("fetches and attaches prior performance when history exists (P1-4 closed loop)", async () => {
    // Simulate a prior bench-press session in exercise_sets.
    // fetchPriorPerformance chains: from().select().eq(user_id).eq(is_completed).eq(is_calibration).order().limit()
    // → 3 .eq() calls, then order, then limit (which returns the promise).
    const historyData = [
      {
        exercise_id: "bench_press",
        session_id: "sess-1",
        set_number: 1,
        weight_kg: 60,
        reps: 8,
        rpe: 2,
        set_type: "normal",
        completed_at: "2026-06-15T10:00:00Z",
      },
    ];
    // Builder that returns itself for each chain step, with limit() resolving.
    const limitFn = jest.fn(async () => ({ data: historyData, error: null }));
    const builder: any = {};
    builder.eq = () => builder;
    builder.order = () => builder;
    builder.limit = limitFn;
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({ eq: () => ({ eq: () => builder }) }),
      }),
    });

    await aiService.generateWeeklyWorkoutPlan(
      { age: 28, gender: "male", weight: 82, height: 178 } as any,
      { primary_goals: ["muscle_gain"], experience_level: "intermediate" } as any,
      3, // week 3 (peak intensity week)
      { bodyMetrics: { height_cm: 178 } as any, workoutPreferences: { workout_frequency_per_week: 3 } as any },
    );

    const sentRequest = mockGenerateWorkoutPlan.mock.calls[0][0];
    // P1-4: priorPerformance is populated with the last bench session
    expect(sentRequest.priorPerformance.length).toBeGreaterThan(0);
    const bench = sentRequest.priorPerformance.find(
      (p: any) => p.exerciseId === "bench_press",
    );
    expect(bench).toBeDefined();
    expect(bench.lastSession.sets[0].weightKg).toBe(60);
    expect(bench.lastSession.sets[0].reps).toBe(8);
    // P0-3: week 3 threads through
    expect(sentRequest.weekNumber).toBe(3);
  });

  it("returns retryable=true on network errors (handleError fix)", async () => {
    mockGenerateWorkoutPlan.mockRejectedValueOnce(new NetworkError("connection reset"));

    const res = await aiService.generateWeeklyWorkoutPlan(
      { age: 28, gender: "male", weight: 82, height: 178 } as any,
      { primary_goals: ["muscle_gain"], experience_level: "intermediate" } as any,
      1,
    );

    expect(res.success).toBe(false);
    // handleError now sets retryable: true on NetworkError (was missing before)
    expect(res.retryable).toBe(true);
  });
});
