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
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      }),
      getSession: jest
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    channel: jest.fn().mockReturnValue({
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
  generateUUID: () => "mesocycle-test-uuid",
  isValidUUID: () => true,
}));

import { useFitnessStore } from "../../stores/fitnessStore";

describe("fitnessStore mesocycle tracking", () => {
  beforeEach(() => {
    useFitnessStore.setState({
      mesocycleStartDate: null,
      weeklyWorkoutPlan: null,
      completedSessions: [],
      currentWorkoutSession: null,
    });
  });

  describe("mesocycleStartDate state", () => {
    it("defaults to null", () => {
      useFitnessStore.setState({ mesocycleStartDate: null });
      const state = useFitnessStore.getState();
      expect(state.mesocycleStartDate).toBeNull();
    });

    it("can be set via setMesocycleStartDate", () => {
      const date = "2026-03-01T00:00:00.000Z";
      useFitnessStore.getState().setMesocycleStartDate(date);
      expect(useFitnessStore.getState().mesocycleStartDate).toBe(date);
    });
  });

  describe("getMesocycleWeek (computed)", () => {
    it("returns 0 when mesocycleStartDate is null", () => {
      useFitnessStore.setState({ mesocycleStartDate: null });
      const week = useFitnessStore.getState().getMesocycleWeek();
      expect(week).toBe(0);
    });

    it("returns 1 during the first week", () => {
      const now = new Date();
      useFitnessStore.setState({
        mesocycleStartDate: now.toISOString(),
      });
      const week = useFitnessStore.getState().getMesocycleWeek();
      expect(week).toBe(1);
    });

    it("returns 2 after 7 days", () => {
      const eightDaysAgo = new Date(
        Date.now() - 8 * 24 * 60 * 60 * 1000,
      ).toISOString();
      useFitnessStore.setState({ mesocycleStartDate: eightDaysAgo });
      const week = useFitnessStore.getState().getMesocycleWeek();
      expect(week).toBe(2);
    });

    it("returns 5 after ~30 days", () => {
      const thirtyDaysAgo = new Date(
        Date.now() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString();
      useFitnessStore.setState({ mesocycleStartDate: thirtyDaysAgo });
      const week = useFitnessStore.getState().getMesocycleWeek();
      expect(week).toBe(5);
    });
  });

  describe("reset resets mesocycleStartDate", () => {
    it("clears mesocycleStartDate on reset", () => {
      useFitnessStore.setState({ mesocycleStartDate: "2026-03-01" });
      useFitnessStore.getState().reset();
      expect(useFitnessStore.getState().mesocycleStartDate).toBeNull();
    });
  });
});
