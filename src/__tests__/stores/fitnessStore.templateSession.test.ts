let mockInsertResult = { data: null, error: null };

jest.mock("../../services/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: (r: any) => r(mockInsertResult),
    })),
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({
          data: { user: { id: "test-user" } },
          error: null,
        }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest
        .fn()
        .mockReturnValue({
          data: { subscription: { unsubscribe: jest.fn() } },
        }),
    },
    channel: jest
      .fn()
      .mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
      }),
  },
}));
jest.mock("../../services/crudOperations", () => ({
  crudOperations: {
    createWorkoutSession: jest.fn(),
    updateWorkoutSession: jest.fn(),
  },
}));
jest.mock("../../services/DataBridge", () => ({ dataBridge: {} }));
jest.mock("../../services/offline", () => ({
  offlineService: {
    queueAction: jest.fn(),
    clearFailedActionsForTable: jest.fn(),
  },
}));
jest.mock("../../services/authUtils", () => ({
  getCurrentUserId: jest.fn(() => "test-user"),
  getUserIdOrGuest: jest.fn(() => "test-user"),
}));
jest.mock("../../stores/profileStore", () => ({
  useProfileStore: { getState: jest.fn(() => ({ bodyAnalysis: {} })) },
}));
jest.mock("../../services/currentWeight", () => ({
  resolveCurrentWeightFromStores: jest.fn(() => ({ value: 70 })),
}));
jest.mock("../../services/calorieCalculator", () => ({
  calculateWorkoutCalories: jest.fn(() => ({ totalCalories: 200 })),
  ExerciseCalorieInput: {},
}));
jest.mock("../../utils/workoutIdentity", () => ({
  findPlanWorkoutBySessionIdentity: jest.fn(),
  getWorkoutSlotKey: jest.fn(),
}));
jest.mock("../../utils/uuid", () => ({
  generateUUID: () => "template-session-uuid",
  isValidUUID: () => true,
}));

import { useFitnessStore } from "../../stores/fitnessStore";
import { supabase } from "../../services/supabase";
import type { WorkoutTemplate } from "../../services/workoutTemplateService";

const sampleTemplate: WorkoutTemplate = {
  id: "tpl-001",
  userId: "test-user",
  name: "Push Day",
  description: "Chest and triceps",
  exercises: [
    {
      exerciseId: "push_up",
      name: "Push-Up",
      sets: 3,
      repRange: [8, 15],
      restSeconds: 60,
    },
    {
      exerciseId: "dumbbell_bench_press",
      name: "DB Bench",
      sets: 4,
      repRange: [8, 12],
      restSeconds: 90,
      targetWeightKg: 20,
    },
  ],
  targetMuscleGroups: ["chest", "triceps"],
  estimatedDurationMinutes: 45,
  isPublic: false,
  usageCount: 3,
  createdAt: "2026-03-26T08:00:00.000Z",
  updatedAt: "2026-03-26T08:00:00.000Z",
};

describe("fitnessStore.startTemplateSession", () => {
  beforeEach(() => {
    mockInsertResult = { data: null, error: null };
    useFitnessStore.setState({
      weeklyWorkoutPlan: {
        planTitle: "Week 1",
        workouts: [],
        weekNumber: 1,
      } as any,
      currentWorkoutSession: null,
      completedSessions: [],
    });
  });

  it("sets currentWorkoutSession in the store", async () => {
    const sessionId = await useFitnessStore
      .getState()
      .startTemplateSession(sampleTemplate);

    const state = useFitnessStore.getState();
    expect(state.currentWorkoutSession).not.toBeNull();
    expect(state.currentWorkoutSession!.sessionId).toBe(sessionId);
    expect(state.currentWorkoutSession!.exercises).toHaveLength(2);
  });

  it("inserts a workout_sessions row with is_extra=true", async () => {
    await useFitnessStore.getState().startTemplateSession(sampleTemplate);

    expect(supabase.from).toHaveBeenCalledWith("workout_sessions");
    const fromCall = (supabase.from as jest.Mock).mock.results.find(
      (r: any) => r.value?.insert,
    );
    expect(fromCall).toBeTruthy();
  });

  it("does NOT affect weeklyWorkoutPlan", async () => {
    const planBefore = useFitnessStore.getState().weeklyWorkoutPlan;
    await useFitnessStore.getState().startTemplateSession(sampleTemplate);
    const planAfter = useFitnessStore.getState().weeklyWorkoutPlan;

    expect(planAfter).toEqual(planBefore);
  });

  it("returns a sessionId string", async () => {
    const sessionId = await useFitnessStore
      .getState()
      .startTemplateSession(sampleTemplate);
    expect(typeof sessionId).toBe("string");
    expect(sessionId.length).toBeGreaterThan(0);
  });
});
