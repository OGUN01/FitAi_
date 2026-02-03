/**
 * SyncMutex - Mutex for Dual Sync Engine Coordination
 *
 * SYNC ARCHITECTURE:
 * FitAI has two sync engines that can run independently:
 *
 * 1. SyncEngine (src/services/SyncEngine.ts)
 *    - Handles profile data sync (personalInfo, dietPreferences, bodyAnalysis, etc.)
 *    - Uses offline queue with AsyncStorage persistence
 *    - Triggers on auth state changes and network reconnection
 *
 * 2. RealTimeSyncService (src/services/syncService.ts)
 *    - Handles real-time sync for workout sessions, meal logs, weight logs, etc.
 *    - Provides bidirectional sync with conflict resolution
 *    - Runs on configurable intervals (default 30s)
 *
 * PROBLEM:
 * Without coordination, both engines can attempt to sync simultaneously,
 * causing race conditions when writing to shared AsyncStorage keys or
 * making overlapping Supabase requests.
 *
 * SOLUTION:
 * This mutex ensures only one sync operation runs at a time.
 * Both engines acquire the mutex before starting sync operations.
 */

type ReleaseCallback = () => void;

export class SyncMutex {
  private locked = false;
  private owner: string | null = null;
  private waitQueue: ReleaseCallback[] = [];

  isLocked(): boolean {
    return this.locked;
  }

  getOwner(): string | null {
    return this.owner;
  }

  tryAcquire(operationName: string): boolean {
    if (this.locked) {
      return false;
    }
    this.locked = true;
    this.owner = operationName;
    return true;
  }

  async acquire(operationName: string): Promise<boolean> {
    if (this.tryAcquire(operationName)) {
      return true;
    }
    return false;
  }

  release(): void {
    if (!this.locked) {
      return;
    }

    this.locked = false;
    this.owner = null;

    if (this.waitQueue.length > 0) {
      const nextCallback = this.waitQueue.shift();
      if (nextCallback) {
        nextCallback();
      }
    }
  }

  forceRelease(): void {
    this.locked = false;
    this.owner = null;
    this.waitQueue = [];
  }

  async waitForRelease(): Promise<void> {
    if (!this.locked) {
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  async withLock<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    while (!this.tryAcquire(operationName)) {
      await this.waitForRelease();
    }

    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

export const syncMutex = new SyncMutex();
