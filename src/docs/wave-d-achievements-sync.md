# Wave D — Achievements & Cross-Device Sync Fixes

**Agent:** code-only (achievements/sync partition)
**Date:** 2026-07-09
**Scope:** P0-8, P0-10, P1-17, P1-20, P2-10 from `UIUX-FINDINGS-CATALOG.md`

---

## P0-8 — `remoteDataSync.init()` wired at app bootstrap

**Status:** Already wired (committed) at `App.tsx:951` — verified, not re-edited.

**Finding:** `initRemoteDataSync()` is imported (`App.tsx:80`) and called inside the app-bootstrap `useEffect([])` at `App.tsx:951`, immediately after `initializeBackend()` resolves. The coordinator (`remoteDataSync.ts:26-51`) subscribes to `authEvents.SIGNED_IN` and `SIGNED_OUT` synchronously inside `init()` (guarded by an `initialized` flag — idempotent).

**Timing verified safe:** `authStore.initialize()` is invoked from `useAuth()`'s mount effect (async — session restore crosses the network). `initRemoteDataSync()` runs in App's mount effect and registers the subscription synchronously. Since React runs mount effects in declaration order and the subscription registration is sync while session restore is async, the SIGNED_IN subscription is always registered before any SIGNED_IN event fires (login/register/session-restore all emit after the async auth call resolves). Dedup window (10s) prevents double-sync from the login() + onAuthStateChange double-fire.

**AsyncInitializer note:** `AsyncInitializer.tsx` is dead code — it is NOT rendered anywhere (grep confirms 0 consumers; only self-references + a style-helper string). Wiring `initRemoteDataSync` there would be a no-op. App.tsx is the correct and only bootstrap site. AsyncInitializer.tsx was not edited.

**Files:** `App.tsx:951` (no change needed — already correct).

---

## P0-10 — Meal achievement tracker wired in `completionTracking.completeMeal`

**Fix:** `src/services/completionTracking.ts:5` — added `import { trackAchievementActivity }`.

`src/services/completionTracking.ts:639-666` — inside `completeMeal`, AFTER the successful Supabase `meal_logs` insert (inside the `else` branch where `supabaseResult.error` is falsy, after `nutritionRefreshService.triggerRefresh()`), added a fire-and-forget call to `trackAchievementActivity.mealLogged(currentUserId, {...})`. Wrapped in try/catch with `console.error` so achievement-eval failures never block or revert the meal completion.

**Why after the insert (not before):** a failed DB write must never trigger an achievement unlock (achievements must reflect real persisted activity). The call is inside the success branch only — the catch-block revert path (P0-5 fix) does NOT call the tracker.

**Other trackers (water, social):** NOT wired — `completionTracking.ts` has no `completeWater` or `completeSocial` function. Water logging happens in `hydrationStore.addWater` (outside this partition); social interactions have no completion path here. Noted for follow-up:
- **Follow-up (outside partition):** Wire `trackAchievementActivity.waterGoalHit` in `src/stores/hydrationStore.ts` `addWater` when `waterIntakeML >= dailyGoalML` after a successful Supabase push.
- **Follow-up (outside partition):** `trackAchievementActivity.socialInteraction` has 0 callers and no social feature exists yet — leave as dead code until a social feature ships.

**Guest handling:** `currentUserId` is falsy for guests in the no-user branch (line 676 `else`), so the tracker only fires for authenticated users. `checkProgress` in the store short-circuits on falsy userId, and `achievementDataService` skips cloud writes for guest-prefixed IDs — so guests get local-only progress (consistent with `reconcileWithCurrentData`).

---

## P1-17 — `useHomeLogic` achievement-init effect dep fix

**Fix:** `src/hooks/useHomeLogic.ts:193-210` — dropped `achievementsInitialized` from the `useEffect` dependency array. Now `[user?.id, initializeAchievements]` with an `eslint-disable-next-line react-hooks/exhaustive-deps` comment.

**Loop-prevention verified:** The early-return guard `if (!user?.id || achievementsInitialized) return;` remains the sole loop-preventer. When `initialize()` resolves and flips `isInitialized=true`, the next render re-runs the effect, hits the guard (`achievementsInitialized` is now true), and returns immediately — no second `initialize()` call, no infinite loop. Previously, `achievementsInitialized` in deps caused a re-render cycle on every init completion (safe only via the guard); now the effect runs exactly once per `user.id` change.

---

## P1-20 — Guest→user achievement migration on SIGNED_IN

**Fix:** Three coordinated changes:

1. `src/stores/achievementStore.ts:34` — added module variable `lastGuestUserId` to remember the most recent guest ID that initialized the store.

2. `src/stores/achievementStore.ts:366-374` — in `initialize()`, when the incoming `userId` is a guest/local ID (`startsWith("guest")` or `=== "local-user"`), set `lastGuestUserId = userId` so the guest's earned progress is remembered across the login transition.

3. `src/stores/achievementStore.ts:773-784` — at the top of `loadFromSupabase(userId)`, before the cloud fetch, if `lastGuestUserId` is set and differs from the current real `userId`, call `migrateGuestAchievements(lastGuestUserId, userId)` then clear `lastGuestUserId` (migrate once per guest session).

4. `src/stores/achievementStore.ts:1041-1102` — implemented `migrateGuestAchievements(guestUserId, realUserId)`: reads the guest's progress from the engine via `getUserAchievementProgress(guestUserId)`, re-keys each achievement to the real userId via `setUserAchievement(realUserId, migrated)`, skips any the real user already completed or has higher progress on (cloud wins on conflict), then refreshes the store Map + stats. Guards: no-op if IDs match, if guest ID isn't actually a guest prefix, or if guest has no progress.

5. `src/services/remoteDataSync.ts:88-108` — after `loadFromSupabase` (which migrates guest progress + pushes via its offline-recovery path), added an explicit fire-and-forget `syncWithSupabase(userId)` push so the migrated achievements persist to the user's cloud record on sign-in.

6. `src/stores/achievementStore.ts:1117` — `reset()` clears `lastGuestUserId`.

**Trace verified:** Guest earns achievements → engine stores under `guest-xxx::achievementId` → `initialize("guest-xxx")` sets `lastGuestUserId` → guest signs in → SIGNED_IN fires → `remoteDataSync.syncAllRemoteData` calls `loadFromSupabase(realUserId)` → migration runs (guest progress re-keyed to realUserId) → cloud fetch merges any existing cloud rows (cloud wins) → offline-recovery pushes migrated rows to Supabase → explicit `syncWithSupabase` push completes the persistence. `loadFromSupabase` returns empty for guests (`achievementData.ts` guest guard) — confirmed.

---

## P2-10 — Achievement cloud-load failure no longer silent

**Fix:** `src/services/achievementData.ts:14-24` — added `AchievementLoadResult` interface `{ok: boolean, achievements: Map<string, UserAchievement>}`.

`src/services/achievementData.ts:101-155` — `loadUserAchievements` now returns `{ok, achievements}` instead of a bare `Map`. On Supabase error or thrown exception: returns `{ok: false, achievements: new Map()}` with `console.error` (CLAUDE.md #5 — no silent failures). On success (including zero rows): returns `{ok: true, achievements: map}`. Guest users short-circuit with `{ok: true, achievements: empty}` (they legitimately have no cloud rows — not an error).

`src/stores/achievementStore.ts:786-844` — `loadFromSupabase` consumes the new return. On `ok: false`: logs `console.error`, returns immediately WITHOUT clobbering local state and WITHOUT attempting the offline push (it would fail too). Local achievement progress is preserved; next successful sync merges + pushes. On `ok: true`: proceeds with merge (always runs, even when cloud is empty, so the offline-recovery + guest-migration push can push locally-completed rows).

**No other callers** of `loadUserAchievements` exist (grep confirmed — only `achievementStore.loadFromSupabase` calls it).

---

## Gate Results

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | EXIT 0 |
| Jest | `npx jest` | 87 suites passed, 471 tests passed, 9 skipped, 0 failed |
| Expo export | `npx expo export --platform android` | EXIT 0 (bundle exported) |

---

## Follow-ups needed in OTHER files (outside this partition)

1. **`src/stores/hydrationStore.ts`** (water achievements): Wire `trackAchievementActivity.waterGoalHit(userId, {...})` inside `addWater` after the water goal is met AND a successful Supabase push. Currently `trackAchievementActivity.waterGoalHit` has 0 callers. Pattern: `if (newIntake >= dailyGoalML) { trackAchievementActivity.waterGoalHit(userId, { goalsHit: 1, amount: newIntake }); }`.

2. **`src/stores/userStore.ts:588,590`** (transient tsc regression — now resolved): Another agent's P2-6 edit left `workoutPrefs.primary_goals.length > 0` without a `?? 0` null-guard on two lines while adding it to adjacent lines. This caused a transient `tsc --noEmit` failure (TS18048 possibly-undefined). Verified resolved by the time of final gate run (exit 0). If it recurs, the fix is: `(workoutPrefs.primary_goals?.length ?? 0) > 0` and `(workoutPrefs.workout_types?.length ?? 0) > 0` on lines 588 + 590.

3. **`trackAchievementActivity.socialInteraction`** (dead code): 0 callers, no social feature exists. Leave as dead code until a social feature ships — do not wire speculatively.

4. **`trackAchievementActivity.dailyUsage`** (dead code): 0 callers. The streak/consistency achievements are already evaluated via `reconcileWithCurrentData` (which derives `consistentDays` from `completedSessions`). No wiring needed unless a daily-usage-specific achievement is added.

5. **`App.tsx`** (owned by no agent this wave): P0-8 wiring is already correct at `App.tsx:951` — no change needed. Flagging only so the orchestrator is aware AsyncInitializer is dead code and should not be relied on for bootstrap wiring.
