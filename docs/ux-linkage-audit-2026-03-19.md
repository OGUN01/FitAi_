# FitAI UX Linkage Audit

Date: 2026-03-19
Status: approved, remaining-surface list exhausted

This is the canonical UX/linkage audit for the current Ralph loop.

## Scope

- Navigation and screen linkage
- Interaction and flow correctness
- State clarity and trust
- Forms and edit flows
- Daily/weekly timeline correctness
- Subscription and entitlement UX
- Reliability and context preservation
- Accessibility/usability issues that materially affect function

## Review Method

- Read the current app entry, navigation, screens, hooks, stores, and services.
- Cross-check against existing architecture audit findings from 2026-03-19.
- Validate only confirmed UX/linkage issues.
- Fix issues in batches, highest risk first.

## Open Reviewed Issues

- None currently in the batch-reviewed surfaces.

## Fixed In This Loop

### NUT-01 High: Diet screen was still stitching together two daily-meal truths

- Severity: High
- User-facing symptom:
  The Diet screen could duplicate or hide manual meals, show misleading meal counts, and blank the main surface when a secondary meal-history fetch failed even though store-backed data was already present.
- Root cause:
  `DietScreen` mixed `useNutritionStore().dailyMeals` with `useNutritionData().userMeals` and tried to deduplicate them heuristically by lowercased name plus date.
- Source-of-truth problem:
  The daily manual-meal list on the Diet surface had no single owner.
- Affected files:
  - `src/screens/main/DietScreen.tsx`
  - `src/hooks/useNutritionData.ts`
  - `src/stores/nutritionStore.ts`
- Precise fix plan:
  Feed the Diet screen from reconciled store-backed `dailyMeals`, derive counts from the same store-backed daily-nutrition model, and stop letting the secondary fetch control primary loading/error UI.
- Status:
  Fixed in Batch 1.

### NUT-02 High: authenticated nutrition hydration preserved stale remote-backed manual meals

- Severity: High
- User-facing symptom:
  After refresh or rehydration, edited or deleted manual meals could remain visible as if they were still current.
- Root cause:
  `nutritionStore.loadData()` appended hydrated `meal_logs` rows around existing `dailyMeals` state instead of rebuilding the authenticated remote-backed daily list.
- Source-of-truth problem:
  The authenticated daily meal list had no remote-first reconciliation rule.
- Affected files:
  - `src/stores/nutritionStore.ts`
- Precise fix plan:
  Rebuild remote daily meals from `meal_logs` and preserve only genuinely local-only, non-remote entries.
- Status:
  Fixed in Batch 1.

### LINK-01 Medium-high: Analytics summary cards advertised taps that did nothing

- Severity: Medium-high
- User-facing symptom:
  Workout, calories, and water cards in Analytics were pressable and triggered haptics, but some taps performed no navigation at all.
- Root cause:
  `AnalyticsScreen.handleMetricPress()` no-oped for several metrics even though `MetricSummaryGrid` rendered all cards as tappable.
- Source-of-truth problem:
  Not a data-truth issue; the interaction contract itself was inconsistent.
- Affected files:
  - `src/screens/main/AnalyticsScreen.tsx`
  - `src/screens/main/analytics/MetricSummaryGrid.tsx`
- Precise fix plan:
  Route each tappable metric card to the matching flow: Workout, Diet log meal, or Diet water logging.
- Status:
  Fixed in Batch 2.

### LINK-02 Medium-high: Home meal/hydration CTAs opened a generic tab instead of the promised action

- Severity: Medium-high
- User-facing symptom:
  Home's empty-meals CTA and hydration tracker tap took the user to a generic screen or placeholder alert instead of opening the matching meal/water flow.
- Root cause:
  `HomeScreen` used coarse tab navigation for action-specific CTAs.
- Source-of-truth problem:
  Not a data-truth issue; the navigation intent was too weak for the promised CTA.
- Affected files:
  - `src/screens/main/HomeScreen.tsx`
  - `src/screens/main/DietScreen.tsx`
- Precise fix plan:
  Reuse existing Diet route params (`openLogMeal`, `openWaterModal`) for direct action deep links.
- Status:
  Fixed in Batch 2.

### PROF-01 High: units preference subtitle could drift from the profile source of truth

- Severity: High
- User-facing symptom:
  The Profile settings subtitle for units could show a stale local preference even after the canonical profile units were updated.
- Root cause:
  `useProfileLogic` hydrated `unitsPreference` from AsyncStorage but did not resync it from `profileStore.personalInfo.units` when profile data became authoritative.
- Source-of-truth problem:
  The settings UI had a local preference shadow instead of following the canonical profile units field.
- Affected files:
  - `src/hooks/useProfileLogic.ts`
  - `src/hooks/useHomeLogic.ts`
  - `src/screens/main/ProfileScreen.tsx`
- Precise fix plan:
  Sync the local settings state from `profileStore.personalInfo.units` whenever that canonical value changes.
- Status:
  Fixed in Batch 3.

### Previously confirmed and now fixed

- Cooking completion return path
- Hydration goal settings navigation
- Android back handling for Achievements
- Home quick-action deep links into Diet subflows
- Workout completion `View Progress` CTA routing
- Authenticated incomplete onboarding bypass to onboarding completion
- Personal-info modal removal of height/weight shadow edits
- Analytics period-consistency breakdown
- Analytics loading-state honesty
- Home/Progress no longer overwrite shared analytics history
- Android onboarding hardware-back consistency
- Ingredient detail modal removal of fake `Next Step`
- Achievements loading-state honesty
- Progress Trends unit alignment
- Notifications unavailable-state guard
- Migration/cloud-sync honesty guard

## Fix Batches

### Batch 1: Nutrition daily-truth reconciliation

- Replaced Diet-screen manual-meal rendering with the store-backed `dailyMeals` list.
- Removed the secondary `userMeals` fetch from the Diet screen's primary blocking/loading path.
- Reconciled authenticated daily manual meals to a remote-first store view plus local-only non-remote entries.
- Aligned `useNutritionData.refreshAll()` with `useNutritionStore.loadData()` so refresh flows keep the Diet surface and store in sync.

### Batch 2: CTA/linkage cleanup

- Routed Analytics metric cards to real destinations instead of silent no-op taps.
- Routed Home's empty-meals CTA directly into meal logging.
- Routed Home hydration taps directly into water logging.

### Batch 3: Profile units truth alignment

- Synced the Profile settings units state from `profileStore.personalInfo.units`.
- Persisted the canonical units value back into AsyncStorage so the settings subtitle and cross-screen measurement readers stay aligned.

### Batch 4: Home-to-Diet action deep links and targeted regression coverage

- Routed Home quick actions into explicit Diet subflows instead of generic tab switches.
- Added Diet route-param consumers for meal logging, water logging, barcode options, label scanning, recipe creation, and scan-food entry.
- Added targeted regression coverage for MainNavigation param handoff and shared units-state synchronization.

### Batch 5: Verification unblock for shared fitness history types

- Normalized the local completed-workout history item type so `WorkoutHistoryList` handlers and `FitnessScreen` props agree.
- Restored clean project type-check output needed for trustworthy verification.

### Batch 6: Workout completion CTA honesty

- Routed `View Progress` in `WorkoutSessionScreen` to the real Progress surface.
- Kept `Done` as the plain return action.

### Batch 7: Onboarding/profile flow truth alignment

- Authenticated users with incomplete onboarding now bypass the welcome splash and resume onboarding completion directly.
- Height and weight were removed from `PersonalInfoEditModal` so body measurements have one canonical edit surface.
- Profile settings copy was updated to match the canonical body-measurements flow.

### Batch 8: Analytics period and loading consistency

- `AnalyticsScreen.calBreakdown` now uses the same selected-period logic as the rest of Analytics.
- `useHomeLogic` and `useProgressScreen` no longer overwrite shared analytics history with hardcoded 90-day writes.
- `AnalyticsScreen` now sets `isDataLoading` at request start so its loading state matches the real fetch lifecycle.

### Batch 9: Remaining control/state honesty fixes

- Android onboarding hardware back now matches the visible back button and steps back through tabs.
- `IngredientDetailModal` no longer advertises a fake `Next Step` action.
- `AchievementsScreen` now shows a real loading state instead of a false empty state during initialization.
- `ProgressTrendsScreen` now respects the canonical profile unit setting for weight trends.
- `NotificationsScreen` now shows an unavailable state when notification modules fail to load instead of rendering broken controls.

### Batch 10: Migration/cloud-trust honesty

- Migration integration now blocks unsupported cloud-sync and conflict-resolution flows instead of allowing a path that can report false success.
- `DataBridge` now marks failed remote loads as degraded local fallback with sync error state instead of silently presenting them as database truth.

## Remaining Reviewed Risks

- Lint output for touched files is still dominated by pre-existing formatting/parser noise in already-dirty files, so it is not yet a clean regression signal for this loop.
- Runtime-only native/provider edge cases still exist as residual risk, but no confirmed UX/linkage issue remains in the reviewed surfaces.
- No remaining unreviewed surface groups are left in this code-side audit sweep.

## Final Verdict

Approved. No confirmed UX/linkage issue remains in the reviewed code surfaces, and the remaining-surface list for this audit sweep is empty.
