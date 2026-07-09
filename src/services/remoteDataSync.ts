/**
 * RemoteDataSync — coordinates cross-device data fetch on sign-in.
 *
 * Subscribes to authEvents.SIGNED_IN and pulls all remote data in parallel so
 * the SSOT stores (profileStore, hydrationStore, fitnessStore, nutritionStore,
 * achievementStore) reflect the user's cloud state on a fresh device login.
 *
 * Why this exists: every store already had its own Supabase hydration method,
 * but nothing triggered them on auth state change. App-start hydration fired
 * before the session was restored and never retried, so a user logging in on
 * a new device saw empty name, water goal, workout history, and meal logs.
 */

import { authEvents } from "./authEvents";
import { dataBridge } from "./DataBridge";

let initialized = false;
let lastSyncedUserId: string | null = null;
let lastSyncedAt = 0;
let inFlight: Promise<void> | null = null;

// Suppress duplicate SIGNED_IN events (login() + supabase onAuthStateChange
// both fire within ~500ms). Within this window, treat as one sync.
const SYNC_DEDUP_WINDOW_MS = 10_000;

export function initRemoteDataSync(): void {
  if (initialized) return;
  initialized = true;

  authEvents.subscribe("SIGNED_IN", (event) => {
    const userId = event.data?.userId;
    if (!userId) return;
    const now = Date.now();
    const sameUserRecent =
      userId === lastSyncedUserId &&
      now - lastSyncedAt < SYNC_DEDUP_WINDOW_MS;
    if (sameUserRecent || inFlight) {
      return;
    }
    lastSyncedUserId = userId;
    lastSyncedAt = now;
    void syncAllRemoteData(userId);
  });

  authEvents.subscribe("SIGNED_OUT", () => {
    lastSyncedUserId = null;
    lastSyncedAt = 0;
    inFlight = null;
    dataBridge.setUserId(null);
  });
}

async function syncAllRemoteData(userId: string): Promise<void> {
  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    dataBridge.setUserId(userId);

    const [{ useHydrationStore }, { useFitnessStore }, { useNutritionStore }, { useAchievementStore }] =
      await Promise.all([
        import("../stores/hydrationStore"),
        import("../stores/fitnessStore"),
        import("../stores/nutritionStore"),
        import("../stores/achievementStore"),
      ]);

    // P0-9/P1-18: Revalidate entitlement on cross-device sign-in so a user
    // whose subscription was cancelled on another device does not retain
    // stale premium state. preserveExistingOnError:true keeps paying users
    // premium on transient network blips (combined with P2-12 boot default).
    const [{ useSubscriptionStore }] = await Promise.all([
      import("../stores/subscriptionStore"),
    ]);

    const results = await Promise.allSettled([
      dataBridge.loadAllData(userId, { forceRefresh: true }),
      useHydrationStore.getState().syncWithSupabase(),
      useFitnessStore.getState().loadData(),
      useNutritionStore.getState().loadData(),
      useAchievementStore.getState().loadFromSupabase(userId),
      useSubscriptionStore
        .getState()
        .fetchSubscriptionStatus({ preserveExistingOnError: true }),
    ]);

    const failures: number[] = [];
    results.forEach((r, i) => {
      if (r.status === "rejected") failures.push(i);
    });
    if (failures.length > 0) {
      console.error(
        `[RemoteDataSync] ${failures.length}/6 remote sync(s) failed for user ${userId}`,
        failures.map((i) => (results[i] as PromiseRejectedResult).reason),
      );
    }

    // P1-20: after loadFromSupabase (which migrates any guest-earned
    // achievements to the real userId via its offline-recovery push), also
    // push the full merged set to Supabase so guest-earned achievements
    // persist to the user's cloud record on the guest→user sign-in
    // transition. Fire-and-forget — failure here is logged inside
    // syncWithSupabase and retried on the next sync.
    useAchievementStore
      .getState()
      .syncWithSupabase(userId)
      .catch((err) => {
        console.error(
          "[RemoteDataSync] achievement syncWithSupabase (push) failed:",
          err,
        );
      });
  })();

  try {
    await inFlight;
  } finally {
    inFlight = null;
  }
}

export const remoteDataSync = { init: initRemoteDataSync };
export default remoteDataSync;
