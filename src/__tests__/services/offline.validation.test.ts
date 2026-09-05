import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock supabase BEFORE importing offlineService
const mockInsert = jest.fn();
const mockUpsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockFrom = jest.fn();

jest.mock("../../services/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock("@react-native-community/netinfo", () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(),
}));

// Import after mocks are set up
import { offlineService } from "../../services/offline";
import { supabase } from "../../services/supabase";

describe("OfflineService - Supabase Response Validation", () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    mockFrom.mockReturnValue({
      insert: mockInsert,
      upsert: mockUpsert,
      update: mockUpdate,
      delete: mockDelete,
    });

    (supabase.from as jest.Mock).mockImplementation(mockFrom);

    mockInsert.mockResolvedValue({ data: [{ id: "123" }], error: null });
    // exercise_sets/water_logs/workout_cardio_logs/saved_meals (plus the
    // pre-existing workout_sessions/meal_logs) go through executeAction's
    // upsert-on-id branch, not a plain insert — see offline.ts.
    mockUpsert.mockResolvedValue({ data: [{ id: "123" }], error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ data: [{ id: "123" }], error: null });

    await offlineService.clearOfflineData();
    (offlineService as any).isOnline = false;
    (offlineService as any).syncInProgress = false;
  });

  describe("CREATE operations", () => {
    it("should handle valid CREATE response", async () => {
      mockInsert.mockResolvedValue({
        data: [{ id: "123", name: "Test" }],
        error: null,
      });

      await offlineService.queueAction({
        type: "CREATE",
        table: "workouts",
        data: { name: "Test Workout" },
        userId: "user-123",
        maxRetries: 3,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.success).toBe(true);
      expect(result.syncedActions).toBe(1);
      expect(result.failedActions).toBe(0);
    });

    it("should handle CREATE response with error object", async () => {
      mockInsert.mockResolvedValue({
        data: null,
        error: { message: "Database error", code: "PGRST116" },
      });

      await offlineService.queueAction({
        type: "CREATE",
        table: "workouts",
        data: { name: "Test Workout" },
        userId: "user-123",
        maxRetries: 1,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.failedActions).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Database error");
    });

    it("should handle CREATE response with undefined error field", async () => {
      mockInsert.mockResolvedValue({
        data: [{ id: "123" }],
      } as any);

      await offlineService.queueAction({
        type: "CREATE",
        table: "workouts",
        data: { name: "Test Workout" },
        userId: "user-123",
        maxRetries: 3,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.success).toBe(true);
      expect(result.syncedActions).toBe(1);
    });

    it("should handle malformed CREATE response (null response)", async () => {
      mockInsert.mockResolvedValue(null as any);

      await offlineService.queueAction({
        type: "CREATE",
        table: "workouts",
        data: { name: "Test Workout" },
        userId: "user-123",
        maxRetries: 1,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.failedActions).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("malformed");
    });

    it("should handle CREATE response with wrong type (string instead of object)", async () => {
      mockInsert.mockResolvedValue("invalid response" as any);

      await offlineService.queueAction({
        type: "CREATE",
        table: "workouts",
        data: { name: "Test Workout" },
        userId: "user-123",
        maxRetries: 1,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.failedActions).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("malformed");
    });

    // BUG FIX regression test: a non-retryable Postgres error (FK/unique/
    // check violation, RLS denial) used to retry up to maxRetries times
    // per sync call, and — worse — stayed in the queue retrying across
    // FURTHER sync cycles (which may not happen again for a long time)
    // until retryCount finally reached maxRetries. It must now fail fast:
    // a single sync call purges it immediately, with mockInsert called
    // only ONCE (no wasted retries within the call), even though
    // maxRetries is set high enough that the old behavior would have kept
    // retrying.
    it("purges a non-retryable error (foreign key violation) immediately, without retrying", async () => {
      // exercise_sets CREATE goes through executeAction's upsert-on-id
      // branch (idempotency fix — see offline.ts), not a plain insert.
      mockUpsert.mockResolvedValue({
        data: null,
        error: {
          message: 'insert or update on table "exercise_sets" violates foreign key constraint "exercise_sets_session_id_fkey"',
          code: "23503",
        },
      });

      await offlineService.queueAction({
        type: "CREATE",
        table: "exercise_sets",
        data: { id: "set-1", session_id: "does-not-exist" },
        userId: "user-123",
        maxRetries: 3,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.failedActions).toBe(1);
      expect(result.errors[0]).toContain("foreign key constraint");
      // Fails fast: exactly one attempt, not the full 3-attempt inner retry
      // loop that a retryable error would have gone through.
      expect(mockUpsert).toHaveBeenCalledTimes(1);

      // Purged, not left in the queue for a future sync to retry again.
      (offlineService as any).isOnline = true;
      const secondResult = await offlineService.syncOfflineActions();
      expect(secondResult.failedActions).toBe(0);
      expect(secondResult.syncedActions).toBe(0);
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("UPDATE operations", () => {
    it("should handle valid UPDATE response", async () => {
      mockEq.mockResolvedValue({
        data: [{ id: "123", name: "Updated" }],
        error: null,
      });

      await offlineService.queueAction({
        type: "UPDATE",
        table: "workouts",
        data: { id: "123", name: "Updated Workout" },
        userId: "user-123",
        maxRetries: 3,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.success).toBe(true);
      expect(result.syncedActions).toBe(1);
    });

    it("should handle UPDATE response with error", async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: "Record not found", code: "PGRST116" },
      });

      await offlineService.queueAction({
        type: "UPDATE",
        table: "workouts",
        data: { id: "999", name: "Non-existent" },
        userId: "user-123",
        maxRetries: 1,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.failedActions).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Record not found");
    });

    it("should handle malformed UPDATE response", async () => {
      mockEq.mockResolvedValue(undefined as any);

      await offlineService.queueAction({
        type: "UPDATE",
        table: "workouts",
        data: { id: "123", name: "Test" },
        userId: "user-123",
        maxRetries: 1,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.failedActions).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("malformed");
    });
  });

  describe("DELETE operations", () => {
    it("should handle valid DELETE response", async () => {
      mockEq.mockResolvedValue({
        data: [{ id: "123" }],
        error: null,
      });

      await offlineService.queueAction({
        type: "DELETE",
        table: "workouts",
        data: { id: "123" },
        userId: "user-123",
        maxRetries: 3,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.success).toBe(true);
      expect(result.syncedActions).toBe(1);
    });

    it("should handle DELETE response with error", async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: "Permission denied", code: "PGRST301" },
      });

      await offlineService.queueAction({
        type: "DELETE",
        table: "workouts",
        data: { id: "123" },
        userId: "user-123",
        maxRetries: 1,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.failedActions).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Permission denied");
    });

    it("should handle malformed DELETE response (array instead of object)", async () => {
      mockEq.mockResolvedValue(["invalid"] as any);

      await offlineService.queueAction({
        type: "DELETE",
        table: "workouts",
        data: { id: "123" },
        userId: "user-123",
        maxRetries: 1,
      });

      (offlineService as any).isOnline = true;
      const result = await offlineService.syncOfflineActions();

      expect(result.failedActions).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("malformed");
    });
  });

  describe("Validation logging", () => {
    it("should log validation failures for debugging", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockInsert.mockResolvedValue(null as any);

      await offlineService.queueAction({
        type: "CREATE",
        table: "workouts",
        data: { name: "Test" },
        userId: "user-123",
        maxRetries: 1,
      });

      (offlineService as any).isOnline = true;
      await offlineService.syncOfflineActions();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("malformed"),
      );

      consoleSpy.mockRestore();
    });

    it("should include context in validation error logs", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      mockEq.mockResolvedValue("string response" as any);

      await offlineService.queueAction({
        type: "UPDATE",
        table: "specific_table",
        data: { id: "456", field: "value" },
        userId: "user-123",
        maxRetries: 1,
      });

      (offlineService as any).isOnline = true;
      await offlineService.syncOfflineActions();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("specific_table"),
      );

      consoleSpy.mockRestore();
    });
  });
});
