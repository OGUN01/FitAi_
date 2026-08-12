/**
 * SyncMutex - Mutex for Sync Coordination
 *
 * CURRENT ARCHITECTURE:
 * - SyncEngine (src/services/SyncEngine.ts) acquires this mutex before running
 *   profile-data sync (personalInfo, dietPreferences, bodyAnalysis, etc.).
 * - src/services/offline.ts — the app's real offline write queue (used by
 *   completionTracking.ts, crudOperations.ts, fitnessStore.ts,
 *   nutritionStore.ts, hydrationStore.ts, offlineStore.ts, useOffline.ts,
 *   useTrackBIntegration.ts, DataBridge.ts) — also acquires this mutex
 *   before syncOfflineActions(), since its queue can contain writes to the
 *   same profile tables SyncEngine syncs.
 *
 * HISTORY: a parallel, dead offline-queue module used to live at
 * src/services/offline/ with zero production writers and its own
 * independent (also unwired) mutex acquisition; it was deleted after
 * confirming its only two "consumers" only ever read network status or a
 * permanently-empty queue. There is now exactly one offline write queue.
 *
 * SOLUTION:
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
    // Discarding lockQueue without resolving orphans any caller currently
    // awaiting its turn inside withLock() (line ~134) — that promise would
    // never settle, hanging the caller forever with no timeout. But resolving
    // every parked ticket at once would let all of them proceed into their
    // critical sections concurrently — exactly the race this mutex exists to
    // prevent. Instead, hand off to only the next-in-line ticket (the same
    // single-owner handoff release() performs) so at most one withLock()
    // caller ever holds the lock; the rest stay queued and will be handed
    // off in turn as each holder's `finally` calls release().
    if (this.lockQueue.length > 0) {
      const next = this.lockQueue.shift()!;
      this.locked = true;
      this.owner = next.operationName;
      next.resolve();
    } else {
      this.locked = false;
      this.owner = null;
    }

    const staleWaiters = this.waitQueue;
    this.waitQueue = [];
    staleWaiters.forEach((callback) => callback());
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
