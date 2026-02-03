/**
 * Tests for Optimistic Update Rollback
 *
 * When a sync fails after optimistic update, the local data should
 * revert to the original state and user should be notified.
 *
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Alert before importing module
const mockAlert = vi.fn();
vi.mock("react-native", () => ({
  Alert: {
    alert: mockAlert,
  },
}));

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock NetInfo
vi.mock("@react-native-community/netinfo", () => ({
  default: {
    fetch: vi.fn().mockResolvedValue({ isConnected: true }),
    addEventListener: vi.fn().mockReturnValue(vi.fn()),
  },
}));

// Mock supabase
const mockSupabaseFrom = vi.fn();
vi.mock("../../services/supabase", () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

describe("Optimistic Update Rollback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("optimisticUpdate with rollback", () => {
    it("should store original state before optimistic update", async () => {
      // Import fresh instance
      vi.resetModules();
      const { offlineService } = await import("../../services/offline");

      // Store existing data first
      const originalData = { id: "item-1", name: "Original", value: 100 };
      await offlineService.storeOfflineData("items_item-1", originalData);

      // Update with new data
      const newData = { name: "Updated", value: 200 };
      await offlineService.optimisticUpdate(
        "items",
        "item-1",
        newData,
        "user-1",
      );

      // Verify new data is stored
      const storedData = offlineService.getOfflineData("items_item-1");
      expect(storedData?.name).toBe("Updated");
      expect(storedData?.value).toBe(200);
    });

    it("should rollback to original state when sync fails", async () => {
      // Import fresh instance
      vi.resetModules();
      const { offlineService } = await import("../../services/offline");

      // Setup failing sync
      mockSupabaseFrom.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error("Network error") }),
      });

      // Store original data
      const originalData = { id: "item-1", name: "Original", value: 100 };
      await offlineService.storeOfflineData("items_item-1", originalData);

      // Perform optimistic update (this queues sync)
      const newData = { name: "Updated", value: 200 };
      await offlineService.optimisticUpdate(
        "items",
        "item-1",
        newData,
        "user-1",
      );

      // Wait for sync attempts to complete (with retries)
      await vi.advanceTimersByTimeAsync(30000);

      // After sync failure, data should be reverted
      const storedData = offlineService.getOfflineData("items_item-1");
      expect(storedData?.name).toBe("Original");
      expect(storedData?.value).toBe(100);
    });

    it("should notify user when rollback occurs", async () => {
      // Import fresh instance
      vi.resetModules();
      const { offlineService } = await import("../../services/offline");

      // Setup failing sync
      mockSupabaseFrom.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error("Network error") }),
      });

      // Store original data
      const originalData = { id: "item-1", name: "Original", value: 100 };
      await offlineService.storeOfflineData("items_item-1", originalData);

      // Perform optimistic update
      const newData = { name: "Updated", value: 200 };
      await offlineService.optimisticUpdate(
        "items",
        "item-1",
        newData,
        "user-1",
      );

      // Wait for sync attempts to complete
      await vi.advanceTimersByTimeAsync(30000);

      // User should be notified
      expect(mockAlert).toHaveBeenCalledWith(
        "Sync Failed",
        expect.stringContaining("reverted"),
      );
    });

    it("should not rollback if sync succeeds", async () => {
      // Import fresh instance
      vi.resetModules();
      const { offlineService } = await import("../../services/offline");

      // Setup successful sync
      mockSupabaseFrom.mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // Store original data
      const originalData = { id: "item-1", name: "Original", value: 100 };
      await offlineService.storeOfflineData("items_item-1", originalData);

      // Perform optimistic update
      const newData = { name: "Updated", value: 200 };
      await offlineService.optimisticUpdate(
        "items",
        "item-1",
        newData,
        "user-1",
      );

      // Wait for sync to complete
      await vi.advanceTimersByTimeAsync(5000);

      // Data should remain updated (not rolled back)
      const storedData = offlineService.getOfflineData("items_item-1");
      expect(storedData?.name).toBe("Updated");
      expect(storedData?.value).toBe(200);
    });

    it("should handle rollback for optimisticCreate on failure", async () => {
      // Import fresh instance
      vi.resetModules();
      const { offlineService } = await import("../../services/offline");

      // Setup failing sync
      mockSupabaseFrom.mockReturnValue({
        insert: vi
          .fn()
          .mockResolvedValue({ error: new Error("Network error") }),
      });

      // Perform optimistic create
      const newItem = { name: "New Item", value: 500 };
      const tempId = await offlineService.optimisticCreate(
        "items",
        newItem,
        "user-1",
      );

      // Verify data is stored optimistically
      const key = `items_${tempId}`;
      let storedData = offlineService.getOfflineData(key);
      expect(storedData?.name).toBe("New Item");

      // Wait for sync to fail
      await vi.advanceTimersByTimeAsync(30000);

      // After failure, created item should be removed (rolled back)
      storedData = offlineService.getOfflineData(key);
      expect(storedData).toBeNull();
    });

    it("should handle rollback for optimisticDelete on failure", async () => {
      // Import fresh instance
      vi.resetModules();
      const { offlineService } = await import("../../services/offline");

      // Setup failing sync
      mockSupabaseFrom.mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: new Error("Network error") }),
      });

      // Store original data
      const originalData = { id: "item-1", name: "To Delete", value: 100 };
      await offlineService.storeOfflineData("items_item-1", originalData);

      // Perform optimistic delete (removes local data immediately)
      await offlineService.optimisticDelete("items", "item-1", "user-1");

      // Verify data is deleted optimistically
      let storedData = offlineService.getOfflineData("items_item-1");
      expect(storedData).toBeNull();

      // Wait for sync to fail
      await vi.advanceTimersByTimeAsync(30000);

      // After failure, deleted item should be restored
      storedData = offlineService.getOfflineData("items_item-1");
      expect(storedData?.name).toBe("To Delete");
    });
  });
});
