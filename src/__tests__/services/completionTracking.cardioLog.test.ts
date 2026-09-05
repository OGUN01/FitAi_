import { createSupabaseMock, type SupabaseMock } from "../helpers/supabaseMock";

let mockSupabase: SupabaseMock;

jest.mock("../../services/supabase", () => ({
  get supabase() {
    return mockSupabase;
  },
}));

jest.mock("../../stores/fitnessStore", () => ({
  useFitnessStore: { getState: jest.fn(() => ({})) },
}));
jest.mock("../../stores/nutritionStore", () => ({
  useNutritionStore: { getState: jest.fn(() => ({})) },
}));

let mockBodyAnalysisWeight: number | undefined;
jest.mock("../../stores/profileStore", () => {
  const fn = jest.fn(() => ({}));
  (fn as any).getState = jest.fn(() => ({
    bodyAnalysis: { current_weight_kg: mockBodyAnalysisWeight },
  }));
  return { useProfileStore: fn };
});
jest.mock("../../stores/achievementStore", () => ({
  useAchievementStore: { getState: jest.fn(() => ({})) },
}));
jest.mock("../../services/crudOperations", () => ({ default: {} }));
jest.mock("../../services/nutritionRefreshService", () => ({
  nutritionRefreshService: {},
}));
jest.mock("../../services/fitnessRefreshService", () => ({
  fitnessRefreshService: {},
}));
jest.mock("../../services/calorieCalculator", () => ({
  calculateWorkoutCalories: jest.fn(),
}));
jest.mock("../../services/analyticsData", () => ({
  analyticsDataService: {},
}));

let mockResolvedWeight: number | null = null;
jest.mock("../../services/currentWeight", () => ({
  resolveCurrentWeightForUser: jest.fn(() =>
    Promise.resolve({ value: mockResolvedWeight }),
  ),
}));

let mockTrackedWeight: number | null = null;
jest.mock("../../services/WeightTrackingService", () => ({
  weightTrackingService: {
    getCurrentWeight: jest.fn(() => mockTrackedWeight),
  },
}));

const mockQueueAction = jest.fn();
jest.mock("../../services/offline", () => ({
  offlineService: { queueAction: (...args: any[]) => mockQueueAction(...args) },
}));

import { completionTrackingService } from "../../services/completionTracking";

describe("logCardioBlock", () => {
  beforeEach(() => {
    mockSupabase = createSupabaseMock();
    jest.clearAllMocks();
    mockBodyAnalysisWeight = undefined;
    mockResolvedWeight = null;
    mockTrackedWeight = null;
  });

  const baseBlock = {
    blockId: "cardio-1",
    name: "Treadmill Run",
    plannedDurationMinutes: 20,
    intensity: "moderate" as const,
  };

  it("does nothing when userId, sessionId, or blockId is missing", async () => {
    mockSupabase.from("workout_cardio_logs");

    await completionTrackingService.logCardioBlock("", "session-1", baseBlock);
    await completionTrackingService.logCardioBlock("user-1", "", baseBlock);
    await completionTrackingService.logCardioBlock("user-1", "session-1", {
      ...baseBlock,
      blockId: "",
    });

    expect(mockSupabase._tables["workout_cardio_logs"]?.insert).not.toHaveBeenCalled();
  });

  it("inserts a row using planned duration when no actual duration is given", async () => {
    mockTrackedWeight = 80;
    mockSupabase.from("workout_cardio_logs");
    mockSupabase._tables["workout_cardio_logs"]._resolve({ data: null, error: null });

    await completionTrackingService.logCardioBlock("user-1", "session-1", baseBlock);

    const insertCall = mockSupabase._tables["workout_cardio_logs"].insert;
    expect(insertCall).toHaveBeenCalledTimes(1);
    const row = insertCall.mock.calls[0][0];
    expect(row).toMatchObject({
      user_id: "user-1",
      session_id: "session-1",
      block_id: "cardio-1",
      name: "Treadmill Run",
      planned_duration_minutes: 20,
      actual_duration_minutes: null,
      intensity: "moderate",
      distance_km: null,
    });
    // 6.0 default MET (no override for "Treadmill Run") x 1.0 moderate modifier
    // x 80kg x (20/60)h = 160
    expect(row.calories_burned).toBe(160);
  });

  it("uses actual duration over planned when provided (CLAUDE.md #9)", async () => {
    mockTrackedWeight = 80;
    mockSupabase.from("workout_cardio_logs");
    mockSupabase._tables["workout_cardio_logs"]._resolve({ data: null, error: null });

    await completionTrackingService.logCardioBlock("user-1", "session-1", {
      ...baseBlock,
      actualDurationMinutes: 30,
    });

    const row = mockSupabase._tables["workout_cardio_logs"].insert.mock.calls[0][0];
    expect(row.actual_duration_minutes).toBe(30);
    // 6.0 x 1.0 x 80 x (30/60) = 240
    expect(row.calories_burned).toBe(240);
  });

  it("falls back to resolveCurrentWeightForUser when no live tracked weight exists", async () => {
    mockTrackedWeight = null;
    mockResolvedWeight = 70;
    mockSupabase.from("workout_cardio_logs");
    mockSupabase._tables["workout_cardio_logs"]._resolve({ data: null, error: null });

    await completionTrackingService.logCardioBlock("user-1", "session-1", baseBlock);

    const row = mockSupabase._tables["workout_cardio_logs"].insert.mock.calls[0][0];
    // 6.0 x 1.0 x 70 x (20/60) = 140
    expect(row.calories_burned).toBe(140);
  });

  it("leaves calories_burned null (never fabricated) when no weight can be resolved", async () => {
    mockTrackedWeight = null;
    mockResolvedWeight = null;
    mockSupabase.from("workout_cardio_logs");
    mockSupabase._tables["workout_cardio_logs"]._resolve({ data: null, error: null });
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    await completionTrackingService.logCardioBlock("user-1", "session-1", baseBlock);

    const row = mockSupabase._tables["workout_cardio_logs"].insert.mock.calls[0][0];
    expect(row.calories_burned).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("queues an offline retry when the insert fails, without throwing", async () => {
    mockTrackedWeight = 80;
    mockSupabase.from("workout_cardio_logs");
    mockSupabase._tables["workout_cardio_logs"]._resolve({
      data: null,
      error: { message: "network error" },
    });
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      completionTrackingService.logCardioBlock("user-1", "session-1", baseBlock),
    ).resolves.toBeUndefined();

    expect(mockQueueAction).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CREATE",
        table: "workout_cardio_logs",
        userId: "user-1",
      }),
    );
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
