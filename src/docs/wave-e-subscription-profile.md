# Wave E — Subscription & Profile Data-Integrity Fixes

**Agent:** Wave E code-only (subscription/profile partition)
**Date:** 2026-07-09
**Scope:** P0-9, P1-13, P1-14, P1-18, P1-19, P2-6, P2-11, P2-12

---

## P0-9 — Subscription store never bootstraps on auth login

**Root cause:** `syncAllRemoteData` (the cross-device SIGNED_IN sync hook in `remoteDataSync.ts`) pulled profile/hydration/fitness/nutrition/achievements data but never fetched subscription status. `initializeSubscription()` in App.tsx only runs once (guarded by `isInitialized`), so a cross-device sign-in after the first init would not revalidate entitlement.

**Fix:** `src/services/remoteDataSync.ts:69-86` — Added `useSubscriptionStore.getState().fetchSubscriptionStatus({ preserveExistingOnError: true })` as the 6th promise in `syncAllRemoteData`'s `Promise.allSettled` array. Updated failure log denominator to `/6`. This runs on every SIGNED_IN event (deduped 10s window), so a fresh-login user gets their entitlement fetched alongside the other remote data.

**Note (P0-8 coordination):** `remoteDataSync.ts` is the Wave D agent's P0-8 file, but P0-8 (`initRemoteDataSync` wiring in App.tsx:951) was already committed in a prior wave and is stable. The Wave D agent also added a P1-20 achievement-push block after my subscription fetch — the two edits coexist without conflict. The subscription fetch sits inside the `inFlight` IIFE before the fire-and-forget achievement push.

**Verification:** `tsc --noEmit` exit 0 (subscriptionStore import resolves). On SIGNED_IN, `fetchSubscriptionStatus` now runs in parallel with the other 5 remote syncs.

---

## P2-12 — `fetchSubscriptionStatus` error wipes to FREE tier

**Root cause:** `initializeSubscription()` called `fetchSubscriptionStatus()` with no options, so `preserveExistingOnError` defaulted to `false`. A transient network blip during boot wiped a paying user's persisted premium state to free-tier.

**Fix:** `src/stores/subscriptionStore.ts:510-512` — `initializeSubscription` now calls `fetchSubscriptionStatus({ preserveExistingOnError: true })`. This is the boot/login path; the purchase path already passed `preserveExistingOnError: true` (usePaywall.ts:302).

**Verification:** `tsc --noEmit` exit 0. On fetch error with `preserveExistingOnError:true`, the store sets only `{ isLoading: false, usageIsFresh: false }` — `currentPlan`/`subscriptionStatus`/`features` are preserved (subscriptionStore.ts:431-433).

---

## P1-18 — Entitlement drift (no server revalidation on boot)

**Root cause:** Combined with P0-9. `isPremium()` trusted persisted local state with no periodic server revalidation. A user cancelled on another device stayed premium locally.

**Fix:**
1. **SIGNED_IN revalidation** — covered by P0-9 (subscription fetch added to `syncAllRemoteData`).
2. **App-focus revalidation** — `src/stores/subscriptionStore.ts:16-58` — Added `setupAppFocusRevalidation()` which lazily imports `AppState` from `react-native` (guarded: skips on web/node test env where AppState is unavailable) and attaches an `AppState.addEventListener("change", ...)` listener. On return to `"active"` state, it calls `fetchSubscriptionStatus({ preserveExistingOnError: true })`, throttled to once per 5 minutes (`APP_FOCUS_REVALIDATION_INTERVAL_MS`) to avoid hammering the server on rapid foreground toggles.
3. `setupAppFocusRevalidation()` is called from `initializeSubscription()` (subscriptionStore.ts:506), so the listener attaches once on first init.

**Verification:** `tsc --noEmit` exit 0. `jest` 471 passed — the lazy `require("react-native")` is wrapped in try/catch so test environments (where react-native is mocked) attach the listener idempotently without throwing.

---

## P1-13 — Hardcoded `"desk_job"` fallback (5 locations)

**Root cause:** Deprecated `occupation_type` field had `|| "desk_job"` fallbacks across 5 files; the DB column is nullable and `activity_level` in `workout_preferences` is the SSOT.

**Fix (in partition):**
- `src/services/userProfile.ts:648-659` — Replaced `get('occupation_type', 'occupationType', 'desk_job')` with `get('occupation_type', 'occupationType', undefined) ?? undefined` and widened the cast to `| undefined`. The `PersonalInfo.occupation_type` type (types/user.ts:46) is optional (`| undefined`), not nullable, so `?? undefined` matches the type (not `?? null`).

**Remaining 4 sites OUTSIDE this agent's partition (NOTE — must be fixed by their owning agents):**
1. `src/utils/validation.ts:708` — `occupation_type: info.occupation_type || "desk_job"` → should be `?? undefined`
2. `src/utils/validation/utils.ts:79` — `occupation_type: info.occupation_type || "desk_job"` → should be `?? undefined`
3. `src/contexts/edit/data-loaders.ts:80` — `occupation_type: profileStorePI?.occupation_type || "desk_job"` → should be `?? undefined`
4. `src/services/SyncEngine.ts:586` — `data.occupation_type || data.occupationType || "desk_job"` → should be `?? undefined`

(`test-name-fix.js:44` is a one-off test script, not production code.)

**Verification:** `tsc --noEmit` exit 0.

---

## P1-14 — Store NOT updated after DB write in profile-edit units save path

**Root cause:** `useProfileLogic.ts:167-208` (`handleUnitsSelect`) updates profileStore via `updatePersonalInfo({units})` (SSOT, correct), writes Supabase via `userProfileService.updateProfile(currentUserId, {units})`, BUT also hand-rolls a `userStore.setProfile({...spread..., personalInfo:{...units}, preferences:{...units}})` at lines 180-187 — a divergent duplicate of the same units value across two stores.

**Fix (partition-constrained):** The duplicate `userStore.setProfile` spread lives in `src/hooks/useProfileLogic.ts` which is NOT in this agent's partition. The catalog fix ("delete the `userStore.setProfile` spread; route through `dataBridge.savePersonalInfo`") must be applied there.

**NOTE for the owning agent — exact change needed in `src/hooks/useProfileLogic.ts:177-187`:**
Delete lines 177-187 (the `const currentUserProfile = useUserStore.getState().profile; if (currentUserProfile) { useUserStore.getState().setProfile({...spread...}); }` block). The `updatePersonalInfo({units})` call (line 175) already updates `profileStore` (the SSOT), and `userProfileService.updateProfile` (line 191) writes Supabase. `userStore.profile.personalInfo.units` is a vestigial duplicate — the architecture doc (`FITAI_DATA_ARCHITECTURE.md:864`) confirms `profileStore.personalInfo.units` is the SSOT for units. `dataBridge.savePersonalInfo` is NOT needed for this path because the units value is a single field, not a full PersonalInfoData save; the existing profileStore + DB write split is correct once the userStore spread is removed.

**In-partition verification:** `dataBridge.savePersonalInfo` (DataBridge.ts:519-568) already correctly updates `profileStore.updatePersonalInfo` (SSOT) + writes Supabase via `PersonalInfoService.save` + queues on failure — no change needed there. `userStore.setProfile` (userStore.ts:471-479) is fine as a method; the bug is the caller's misuse.

**Verification:** `tsc --noEmit` exit 0 (no code changed for this finding in-partition; noted as follow-up).

---

## P1-19 — `usePaywall` plan-fetch deps + stale fallback lock-in

**Root cause:** The mount effect deps were `[plans.length]` with a guard `if (plans.length > 0) return;`. When the server fetch failed, `loadPlansFromServer` returned `FALLBACK_PLANS` (3 entries), setting `plans.length` to 3. On any re-mount/dep-change, the guard saw `length > 0` and skipped the refetch — permanently locking the user into stale fallback plans.

**Fix:** `src/hooks/usePaywall.ts`:
- Added `loadedSuccessfullyRef = useRef(false)` (line 152).
- Changed the effect guard from `if (plans.length > 0) return;` to `if (loadedSuccessfullyRef.current) return;` (line 175) — gated on *server* success, not array length.
- Set `loadedSuccessfullyRef.current = true` only when `loaded.source === "server"` (lines 190-192). Fallback data never sets the flag, so it remains retryable.
- Changed effect deps from `[plans.length]` to `[plansSource]` (line 211) — a `"fallback"` state triggers a retry on re-mount / dep change; once `"server"`, the ref blocks further fetches.

**Verification:** `tsc --noEmit` exit 0. `jest` 471 passed (useProfileLogic test suite unaffected).

---

## P2-6 — `userStore.profile` duplicates profileStore onboarding data (SSOT violation)

**Root cause:** Incomplete migration from userStore-centric to profileStore SSOT model. `userStore.profile.personalInfo`/`fitnessGoals`/`bodyMetrics` duplicate `profileStore.personalInfo`/etc. `checkProfileComplete` read the duplicate.

**Fix (minimal safe version — full removal deferred):** Per catalog guidance, full removal touches ~10 reader files outside this partition (App.tsx, constrainedWorkoutGeneration.ts, CreateRecipeModal.tsx, useCreateRecipe.ts, profileValidator.ts, profileValidation.ts, EditContext.tsx). Removing now would break those callers (they'd get `undefined`). Applied the minimal safe version:

`src/stores/userStore.ts:531-601` — `checkProfileComplete` now prefers `profileStore` (the SSOT) for `personalInfo` and `workoutPreferences` reads when profileStore is hydrated, falling back to the passed-in `userStore.profile` copy for backward compatibility. Uses a lazy `require("../stores/profileStore")` (wrapped in try/catch) to avoid a static circular import and survive early-boot/test environments where profileStore may not be initialized. This makes profileStore the authoritative source for the completeness check without breaking existing callers.

**Follow-up (full removal — wide refactor, NOT done this wave):** Remove `personalInfo`/`fitnessGoals`/`bodyMetrics` population from `mapDatabaseProfileToUserProfile` (userProfile.ts:634-695) and update these readers to source from `profileStore` directly:
- `App.tsx:1113-1116` (debug logs)
- `src/ai/constrainedWorkoutGeneration.ts:273,276,306,309`
- `src/components/diet/CreateRecipeModal.tsx:160-163`
- `src/hooks/useCreateRecipe.ts:81-84`
- `src/services/profileValidator.ts:348-364`
- `src/utils/profileValidation.ts:363-401`
- `src/contexts/EditContext.tsx:226`

**Verification:** `tsc --noEmit` exit 0. `jest` 471 passed — `useProfileLogic.test.tsx` mocks profileStore with `getState`, and the lazy require resolves to the mock.

---

## P2-11 — `PaywallModal` hardcodes `TIER_FEATURES` duplicating server-owned features

**Root cause:** Marketing feature copy (the bullet-point lists per tier) lived in a `TIER_FEATURES` constant in `PaywallModal.tsx`, not in the DB. Editing copy required an app release.

**Fix (data layer — UI wiring deferred to UI agent):**
1. **Migration:** `supabase/migrations/20260709000001_add_subscription_plans_features_list.sql` — Append-only `IF NOT EXISTS` migration adding a `features_list JSONB` column to `subscription_plans` and seeding it with the exact copy from `PaywallModal`'s `TIER_FEATURES` (free/basic/pro arrays). Uses `ON CONFLICT (tier) DO UPDATE` so re-running updates copy without duplicates.
2. **`src/hooks/usePaywall.ts`** — Added `features_list?: string[] | null` to `SubscriptionPlanRow` (line 38). Added `planFeaturesByTier: Record<string, string[]>` computed via `useMemo` (lines 401-409), exposed in the hook return (line 425). Maps `tier -> features_list` from the fetched plan rows; empty when plans came from fallback.

**NOTE for the UI agent — exact change needed in `src/components/subscription/PaywallModal.tsx`:**
- Destructure `planFeaturesByTier` from `usePaywall()` (line 48-57 area).
- Replace `const features = TIER_FEATURES[plan.tier] ?? [];` (line 259) with `const features = planFeaturesByTier[plan.tier] ?? TIER_FEATURES[plan.tier] ?? [];` — prefer server-owned copy, fall back to the hardcoded map when the column is NULL or plans came from fallback.
- Replace `TIER_FEATURES.free` (line 247) with `planFeaturesByTier.free ?? TIER_FEATURES.free ?? []`.
- The `TIER_FEATURES` constant (lines 22-41) can be kept as the fallback or removed once the migration is confirmed deployed.

**Verification:** `tsc --noEmit` exit 0. `expo export --platform android` exit 0 (migration is SQL, not bundled).

---

## Gate Results

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | EXIT 0 |
| Jest | `npx jest` | 87 suites passed, 471 tests passed (480 total incl. 9 new), 0 failed, 1 suite skipped |
| Expo export | `npx expo export --platform android` | EXIT 0 (bundle exported, 11.2 MB) |

---

## Files Changed (this agent)

| File | Finding | Change |
|------|---------|--------|
| `src/stores/subscriptionStore.ts` | P2-12, P0-9, P1-18 | `initializeSubscription` passes `preserveExistingOnError:true`; added `setupAppFocusRevalidation()` (AppState listener, 5-min throttle, lazy RN import) |
| `src/services/remoteDataSync.ts` | P0-9, P1-18 | Added subscription `fetchSubscriptionStatus({preserveExistingOnError:true})` to `syncAllRemoteData` (6th promise) |
| `src/services/userProfile.ts` | P1-13 | Replaced `get('occupation_type','occupationType','desk_job')` with `?? undefined` |
| `src/hooks/usePaywall.ts` | P1-19, P2-11 | `loadedSuccessfullyRef` ref-based guard + `plansSource` dep; `planFeaturesByTier` exposed; `features_list` on row type |
| `src/stores/userStore.ts` | P2-6 | `checkProfileComplete` prefers profileStore (SSOT) with lazy require + fallback |
| `supabase/migrations/20260709000001_add_subscription_plans_features_list.sql` | P2-11 | New migration: `features_list JSONB` column + seed data |

## Follow-ups for Other Agents

| Finding | File(s) | Action |
|---------|---------|--------|
| P1-13 (4 remaining desk_job sites) | `src/utils/validation.ts:708`, `src/utils/validation/utils.ts:79`, `src/contexts/edit/data-loaders.ts:80`, `src/services/SyncEngine.ts:586` | Replace `|| "desk_job"` with `?? undefined` |
| P1-14 (units dual-store spread) | `src/hooks/useProfileLogic.ts:177-187` | Delete the `userStore.setProfile({...spread...})` block; profileStore is SSOT |
| P2-11 (UI wiring) | `src/components/subscription/PaywallModal.tsx:259,247,48-57` | Read `planFeaturesByTier` from `usePaywall`; prefer server copy, fall back to `TIER_FEATURES` |
| P2-6 (full removal) | 7 reader files (listed above) | Source personalInfo/fitnessGoals/bodyMetrics from profileStore; remove population in `userProfile.ts:634-695` |
