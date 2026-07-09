# Wave C-02 — Diet Read-Path Consolidation + Dead SQL Function Drop

**Agent:** code-only (flat). **Wave:** C (code-fix).
**Date:** 2026-06-24.
**Scope:** P1-5 (triple-source diet preferences → single SSOT) + P2-10 (dead `get_daily_nutrition_totals` SQL function).
**Authority:** `src/docs/UIUX-DATA-INTEGRITY-GOAL.md` (authoritative spec, Wave C section) + `src/docs/wave-a-04-diet-plan-audit.md` (findings P1-5 / P2-10) + `src/docs/FITAI_DATA_ARCHITECTURE.md` §E.3 (SSOT rule).
**Method:** code-review-graph MCP for structural mapping (graph live, last-updated 2026-06-24T02:16) + Read/Grep for verification. No emulator, no commits, no `supabase db push`.

---

## P1-5 — Triple-source diet preferences → single SSOT

### SSOT identified
**`profileStore.dietPreferences`** (`src/stores/profileStore.ts`, selector at `useMealPlanning.ts:71-73`).

Confirmed authoritative by `FITAI_DATA_ARCHITECTURE.md` §E.3 (Diet Screen table): *"Diet preferences | `profileStore.dietPreferences` | Passed to AI generation"*, and §E.1: *"profileStore (Zustand) = SSOT for all user/onboarding data at runtime"*. It is hydrated synchronously from AsyncStorage (`profile-storage-v2`) via `createDebouncedStorage`, then reconciled with Supabase `diet_preferences` on `DataBridge.loadAllData`. The Zustand subscription is reactive — UI and generation see edits immediately.

### The three pre-fix sources (audit P1-5)
1. **`profileDietPreferences`** — `useProfileStore((s) => s.dietPreferences)` — **THE SSOT** (kept).
2. **`mergedDietPreferences`** — `useMemo(() => buildLegacyDietPreferences(profileDietPreferences), [profileDietPreferences])` — a transform OF the SSOT (`src/utils/profileLegacyAdapter.ts:99-114`), not an independent source. Produces `LegacyDietPreferencesAdapter` (`allergies, restrictions, diet_type, dietType, dislikes`) which the AI client's `DietPreferences` shape historically consumed. **Kept** (it derives from the SSOT; the audit explicitly permits it: *"and the legacy transform if the AI client still needs the legacy shape"*).
3. **`dietPreferences`** — destructured from `useNutritionData()` (`useMealPlanning.ts:102`). This hook fetches `diet_preferences` from Supabase **independently of profileStore** via `nutritionDataService.getUserDietPreferences(userId)` (see `useNutritionData.ts:33-37, 101-105`). Async, can lag the store on cold start and drift after an edit → stale allergens could leak into a freshly generated plan. **REMOVED.**

### Reads removed
| Location (old line) | Before | After |
|---|---|---|
| `useMealPlanning.ts:102` | `const { dietPreferences, loadDailyNutrition } = useNutritionData();` | `const { loadDailyNutrition } = useNutritionData();` (+ explanatory comment block). `loadDailyNutrition` retained (used at line 633 to refresh consumed-nutrition rings after a meal completion — a different concern, owned by the store). |
| `useMealPlanning.ts:348` | `if (!mergedDietPreferences && !dietPreferences) missingItems.push("Diet Preferences");` | `if (!profileDietPreferences) missingItems.push("Diet Preferences");` — checks the SSOT directly. Equivalent because `mergedDietPreferences` is a transform of `profileDietPreferences` (null if SSOT is null). |
| `useMealPlanning.ts:391-394` | `dietPreferences: (profileDietPreferences \|\| mergedDietPreferences \|\| dietPreferences \|\| undefined) as DietPreferences \| undefined` | `const dietPreferencesForAI = profileDietPreferences ?? mergedDietPreferences;` then `dietPreferences: dietPreferencesForAI as DietPreferences \| undefined`. The vestigial Supabase fallback is gone. Added `console.warn` if `dietPreferencesForAI` is null (Principle 8 — surface, don't fabricate). |

### Exact diff (before → after)

**Before (lines 100-102):**
```ts
  const { canUseFeature } = useSubscriptionStore(...) // ... context
  const { dietPreferences, loadDailyNutrition } = useNutritionData();
```

**After (lines 100-110):**
```ts
  // NOTE: useNutritionData still returns `dietPreferences` (an independent Supabase
  // fetch of the diet_preferences table), but that is a VESTIGIAL second source of
  // truth — it can lag profileStore on cold start and drift after an edit, which lets
  // stale allergens leak into a freshly generated plan (Wave A-04 finding P1-5).
  // profileStore.dietPreferences is the authoritative SSOT (architecture doc §E.3),
  // hydrated synchronously from AsyncStorage. We therefore do NOT destructure
  // `dietPreferences` here; we read only `loadDailyNutrition` (used to refresh the
  // consumed-nutrition rings after a meal completion — a different concern).
  const { loadDailyNutrition } = useNutritionData();
```

**Before (lines 348-349):**
```ts
    if (!mergedDietPreferences && !dietPreferences)
      missingItems.push("Diet Preferences");
```

**After (lines 356-360):**
```ts
    // Single source of truth: profileStore.dietPreferences (architecture doc §E.3).
    // The legacy transform `mergedDietPreferences` is derived from this same value,
    // so checking the SSOT alone is sufficient and avoids the stale-fallback drift.
    if (!profileDietPreferences)
      missingItems.push("Diet Preferences");
```

**Before (lines 385-399):**
```ts
      const response = await aiService.generateWeeklyMealPlanAsync(
        legacyPersonalInfo!,
        mergedFitnessGoals!,
        1,
        {
          bodyMetrics: bodyAnalysis || undefined,
          dietPreferences: (profileDietPreferences ||
            mergedDietPreferences ||
            dietPreferences ||
            undefined) as DietPreferences | undefined,
          calorieTarget: userCalorieTarget,
          advancedReview: profileAdvancedReview || undefined,
          skipCache: true,
        },
      );
```

**After (lines 395-422):**
```ts
      // Single source of truth for diet preferences: profileStore.dietPreferences
      // (architecture doc §E.3). The legacy transform `mergedDietPreferences` is
      // derived from this same value (buildLegacyDietPreferences) and is kept only
      // because the AI client's DietPreferences shape historically expects it.
      // We NEVER read diet prefs from useNutritionData (a separate Supabase fetch
      // that can lag the store — see Wave A-04 P1-5). If the SSOT is null here we
      // already surfaced "Profile Incomplete" above; surface a warning rather than
      // fabricate prefs (Principle 8).
      const dietPreferencesForAI =
        profileDietPreferences ?? mergedDietPreferences;
      if (!dietPreferencesForAI) {
        console.warn(
          "[DIET] generateWeeklyMealPlan: profileStore.dietPreferences is null — generating without diet prefs (profileStore SSOT not hydrated).",
        );
      }

      const response = await aiService.generateWeeklyMealPlanAsync(
        legacyPersonalInfo!,
        mergedFitnessGoals!,
        1,
        {
          bodyMetrics: bodyAnalysis || undefined,
          dietPreferences: dietPreferencesForAI as DietPreferences | undefined,
          calorieTarget: userCalorieTarget,
          advancedReview: profileAdvancedReview || undefined,
          skipCache: true, // Always bypass cache — user explicitly requested fresh generation
        },
      );
```

### Happy path preserved
For a user with prefs set: `profileDietPreferences` is non-null (hydrated synchronously from AsyncStorage), `dietPreferencesForAI = profileDietPreferences` (the SSOT), passed to the AI client. No behavioral change to the generation request — same shape, same data, just a single authoritative origin instead of a three-way fallback. The "Profile Incomplete" guard still fires when prefs are absent.

### Null/warning behavior (Principle 8)
If `profileDietPreferences` is null AND `mergedDietPreferences` (its transform) is also null: `dietPreferencesForAI` is null → `console.warn` fires, and `generateWeeklyMealPlanAsync` is called with `dietPreferences: undefined`. In practice the "Profile Incomplete" guard (line 356-360) returns before this point, so generation with null prefs only occurs if the guard was bypassed — the warning makes that visible. No fabricated prefs, no hardcoded fallbacks.

### Blocked change reported for the shared-service owner
**File NOT edited (owned by the parallel Wave C-01 agent):** `src/hooks/useNutritionData.ts`, `src/services/nutritionData.ts`.

The vestigial `dietPreferences` state + `loadDietPreferences` action remain in `useNutritionData.ts` (lines 33-37 interface, 101-105 state). They are now **dead within `useMealPlanning`** (the only consumer that read `dietPreferences` from this hook). Recommended cleanup for the shared-service owner:
- Remove `dietPreferences` from `UseNutritionDataReturn` (interface lines 33-34).
- Remove the `dietPreferences`/`setDietPreferences`/`preferencesLoading`/`preferencesError` state (lines 101-105) and the `loadDietPreferences` callback.
- Remove `getUserDietPreferences`/`loadDietPreferences` from `nutritionDataService` (`src/services/nutritionData.ts`) if no other consumer exists — grep first.

**This is NOT required for the P1-5 fix to be correct.** `useMealPlanning` no longer reads the vestigial field; the dead code in `useNutritionData` is inert w.r.t. generation. Leaving it untouched avoids conflicting with the parallel agent's in-flight edits to those files. The SSOT consolidation in `useMealPlanning.ts` is complete and self-sufficient.

---

## P2-10 — Dead `get_daily_nutrition_totals` SQL function

### What the function was
`get_daily_nutrition_totals(p_user_id UUID, p_date DATE)` — defined in `supabase/migrations/20250129000002_add_session_log_tables.sql:189-214`, with a COMMENT at line 244. Returns `TABLE(total_calories, total_protein_g, total_carbs_g, total_fat_g, total_fiber_g, meals_logged)` computed as `SUM(calories), SUM(protein_g), SUM(carbs_g), SUM(fat_g), SUM(fiber_g)` over `meal_logs WHERE user_id = p_user_id AND DATE(logged_at) = p_date`.

### Why it's corrupt
The live `meal_logs` schema (`src/services/supabase-types.generated.ts:1777-1801`) has columns: `total_calories, total_protein, total_carbohydrates, total_fat` (plus `source_metadata`, `is_completed`, etc.). There is **no** `calories`, `protein_g`, `carbs_g`, `fat_g`, or `fiber_g` column. The table was migrated to new column names but this function body was never updated — any call raises `column "calories" does not exist`.

### Caller count: ZERO
- **code-review-graph `semantic_search_nodes` for `get_daily_nutrition_totals`:** 0 results.
- **Grep across the entire repo** (`get_daily_nutrition_totals`): matches only (a) the function definition in `20250129000002_add_session_log_tables.sql:189`, (b) its COMMENT at `:244`, and (c) the audit doc `wave-a-04-diet-plan-audit.md`. No `.ts`/`.tsx`/`.sql` caller anywhere.
- The two later security-definer migrations (`20251229170010`, `20260401000001`) did not alter or recreate this function's signature (grep confirmed — no `CREATE OR REPLACE` for it outside the original file).

Since there is no caller, there is no contract to preserve. **DROP is correct; REPLACE is not** — a REPLACED function would still be dead code (zero callers), would require inventing a correct body against the live schema (no consumer to validate it), and would mislead future developers into thinking a server-side totals path exists. The client-side SSOT for consumed totals is `nutritionStore.getTodaysConsumedNutrition()` (architecture doc §A.8, P0-2 resolution). A server-side aggregate, if ever needed, should be a new RPC designed against the live schema — not a resurrection of this skeleton.

### Migration created
**File:** `D:\FitAi\FitAI\supabase\migrations\20260624000001_drop_dead_get_daily_nutrition_totals.sql`

**SQL:**
```sql
DROP FUNCTION IF EXISTS public.get_daily_nutrition_totals(UUID, DATE);
```

**Safety:**
- **Append-only (Principle 7):** new migration; the original `20250129000002` migration is untouched.
- **`IF EXISTS` guard:** safe to re-run (no error if the function was already dropped or never existed).
- **Signature-specified `(UUID, DATE)`:** Postgres `DROP FUNCTION` requires the argument types to target the correct overload when more than one exists. Only one signature was ever created; specifying it is belt-and-suspenders and matches the audit's recommended fix verbatim.
- **`public.` schema-qualified:** unambiguous.
- **Naming convention:** matches existing migrations (`YYYYMMDDhhmmss_snake_case_description.sql` — e.g. `20260622000001_tighten_cache_rls.sql`, `20260620000001_add_meal_logs_is_completed.sql`).

**NOT pushed** — per CLAUDE.md, `npx supabase db push` is the orchestrator/user's responsibility. The file is staged and ready; `IF EXISTS` makes it safe to apply regardless of prior state.

### Live-DB inspection caveat
`mcp__supabase__execute_sql` returned `Unauthorized` (the MCP server's access token is not configured; per CLAUDE.md, Supabase credentials live in `.env.local` and deployment uses the CLI, not MCP). Instead I verified the function's existence and column references against `supabase-types.generated.ts` (the architecture doc's stated live-DB source of truth, §G) and the migration source. The generated types confirm the `meal_logs` columns the function references do not exist; the migration source confirms the function definition + signature. The DROP targets exactly that signature. Before running `db push`, the orchestrator may optionally confirm via `npx supabase` CLI (`\df+ get_daily_nutrition_totals`), but the `IF EXISTS` guard makes the migration safe either way.

---

## tsc gate (STEP 3)

```
$ npx tsc --noEmit
---EXIT:0---
```

**Result: exit 0, zero errors** (no pre-existing errors to attribute — fully clean). The `useNutritionData` import is retained (still used for `loadDailyNutrition`); the `DietPreferences` type import is retained (used in the cast); `mergedDietPreferences` is still referenced (lines 383, 405) so it is not an unused local. No new TypeScript errors introduced.

---

## Verdict

**CLEAN.** Both fixes applied within the owned files (`src/hooks/useMealPlanning.ts` + new migration). No edits to the parallel-agent-owned files (`nutritionStore.ts`, `nutritionData.ts`, `useNutritionData.ts`, `completionTracking.ts`, `LogMealModal.tsx`, `nutritionRefreshService.ts`, `useFitnessLogic.ts`). tsc passes exit 0. The single blocked item (vestigial `dietPreferences` dead code in `useNutritionData.ts`/`nutritionData.ts`) is reported for the shared-service owner but is not required for the P1-5 fix to be correct — `useMealPlanning` no longer reads it.

### Files touched
- `src/hooks/useMealPlanning.ts` — 3 edits (destructure, incomplete-check, generation-call).
- `supabase/migrations/20260624000001_drop_dead_get_daily_nutrition_totals.sql` — new file.

### Not touched (correctly)
- `src/hooks/useNutritionData.ts` — vestigial `dietPreferences` remains (reported for owner).
- `src/services/nutritionData.ts` — `getUserDietPreferences` remains (reported for owner).
- All other parallel-agent-owned files.
- No existing migration edited (Principle 7).
- No git commit/add, no `supabase db push`.
