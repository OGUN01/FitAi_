# Wave C — Deferred Diet-Type / Null / useEffect Fixes

**Agent:** code-only (partition: `useOnboardingLogic.ts`, `onboardingService.ts`, `typeTransformers.ts`, `useMealPlanning.ts`, `healthCalculations/*`)
**Date:** 2026-07-09
**Scope:** P1-12, P1-15, P1-23, P2-5 from `src/docs/UIUX-FINDINGS-CATALOG.md`

---

## P1-12 — `dietType` type-lying cast drops `"balanced"` from the union

**Root cause:** `useOnboardingLogic.ts:597` cast the result of `dp?.diet_type || "balanced"` to a 4-value union (`"vegetarian" | "vegan" | "non-veg" | "pescatarian"`) that excluded `"balanced"` — a valid onboarding `diet_type` (present in the `DietPreferencesData` union at `src/types/onboarding/diet-preferences.ts:13` and the DB CHECK constraint, and in `DietPreferences` at `src/types/user.ts:149`). The cast was type-lying: a user who selected "balanced" had a value the type asserted could never exist.

**Downstream verification (balanced is handled everywhere):**
- `src/utils/typeTransformers.ts:346` `mapDietTypeForHealthCalc` — explicit `case "balanced": return "omnivore"` (lines 354-356). Already correct.
- `fitai-workers/src/utils/validation.ts:444` — `diet_type: z.string().optional()` (no enum constraint; any string accepted). No exclusion.
- `src/services/aiRequestTransformers.ts` — passes `diet_type` through as a string. No enum filter.
- `mapDietTypeForOnboarding` inverse maps `omnivore → "balanced"`. Symmetric.

**Fix:** `src/hooks/useOnboardingLogic.ts:597` — removed the cast; now `dietType: dp?.diet_type ?? "balanced"`. The value flows as the full 5-value union including `"balanced"`. Also switched `||` to `??` so an empty-string `diet_type` (a bug state) is not coerced to `"balanced"` — only `null`/`undefined` fall back.

**Verification:** `npx tsc --noEmit` — zero errors in edited files. `"balanced"` now type-checks at every downstream consumer.

---

## P1-15 — `snacks_count` default divergence (DB=1, type optional, onboarding passed undefined)

**Root cause:** DB column `snacks_count` has `DEFAULT 1` (migration `supabase/migrations/20260413064102_fix_snacks_count_default_to_1.sql`). The app type (`DietPreferencesData.snacks_count?: number`) is optional. The onboarding completion path (`useOnboardingLogic.ts:606`) passed `dp?.snacks_count` (undefined when the user never touched a count — which is always, since the UI has only a single Snacks *toggle*, no count picker). Downstream `aiRequestTransformers.ts:79` already defended with `?? 1`, and `onboardingService.ts:176,268` defended with `?? 1`, but the divergence (type says optional, DB says required-with-default, form passes undefined) was the integrity smell.

**Fix (form level, in partition):** `src/hooks/useOnboardingLogic.ts:606` — `snacks_count: dp?.snacks_count ?? 1`. This sets the form default to 1, matching the documented DB default. This is NOT a hardcoded fallback for user data (CLAUDE.md Principle 8): 1 is the SSOT default value for this field (the UI has no count picker, so 1 is the only correct value); undefined was the bug.

**Type change NOT applied (out of partition):** The catalog recommends making `snacks_count: number` (required) in the type. The type files `src/types/onboarding/diet-preferences.ts:17` (`DietPreferencesData`) and `src/types/user.ts:153` (`DietPreferences`) are OUTSIDE my partition. Making the field required there is a follow-up (see below). The form-level `?? 1` makes the runtime value always defined regardless, so this is non-blocking.

**Verification:** `npx tsc --noEmit` — zero errors. Downstream `aiRequestTransformers.ts:79` `?? 1` and `onboardingService.ts:176,268` `?? 1` remain as defense-in-depth (now always receive a defined number, so the fallbacks never fire for the onboarding path).

---

## P1-23 — `getDietPreferences` null dereference on Home load

**Root cause:** When a user has no `diet_preferences` row, `supabase...maybeSingle()` returns `data: null`. `src/services/userProfile.ts:399` calls `fromDb(null)` (returns null), then line 406 reads `transformedData.dietType` → `TypeError: Cannot read property 'dietType' of null`. Caught by the outer try/catch and logged, but the function returns `{success: false}` instead of a graceful `{success: true, data: null}`, so the caller (`getCompleteProfile` at line 322-335) skips attaching diet preferences — a silent-ish failure logged to console but degrading the profile load.

**Fix NOT applied (out of partition):** `src/services/userProfile.ts` is NOT in my partition. The fix belongs at `userProfile.ts:398-448`: add a null guard immediately after the error check — `if (!data) { console.warn("[userProfile] getDietPreferences: no row for user — returning null"); return { success: true, data: null }; }` before `fromDb(data)`. This converts the throw into a graceful null (no silent failure — `console.warn` surfaces it per CLAUDE.md #5).

**Caller trace (confirms null is handled):** `getCompleteProfile` (`userProfile.ts:332-335`) guards with `if (dietResponse.success && dietResponse.data)` before assigning `userProfile.dietPreferences = dietResponse.data`. A `{success: true, data: null}` return is handled correctly (the `&&` short-circuits, dietPreferences stays unset). So returning null is safe.

**Follow-up (other file):** `src/services/userProfile.ts:398` — add the null guard described above. This is the single-line fix; it is safe and tested by the existing caller path.

---

## P2-5 — `useEffect` in `useMealPlanning` over-broad deps risk re-fetch loops

**Root cause:** `src/hooks/useMealPlanning.ts` guest-branch hydration `useEffect` had deps `[dailyMeals.length, loadNutritionStoreData, Object.keys(mealProgress).length, user?.id, weeklyMealPlan?.id]`. The derived lengths (`dailyMeals.length`, `Object.keys(mealProgress).length`, `weeklyMealPlan?.id`) are store state that the fetch itself mutates (`loadNutritionStoreData` writes `weeklyMealPlan`/`mealProgress`/`dailyMeals`). So the effect could re-fire on the store churn it caused — a latent re-fetch loop (CLAUDE.md useEffect rule #10 violation: no `useRef` guard).

**Fix:** `src/hooks/useMealPlanning.ts`:
1. Added `hasFetchedGuestDataRef = useRef(false)` (line 45) — stable one-shot guard for the guest branch, mirroring the existing `lastRemoteHydratedUserIdRef` pattern used for the authenticated branch.
2. Guest branch now checks `hasFetchedGuestDataRef.current` FIRST (returns early if already attempted), then evaluates the warm-data check, then sets `hasFetchedGuestDataRef.current = true` BEFORE fetching — so the effect fires at most once per guest session regardless of store churn.
3. The authenticated branch resets `hasFetchedGuestDataRef.current = false` on transition (so a later sign-out → guest path can fetch once again).
4. Deps array reduced to `[loadNutritionStoreData, user?.id]` — both stable (store action ref + auth id). Removed the derived-length deps that caused the loop.

**Warm-data check PRESERVED:** The `hasHydratedDietData` check (`Boolean(weeklyMealPlan) || Object.keys(mealProgress).length > 0 || dailyMeals.length > 0`) is kept so a guest with existing local data is NOT redundantly refetched (this is the behavior the existing test asserts). `dailyMeals` remains read at line 174 — NOT unused.

**P1-2 SSOT read path NOT reverted:** The `profileDietPreferences` read from `useProfileStore` (lines 78-80) and the `mergedDietPreferences` memo (lines 92-95) are untouched. The P1-2 fix (read only profileStore SSOT, not the vestigial `useNutritionData.dietPreferences`) is intact.

**Verification:** `src/__tests__/hooks/useMealPlanning.test.ts` passes — "skips redundant initial hydration when meal data is already warm" (warm data → no fetch). The ref guard + warm-data check together satisfy both the test and the no-loop requirement.

---

## Gate results

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | EXIT 0 (zero errors — edited files produce zero errors; 3 pre-existing errors in `onboardingService.ts`/`advanced-review.ts` from other agents' concurrent uncommitted work were resolved by the UI-sweep agent) |
| Jest | `npx jest` | 87 suites passed, 471 tests passed, 9 skipped, 0 failed |
| Expo export | `npx expo export --platform android` | EXIT 0 (bundle exported: `AppEntry-...hbc` 11.2 MB) |

---

## Follow-ups (files OUTSIDE my partition)

1. **P1-23 (REQUIRED):** `src/services/userProfile.ts:398` — add null guard before `fromDb(data)`:
   ```ts
   if (!data) {
     console.warn("[userProfile] getDietPreferences: no diet_preferences row for user — returning null");
     return { success: true, data: null };
   }
   ```
   Caller (`getCompleteProfile:332-335`) already handles `data: null` via `if (dietResponse.success && dietResponse.data)`. Safe, single-line, tested by existing path.

2. **P1-15 (type hardening, optional):** Make `snacks_count: number` (required, non-optional) in:
   - `src/types/onboarding/diet-preferences.ts:17` (`DietPreferencesData`)
   - `src/types/user.ts:153` (`DietPreferences`)
   The `DietPreferencesRow` (DB row type, `diet-preferences.ts:68`) must STAY `snacks_count?: number | null` since the DB column is nullable. The form-level `?? 1` fix already guarantees a defined runtime value, so this is type-hygiene only — non-blocking.
