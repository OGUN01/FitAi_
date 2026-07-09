# Wave B Deferred — AdvancedReview Data-Integrity Fixes

**Agent:** code-only (advanced-review partition)
**Date:** 2026-07-09
**Scope:** P0-11, P1-16, P2-7, P2-8 from `src/docs/UIUX-FINDINGS-CATALOG.md`

All fixes are uncommitted. No UI files touched. No new deps. No `Alert.alert`.
No `console.log` in prod paths (only `console.error`/`console.warn` for failures).

---

## P0-11 — AdvancedReview: 9 calculated/validation fields NEVER computed at save time

**Root cause:** `AdvancedReviewService.calculateAndSave` built `advancedReviewData`
from `extended.*` + `m.*` but omitted the 9 fields that `save()` writes:
`total_calorie_deficit`, `data_completeness_percentage`, `reliability_score`,
`personalization_level`, `validation_status`, `validation_errors`,
`validation_warnings`, `refeed_schedule`, `medical_adjustments` (+ `detected_climate`).
These were left `undefined` → persisted as NULL for every user.

**Fix:** `src/services/onboardingService.ts` — `calculateAndSave` (~lines 632-740)
now computes and passes all omitted fields, mirroring `useReviewValidation` so the
service save path and the live UI calc path agree (single source of truth):
- `total_calorie_deficit` — derived from ValidationEngine's capped weekly rate:
  `Math.round(((m.weeklyRate * CALORIE_PER_KG) / 7) * m.timeline * 7)` (matches
  hook BUG-03 derivation). `CALORIE_PER_KG` imported from `./validation/constants`.
- `data_completeness_percentage`, `reliability_score`, `personalization_level` —
  from `extended.*` (master-engine already computes these).
- `validation_status` — `"blocked" | "warnings" | "passed"` from
  `validationResult.hasErrors`/`hasWarnings`.
- `validation_errors`, `validation_warnings` — from `validationResult.errors`/
  `warnings` (cast to declared row shape, parity with hook's `as AdvancedReviewData`).
- `refeed_schedule`, `medical_adjustments` — from `validationResult.adjustments`.
- `detected_climate` — via `detectClimate(country, state)` from
  `../utils/healthCalculations`; wrapped in try/catch → `null` + `console.warn`
  on malformed input (no silent failure, no fabricated fallback per CLAUDE.md #5/#8).
- `detected_ethnicity` — from `extended.detected_ethnicity`.

**Verification:** `tsc --noEmit` exit 0 (validation array casts resolve the
`ValidationResult[]` vs `{field,message,code}[]` shape mismatch). Fields now
flow: ValidationEngine/master-engine → `calculateAndSave` → `save()` → DB.

---

## P1-16 — DataBridge offline-queue guard overbroadly skips ALL profile hydration

**Root cause:** `loadFromDatabase` guard used `offlineService.hasPendingActions()`
which is GLOBAL — any queued `meal_logs`/`workout_sessions` action skipped ALL
profile hydration, causing empty profile screens.

**Fix:** `src/services/DataBridge.ts` (~lines 419-440) — replaced the global
`hasPendingActions()` check with a profile-table-filtered check:
```ts
const PROFILE_TABLES = ["profiles","diet_preferences","body_analysis",
  "workout_preferences","advanced_review"];
const hasPendingProfileAction = PROFILE_TABLES.some(
  (table) => offlineService.getOfflineDataByTable(table).length > 0,
);
```
Hydration now skips ONLY when a profile-related table has a pending offline
write (protecting in-flight local edits), and proceeds for unrelated queues.
Changed `console.error` → `console.warn` (this is an expected, non-error path).
Also removed a pre-existing unused import (`toDbFormat`, `normalizeToSnakeCase`
from `../utils/typeTransformers`) at line 39 — had zero usages in the file.

**Verification:** `tsc` exit 0. Non-profile queues no longer block profile
hydration. Profile-write protection preserved.

**Follow-up (out of partition):** A cleaner signal would be a dedicated
`offlineService.hasPendingActionsForTables(tables: string[])` method on
`OfflineService.ts` that filters the sync queue directly (the current
`getOfflineDataByTable` checks the offline-read cache, which also stores
pending-write entries under `${table}_${id}` keys — reliable but indirect).
Not added because `OfflineService.ts` is outside this agent's partition.

---

## P2-7 — `AdvancedReviewRow` type missing 8 DB columns

**Root cause:** Hand-written `AdvancedReviewRow` not regenerated after migrations
`20260331000000` + `20260406000000`. `load()` uses `select("*")` but built the
return object field-by-field, silently dropping the 8 columns.

**Fix:** `src/types/onboarding/advanced-review.ts` — added 8 columns to
`AdvancedReviewRow` (nullable, matching DB types):
`climate_used` (string|null), `climate_tdee_modifier` (number|null),
`climate_water_modifier` (number|null), `ethnicity_used` (string|null),
`calculations_version` (string|null), `bmr_formula_accuracy` (number|null),
`bmr_formula_confidence` (number|null), `max_heart_rate` (number|null).
Also added the 7 non-`max_heart_rate` columns to `AdvancedReviewData` (the
runtime/UI shape) — `max_heart_rate` already existed there at line 41.

`src/services/onboardingService.ts`:
- `save()` (~lines 814-822) — persists all 8 (`?? null`).
- `load()` (~lines 924-931) — returns all 7 (`max_heart_rate` already returned
  at line 892 in the fitness-metrics block; avoided duplicate key).

**Verification:** `tsc` exit 0 (no duplicate identifiers). Columns now round-trip.

---

## P2-8 — `AdvancedReviewData` retains deprecated/non-DB fields

**Root cause:** H3 cleanup incomplete. `health_score` on `AdvancedReviewRow` is
NOT a DB column (original migration has `overall_health_score`, not `health_score`).

**Fix:** `src/types/onboarding/advanced-review.ts`:
- Removed `health_score` from `AdvancedReviewRow` (was misleading — no such column).
- Kept `health_score` on `AdvancedReviewData` (the runtime/UI type) because
  `userMetricsService.ts:227` reads `advancedReview?.health_score` from the Data
  interface — removing it there would break TS compilation in that out-of-partition
  file. Marked it `@ui-only` with a clear comment.
- Marked `vo2_max_estimate`, `heart_rate_zones`, `usedFallbackDefaults` as
  `@ui-only` (grouped under a clear "UI-only fields (NOT DB columns)" header).
  Kept them on `AdvancedReviewData` because UI readers exist (see follow-ups).
- `save()` already excluded these via explicit field-picking (BUG-46 comment) —
  no change needed there; the type cleanup prevents future dead writes.

**Verification:** `tsc` exit 0. `save()` never wrote these (confirmed). UI readers
still type-check.

**Follow-ups (out of partition — UI/service files that read deprecated fields):**
- `src/services/userMetricsService.ts:227` — reads `advancedReview?.health_score`
  (dead — `load()` never populates it; always falls through to `|| null`). Should
  read `overall_health_score` only.
- `src/hooks/useCalculatedMetrics.ts:560` and `src/hooks/calculated-metrics/mappers.ts:126`
  — read `health_score ?? overall_health_score` (harmless fallback, but the
  `health_score` branch is dead). UI files — not edited per partition rules.
- `src/services/SyncEngine.ts:864,868,897` — reads `vo2_max_estimate`,
  `heart_rate_zones`, `health_score` from `data: any` (no TS impact; maps to a
  local metrics object). Safe but references deprecated names.
- `src/utils/ConsistencyChecker.ts` + `src/utils/consistency-checker/schemas-review.ts`
  — schema definitions still list `health_score`, `vo2_max_estimate`,
  `heart_rate_zones` as review fields. Should be reconciled with the @ui-only marking.

---

## Gate results

| Gate | Command | Result |
|------|---------|--------|
| TypeScript | `npx tsc --noEmit` | **EXIT 0** (zero errors) |
| Jest | `npx jest` | **471 passed, 0 failed, 9 skipped, 87 suites** |
| Bundle | `npx expo export --platform android` | **EXIT 0** (11.2 MB android bundle exported) |

Note: 2 pre-existing `tsc` errors in `src/stores/userStore.ts` (lines 588, 590,
`noUncheckedIndexedAccess`-style strictness on `primary_goals?.length`) are
unrelated to this partition (not in diff, introduced by another agent's
userStore changes) and are NOT flagged by the project's `tsconfig` (exit 0).

---

## Files changed (this agent's partition)

- `src/types/onboarding/advanced-review.ts` — P2-7 (8 columns added to Row + Data),
  P2-8 (removed `health_score` from Row; marked 4 fields @ui-only)
- `src/services/onboardingService.ts` — P0-11 (populate 9 fields in calculateAndSave),
  P2-7 (save/load round-trip 8 columns)
- `src/services/DataBridge.ts` — P1-16 (profile-table-filtered guard) + removed
  pre-existing unused import

## Constraints honored
No new deps. No `Alert.alert`. No `console.log` in prod (only `console.error`/
`console.warn` for genuine failures). No hardcoded fallbacks for user data
(`detected_climate` → null + warn on failure, not a fabricated value). No RLS
bypass. No migrations (type-only + service-logic fixes). No commits. No UI files
edited. No device driving.
