/**
 * SyncMutex - Mutex for Sync Coordination
 *
 * CURRENT ARCHITECTURE (as of this file's last audit):
 * - SyncEngine (src/services/SyncEngine.ts) acquires this mutex before running
 *   profile-data sync (personalInfo, dietPreferences, bodyAnalysis, etc.).
 * - src/services/offline/OfflineService.ts (this folder) also acquires this
 *   mutex before syncOfflineActions(). In production this instance is only
 *   consumed by DataBridge.ts and useTrackBIntegration.ts.
 *
 * KNOWN GAP:
 * `RealTimeSyncService` (formerly src/services/syncService.ts) no longer
 * exists in the codebase — do not assume this mutex coordinates it.
 * More importantly, the app's actual highest-traffic offline write path,
 * `src/services/offline.ts` (used by completionTracking.ts, crudOperations.ts,
 * fitnessStore.ts, nutritionStore.ts, hydrationStore.ts, offlineStore.ts and
 * useOffline.ts), is a completely separate module with its own local
 * `syncInProgress` boolean and is NOT wired into this mutex. This mutex
 * therefore does NOT protect that module from racing SyncEngine today.
 * Wiring `src/services/offline.ts` into this mutex (or documenting an
 * equivalent guarantee) is an open follow-up outside this file's scope.
 *
 * SOLUTION (for the engines that DO use it):
 * This mutex ensures only one sync operation runs at a time among callers
 * that acquire it.
 */

type ReleaseCallback = () => void;
type LockTicket = { operationName: string; resolve: () => void };

export class SyncMutex {
  private locked = false;
  private owner: string | null = null;
  // Bare waitForRelease() callers (no ownership claim) — just want to know the
  // lock state changed.
  private waitQueue: ReleaseCallback[] = [];
  // withLock() callers waiting their turn for ownership. Invariant: whenever
  // this is non-empty, `locked` is true (see release()'s handoff below).
  private lockQueue: LockTicket[] = [];

  isLocked(): boolean {
    return this.locked;
  }

  getOwner(): string | null {
    return this.owner;
  }

  tryAcquire(operationName: string): boolean {
    // Also refuse a "walk-up" acquire while withLock() waiters are queued —
    // otherwise a fresh caller could win the lock in the gap between release()
    // and a queued waiter's promise continuation running, starving whoever
    // has been waiting longest.
    if (this.locked || this.lockQueue.length > 0) {
      return false;
    }
    this.locked = true;
    this.owner = operationName;
    return true;
  }

  /**
   * Non-blocking lock attempt. Returns false immediately if lock is held.
   * Use withLock() for blocking mutual exclusion.
   */
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

    if (this.lockQueue.length > 0) {
      // Atomic handoff: grant ownership to the longest-waiting withLock()
      // caller BEFORE resolving its promise. `locked` stays true the whole
      // time — ownership transfers directly, it is never actually "open" for
      // a walk-up caller to steal in between.
      const next = this.lockQueue.shift()!;
      this.owner = next.operationName;
      next.resolve();
    } else {
      this.locked = false;
      this.owner = null;
    }

    // Best-effort notification for bare waitForRelease() callers, only once
    // the lock is genuinely free (no withLock waiter took it via handoff).
    if (!this.locked && this.waitQueue.length > 0) {
      const nextCallback = this.waitQueue.shift();
      nextCallback?.();
    }
  }

  forceRelease(): void {
    this.locked = false;
    this.owner = null;
    this.waitQueue = [];
    this.lockQueue = [];
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
    if (!this.tryAcquire(operationName)) {
      // Join the FIFO ticket queue rather than re-racing tryAcquire() in a
      // loop — release() hands ownership directly to the front ticket, so by
      // the time this promise resolves the lock is already ours.
      await new Promise<void>((resolve) => {
        this.lockQueue.push({ operationName, resolve });
      });
    }

    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

export const syncMutex = new SyncMutex();
