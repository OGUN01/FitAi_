jest.mock("../../services/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      then: (r: any) => r({ data: [], error: null }),
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
    createWorkoutSession: jest.fn().mockResolvedValue(undefined),
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
jest.mock("../../stores/profileStore", () => {
  const state = { bodyAnalysis: {} };
  const fn = jest.fn(() => state);
  (fn as any).getState = jest.fn(() => state);
  return { useProfileStore: fn };
});
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

import { useFitnessStore } from "../../stores/fitnessStore";

describe("fitnessStore cardio blocks (Workout Engine v2 Phase 4B.2)", () => {
  describe("startWorkoutSession", () => {
    it("seeds cardioBlocks from workout.cardioBlocks", async () => {
      const workout = {
        id: "workout-1",
        dayOfWeek: "Monday",
        title: "Full Body",
        exercises: [
          { exerciseId: "squat", sets: 3, reps: 8, weight: 60, restTime: 90 },
        ],
        cardioBlocks: [
          {
            id: "cardio-1",
            kind: "cardio" as const,
            name: "Treadmill",
            durationMinutes: 20,
            intensity: "moderate" as const,
            distanceKm: 3.5,
          },
        ],
      } as any;

      await useFitnessStore.getState().startWorkoutSession(workout);

      const session = useFitnessStore.getState().currentWorkoutSession;
      expect(session?.cardioBlocks).toHaveLength(1);
      expect(session?.cardioBlocks?.[0]).toMatchObject({
        blockId: "cardio-1",
        name: "Treadmill",
        plannedDurationMinutes: 20,
        intensity: "moderate",
        distanceKm: 3.5,
        completed: false,
      });
    });

    it("seeds an empty cardioBlocks array when the workout has none", async () => {
      const workout = {
        id: "workout-2",
        dayOfWeek: "Tuesday",
        title: "Upper Body",
        exercises: [
          { exerciseId: "bench_press", sets: 3, reps: 8, weight: 60, restTime: 90 },
        ],
      } as any;

      await useFitnessStore.getState().startWorkoutSession(workout);

      const session = useFitnessStore.getState().currentWorkoutSession;
      expect(session?.cardioBlocks).toEqual([]);
    });
  });

  describe("updateCardioBlock", () => {
    beforeEach(() => {
      useFitnessStore.setState({
        currentWorkoutSession: {
          workoutId: "workout-1",
          sessionId: "session-1",
          startedAt: "2026-03-26T10:00:00.000Z",
          exercises: [],
          cardioBlocks: [
            {
              blockId: "cardio-1",
              name: "Treadmill",
              plannedDurationMinutes: 20,
              intensity: "moderate",
              completed: false,
            },
            {
              blockId: "cardio-2",
              name: "Rowing",
              plannedDurationMinutes: 15,
              intensity: "high",
              completed: false,
            },
          ],
        } as any,
      });
    });

    it("marks the matching block completed by blockId, leaving others untouched", () => {
      useFitnessStore.getState().updateCardioBlock("cardio-1", {
        completed: true,
        actualDurationMinutes: 25,
      });

      const blocks = useFitnessStore.getState().currentWorkoutSession?.cardioBlocks;
      expect(blocks?.[0]).toMatchObject({
        blockId: "cardio-1",
        completed: true,
        actualDurationMinutes: 25,
      });
      expect(blocks?.[1]).toMatchObject({
        blockId: "cardio-2",
        completed: false,
      });
    });

    it("preserves the existing actualDurationMinutes when none is passed", () => {
      useFitnessStore.getState().updateCardioBlock("cardio-1", {
        completed: true,
        actualDurationMinutes: 25,
      });
      useFitnessStore.getState().updateCardioBlock("cardio-1", { completed: true });

      const block = useFitnessStore
        .getState()
        .currentWorkoutSession?.cardioBlocks?.find((b) => b.blockId === "cardio-1");
      expect(block?.actualDurationMinutes).toBe(25);
    });

    it("is a no-op when there is no currentWorkoutSession", () => {
      useFitnessStore.setState({ currentWorkoutSession: undefined as any });

      expect(() =>
        useFitnessStore.getState().updateCardioBlock("cardio-1", { completed: true }),
      ).not.toThrow();
      expect(useFitnessStore.getState().currentWorkoutSession).toBeUndefined();
    });

    it("is a no-op when the blockId does not match any cardio block", () => {
      useFitnessStore.getState().updateCardioBlock("nonexistent", { completed: true });

      const blocks = useFitnessStore.getState().currentWorkoutSession?.cardioBlocks;
      expect(blocks?.every((b) => b.completed === false)).toBe(true);
    });
  });
});
