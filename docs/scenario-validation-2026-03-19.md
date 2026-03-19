# FitAI Scenario Validation

Date: 2026-03-19
Purpose: validate the architecture audit against executable scenarios before starting the fix phase.

## Overall Verdict

The architecture audit is reinforced by runtime and test evidence, but the app is not comprehensively scenario-validated yet.

- Strongest coverage today:
  - worker subscription lifecycle and gating
  - worker API auth/validation boundaries
  - isolated helper/unit behavior for week helpers, app config parsing, quick workout visibility, weight tracking service, health-connect write mapping
  - offline queue simulation and onboarding/profile migration transformation scripts
- Weakest coverage today:
  - nutrition SSOT scenarios
  - workout regeneration identity and hydration reconciliation
  - stale-cache fallback behavior
  - migration resume/rollback
  - cross-screen date/period consistency
  - health-store sync ingestion and duplicate prevention
  - profile/body fallback precedence across stores

## Commands Executed

### App tests

```powershell
npx jest src/__tests__/services/offline.validation.test.ts src/__tests__/services/offline.rollback.test.ts src/__tests__/services/dataTransformation.mealLogs.test.ts src/__tests__/utils/weekUtils.test.ts src/__tests__/hooks/useQuickWorkouts.test.ts src/__tests__/hooks/useAppConfig.test.tsx src/__tests__/services/auth.sessionLifecycle.test.ts src/__tests__/services/WeightTrackingService.test.ts --runInBand
```

Result:
- Passed: `useAppConfig`, `dataTransformation.mealLogs`, `auth.sessionLifecycle`, `WeightTrackingService`, `useQuickWorkouts`
- Failed: `offline.validation`, `weekUtils`
- Skipped block present in `offline.rollback`

```powershell
npx jest src/__tests__/services/health/healthConnectWrite.test.ts src/__tests__/utils/clearUserData.test.ts --runInBand
```

Result:
- Passed: both suites

```powershell
npx jest src/__tests__/services/dataManager.test.ts --runInBand
```

Result:
- Failed: entire suite (`11/11`) due broken harness: `useProfileStore.getState is not a function`

### Worker tests

```powershell
npm --prefix fitai-workers test -- subscription.test.ts subscription.regression.test.ts subscriptionGate.test.ts usageTracker.test.ts razorpay.test.ts
```

Result:
- Passed: `54/54`

```powershell
npm --prefix fitai-workers run test:api -- e2e/diet.api.spec.ts e2e/workout.api.spec.ts
```

Result:
- Passed: `10`
- Skipped: `2` authenticated happy-path tests

```powershell
npm --prefix fitai-workers run test:api -- e2e/health.api.spec.ts
```

Result:
- Passed: `5/5`

### Scenario scripts

```powershell
node scripts/test-offline-sync.mjs
```

Result:
- Passed overall with `72 PASS / 0 FAIL / 2 WARN`
- Warnings exposed real schema/contract problems:
  - `workout_sessions.workout_id` null constraint rejection in live insert path
  - one `profiles`-related verification warning in the script, likely caused by the script's query assumption rather than proof that the live table is missing

```powershell
node scripts/test-migration-complete.js
```

Result:
- Passed for onboarding/profile transformation logic only
- Confirms transformation coverage, not full guest-history migration

## Scenario Matrix

### Nutrition

| Scenario | Status | Evidence | Conclusion |
|---|---|---|---|
| Planned meal completion round-trips to same plan slot via `plan_meal_id` / `from_plan` | `uncovered` | [completionTracking.ts](/D:/FitAi/FitAI/src/services/completionTracking.ts#L365), [meal-completion.ts](/D:/FitAi/FitAI/src/services/completion-tracking/meal-completion.ts#L68), [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L787) | No automated scenario proves planned meal identity survives reload/device/regeneration. |
| Single active `weekly_meal_plans` invariant | `uncovered` | [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L233), [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L271), [20260124000001_add_missing_data_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260124000001_add_missing_data_tables.sql#L391) | No automation covers retries, multi-device writes, or ambiguity rejection. |
| Hydration rebuilds `mealProgress` from remote truth | `partially covered` | [dataTransformation.mealLogs.test.ts](/D:/FitAi/FitAI/src/__tests__/services/dataTransformation.mealLogs.test.ts#L7), [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L783) | Helper transform is tested, store reconciliation is not. |
| Canonical history stays on `meal_logs` instead of split `meals` / `meal_logs` behavior | `uncovered` | [useMealEdit.ts](/D:/FitAi/FitAI/src/hooks/useMealEdit.ts#L168), [MealEditModal.tsx](/D:/FitAi/FitAI/src/components/diet/MealEditModal.tsx#L193), [analyticsData.ts](/D:/FitAi/FitAI/src/services/analyticsData.ts#L239) | No scenario test proves edits/history stay on the same table as completion/logging. |
| Diet/Home/Progress/Analytics agree on today’s calories and meal counts | `uncovered` | [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L339), [useHomeLogic.ts](/D:/FitAi/FitAI/src/hooks/useHomeLogic.ts#L359), [progress-screen/data.ts](/D:/FitAi/FitAI/src/hooks/progress-screen/data.ts#L96), [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L166) | No cross-screen SSOT assertion exists. |
| Diet API auth/body validation | `covered` | [diet.api.spec.ts](/D:/FitAi/FitAI/fitai-workers/e2e/diet.api.spec.ts) | API boundary is covered, not persistence/sync invariants. |

### Workout Identity And Regeneration

| Scenario | Status | Evidence | Conclusion |
|---|---|---|---|
| Today planned-workout completion visibility via `completedSessions` | `covered` | [useQuickWorkouts.test.ts](/D:/FitAi/FitAI/src/__tests__/hooks/useQuickWorkouts.test.ts) | One reader is validated against canonical completed sessions. |
| Monday-based week helper behavior | `partially covered` | [weekUtils.test.ts](/D:/FitAi/FitAI/src/__tests__/utils/weekUtils.test.ts) | Helper exists, but the suite currently fails on a timezone-sensitive `isSameDay` assertion. |
| Hydration reconciliation from `workout_sessions` back to planned slots | `partially covered` | [fitnessStore.ts](/D:/FitAi/FitAI/src/stores/fitnessStore.ts#L593), [fitnessStore.ts](/D:/FitAi/FitAI/src/stores/fitnessStore.ts#L697) | Code exists, but there is no direct scenario test for cross-device hydration or stale-local reconciliation. |
| Active-plan rollover safety | `uncovered` | [fitnessStore.ts](/D:/FitAi/FitAI/src/stores/fitnessStore.ts#L123), [fitnessStore.ts](/D:/FitAi/FitAI/src/stores/fitnessStore.ts#L171) | No scenario covers save failure between deactivate/create or multi-device contention. |
| Stable slot identity across regeneration | `uncovered` | [useFitnessLogic.ts](/D:/FitAi/FitAI/src/hooks/useFitnessLogic.ts#L309), [useFitnessLogic.ts](/D:/FitAi/FitAI/src/hooks/useFitnessLogic.ts#L619) | No automated scenario proves same logical slot keeps identity through regenerate. |
| Worker generation contract guarantees per-workout identity | `uncovered` | [validation.ts](/D:/FitAi/FitAI/fitai-workers/src/utils/validation.ts#L255), [workout.api.spec.ts](/D:/FitAi/FitAI/fitai-workers/e2e/workout.api.spec.ts) | Current worker API tests cover auth/validation, not slot identity semantics. |

### Offline, Hydration, Migration

| Scenario | Status | Evidence | Conclusion |
|---|---|---|---|
| Offline queue replay mechanics | `partially covered` | [offline.validation.test.ts](/D:/FitAi/FitAI/src/__tests__/services/offline.validation.test.ts), [test-offline-sync.mjs](/D:/FitAi/FitAI/scripts/test-offline-sync.mjs) | Replay mechanics are exercised, but current evidence also confirms destructive purge behavior and live schema warnings. |
| Rollback after failed optimistic sync | `partially covered` | [offline.rollback.test.ts](/D:/FitAi/FitAI/src/__tests__/services/offline.rollback.test.ts) | Intended tests exist, but the rollback block is skipped today. |
| Remote read failure surfaces divergence instead of stale local fallback | `uncovered` | [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L231) | No runnable scenario found. |
| Guest-to-user migration including fitness history | `partially covered` | [test-migration-complete.js](/D:/FitAi/FitAI/scripts/test-migration-complete.js), [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L1200) | Script passes for onboarding/profile transformations only; workout sessions, meal logs, and body measurements are still not migrated. |
| Migration resume / rollback engine | `uncovered` | [MigrationEngine.ts](/D:/FitAi/FitAI/src/services/migration/MigrationEngine.ts#L104), [migration/helpers.ts](/D:/FitAi/FitAI/src/services/migration/helpers.ts#L13) | No runnable test covers true resume or rollback; remote helpers are stubs. |
| Bridge parity between `DataBridge.ts` and `data-bridge/*` | `uncovered` | [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts), [index.ts](/D:/FitAi/FitAI/src/services/data-bridge/index.ts) | No parity test exists. |

### Date Boundaries, Scope, Analytics

| Scenario | Status | Evidence | Conclusion |
|---|---|---|---|
| Local-midnight / UTC-vs-local day bucketing | `partially covered` | [weekUtils.test.ts](/D:/FitAi/FitAI/src/__tests__/utils/weekUtils.test.ts) failed on `isSameDay`, plus readers in [useNutritionData.ts](/D:/FitAi/FitAI/src/hooks/useNutritionData.ts#L113), [useProgressScreen.ts](/D:/FitAi/FitAI/src/hooks/useProgressScreen.ts#L31), [hydrationStore.ts](/D:/FitAi/FitAI/src/stores/hydrationStore.ts#L46) | The helper-level failure reinforces the architecture risk; consumer paths remain untested. |
| Week rollover / Monday-start semantics | `partially covered` | [weekUtils.test.ts](/D:/FitAi/FitAI/src/__tests__/utils/weekUtils.test.ts), [useHomeLogic.ts](/D:/FitAi/FitAI/src/hooks/useHomeLogic.ts#L379) | Helper semantics are tested, but diverging consumers are not. |
| Weekly meal counts on Home / Progress | `uncovered` | [useHomeLogic.ts](/D:/FitAi/FitAI/src/hooks/useHomeLogic.ts#L107), [useProgressScreen.ts](/D:/FitAi/FitAI/src/hooks/useProgressScreen.ts#L42) | No automated scenario exists. |
| Analytics period consistency | `uncovered` | [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L152), [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L315) | No tests cover current-period cards versus chart bucketing. |
| Streak continuity across day boundaries | `uncovered` | [achievement/actions.ts](/D:/FitAi/FitAI/src/stores/achievement/actions.ts#L151) | No direct streak scenario found. |

### Subscription, Config, Auth

| Scenario | Status | Evidence | Conclusion |
|---|---|---|---|
| Worker subscription lifecycle create -> verify -> status -> cancel/pause/resume | `covered` | [subscription.test.ts](/D:/FitAi/FitAI/fitai-workers/test/subscription.test.ts), [subscription.regression.test.ts](/D:/FitAi/FitAI/fitai-workers/test/subscription.regression.test.ts), [subscription-flow.test.ts](/D:/FitAi/FitAI/fitai-workers/test/integration/subscription-flow.test.ts) | Strong backend coverage. |
| Backend usage enforcement and reset | `covered` | [subscriptionGate.test.ts](/D:/FitAi/FitAI/fitai-workers/test/subscriptionGate.test.ts), [usageTracker.test.ts](/D:/FitAi/FitAI/fitai-workers/test/usageTracker.test.ts) | Strong backend coverage. |
| App usage truth on read path | `partially covered` | Backend covered above; app source in [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L110) and [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L420) | No app test proves live backend usage is consumed instead of locally reconstructed counts. |
| Subscription fallback precedence after errors | `uncovered` | [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L255), [usePaywall.ts](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L265) | No app test covers conflicting error paths. |
| Public app-config parsing and fail-open defaults | `partially covered` | [useAppConfig.test.tsx](/D:/FitAi/FitAI/src/__tests__/hooks/useAppConfig.test.tsx), [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L24) | App hook defaults are tested; worker fail-open behavior is not directly exercised. |
| Client/backend app-config freshness divergence | `uncovered` | [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L88), [appConfig.ts](/D:/FitAi/FitAI/fitai-workers/src/utils/appConfig.ts#L115) | No automated stale-cache scenario. |
| Payment auth precedence vs main auth restore | `partially covered` | [auth.sessionLifecycle.test.ts](/D:/FitAi/FitAI/src/__tests__/services/auth.sessionLifecycle.test.ts), [RazorpayService.ts](/D:/FitAi/FitAI/src/services/RazorpayService.ts#L95) | Core auth restore is tested; payment-specific precedence is not. |

### Health, Profile, Weight

| Scenario | Status | Evidence | Conclusion |
|---|---|---|---|
| WeightTrackingService local history/event behavior | `covered` | [WeightTrackingService.test.ts](/D:/FitAi/FitAI/src/__tests__/services/WeightTrackingService.test.ts) | Good isolated service coverage only. |
| Health Connect write mapping and contract | `covered` | [healthConnectWrite.test.ts](/D:/FitAi/FitAI/src/__tests__/services/health/healthConnectWrite.test.ts) | Covers mapping/helpers, not health-store sync ingestion. |
| HealthKit / health-store sync success path and duplicate prevention | `uncovered` | [healthDataStore.ts](/D:/FitAi/FitAI/src/stores/healthDataStore.ts#L495) | No direct test for `syncHealthData()` or duplicate-workout prevention. |
| Profile/DataBridge onboarding source-of-truth behavior | `partially covered` | [dataManager.test.ts](/D:/FitAi/FitAI/src/__tests__/services/dataManager.test.ts) currently fails `11/11` | Intended validation exists but the harness is broken, so evidence is not trustworthy yet. |
| Weight single-source-of-truth across profile, health, analytics, dashboard | `uncovered` | [WeightTrackingService.ts](/D:/FitAi/FitAI/src/services/WeightTrackingService.ts), [healthDataStore.ts](/D:/FitAi/FitAI/src/stores/healthDataStore.ts), [analyticsStore.ts](/D:/FitAi/FitAI/src/stores/analyticsStore.ts) | No cross-store consistency scenario. |
| Current streak as one authoritative value across surfaces | `uncovered` | [achievementStore.ts](/D:/FitAi/FitAI/src/stores/achievementStore.ts#L464), [analyticsStore.ts](/D:/FitAi/FitAI/src/stores/analyticsStore.ts#L136) | No direct automated consistency test. |

## Key Validation Findings

1. The architecture audit is directionally correct.
   - The scenario pass did not contradict the audit.
   - It strengthened it with runtime/test evidence.

2. The biggest gaps are not theoretical anymore.
   - Nutrition SSOT scenarios are mostly untested.
   - Workout regeneration identity is still unverified.
   - Offline replay is only partially trustworthy and currently validates destructive behavior.
   - Date-boundary behavior is still inconsistent enough that even helper tests fail under this environment.

3. Some existing tests are themselves signals of architecture debt.
   - [offline.validation.test.ts](/D:/FitAi/FitAI/src/__tests__/services/offline.validation.test.ts) fails on logging expectations.
   - [weekUtils.test.ts](/D:/FitAi/FitAI/src/__tests__/utils/weekUtils.test.ts) fails on a same-day assertion.
   - [dataManager.test.ts](/D:/FitAi/FitAI/src/__tests__/services/dataManager.test.ts) is broadly broken, which weakens profile/DataBridge validation.

4. Worker-side subscription and API boundary coverage is substantially better than app-side SSOT coverage.

## Readiness For Fix Phase

This validation pass is strong enough to start architecture fixes.

What it proves:
- the major audit findings are real
- the highest-risk gaps are correctly prioritized
- several important domains already have enough automation to protect refactors

What it does not prove:
- that the current app is behaviorally correct in all scenarios
- that nutrition/workout identity flows are already well guarded by tests
- that date-boundary and cross-screen SSOT issues will be caught automatically without new tests

## Best Fix Order Confirmed By Validation

1. Nutrition identity and `weekly_meal_plans` invariant
2. Offline queue/idempotency/bridge correctness
3. Date and week boundary unification
4. Workout regeneration identity and hydration reconciliation
5. Read-model cleanup for nutrition, weight, streak, and dashboard surfaces
6. App-side subscription/config/auth truth alignment
