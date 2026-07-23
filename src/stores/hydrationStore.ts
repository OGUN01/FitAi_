import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import { hydrationDataService } from "../services/hydrationData";
import { getLocalDateString } from "../utils/weekUtils";
import { offlineService } from "../services/offline";
import { getCurrentUserId } from "../services/authUtils";
import { trackAchievementActivity } from "./achievementStore";

/**
 * Returns the real authenticated user id, or null when the user is a guest /
 * not authenticated. Used to SKIP offline-queue sync for guests (matching the
 * pattern in nutritionStore.getSyncableUserId). Guest IDs ("guest-...") must
 * never reach Supabase writes — RLS rejects them and they pollute the retry
 * queue indefinitely.
 */
function getSyncableUserId(): string | null {
  const userId = getCurrentUserId();
  if (!userId) return null;
  if (userId.startsWith("guest")) return null;
  return userId;
}

/**
 * HYDRATION STORE - SINGLE SOURCE OF TRUTH
 *
 * This store is the ONLY place water intake should be tracked.
 * All screens (HomeScreen, DietScreen, DietScreenNew) MUST use this store.
 *
 * NO FALLBACKS - If data is missing, it means onboarding is incomplete.
 */

interface HydrationState {
  // Water intake in MILLILITERS (always ML, never liters)
  waterIntakeML: number;

  // Daily goal in MILLILITERS (set from calculatedMetrics.dailyWaterML)
  dailyGoalML: number | null;

  // True when the user has explicitly set a custom goal (via notifications/reminder edit).
  // When false, the goal was auto-seeded from calculatedMetrics and should update
  // whenever the user's profile (weight, activity) changes.
  isGoalUserSet: boolean;

  // Date tracking for daily reset
  lastResetDate: string; // ISO date string (YYYY-MM-DD)

  // Actions
  addWater: (amountML: number) => void;
  setWaterIntake: (amountML: number) => void;
  // setDailyGoal: explicit user override — marks isGoalUserSet = true
  setDailyGoal: (goalML: number) => void;
  // setDailyGoalFromMetrics: auto-update from calculatedMetrics — only applies when !isGoalUserSet
  setDailyGoalFromMetrics: (goalML: number) => void;
  resetDaily: () => void;
  checkAndResetIfNewDay: () => void;

  // Getters
  getProgress: () => number; // Returns 0-100
  getRemainingML: () => number;

  // Reset store (for logout)
  reset: () => void;

  // Sync with Supabase
  syncWithSupabase: () => Promise<void>;
}

const getTodayDateString = (): string => {
  return getLocalDateString();
};

// Module-level ref to cancel any pending Supabase retry timeout
let syncRetryTimeoutId: ReturnType<typeof setTimeout> | null = null;

// P1-hyd-3: re-entrancy guard so the post-reset re-sync cannot trigger an
// infinite loop. checkAndResetIfNewDay sets lastResetDate = today before
// syncing, so the sync's resulting set() cannot re-fire a reset — but we keep
// this flag so a sync triggered DURING another sync's await window is a no-op
// rather than a duplicate network call.
let isResyncingAfterReset = false;

// P1-hyd-3 race fix: if the user taps "add water" while a post-reset (or any)
// syncWithSupabase is in flight, the sync's `set({ waterIntakeML: remote })`
// would overwrite the optimistic local add. We accumulate any in-flight local
// adds here and re-apply them on top of the remote total when the sync
// resolves, so neither the add nor the remote value is lost.
let pendingAddML = 0;

/**
 * Queue a failed water intake insert for offline retry (P0-offline-water).
 *
 * `hydrationDataService.logWaterIntake` resolves with `{ success:false }` on
 * network/auth failure — previously those adds were silently dropped from
 * `water_logs` and then clobbered by the next `syncWithSupabase` readback,
 * losing offline hydration data. This mirrors the offline queueing already
 * used by nutritionStore (meal_logs) and fitnessStore (workout_sessions).
 *
 * Skipped for guests (RLS would reject "guest" ids on every retry and
 * pollute the offline queue — the local optimistic add still applies).
 */
function queueWaterLogForOffline(amountML: number): void {
  const userId = getSyncableUserId();
  if (!userId) return; // Guest or unauthenticated: local add already applied.

  offlineService
    .queueAction({
      type: "CREATE",
      table: "water_logs",
      data: {
        user_id: userId,
        date: getLocalDateString(),
        amount_ml: amountML,
        logged_at: new Date().toISOString(),
      },
      userId,
      maxRetries: 3,
    })
    .catch((qErr) =>
      console.error(
        "[HydrationStore] Failed to queue offline water log:",
        qErr,
      ),
    );
}

export const useHydrationStore = create<HydrationState>()(
  persist(
    (set, get) => ({
      // Initial state
      waterIntakeML: 0,
      dailyGoalML: null, // Must be set from calculatedMetrics
      isGoalUserSet: false,
      lastResetDate: getTodayDateString(),

      // Add water (main action for UI buttons)
      addWater: (amountML: number) => {
        // Check if we need to reset for a new day first
        get().checkAndResetIfNewDay();

        // Re-read after reset so today's intake is always based on today's store state.
        const state = get();

        // P1-hyd-2 FIX: Previously this SILENTLY clamped at 150% of the daily
        // goal (`Math.min(newIntake, maxIntake)`). A 4L-drinker would hit an
        // invisible ceiling, subsequent adds were swallowed locally, while the
        // Supabase water_logs row STILL inserted the full amount — so cloud and
        // local diverged, and the next syncWithSupabase then overwrote local
        // with the uncapped remote total, making the displayed intake jump.
        //
        // Now we log the REAL amount both locally and to Supabase so the two
        // can never diverge. A very high sanity cap (10L = medically
        // implausible for a single add) guards against a buggy caller passing
        // an absurd value, but it only WARNS — it does not silently drop.
        const SANITY_CAP_ML = 10000; // 10L single-add guard
        let addAmountML = amountML;
        if (amountML > SANITY_CAP_ML) {
          console.warn(
            `[HydrationStore] addWater received implausibly large amount (${amountML}ml). Capping at ${SANITY_CAP_ML}ml.`,
          );
          addAmountML = SANITY_CAP_ML;
        }
        if (addAmountML <= 0) return;

        const newIntake = state.waterIntakeML + addAmountML;
        set({ waterIntakeML: newIntake });

        // P0-10 (Wave D): fire the water-goal-hit achievement tracker at the
        // exact threshold-crossing moment — only when the goal was NOT yet met
        // before this add and IS met after (dailyGoalML > 0). This prevents
        // re-firing on every subsequent add past the goal (overshoot), while
        // still firing once when the user first reaches their daily water goal.
        // Mirrors the trackAchievementActivity.mealLogged pattern in
        // completionTracking.ts:651 — fire-and-forget + try/catch so an
        // achievement-eval failure can never block or revert the water add.
        // Guests are skipped via getSyncableUserId (guest IDs would never
        // reach cloud achievement writes and checkProgress short-circuits on
        // falsy userId anyway).
        if (
          state.dailyGoalML &&
          state.dailyGoalML > 0 &&
          state.waterIntakeML < state.dailyGoalML &&
          newIntake >= state.dailyGoalML
        ) {
          const achievementUserId = getSyncableUserId();
          if (achievementUserId) {
            try {
              trackAchievementActivity.waterGoalHit(achievementUserId, {
                amount: newIntake,
                goal: state.dailyGoalML,
                goalsHit: 1,
              });
            } catch (achievementError) {
              console.error(
                "⚠️ Failed to track water-goal achievement:",
                achievementError,
              );
            }
          }
        }

        // Record the add so a concurrent syncWithSupabase can preserve it (see
        // pendingAddML comment above). Cleared once the sync reconciles.
        pendingAddML += addAmountML;

        // Sync to Supabase in background (fire and forget). The SAME amount
        // added locally is inserted into water_logs so remote total stays in
        // sync with the displayed local value.
        //
        // P0-offline-water FIX: logWaterIntake RESOLVES with { success:false }
        // on network/auth failure (it never rejects), so a bare `.catch` never
        // fired — offline adds silently failed to reach water_logs and were
        // then overwritten by the next syncWithSupabase remote readback. Now
        // we inspect the result and queue the insert for offline retry, the
        // same pattern nutritionStore/fitnessStore use for their Supabase
        // writes. Guests are skipped (RLS would reject guest ids on every
        // retry and pollute the queue — the local optimistic add still holds).
        hydrationDataService
          .logWaterIntake(addAmountML)
          .then((result) => {
            if (result.success) return;
            console.error(
              "[HydrationStore] logWaterIntake returned non-success, queuing for offline retry:",
              result.error,
            );
            queueWaterLogForOffline(addAmountML);
          })
          .catch((err) => {
            console.error(
              "[HydrationStore] Failed to sync water intake to Supabase, queuing for offline retry:",
              err,
            );
            queueWaterLogForOffline(addAmountML);
          });
      },

      // Set exact water intake (for manual adjustment)
      setWaterIntake: (amountML: number) => {
        set({ waterIntakeML: Math.max(0, amountML) });
      },

      // Set daily goal — explicit user override (e.g. from water reminder settings)
      // Marks isGoalUserSet = true so auto-updates from metrics don't overwrite it.
      setDailyGoal: (goalML: number) => {
        if (!goalML || goalML <= 0) return;
        set({ dailyGoalML: goalML, isGoalUserSet: true });
      },

      // Set daily goal from calculatedMetrics — only applies when user hasn't set a custom goal.
      // This keeps the goal in sync with profile changes (weight, activity level) automatically.
      setDailyGoalFromMetrics: (goalML: number) => {
        if (!goalML || goalML <= 0) return;
        const { isGoalUserSet } = get();
        if (!isGoalUserSet) {
          set({ dailyGoalML: goalML });
        }
      },

      // Manual reset (for testing/debugging)
      resetDaily: () => {
        // Cancel any pending retry timeout to prevent stale data overwriting the reset
        if (syncRetryTimeoutId !== null) {
          clearTimeout(syncRetryTimeoutId);
          syncRetryTimeoutId = null;
        }
        set({
          waterIntakeML: 0,
          lastResetDate: getTodayDateString(),
        });
      },

      // Auto-reset check - call this on app open or screen mount
      checkAndResetIfNewDay: () => {
        const today = getTodayDateString();
        const state = get();

        if (state.lastResetDate !== today) {
          // It's a new day - reset water intake
          set({
            waterIntakeML: 0,
            lastResetDate: today,
          });

          // P1-hyd-3 FIX: After zeroing local, re-sync from Supabase so a user
          // who already logged water today on ANOTHER device sees the real
          // total instead of 0ml until the next explicit sync. lastResetDate
          // is already set to today, so the sync's set() cannot re-fire a
          // reset (and the isResyncingAfterReset guard prevents a duplicate
          // network call if two mounts race). Failures are logged but never
          // block the reset — local is already at 0 which is the safe default.
          if (!isResyncingAfterReset) {
            isResyncingAfterReset = true;
            get()
              .syncWithSupabase()
              .catch((err) => {
                console.error(
                  "[HydrationStore] Post-reset re-sync failed:",
                  err instanceof Error ? err.message : err,
                );
              })
              .finally(() => {
                isResyncingAfterReset = false;
              });
          }
        }
      },

      // Get progress as percentage (0-100)
      getProgress: () => {
        const state = get();
        if (!state.dailyGoalML || state.dailyGoalML === 0) {
          return 0; // No goal set = 0% progress
        }
        return Math.min(
          100,
          Math.round((state.waterIntakeML / state.dailyGoalML) * 100),
        );
      },

      // Get remaining water needed in ML
      getRemainingML: () => {
        const state = get();
        if (!state.dailyGoalML) {
          return 0;
        }
        return Math.max(0, state.dailyGoalML - state.waterIntakeML);
      },

      // Reset store to initial state (for logout)
      reset: () => {
        // Cancel any pending Supabase retry so it cannot fire AFTER logout and
        // re-inject the previous user's water total into the just-reset store
        // (cross-user data leak). resetDaily() already does this; reset() must
        // mirror it because clearUserData calls reset(), not resetDaily().
        if (syncRetryTimeoutId !== null) {
          clearTimeout(syncRetryTimeoutId);
          syncRetryTimeoutId = null;
        }
        // Clear the in-flight add accumulator so the previous user's pending
        // adds are not re-applied on top of the next user's remote total during
        // syncWithSupabase reconciliation (reconciled = total_ml + pendingAddML).
        pendingAddML = 0;
        set({
          waterIntakeML: 0,
          dailyGoalML: null,
          isGoalUserSet: false,
          lastResetDate: getTodayDateString(),
        });
      },

      // Sync with Supabase - call on app start to reconcile local with remote
      syncWithSupabase: async () => {
        try {
          const result = await hydrationDataService.syncHydrationWithSupabase();
          if (result.success) {
            // Supabase is authoritative, BUT re-apply any adds that happened
            // while this sync's await was in flight (see pendingAddML). Without
            // this, a user who tapped "add water" during the post-reset re-sync
            // would have their optimistic add overwritten by the remote total.
            const reconciled = result.total_ml + pendingAddML;
            pendingAddML = 0;
            set({ waterIntakeML: reconciled });
          }
        } catch (error) {
          console.error(
            "[HydrationStore] Sync failed:",
            error instanceof Error ? error.message : error,
          );
          // Retry once after a short delay — store the timeout ID so resetDaily() can cancel it
          syncRetryTimeoutId = setTimeout(async () => {
            syncRetryTimeoutId = null;
            try {
              const retryResult =
                await hydrationDataService.syncHydrationWithSupabase();
              if (retryResult.success) {
                const reconciled = retryResult.total_ml + pendingAddML;
                pendingAddML = 0;
                set({ waterIntakeML: reconciled });
              }
            } catch (retryError) {
              console.error(
                "[HydrationStore] Sync retry also failed:",
                retryError instanceof Error ? retryError.message : retryError,
              );
            }
          }, 3000);
        }
      },
    }),
    {
      name: "fitai-hydration-storage",
      storage: createDebouncedStorage(),
      // Only persist these fields
      partialize: (state) => ({
        waterIntakeML: state.waterIntakeML,
        dailyGoalML: state.dailyGoalML,
        isGoalUserSet: state.isGoalUserSet,
        lastResetDate: state.lastResetDate,
      }),
      // After AsyncStorage rehydrates, check if it's a new day and reset if needed
      onRehydrateStorage: () => (state) => {
        state?.checkAndResetIfNewDay?.();
      },
    },
  ),
);
