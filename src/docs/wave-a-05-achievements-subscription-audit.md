# Wave A-05 — Achievements + Subscription Data-Integrity Audit

**Agent:** Wave A code-only (audit, no fixes).
**Date:** 2026-06-23.
**Scope:** `useWorkoutAchievements`, `achievementStore`, `achievementData`, `completionTracking` (achievement→completion pipeline), `subscriptionStore`, `usePaywall`, `PaywallModal`, `RazorpayService`, `SubscriptionManagement`, `PremiumGate`/`PremiumBadge`, `authUtils`, `clearUserData`, `remoteDataSync`.
**Method:** Read/Grep/Glob only (per spec line 99 — code-review-graph MCP disabled for this goal). No device, no source edits, no commits.

---

## Summary of top findings (by severity)

| # | Sev | Issue | Where |
|---|-----|-------|-------|
| F1 | **P0** | `initRemoteDataSync()` is never called → SIGNED_IN cross-device sync (incl. `achievementStore.loadFromSupabase`) is dead. Achievements never hydrate from cloud on login. | `src/services/remoteDataSync.ts:26` (defined, 0 callers) |
| F2 | **P0** | Subscription store never bootstraps on auth login. `initializeSubscription()` has 0 callers; `fetchSubscriptionStatus()` only runs when PaywallModal/SubscriptionManagement mounts or after a purchase. A fresh-login user appears free until they open the paywall. | `src/stores/subscriptionStore.ts:450` |
| F3 | **P0** | Meal/water/social achievement trackers are dead code — `trackAchievementActivity.{mealLogged,waterGoalHit,dailyUsage,socialInteraction,customActivity}` have ZERO callers. Meal completion (`completeMeal`) never fires `checkProgress`. Nutrition/streak achievements only update retroactively via `reconcileWithCurrentData`, which runs ONLY on workout completion. | `src/stores/achievementStore.ts:1066-1123` (dead exports); `src/services/completionTracking.ts:461-692` (no achievement call) |
| F4 | **P1** | `useHomeLogic` useEffect loop risk: deps `[user?.id, achievementsInitialized, initializeAchievements]`. `initialize()` sets `isInitialized=true` → effect re-fires. Currently safe only because `initialize()` early-returns when already initialized, but the dep on the boolean it mutates is a latent footgun. | `src/hooks/useHomeLogic.ts:198-201` |
| F5 | **P1** | Entitlement drift: `isPremium()` reads persisted `subscriptionStatus`/`currentPlan`/`currentPeriodEnd` from AsyncStorage with NO server revalidation on app start. A user who cancels on another device, or whose webhook fires server-side, stays "premium" locally until they open the paywall. `isPremium()` even comments it trusts persisted state "before isInitialized". | `src/stores/subscriptionStore.ts:471-485` |
| F6 | **P1** | `usePaywall` useEffect deps `[plans.length]` — if server returns 0 plans it falls back to `FALLBACK_PLANS` (length 3), so it won't refetch on retry. Worse, the `fetchPlans` closure captures nothing reactive, so a stale network failure locks fallback plans for the session. | `src/hooks/usePaywall.ts:160-194` |
| F7 | **P1** | `AchievementsScreen` useEffect deps `[user?.id, guestId, initialize]` calls `initialize(userId)` on every user-id change. `initialize` is a stable Zustand action so this is safe, BUT it passes `guestId || "guest"` — and `checkProgress`/`loadFromSupabase` both early-return for guest prefixes, so a guest user can never see cloud-merged achievements and a guest→user transition doesn't re-merge (only `remoteDataSync` would, which is dead — F1). | `src/screens/main/AchievementsScreen.tsx:54-57` |
| F8 | **P2** | Silent failure in `achievementData.loadUserAchievements`: on Supabase error returns an **empty Map** (not the local map), and `loadFromSupabase` treats `cloudAchievements.size > 0` as the merge gate. So a network error wipes any chance of merge and silently keeps stale local state — no user-visible signal. (Error IS logged via `console.error`, so Principle 5 is satisfied, but the data outcome is a silent no-op.) | `src/services/achievementData.ts:116-119` + `src/stores/achievementStore.ts:735` |
| F9 | **P2** | `PaywallModal` hardcodes `TIER_FEATURES` map (free/basic/pro feature lists) in the component, duplicating the server-owned `subscription_plans` feature columns. Feature copy can drift from the DB. | `src/components/subscription/PaywallModal.tsx:22-41` |
| F10 | **P2** | `subscriptionStore.fetchSubscriptionStatus` on error wipes to FREE features (`preserveExistingOnError=false` default). A transient network blip during app start flips a paying user to free-tier UI until next successful fetch. The `canUseFeature` gate then blocks them. | `src/stores/subscriptionStore.ts:427-447` |
| F11 | **P2** | `useWorkoutAchievements` useEffect deps `[showCelebration, celebrationAchievement, showAchievementNotification]`. `showAchievementNotification` is a `useCallback` with stable dep `[achievementToastAnim]` (a useState ref, stable), so currently safe. But `recentAchievements` is appended inside this effect via `setRecentAchievements((prev) => [...prev, celebrationAchievement])` — this does NOT re-trigger the effect (separate state), so OK. Flagging as low-risk latent: if anyone adds `recentAchievements` to deps it loops. | `src/hooks/useWorkoutAchievements.ts:72-82` |
| F12 | **P3** | RLS gap (now closed) + stale-code risk: original `subscriptions_insert_own`/`update_own` and `feature_usage_insert_own`/`update_own` policies were correctly dropped in `20260319000001` and replaced with service_role-only. **Verified clean.** No remaining gap. Documented for completeness. | `supabase/migrations/20260319000001_harden_subscription_security_and_public_config.sql:13-26` |
| F13 | **P3** | `user_achievements` RLS present (`auth.uid() = user_id` FOR ALL). `subscription_plans` RLS present (public read active). `webhook_events` RLS present (service_role only). All achievement/subscription tables pass RLS sanity. | `supabase/migrations/20260124000001_add_missing_data_tables.sql:543-544`, `20260220000001` |

---

## Detailed findings

### F1 (P0) — `initRemoteDataSync()` is dead code; achievements never hydrate on login

**File:** `src/services/remoteDataSync.ts:26` (`export function initRemoteDataSync()`), `src/services/remoteDataSync.ts:96` (`export const remoteDataSync = { init: initRemoteDataSync }`).

**Evidence:** Grep for `initRemoteDataSync|remoteDataSync\.init` across `src/**/*.{ts,tsx}` returns only the two definition lines — zero call sites.

**Root cause:** The module was written to subscribe to `authEvents.SIGNED_IN` and run `syncAllRemoteData(userId)`, which calls `useAchievementStore.getState().loadFromSupabase(userId)` (line 74) plus fitness/nutrition/hydration loads. But `init()` is never invoked at app boot. The subscription is never registered, so `authEvents.emit("SIGNED_IN", …)` (fired from `authStore.setUser`/`login`/`register`/`signInWithGoogle`) fires into nothing.

**Impact:** A user logging in on a new device sees locally-cached or empty achievements until they navigate to a screen that lazily calls `initialize()` (Home via `useHomeLogic`, Analytics, or Achievements). `loadFromSupabase` (the cloud merge) is only called inside `initialize()` as a fire-and-forget after local init — so even then it runs, but the dedicated cross-device sync path is dead. Cloud-unlocked achievements can be missing for an entire session.

**Fix:** Call `remoteDataSync.init()` once during app bootstrap (e.g. in `AsyncInitializer` or the root `App.tsx`/`AppContainer` setup, after `authStore.initialize()`). One-line wiring.

---

### F2 (P0) — Subscription store never bootstraps on auth login

**File:** `src/stores/subscriptionStore.ts:450` (`initializeSubscription`), `src/stores/subscriptionStore.ts:458` (calls `fetchSubscriptionStatus`).

**Evidence:** Grep `initializeSubscription\(|\.initializeSubscription` returns only the definition + an internal comment. `fetchSubscriptionStatus` is called only from: `SubscriptionManagement.tsx:164,229` (cancel/resume handlers), `subscriptionStore.ts:458,468` (inside `initializeSubscription`/`refreshUsage` — both uncalled), `usePaywall.ts:302` (after purchase).

**Root cause:** `subscriptionStore` is persisted via Zustand `persist` middleware, so on app start it rehydrates from AsyncStorage (`currentPlan`, `subscriptionStatus`, `currentPeriodEnd`). But nothing triggers a server revalidation on SIGNED_IN. The store is absent from `remoteDataSync.syncAllRemoteData`'s `Promise.allSettled` list (line 69-75) — only hydration/fitness/nutrition/achievement are synced, not subscription.

**Impact (entitlement drift, F5 made worse):** A user who logs in fresh sees their *persisted* (possibly stale) tier. If they cancelled on the web between sessions, or the Razorpay webhook fired server-side, the local store still says "active/pro" until they open the paywall. `isPremium()` (line 471) and `canUseFeature` (line 487) both trust this stale state. `isInitialized` is `false` until a fetch succeeds — but `canUseFeature` returns `false` when `!isInitialized` (line 492), so a fresh-login user is **blocked from all premium features** until they open the paywall (the only path that calls `fetchSubscriptionStatus` outside of purchase). Worst case: paying user, fresh login, blocked.

**Fix:** (a) Add `useSubscriptionStore.getState().fetchSubscriptionStatus({ preserveExistingOnError: true })` to `syncAllRemoteData`'s `Promise.allSettled` (after F1 wiring). (b) Or call `initializeSubscription()` from `remoteDataSync` / app boot. Must use `preserveExistingOnError: true` to avoid F10.

---

### F3 (P0) — Meal/water/social achievement trackers are dead code; meals never trigger achievements

**Files:**
- `src/stores/achievementStore.ts:1066-1123` — `trackAchievementActivity.mealLogged`, `.waterGoalHit`, `.dailyUsage`, `.socialInteraction`, `.customActivity`.
- `src/services/completionTracking.ts:461-692` — `completeMeal`.

**Evidence:** Grep `trackAchievementActivity\.(mealLogged|waterGoalHit|dailyUsage|socialInteraction|customActivity)` across `src/**/*.{ts,tsx}` → **No matches found.** Only `trackAchievementActivity.workoutCompleted` is called (from `useWorkoutAchievements.trackWorkoutCompletion`, line 189).

`completeMeal` (completionTracking.ts:461) emits a `CompletionEvent` and writes `meal_logs` + `analytics_metrics`, but never calls `trackAchievementActivity.mealLogged` or `useAchievementStore.getState().checkProgress`. Compare `completeWorkout` (line 393-398) which calls `updateCurrentStreak()` + `reconcileWithCurrentData(userId)`.

**Root cause:** The live meal-completion path was never wired to the achievement engine. The only place nutrition/streak/water achievements get evaluated is `reconcileWithCurrentData` (achievementStore.ts:809), which scans `nutritionStore.mealProgress` retroactively — but `reconcileWithCurrentData` is only invoked from `completeWorkout` (completionTracking.ts:397) and `initialize` (achievementStore.ts:420). So a user who only logs meals (no workouts) never advances "Log N meals" / "Hydration goal" / streak achievements until their next workout.

**Impact:** Nutrition/streak/water achievements are frozen for diet-only users. Achievements like "Log 50 meals" silently never progress. This is a data-integrity violation of the "store is the runtime source" + "no silent loss" principles — the activity happened, the engine never heard.

**Fix:** In `completionTracking.completeMeal`, after the successful Supabase insert + store update, call `trackAchievementActivity.mealLogged(currentUserId, { totalLogs: ..., calories: meal.totalCalories, ... })` (mirrors the workout path). Also wire `trackAchievementActivity.waterGoalHit` from `hydrationStore`/`useNutritionTracking` when the daily water goal is hit, and `trackAchievementActivity.dailyUsage` from the streak updater. Remove the dead exports if not used, or wire them.

---

### F4 (P1) — `useHomeLogic` useEffect dep on the boolean it mutates

**File:** `src/hooks/useHomeLogic.ts:198-201`.

```ts
initializeAchievements(user.id).catch(...);
}, [user?.id, achievementsInitialized, initializeAchievements]);
```

**Root cause:** `initializeAchievements` (=`useAchievementStore.initialize`) sets `isInitialized: true` on success. The effect depends on `achievementsInitialized` (=`isInitialized`), so the effect re-fires immediately after the first successful init. It's currently safe only because `initialize()` early-returns when `state.isInitialized && initializedAchievementUserId === userId` (achievementStore.ts:331-336). But the dep is semantically wrong — it expresses "re-run when initialization state changes", which is the loop pattern CLAUDE.md Principle 10 warns about.

**Fix:** Drop `achievementsInitialized` from the deps (it's a guard, not a trigger). Keep `[user?.id, initializeAchievements]`. Add a `useRef` guard if re-entrancy protection is desired.

---

### F5 (P1) — Entitlement drift: `isPremium()` trusts persisted local state with no server revalidation on boot

**File:** `src/stores/subscriptionStore.ts:471-485`.

```ts
isPremium: () => {
  const { subscriptionStatus, currentPlan, currentPeriodEnd } = get();
  if (currentPeriodEnd && new Date(currentPeriodEnd) < new Date()) return false;
  // Use persisted state even before isInitialized to avoid flash of free-tier UI.
  return (subscriptionStatus === "active" || === "authenticated")
    && (currentPlan?.tier === "basic" || === "pro");
}
```

**Root cause:** Combined with F2 (no boot fetch), `isPremium()` reads AsyncStorage-persisted state. The `currentPeriodEnd` past-date guard is good defense-in-depth, but a user whose subscription is cancelled server-side with a *future* `current_period_end` (Razorpay "cancelled but access continues") will still show premium locally — correct in that case. The real drift: a user who cancels with immediate effect on another device, or whose `subscriptions` row is deleted/halted by a webhook, has stale local `subscriptionStatus: "active"` until a fetch overwrites it. Since no fetch runs on boot/login (F2), the drift persists for the whole session.

**Impact:** User appears premium locally but is not server-side. `canUseFeature` grants unlimited AI/scans. Razorpay server-side enforcement (worker) would still reject actual premium API calls, so the user hits confusing "403" errors while the UI says they're premium.

**Fix:** Wire F2 (fetch on SIGNED_IN). Additionally, consider a periodic background revalidation (e.g. on app foreground via `AppState` listener) so a long-running session catches mid-session cancellations.

---

### F6 (P1) — `usePaywall` plan-fetch deps + stale fallback lock-in

**File:** `src/hooks/usePaywall.ts:160-194`.

**Root cause:** Effect deps `[plans.length]`. If `loadPlansFromServer` returns `source: "fallback"` (network error or empty), `setPlans(FALLBACK_PLANS)` sets length 3 → effect won't refetch (guard `if (plans.length > 0) return`). The user is stuck with fallback pricing for the session even if network recovers. Also, the early-return guard means opening the paywall a second time in the same session never retries.

**Fix:** Use a `useRef<boolean>` "loadedSuccessfully" flag set only when `source === "server"`, and gate refetch on that (not on `plans.length`). Or refetch on every modal open if `plansSource !== "server"`.

---

### F7 (P1) — Guest achievements never merge from cloud; guest→user transition gap

**File:** `src/screens/main/AchievementsScreen.tsx:54-57`, `src/stores/achievementStore.ts:441-486` (`checkProgress` guest guard), `src/services/achievementData.ts:31,79,106` (guest skip).

**Root cause:** `checkProgress` and all `achievementDataService` methods early-return for `userId.startsWith("guest") || === "local-user"`. This is correct (guests shouldn't write to Supabase), BUT `loadFromSupabase` also returns empty for guests, and the only cross-device merge path (`remoteDataSync` — F1, dead) is the one that would run on guest→user signup. Since `remoteDataSync.init` is never called, a guest who unlocks achievements locally, then signs up, does NOT get those local achievements pushed to Supabase — `loadFromSupabase` (called lazily from `initialize`) merges cloud→local, not local→cloud. The offline-recovery push in `loadFromSupabase` (achievementStore.ts:784-798) does push local-missing-from-cloud, but only runs inside `loadFromSupabase`, which only runs inside `initialize`, which only runs when the user visits Home/Analytics/Achievements.

**Impact:** Guest→user achievement migration is fragile and depends on screen navigation. If a user signs up and immediately uses a premium feature without visiting those screens, their guest achievements sit in local AsyncStorage (under `achievement-storage`) and may be cleared by `clearAllUserData` on a future logout before ever syncing.

**Fix:** Wire F1. Also, on the SIGNED_IN transition specifically, call `useAchievementStore.getState().syncWithSupabase(userId)` (push) in addition to `loadFromSupabase` (pull+merge) so guest-unlocked achievements reach the cloud.

---

### F8 (P2) — Silent no-op on achievement cloud-load failure

**File:** `src/services/achievementData.ts:116-119`, `src/stores/achievementStore.ts:735`.

**Root cause:** `loadUserAchievements` returns an empty `Map` on Supabase error. `loadFromSupabase` gates the merge on `cloudAchievements.size > 0`, so an error silently skips merge and keeps stale local state. The error IS `console.error`'d (Principle 5 satisfied), but the data outcome is indistinguishable from "user has no cloud achievements" — no retry, no user signal.

**Fix:** Distinguish error from empty-result: throw or return `{ ok: false, achievements: Map }`. `loadFromSupabase` should skip merge + log on error (current behavior) but optionally queue a retry, vs. proceed with merge on empty-but-ok. Low severity because local state is preserved, not lost.

---

### F9 (P2) — `PaywallModal` duplicates feature-list copy that lives in `subscription_plans`

**File:** `src/components/subscription/PaywallModal.tsx:22-41` (`TIER_FEATURES`).

**Root cause:** The component hardcodes human-readable feature strings ("Unlimited AI generations", etc.) per tier. The DB `subscription_plans` table owns the *limit* columns (`unlimited_ai`, `analytics`, etc.) but not the marketing copy. So copy drift is possible. Not a data-integrity bug per se, but a single-source-of-truth smell.

**Fix:** Move marketing copy to `subscription_plans.description` or an `app_config` row, fetch alongside plans in `usePaywall`. Low priority.

---

### F10 (P2) — `fetchSubscriptionStatus` error wipes to free tier

**File:** `src/stores/subscriptionStore.ts:427-447`.

**Root cause:** Default `preserveExistingOnError=false`. On any fetch error (network blip, 5xx), the store sets `currentPlan: null`, `features: FREE_FEATURES`, `usage: EMPTY_USAGE`, `usageIsFresh: false`. A paying user on a flaky connection sees free-tier UI and gets blocked by `canUseFeature` until the next successful fetch.

**Fix:** Default `preserveExistingOnError: true` for the boot/login path (F2). Keep `false` only for explicit "force refresh" user actions. The purchase path already passes `preserveExistingOnError: true` (usePaywall.ts:302).

---

### F11 (P2) — `useWorkoutAchievements` celebration effect (low-risk latent loop)

**File:** `src/hooks/useWorkoutAchievements.ts:72-82`.

**Root cause:** Effect deps `[showCelebration, celebrationAchievement, showAchievementNotification]`. Inside, it calls `setRecentAchievements((prev) => [...prev, celebrationAchievement])`. `recentAchievements` is NOT in deps, so no loop today. `showAchievementNotification` is a `useCallback` with dep `[achievementToastAnim]` (a `useState(new Animated.Value(0))` — stable ref), so stable. Currently safe. Flagged because the pattern (append-to-separate-state inside an effect that reads sibling state) is the classic loop precursor.

**Fix:** No action required. Document as a known-safe pattern. If `recentAchievements` is ever added to deps, add a `useRef` guard.

---

### F12 / F13 (P3) — RLS sanity: ALL PASS

- `user_achievements`: `auth.uid() = user_id` FOR ALL (`20260124000001:543-544`). ✓
- `subscription_plans`: public read for active rows (`20260319000001:112-114`) + authenticated read (`20260220000001:150-152`). ✓
- `subscriptions`: service_role only after hardening (`20260319000001:18-21`); old `insert_own`/`update_own` dropped. User SELECT retained (`20260220000001:157-159`). ✓
- `feature_usage`: service_role only after hardening; old user insert/update dropped. ✓
- `webhook_events`: service_role only, revoked from PUBLIC/anon/authenticated. ✓

No RLS gaps in the achievements/subscription domain.

---

## Schema/code match (Principle 4 + 6)

**`user_achievements` columns vs code:**
- DB: `id, user_id, achievement_id, achievement_type, title, description, icon, progress, target_value, current_value, is_completed (renamed from is_unlocked), unlocked_at, xp_reward, created_at, updated_at` + later-added `max_progress, celebration_shown, fit_coins_earned`.
- Code upsert (`achievementData.ts:39-52`): writes `user_id, achievement_id, title, progress, max_progress, is_completed, unlocked_at, celebration_shown, fit_coins_earned`. ✓ all columns exist.
- Code read (`achievementData.ts:121-135`): reads `id, achievement_id, user_id, progress, max_progress, is_completed, unlocked_at, celebration_shown, fit_coins_earned`. ✓
- **Note:** `achievement_type`, `description`, `icon`, `target_value`, `current_value`, `xp_reward` are DB columns never written/read by current code. Dead columns — not a bug, but tech debt.
- **Note:** code never persists `achievementEngine`'s `progress` raw-count semantics correctly if `max_progress` defaults to 1 and the achievement target is >100 — but `20260328000002` dropped the `progress <= 100` constraint, so upserts succeed. ✓

**`subscription_plans` / `subscriptions` / `feature_usage` vs code:** All columns read/written by `usePaywall`/`subscriptionStore`/`RazorpayService` match the migrations. ✓

**Store updated after DB write (Principle 6):**
- `completeWorkout`: writes Supabase, then `addCompletedSession` (store), then `updateCurrentStreak` + `reconcileWithCurrentData` (achievement store). ✓
- `completeMeal`: writes Supabase, then `setState(mealProgress)` + `addDailyMeal` (nutrition store). ✓ — but does NOT update achievement store (F3).
- `achievementDataService.saveUserAchievement`: writes Supabase but the *store* (`userAchievements` Map) was already updated by `checkProgress` before the save (achievementStore.ts:468 `set(...)` then listener fires save at 396-403). ✓ store leads, DB follows — correct order.

---

## Hardcoded fallbacks (Principle 8)

- `subscriptionStore.ts:157-165` `FREE_FEATURES` — legitimate default tier config, not user data. ✓
- `usePaywall.ts:50-73` `FALLBACK_PLANS` — hardcoded pricing (₹299/₹599/₹400) shown when DB fetch fails. This is a **hardcoded fallback for pricing data** — if the DB plans change, the fallback drifts. Not user data per Principle 8, but a pricing-integrity risk. Flag as P2 (F6-adjacent).
- `achievementStore.ts:998` `partialize` persists `isInitialized: true` — but `onRehydrateStorage` does NOT reset it, and `initialize()` early-returns if `isInitialized && userId matches`. So a persisted `isInitialized: true` with a stale `initializedAchievementUserId` could skip re-init after a logout/login to the SAME user. Actually safe because `reset()` (called by `clearAllUserData` on logout) clears `isInitialized` and `initializedAchievementUserId`. ✓
- No fake user IDs, no hardcoded weights/calories in the audited paths. ✓ (`completionTracking.calculateActualCalories` returns 0 + warn if weight missing — correct per Principle 8.)

---

## Wave mapping

Per `UIUX-DATA-INTEGRITY-GOAL.md` "AGENT DISPATCH PLAN":

- **Wave B** (workout session + code: progressive-overload/calories/offline/schema) — F4 (`useHomeLogic` effect), F11 (celebration effect) are workout-session-adjacent. The workout→achievement pipeline (`trackSetCompletion`/`trackExerciseCompletion`/`trackMilestone`/`trackWorkoutCompletion` wiring in `WorkoutSessionScreen`) is already correct; no Wave B achievement work needed there.
- **Wave D** (analytics + achievements + progress) — **primary wave for achievement fixes**: F1 (wire `remoteDataSync.init`), F3 (wire meal/water/streak trackers + `completeMeal` achievement call), F7 (guest→user achievement migration), F8 (error-vs-empty distinction in `loadFromSupabase`), F11 (latent loop guard).
- **Wave E** (profile + settings + paywall) — **primary wave for subscription fixes**: F2 (bootstrap subscription on SIGNED_IN), F5 (entitlement revalidation), F6 (paywall fallback retry), F9 (feature-copy SSOT), F10 (preserve-on-error default).
- **Wave F** (regression sweep + release-APK sign-off) — verify all of the above hold after fixes; re-run `npx tsc --noEmit`, `npx jest`, `npx expo export`.

**Cross-cutting:** F1 + F2 should be fixed together (both are "wire SIGNED_IN bootstrap" — same edit site in `remoteDataSync.ts` + app boot). Recommend bundling into a single Wave D/E handoff.

---

## Files touched (read-only, this audit)

- `src/docs/UIUX-DATA-INTEGRITY-GOAL.md`, `src/docs/FITAI_DATA_ARCHITECTURE.md`, `memory/uiux-data-integrity-goal.md`
- `src/hooks/useWorkoutAchievements.ts`, `src/hooks/usePaywall.ts`, `src/hooks/useHomeLogic.ts`
- `src/stores/achievementStore.ts`, `src/stores/subscriptionStore.ts`, `src/stores/authStore.ts`, `src/stores/userStore.ts`
- `src/services/achievementData.ts`, `src/services/completionTracking.ts`, `src/services/RazorpayService.ts`, `src/services/supabase.ts`, `src/services/authUtils.ts`, `src/services/remoteDataSync.ts`
- `src/components/subscription/PaywallModal.tsx`, `src/components/subscription/PremiumGate.tsx`, `src/components/subscription/PremiumBadge.tsx`
- `src/screens/profile/SubscriptionManagement.tsx`, `src/screens/main/AchievementsScreen.tsx`, `src/screens/main/profile/components/SettingsModalWrapper.tsx`, `src/screens/main/profile/modals/SettingsSelectionModal.tsx`
- `src/utils/clearUserData.ts`
- `supabase/migrations/20260124000001_add_missing_data_tables.sql`, `20260220000001_add_subscription_tables.sql`, `20260319000001_harden_subscription_security_and_public_config.sql`, `20260320000001_add_celebration_shown_to_user_achievements.sql`, `20260321000001_add_fit_coins_earned_to_user_achievements.sql`, `20260322000001_fix_user_achievements_schema.sql`, `20260328000002_fix_achievement_progress_constraint.sql`

No source files were edited. No commits made. Audit only.
