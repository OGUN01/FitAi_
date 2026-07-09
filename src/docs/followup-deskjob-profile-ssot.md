# Follow-up: desk_job fallbacks (P1-13) + profile-edit units SSOT (P1-14)

**Agent:** code-only data-integrity follow-up agent
**Date:** 2026-07-09
**Scope:** P1-13 (4 remaining `desk_job` user-data fallbacks) + P1-14 (profile-edit units save dual-store)
**Partition:** `src/contexts/edit/data-loaders.ts`, `src/services/SyncEngine.ts`, `src/utils/validation.ts`, `src/utils/validation/utils.ts`, `src/hooks/useProfileLogic.ts`, `src/__tests__/hooks/useProfileLogic.test.tsx`

---

## P1-13 — Hardcoded `desk_job` fallback for deprecated `occupation_type`

### Root cause
`occupation_type` is a deprecated, nullable column (activity_level in workout_preferences is the SSOT). Five `|| "desk_job"` fallbacks fabricated user data when the user never selected an occupation, violating CLAUDE.md Principle 8 (no hardcoded fallbacks for user data). One site (`userProfile.ts:649-654`) was already fixed in a prior wave; 4 remained.

### Fixes (4 sites — value-literal replacement only)

| # | File:line | Before | After |
|---|-----------|--------|-------|
| 1 | `src/contexts/edit/data-loaders.ts:80` | `occupation_type: profileStorePI?.occupation_type \|\| "desk_job"` | `occupation_type: profileStorePI?.occupation_type` (the `?.` already guards; `undefined` is the correct value) |
| 2 | `src/services/SyncEngine.ts:585` | `data.occupation_type \|\| data.occupationType \|\| "desk_job"` | `(data.occupation_type ?? data.occupationType) ?? undefined` |
| 3 | `src/utils/validation.ts:708` | `occupation_type: info.occupation_type \|\| "desk_job"` | `occupation_type: info.occupation_type ?? undefined` |
| 4 | `src/utils/validation/utils.ts:79` | `occupation_type: info.occupation_type \|\| "desk_job"` | `occupation_type: info.occupation_type ?? undefined` |

### Type safety verification
`PersonalInfo.occupation_type` is declared `?: "desk_job" | "light_active" | "moderate_active" | "heavy_labor" | "very_active"` (`src/types/user.ts:46-51`). The `?:` makes `undefined` assignable. `userProfile.ts:649-654` (the doc comment + cast) confirms the union is `... | undefined`. All 4 receiving types accept `undefined`. No downstream consumer requires a non-undefined value — `occupation_type` is read only by the deprecated occupation-detection path which already null-guards.

### Untouched (legitimate — MUST stay)
Per task constraints, these enum definitions / option labels / health-calc multipliers were NOT touched: `WorkoutPreferencesConstants.ts:248`, `PersonalInfoConstants.ts:97`, `types/user.ts:47`, `types/onboarding/personal-info.ts:29,63`, `utils/ConsistencyChecker.ts:148`, `utils/consistency-checker/schemas-user.ts:56`, `utils/healthCalculations.ts:228`, `utils/healthCalculations/autoDetection.ts:550`, `utils/healthCalculations/core/tdeeCalculation.ts:51,193`, `utils/healthCalculations/metabolic.ts:182`, `utils/healthCalculations/types.ts:80`, `__tests__/services/dataManager.test.ts:67`, `userProfile.ts:649-654`.

---

## P1-14 — Profile-edit units save dual-store (userStore + profileStore)

### Root cause
`useProfileLogic.ts` `handleUnitsSelect` hand-rolled a `userStore.setProfile({...spread..., personalInfo:{...units}, preferences:{...units}})` after `userProfileService.updateProfile` wrote Supabase. This duplicated the units value across two stores (userStore.profile + profileStore), violating the SSOT principle. `userStore.profile` is auth-only per its header comment.

### Fix
`src/hooks/useProfileLogic.ts:166-201` — deleted the `userStore.setProfile` spread block (old lines 177-187). The units save path now uses only:
1. `updatePersonalInfo({ units })` — writes profileStore (the SSOT for personalInfo).
2. `userProfileService.updateProfile(currentUserId, { units })` — writes Supabase via the partial-update API (`UpdateProfileRequest extends Partial<PersonalInfo>`, `src/types/user.ts:335`).

`dataBridge.savePersonalInfo` was investigated but rejected: its signature is `(data: PersonalInfoData | PersonalInfo, userId?)` — it requires a FULL PersonalInfo object, not a partial `{ units }`. Using it for a units-only update would require fabricating the full personalInfo (re-introducing hardcoded fallbacks) or reading+merging the entire SSOT snapshot. The narrow `userProfileService.updateProfile` partial-update API is the correct tool for a single-field update; `updatePersonalInfo` is the correct SSOT store writer (it accepts `Partial<PersonalInfoData>` and shallow-merges).

### Test update
`src/__tests__/hooks/useProfileLogic.test.tsx` — the units test was rewritten to assert the new correct behavior:
- `updatePersonalInfo` called with `{ units: "imperial" }` (SSOT write).
- `userProfileService.updateProfile` called with `("user-1", { units: "imperial" })` (Supabase write).
- `setProfile` NOT called (proves the dual-store spread is gone).

**Latent test bug fixed:** the old `jest.mock("../../services/userProfile", ...)` factory referenced `mockUpdateProfile` (a top-level `const`), but Jest hoists `jest.mock` above `const` declarations, so the factory captured `undefined`. The old test never asserted `updateProfile` was called, so this was latent — calling `undefined()` threw, was swallowed by the silenced `console.error` catch, and went unnoticed. Fixed by defining `jest.fn().mockResolvedValue(...)` INSIDE the factory and asserting against the imported `userProfileService.updateProfile` mock.

### `userStore.setProfile` callers
Traced all readers of `userStore.setProfile`: only `useProfileLogic.ts:182` (the units handler, now removed) called it directly. `setProfile` remains as a store method (`userStore.ts:470`) for auth-path profile hydration — no change needed there. No other caller depends on the removed spread.

---

## Pre-existing dead code removed (coordinator-flagged, in-partition)

The desk_job edits were pure value-literal removals and did NOT orphan any imports/params. However, the coordinator flagged 5 unused-binding warnings; all were verified pre-existing at HEAD (not caused by these edits) and all were in-partition, so they were removed to keep the tree clean:

| File:line | Symbol | Action |
|-----------|--------|--------|
| `src/contexts/edit/data-loaders.ts:1-6` | unused type imports `PersonalInfo, FitnessGoals, DietPreferences, WorkoutPreferences` (speculatively imported, never referenced) | Removed the import block |
| `src/services/SyncEngine.ts:507` | `syncAllInternal(userId)` — `userId` param never read in body (only the public `syncAll(userId)` delegate passes it) | Dropped param from `syncAllInternal` + updated call site at line 503 |
| `src/utils/validation.ts:4` | `MealLog` imported, never used | Removed from import |
| `src/utils/validation.ts:32` | `interface BodyMeasurement` declared, never used | Removed interface |
| `src/utils/validation.ts:757` | `private sanitizeActivityLevel` method, never called | Removed method |

---

## Gate results

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | EXIT 0 (zero errors, zero warnings) |
| Jest | `npx jest` | 87 suites passed (1 skipped), 471 tests passed, 9 skipped, 0 failed — matches catalog baseline |
| Expo bundle | `npx expo export --platform android` | EXIT 0 (bundle exported: `AppEntry-032e90e3e5262d87d2219a10b2178294.hbc`, 11.2 MB) |

---

## Follow-ups

1. **P2-6 (Wave E):** `userStore.profile` still duplicates `personalInfo`/`fitnessGoals`/`bodyMetrics` from profileStore (broader SSOT violation). The P1-14 fix removed one duplication site (units); the full `UserProfile` shape cleanup is a separate, larger Wave E task.
2. **`dataBridge.savePersonalInfo` partial-update gap:** There is no narrow "update one field" API on DataBridge. A future improvement could add `dataBridge.updatePersonalInfoFields(partial, userId)` that merges against the current SSOT snapshot before calling `PersonalInfoService.save`, so hooks don't need to choose between `updatePersonalInfo` (store-only) and `userProfileService.updateProfile` (DB-only). Not needed for P1-14.
3. **`SyncEngine.syncAllInternal` unused param:** Now dropped. If a future change needs `userId` inside `syncAllInternal` (e.g. user-scoped queue processing), re-add it.
