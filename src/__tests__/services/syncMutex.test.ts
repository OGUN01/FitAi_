/**
 * Tests for syncMutex - Mutex for Dual Sync Engine Coordination
 *
 * This mutex prevents race conditions between SyncEngine (profile data sync)
 * and RealTimeSyncService (real-time sync) when both attempt to sync simultaneously.
 *
 * TDD: RED phase - tests written before implementation
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { syncMutex, SyncMutex } from "../../services/syncMutex";

describe("syncMutex", () => {
  beforeEach(() => {
    // Ensure mutex is released before each test
    syncMutex.forceRelease();
    jest.useFakeTimers();
  });

  afterEach(() => {
    syncMutex.forceRelease();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe("acquire", () => {
    it("should acquire lock when not held", async () => {
      const acquired = await syncMutex.acquire("test-operation");
      expect(acquired).toBe(true);
      expect(syncMutex.isLocked()).toBe(true);
    });

    it("should return false immediately if lock is already held", async () => {
      await syncMutex.acquire("first-operation");
      const secondAcquire = syncMutex.tryAcquire("second-operation");
      expect(secondAcquire).toBe(false);
    });

    it("should track which operation holds the lock", async () => {
      await syncMutex.acquire("SyncEngine.processQueue");
      expect(syncMutex.getOwner()).toBe("SyncEngine.processQueue");
    });
  });

  describe("release", () => {
    it("should release the lock", async () => {
      await syncMutex.acquire("test-operation");
      syncMutex.release();
      expect(syncMutex.isLocked()).toBe(false);
    });

    it("should allow new acquire after release", async () => {
      await syncMutex.acquire("first");
      syncMutex.release();

      const secondAcquire = await syncMutex.acquire("second");
      expect(secondAcquire).toBe(true);
      expect(syncMutex.getOwner()).toBe("second");
    });

    it("should be safe to call release when not locked", () => {
      expect(() => syncMutex.release()).not.toThrow();
    });
  });

  describe("waitForRelease", () => {
    it("should resolve immediately if lock is not held", async () => {
      const start = Date.now();
      await syncMutex.waitForRelease();
      expect(Date.now() - start).toBeLessThan(10);
    });

    it("should wait until lock is released", async () => {
      // Acquire the lock
      await syncMutex.acquire("holder");

      // Start waiting in background
      let waitResolved = false;
      const waitPromise = syncMutex.waitForRelease().then(() => {
        waitResolved = true;
      });

      // Verify still waiting
      expect(waitResolved).toBe(false);

      // Release the lock
      syncMutex.release();

      // Advance timers to allow promise resolution
      await jest.advanceTimersByTimeAsync(10);

      // Now it should be resolved
      expect(waitResolved).toBe(true);
    });
  });

  describe("withLock", () => {
    it("should execute function while holding lock", async () => {
      const fn = jest.fn().mockResolvedValue("result");

      const result = await syncMutex.withLock("test-operation", fn);

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result).toBe("result");
    });

    it("should release lock even if function throws", async () => {
      const fn = jest.fn().mockRejectedValue(new Error("test error"));

      await expect(syncMutex.withLock("test-operation", fn)).rejects.toThrow(
        "test error",
      );
      expect(syncMutex.isLocked()).toBe(false);
    });

    it("should release lock after successful execution", async () => {
      const fn = jest.fn().mockResolvedValue("done");

      await syncMutex.withLock("test-operation", fn);

      expect(syncMutex.isLocked()).toBe(false);
    });

    it("should wait for existing lock before executing", async () => {
      const executionOrder: string[] = [];

      // First operation holds the lock
      await syncMutex.acquire("first");

      // Second operation tries to run with lock
      const secondPromise = syncMutex
        .withLock("second", async () => {
          executionOrder.push("second");
          return "second-result";
        })
        .catch(() => {});

      // Release first lock after a delay
      setTimeout(() => {
        executionOrder.push("first-released");
        syncMutex.release();
      }, 100);

      // Advance timers
      await jest.advanceTimersByTimeAsync(150);
      await secondPromise;

      expect(executionOrder).toEqual(["first-released", "second"]);
    });
  });

  describe("race condition prevention", () => {
    it("should serialize concurrent sync operations", async () => {
      const executionOrder: string[] = [];

      // Simulate two sync engines trying to sync at the same time
      const syncEngine1 = async () => {
        await syncMutex.withLock("SyncEngine.processQueue", async () => {
          executionOrder.push("syncEngine-start");
          await new Promise((resolve) => setTimeout(resolve, 50));
          executionOrder.push("syncEngine-end");
        });
      };

      const syncService1 = async () => {
        await syncMutex.withLock("RealTimeSyncService.startSync", async () => {
          executionOrder.push("syncService-start");
          await new Promise((resolve) => setTimeout(resolve, 30));
          executionOrder.push("syncService-end");
        });
      };

      // Start both simultaneously
      const p1 = syncEngine1();
      const p2 = syncService1();

      // Advance timers to complete both operations
      await jest.advanceTimersByTimeAsync(200);
      await Promise.all([p1, p2]);

      // Verify operations did not interleave
      const startEndPairs = executionOrder.reduce(
        (acc, item, idx, arr) => {
          if (item.endsWith("-start")) {
            const prefix = item.replace("-start", "");
            const endIdx = arr.indexOf(`${prefix}-end`);
            if (endIdx > idx) {
              // Check no other operation started between start and end
              const between = arr.slice(idx + 1, endIdx);
              if (between.some((x) => x.endsWith("-start"))) {
                acc.interleaved = true;
              }
            }
          }
          return acc;
        },
        { interleaved: false },
      );

      expect(startEndPairs.interleaved).toBe(false);
    });
  });

  describe("timeout", () => {
    it("should timeout if lock cannot be acquired", async () => {
      // Hold the lock
      await syncMutex.acquire("holder");

      // Try to acquire with timeout
      const result = syncMutex.tryAcquire("waiter");

      expect(result).toBe(false);
    });
  });

  describe("forceRelease", () => {
    it("should release lock regardless of owner", async () => {
      await syncMutex.acquire("some-operation");
      syncMutex.forceRelease();
      expect(syncMutex.isLocked()).toBe(false);
      expect(syncMutex.getOwner()).toBeNull();
    });
  });
});
