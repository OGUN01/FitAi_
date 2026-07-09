# Wave B3-02 — Fix profileStore.bodyAnalysis Hydration from Supabase (B2-P0-3)

**Agent:** Wave B3 code-fix agent (flat). **Date:** 2026-06-24.
**Scope:** Closes B2-P0-3 — the `useFitnessLogic` pre-flight guard fires a false
positive on the happy path because `profileStore.bodyAnalysis` is null for existing
users (with seeded body_analysis in Supabase) whose local Zustand persist is empty.
**Method:** code-review-graph MCP (`semantic_search_nodes` + `query_graph` callees_of)
+ Read/Grep. FLAT agent, no sub-agents. No device.
**Spec:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md`.

---

## 1. Root Cause (confirmed)

The device agent's B2-P0-3 finding is correct. Tracing the data path:

- The guard reads `bodyAnalysis?.current_weight_kg` from
  `useProfileStore().bodyAnalysis` (`useFitnessLogic.ts:90,429-432`).
- `profileStore` starts with `bodyAnalysis: null` (`profileStore.ts:112`) and
  hydrates from **local AsyncStorage** only (Zustand `persist`,
  `profile-storage-v2`). It is NEVER loaded from Supabase on login for an existing
  user with a valid local profile.
- `App.tsx:loadExistingData` has three branches:
  1. `user && profile` (valid local profile) — line 750-789. Calls
     `verifyAndSyncProfileInBackground` (line 761) which runs `verifyDatabaseData`
     + `syncLocalToDatabase` — **both local→DB only**. Never loads DB→local.
     `profileStore.bodyAnalysis` stays null. **THIS IS THE BUG.**
  2. `user && !profile` — line 792-829. Calls `getCompleteProfile` which sets
     `userStore.profile` but NOT `profileStore.bodyAnalysis` (userStore.getCompleteProfile
     only fetches profiles/diet/workout — `userProfile.ts:319-324` — it does NOT
     fetch the `body_analysis` table at all).
  3. Guest — reads onboarding_data from AsyncStorage.
- The only existing DB→profileStore hydration that fetches body_analysis is
  `dataBridge.loadAllData(userId)` → `DataBridge.loadFromDatabase`
  (`DataBridge.ts:352-433`), which fetches via `BodyAnalysisService.load` and
  hydrates `profileStore.bodyAnalysis` via `hydrateFromLegacy`. But this was only
  called at **onboarding completion** (`App.tsx:1149`), never on existing-user login.

So for any user whose local AsyncStorage was cleared (fresh install, app data
cleared, cold-boot after cache wipe) but who HAS a profile + body_analysis in
Supabase, `profileStore.bodyAnalysis` is null. The guard correctly reads null →
fires the "Body Analysis Required" false positive, blocking legitimate generation.

This is a PRE-EXISTING latent data-integrity bug (body_analysis was never hydrated
on login for existing users — none of the three login branches fetched it). The
new guard EXPOSED it; it did not cause it.

---

## 2. Existing hydration pattern mirrored

`dataBridge.loadAllData(userId)` is the canonical DB→profileStore hydration path
in this codebase. It is already used at onboarding completion (`App.tsx:1149`,
commented "Must be awaited BEFORE setIsOnboardingComplete so the store is fully
hydrated before MainNavigation renders"). It:

- Fetches all 5 profile sections in parallel (`PersonalInfoService.load`,
  `DietPreferencesService.load`, `BodyAnalysisService.load`,
  `WorkoutPreferencesService.load`, `AdvancedReviewService.load`) —
  `DataBridge.ts:356-388`.
- Resolves the canonical current weight (`resolveCurrentWeightForUser`) and
  applies it to body_analysis — `DataBridge.ts:389-401`.
- Marks `syncStatus="syncing"`, then applies all loaded data atomically via a
  single `profileStore.hydrateFromLegacy(batchUpdate)` call, then marks
  `syncStatus="synced"` — `DataBridge.ts:411-433`. (Has an offline-queue guard
  that skips hydration if `offlineService.hasPendingActions()` is true, to
  avoid overwriting in-flight local edits — this is correct behavior and the
  existing guard.)
- Has a built-in idempotency guard: returns cached store state if
  `profileStore.isHydrated` is already true (`DataBridge.ts:247-257`), and
  deduplicates concurrent calls via `DataBridge.loadPromise` (`DataBridge.ts:261-271`).

No new fetch function was created (CLAUDE.md Principle 3 — Search Before
Building). The existing `dataBridge.loadAllData` already does exactly what's
needed; the fix just calls it on the existing-user login path that was missing it.

---

## 3. Single source of truth read

`body_analysis` table (Supabase, RLS `auth.uid()=user_id`) → `BodyAnalysisService.load`
→ `DataBridge.loadFromDatabase` → `profileStore.hydrateFromLegacy` →
`profileStore.bodyAnalysis`. This is the SSOT for body-analysis data per
`profileStore.ts:5-23` ("SINGLE SOURCE OF TRUTH FOR ONBOARDING PROFILE DATA ...
bodyAnalysis (measurements, body composition goals)"). The guard
(`useFitnessLogic.ts:429-432`) reads `profileStore.bodyAnalysis` — the same SSOT.
No fabricated defaults (CLAUDE.md Principle 8): if no `body_analysis` row exists,
the store stays null and the guard handles it gracefully (shows the friendly
prompt — the correct missing-data behavior).

---

## 4. Exact diff (App.tsx before → after)

**Before** (`App.tsx:759-762`):
```ts
          if (isValid) {
            setIsOnboardingComplete(true);
            verifyAndSyncProfileInBackground(user.id);
          } else {
```

**After** (`App.tsx:759-788`):
```ts
          if (isValid) {
            setIsOnboardingComplete(true);
            verifyAndSyncProfileInBackground(user.id);
            // B2-P0-3 fix: hydrate profileStore from Supabase SSOT for existing users.
            // The local Zustand persist (profile-storage-v2) may be empty (fresh install,
            // app data cleared, cold-boot after cache wipe) even though the user HAS a
            // profile + body_analysis in Supabase. verifyAndSyncProfileInBackground only
            // syncs local→DB (it never loads DB→local), so profileStore.bodyAnalysis
            // stays null and the useFitnessLogic pre-flight guard fires a false positive.
            // dataBridge.loadAllData is the canonical DB→profileStore hydration path
            // (same call used at onboarding completion, line ~1149): it fetches all
            // profile sections including body_analysis via BodyAnalysisService.load and
            // hydrates profileStore.bodyAnalysis via hydrateFromLegacy. Run fire-and-
            // forget in the background (mirrors verifyAndSyncProfileInBackground) so app
            // startup is not blocked; the guard reads the SSOT and the store updates
            // reactively once hydration resolves. If no body_analysis row exists, the
            // store stays null and the guard handles it gracefully (no fabrication,
            // CLAUDE.md Principle 8).
            void runAfterInteractions(async () => {
              if (!mounted) return;
              try {
                await dataBridge.loadAllData(user.id);
              } catch (error) {
                console.error(
                  "❌ App: Failed to hydrate profileStore from Supabase for existing user:",
                  error,
                );
              }
            });
          } else {
```

### Design notes

- **Non-blocking for app startup** — wrapped in `void runAfterInteractions(...)`
  (fire-and-forget), exactly mirroring the adjacent
  `verifyAndSyncProfileInBackground` (line 705-722). `setIsOnboardingComplete(true)`
  and `setIsLoadingOnboarding(false)` (line 787) run synchronously; the user is not
  blocked on the Supabase round-trip. The store updates reactively once hydration
  resolves, and any subscribed UI (including the guard on the next generation
  attempt) re-renders with the real value.
- **Idempotent** — `dataBridge.loadAllData` has its own
  `profileStore.isHydrated` short-circuit (`DataBridge.ts:247-257`) and concurrent-
  call dedup (`DataBridge.ts:261-271`), so calling it here is safe even if another
  path (e.g. onboarding completion) has already hydrated.
- **No new imports** — `dataBridge` (line 79) and `runAfterInteractions` (line 82)
  are already imported. `mounted` is the existing closure flag (line 703).
- **No `Alert.alert`** — errors are logged via `console.error` (CLAUDE.md Principle 5).
- **No `console.log` in production path** — only `console.error` on the failure
  branch (Principle 5). (The pre-existing `console.warn` debug lines in this
  function are out of this agent's scope to remove.)

---

## 5. Consumer-safety check

Populating `profileStore.bodyAnalysis` (previously always null on this path) —
verified via `semantic_search_nodes` + Read that every consumer is null-safe
(optional chaining / null-guards) and strictly improves when given a real value:

| Consumer | File | Behavior with null → value |
|---|---|---|
| `buildLegacyPersonalInfo` | `profileLegacyAdapter.ts:45-71` | Reads `bodyAnalysis?.height_cm`, `bodyAnalysis?.current_weight_kg` via `resolveCurrentWeightFromStores`. Null-safe. Gains real height/weight. |
| `resolveCurrentWeightFromStores` | `currentWeight.ts:195-230` | Falls back to `profileStore.bodyAnalysis?.current_weight_kg` when weightHistory empty. Null-safe. Returns real weight instead of null. |
| `WeightTrackingService.initializeFromBodyAnalysis` | `WeightTrackingService.ts:95-103` | Only called when value is non-null. Safe. |
| `buildAchievementActivityData` | `achievementStore.ts:64-180` | Reads `bodyAnalysis?.current_weight_kg`, `bodyAnalysis?.target_weight_kg`. Null-safe. |
| `mapToCalculatedMetrics` | `useCalculatedMetrics.ts:429` / `calculated-metrics/mappers.ts:12` | Accepts `BodyAnalysisData \| null`. Null-safe. |
| `GoalProgressCard` | `GoalProgressCard.tsx:20` | Accepts `bodyAnalysis` prop. Null-safe. |
| Health calculators (`calculateOverallHealthScore`, `calculateFitnessReadinessScore`, `calculateGoalRealisticScore`, `calculateAllMetrics`) | `healthCalculations.ts` / `health-scoring.ts` / `master-engine.ts` | Take `BodyAnalysisData` (non-null) — these are only called from onboarding flows where bodyAnalysis is already present; not invoked from the login path. Not affected by this change. |
| `useFitnessLogic` pre-flight guard | `useFitnessLogic.ts:429-432` | Reads `bodyAnalysis?.current_weight_kg`. Null-safe. **This is the bug being fixed** — now resolves a real weight instead of null → guard no longer fires false positive. |

No consumer breaks when null→value. All strictly benefit.

---

## 6. Files touched

1. `D:\FitAi\FitAI\App.tsx` — added DB→profileStore hydration call in the
   `user && profile` (valid) branch of `loadExistingData` (lines 759-788).

## Files NOT touched (out of scope, owned by other agents)

- `src/components/ui/aurora/GlassCard.tsx` — GlassCard touch clipping (B3-01, parallel agent).
- `src/components/fitness/SetLogModal.tsx`, `BottomSheet.tsx`, `AnimatedPressable.tsx` — parallel agents.
- `src/hooks/useFitnessLogic.ts` — the guard itself is correct; not edited.
- Any `src/components/*`, Wave C diet files, `profileStore.ts`, `DataBridge.ts`,
  `onboardingService.ts`, `userProfile.ts`, `userStore.ts` — unchanged.

---

## 7. tsc gate

```
$ cd D:/FitAi/FitAI && npx tsc --noEmit; echo "EXIT_CODE=$?"
EXIT_CODE=0
```

**Exit 0.** Zero new errors. No errors attributable to this change. (The
`App.tsx` edit adds only an existing-function call wrapped in an existing
`runAfterInteractions` helper — no new types or imports.)

Full jest suite NOT run per task instructions (scoped gate = tsc only).

---

## 8. Verification status

Code-only: root cause confirmed (existing latent bug — body_analysis never
hydrated on existing-user login, exposed by the B2 guard), fix mirrors the
existing onboarding-completion hydration call, reads the SSOT, follows the
existing fire-and-forget background pattern, consumer-safe, tsc clean.

End-to-end device verification (existing user with seeded body_analysis → tap
Regenerate → confirm generation proceeds instead of false-positive "Body Analysis
Required" alert) is the Wave B3 device agent's task.
