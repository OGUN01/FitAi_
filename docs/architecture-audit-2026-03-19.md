# FitAI Architecture Audit

Date: 2026-03-19

Scope: app stores, services, hooks, screens, worker/backend config paths, and Supabase schema/migrations.

Goal: enumerate confirmed architecture and source-of-truth issues before the next fix batch.

## Method

- Reviewed the existing workout-source-of-truth fixes and used them as a baseline.
- Ran focused domain sweeps across fitness, nutrition, offline sync, analytics/date scoping, subscription/config/auth, and health/profile/schema invariants.
- Cross-checked with targeted repo-wide searches for:
  - UTC day slicing
  - duplicate active-plan patterns
  - legacy table usage (`meals` vs `meal_logs`)
  - stale progress-store readers (`workoutProgress`, `mealProgress`, `dailyMeals`, `completedSessions`, `weightHistory`)

## Environment Notes

- `tmux` is not installed in this environment, so the OMX team runner could not be used for the six-lane audit fan-out.
- The documented repo guidance files `docs/shared/agent-tiers.md` and `.codex/prompts/*` are not present.

## Confirmed Findings

### Workout / Fitness

#### W-01 High: weekly workout plan rollover is non-atomic on the app side

Failure mode:
- local state sets the new active plan before remote persistence settles
- the save path deactivates existing active plans and then creates a replacement row
- if the replacement write is delayed or fails, the app can transiently observe zero active plans or resolve ambiguity by "latest row" semantics

Evidence:
- [fitnessStore.ts](/D:/FitAi/FitAI/src/stores/fitnessStore.ts#L64)
- [fitnessStore.ts](/D:/FitAi/FitAI/src/stores/fitnessStore.ts#L122)
- [fitnessStore.ts](/D:/FitAi/FitAI/src/stores/fitnessStore.ts#L167)
- [planActions.ts](/D:/FitAi/FitAI/src/stores/fitness/planActions.ts#L146)
- [planActions.ts](/D:/FitAi/FitAI/src/stores/fitness/planActions.ts#L187)

#### W-02 High: workout regeneration still does not preserve logical slot identity end-to-end

Failure mode:
- regenerated plans synthesize new workout identities in several generation paths
- history preservation depends on app-side remapping instead of a backend contract that returns stable slot identity
- the same logical Monday slot can still be represented by different generated IDs over time

Evidence:
- [useFitnessLogic.ts](/D:/FitAi/FitAI/src/hooks/useFitnessLogic.ts#L309)
- [useFitnessLogic.ts](/D:/FitAi/FitAI/src/hooks/useFitnessLogic.ts#L622)
- [index.ts](/D:/FitAi/FitAI/src/ai/index.ts#L406)
- [workoutGeneration.ts](/D:/FitAi/FitAI/src/ai/workoutGeneration.ts#L117)
- [validation.ts](/D:/FitAi/FitAI/fitai-workers/src/utils/validation.ts#L255)
- [workoutGenerationRuleBased.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/workoutGenerationRuleBased.ts#L416)

#### W-03 Medium-high: several workout readers still derive state from legacy `workoutProgress` instead of canonical completed sessions

Failure mode:
- UI cards and stats can disagree with session history
- plan-progress state can drift from actual historical completions after hydration, regeneration, or cross-device usage

Evidence:
- [WeeklyPlanOverview.tsx](/D:/FitAi/FitAI/src/components/fitness/WeeklyPlanOverview.tsx#L52)
- [stats-calculator.ts](/D:/FitAi/FitAI/src/services/completion-tracking/stats-calculator.ts#L17)
- [dataRetrieval.ts](/D:/FitAi/FitAI/src/services/dataRetrieval.ts#L268)
- [achievement/actions.ts](/D:/FitAi/FitAI/src/stores/achievement/actions.ts#L151)

#### W-04 Medium-high: workout history hydration still preserves stale local session state instead of strictly reconciling to remote truth

Failure mode:
- remote hydration merges local and remote completed sessions
- old persisted local sessions can survive if they do not collide on the chosen merge key
- stale or corrupted local history can remain visible after remote data has changed

Evidence:
- [fitnessStore.ts](/D:/FitAi/FitAI/src/stores/fitnessStore.ts#L724)
- [fitnessStore.ts](/D:/FitAi/FitAI/src/stores/fitnessStore.ts#L733)
- [dataActions.ts](/D:/FitAi/FitAI/src/stores/fitness/dataActions.ts#L63)
- [dataActions.ts](/D:/FitAi/FitAI/src/stores/fitness/dataActions.ts#L105)

### Nutrition / Diet

#### N-01 Critical: planned meal completions do not persist stable plan identity

Failure mode:
- `meal_logs` supports `from_plan` and `plan_meal_id`
- the active write path does not persist `plan_meal_id`
- hydration falls back to `log.id` rather than the planned meal identity
- planned meal completion can remap after refresh, cross-device sync, or plan regeneration

Evidence:
- [20250129000002_add_session_log_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20250129000002_add_session_log_tables.sql#L113)
- [completionTracking.ts](/D:/FitAi/FitAI/src/services/completionTracking.ts#L365)
- [meal-completion.ts](/D:/FitAi/FitAI/src/services/completion-tracking/meal-completion.ts#L68)
- [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L787)

#### N-02 Critical: `weekly_meal_plans` still has no DB-enforced single-active-plan invariant

Failure mode:
- the app inserts meal plans with `is_active: true`
- readers load "latest active" instead of rejecting ambiguity
- retries, multi-device writes, or stale queues can create multiple active meal plans

Evidence:
- [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L233)
- [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L271)
- [actions.ts](/D:/FitAi/FitAI/src/stores/nutrition/actions.ts#L118)
- [persistence.ts](/D:/FitAi/FitAI/src/stores/nutrition/persistence.ts#L25)
- [20260124000001_add_missing_data_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260124000001_add_missing_data_tables.sql#L391)
- [20260124000001_add_missing_data_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260124000001_add_missing_data_tables.sql#L416)

#### N-03 High: stale local meal progress survives hydration

Failure mode:
- hydration preserves local `mealProgress`
- remote rows are merged around existing local entries instead of replacing them
- stale local completion state can outlive remote truth indefinitely

Evidence:
- [persistence.ts](/D:/FitAi/FitAI/src/stores/nutrition/persistence.ts#L102)
- [persistence.ts](/D:/FitAi/FitAI/src/stores/nutrition/persistence.ts#L108)
- [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L783)
- [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L800)

#### N-04 High: Diet screen still merges multiple nutrition histories heuristically

Failure mode:
- the screen combines completed weekly-plan meals and separately hydrated/logged daily meals
- dedupe is heuristic, based on lowercased meal name and date rather than stable identity
- the same meal can be double-counted, hidden, or assigned to the wrong day

Evidence:
- [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L342)
- [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L357)
- [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L654)
- [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L665)

#### N-05 High: nutrition edit/history flows still mix legacy `meals` and current `meal_logs`

Failure mode:
- meal completion and log creation use `meal_logs`
- meal edit and some analytics fallback paths still use `meals`
- the app can mutate or read different tables for the same logical meal history

Evidence:
- [MealEditModal.tsx](/D:/FitAi/FitAI/src/components/diet/MealEditModal.tsx#L193)
- [useMealEdit.ts](/D:/FitAi/FitAI/src/hooks/useMealEdit.ts#L168)
- [completionTracking.ts](/D:/FitAi/FitAI/src/services/completionTracking.ts#L365)
- [nutritionData.ts](/D:/FitAi/FitAI/src/services/nutritionData.ts#L503)
- [analyticsData.ts](/D:/FitAi/FitAI/src/services/analyticsData.ts#L278)

#### N-06 High: local meal-log updates are effectively non-persistent in the bridge layer

Failure mode:
- `crudOperations.updateMealLog()` writes the updated row through `dataBridge.storeMealLog(updated)`
- `storeMealLog()` short-circuits when the ID already exists
- completion/delete changes can diverge between in-memory store and persisted local cache

Evidence:
- [crudOperations.ts](/D:/FitAi/FitAI/src/services/crudOperations.ts#L325)
- [crudOperations.ts](/D:/FitAi/FitAI/src/services/crudOperations.ts#L347)
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L1099)

#### N-07 High: nutrition read models still disagree on what "today's nutrition" means

Failure mode:
- some readers use `getTodaysConsumedNutrition()`
- some readers build counts from `weeklyMealPlan + mealProgress`
- some screens merge `dailyMeals` with separately loaded remote meals
- off-plan/manual meals and remote-only logs are not represented consistently

Evidence:
- [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L533)
- [useHomeLogic.ts](/D:/FitAi/FitAI/src/hooks/useHomeLogic.ts#L359)
- [progress-screen/data.ts](/D:/FitAi/FitAI/src/hooks/progress-screen/data.ts#L39)
- [progress-screen/data.ts](/D:/FitAi/FitAI/src/hooks/progress-screen/data.ts#L96)
- [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L339)

#### N-08 Medium-high: nutrition day boundaries are still mixed between UTC and local time

Failure mode:
- planned meal completion, daily meal inclusion, and screen summaries can disagree around midnight
- the same meal can land in different day buckets depending on which reader is used

Evidence:
- [useNutritionData.ts](/D:/FitAi/FitAI/src/hooks/useNutritionData.ts#L113)
- [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L552)
- [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L771)
- [DietScreen.tsx](/D:/FitAi/FitAI/src/screens/main/DietScreen.tsx#L665)

### Offline / Data Bridge / Migration

#### O-00 Critical: migration "remote" helpers are stubs and can report success without changing Supabase

Failure mode:
- the migration engine builds SQL strings and simulates work instead of executing real remote upload/delete/verify operations
- migration success, rollback, and verification can be reported without corresponding remote state changes

Evidence:
- [helpers.ts](/D:/FitAi/FitAI/src/services/migration/helpers.ts#L13)
- [helpers.ts](/D:/FitAi/FitAI/src/services/migration/helpers.ts#L46)
- [helpers.ts](/D:/FitAi/FitAI/src/services/migration/helpers.ts#L63)
- [steps.ts](/D:/FitAi/FitAI/src/services/migration/steps.ts#L128)
- [steps.ts](/D:/FitAi/FitAI/src/services/migration/steps.ts#L160)
- [steps.ts](/D:/FitAi/FitAI/src/services/migration/steps.ts#L192)

#### O-01 Critical: startup sync drops queued offline workout session creates instead of migrating them

Failure mode:
- queued `workout_sessions` create actions using camelCase fields are purged on load
- pending offline-created sessions can be lost before they ever sync

Evidence:
- [offline.ts](/D:/FitAi/FitAI/src/services/offline.ts#L155)
- [offline.ts](/D:/FitAi/FitAI/src/services/offline.ts#L160)

#### O-02 Critical: offline create retries are non-idempotent and rollback can delete the local truth after a successful remote write

Failure mode:
- retries use plain `insert()` without idempotency or upsert
- a timeout-after-commit can create duplicate remote rows
- after repeated failure, rollback removes the optimistic local record even if the remote write already succeeded

Evidence:
- [offline.ts](/D:/FitAi/FitAI/src/services/offline.ts#L318)
- [offline.ts](/D:/FitAi/FitAI/src/services/offline.ts#L360)
- [offline.ts](/D:/FitAi/FitAI/src/services/offline.ts#L381)

#### O-03 High: offline workout-session schema mapping is incomplete and asymmetric

Failure mode:
- canonical fields like `total_duration_minutes`, `exercises_completed`, `planned_day_key`, and `plan_slot_key` are not reliably bridged
- offline sync can downgrade or fail canonical workout reconciliation

Evidence:
- [offline.ts](/D:/FitAi/FitAI/src/services/offline.ts#L38)
- [offline.ts](/D:/FitAi/FitAI/src/services/offline.ts#L47)
- [offline.ts](/D:/FitAi/FitAI/src/services/offline.ts#L386)
- [offline.ts](/D:/FitAi/FitAI/src/services/offline.ts#L402)

#### O-04 High: local workout-session storage in `DataBridge` is append-only and non-idempotent

Failure mode:
- repeated bridge writes can create duplicate local sessions with the same logical identity
- later updates only touch the first matching row

Evidence:
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L1037)
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L1073)

#### O-05 High: remote read failures silently fall back to local cache as if it were authoritative

Failure mode:
- actual remote/local divergence is masked instead of surfaced
- stale local state can be hydrated and treated as truth

Evidence:
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L231)
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L360)

#### O-06 High: guest-to-user migration does not move all fitness history domains

Failure mode:
- workout sessions, meal logs, and body measurements can remain stranded in guest/local storage
- migrated accounts can appear incomplete after signup/login

Evidence:
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L245)
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L814)
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L1200)

#### O-07 High: migration resume is not a true resume

Failure mode:
- checkpoint state exists, but retry restarts full migration logic
- repeated retries can be non-idempotent and hard to reason about

Evidence:
- [migrationManager.ts](/D:/FitAi/FitAI/src/services/migrationManager.ts#L594)
- [migrationManager.ts](/D:/FitAi/FitAI/src/services/migrationManager.ts#L617)
- [MigrationEngine.ts](/D:/FitAi/FitAI/src/services/migration/MigrationEngine.ts#L36)
- [MigrationEngine.ts](/D:/FitAi/FitAI/src/services/migration/MigrationEngine.ts#L104)

#### O-08 High: rollback bookkeeping is incomplete

Failure mode:
- rollback relies on `checkpoint.completedSteps`
- progress handling does not reliably populate that authoritative list
- partial remote uploads can be missed during rollback

Evidence:
- [migrationManager.ts](/D:/FitAi/FitAI/src/services/migrationManager.ts#L195)
- [migrationManager.ts](/D:/FitAi/FitAI/src/services/migrationManager.ts#L689)

#### O-09 Medium-high: there are two parallel data-bridge implementations with live callers

Failure mode:
- fixes can land in `src/services/data-bridge/*` while active callers still use `src/services/DataBridge.ts`
- behavior can diverge across auth, CRUD, and persistence paths even when both are intended to represent the same bridge layer

Evidence:
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts)
- [index.ts](/D:/FitAi/FitAI/src/services/data-bridge/index.ts)
- [auth.ts](/D:/FitAi/FitAI/src/services/auth.ts#L6)
- [crudOperations.ts](/D:/FitAi/FitAI/src/services/crudOperations.ts#L4)

### Date / Scope / Analytics

#### D-01 Critical: UTC day slicing is still widespread across app domains

Failure mode:
- workouts, meals, hydration, weights, achievements, analytics, and charts do not all agree on local day boundaries
- around midnight, the same event can count toward different days in different screens

Evidence:
- [useNutritionData.ts](/D:/FitAi/FitAI/src/hooks/useNutritionData.ts#L113)
- [useProgressScreen.ts](/D:/FitAi/FitAI/src/hooks/useProgressScreen.ts#L36)
- [WeightEntryModal.tsx](/D:/FitAi/FitAI/src/components/progress/WeightEntryModal.tsx#L168)
- [hydrationStore.ts](/D:/FitAi/FitAI/src/stores/hydrationStore.ts#L46)
- [analyticsData.ts](/D:/FitAi/FitAI/src/services/analyticsData.ts#L378)
- [achievement/actions.ts](/D:/FitAi/FitAI/src/stores/achievement/actions.ts#L166)

#### D-02 High: weekly meal progress in Home and Progress is not actually week-scoped

Failure mode:
- meals completed from prior weeks can inflate current-week summaries

Evidence:
- [useHomeLogic.ts](/D:/FitAi/FitAI/src/hooks/useHomeLogic.ts#L107)
- [useHomeLogic.ts](/D:/FitAi/FitAI/src/hooks/useHomeLogic.ts#L115)
- [useProgressScreen.ts](/D:/FitAi/FitAI/src/hooks/useProgressScreen.ts#L42)
- [useProgressScreen.ts](/D:/FitAi/FitAI/src/hooks/useProgressScreen.ts#L45)

#### D-03 High: Analytics mixes period-scoped workout metrics with today-only nutrition

Failure mode:
- week/month/quarter/year views show period-filtered workout values but today's calorie-consumed value
- the card looks comparable but is not based on the same time window

Evidence:
- [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L152)
- [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L166)
- [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L170)
- [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L176)

#### D-04 Medium-high: the weekly workout chart is still a rolling-7-day implementation disguised as a current-week chart

Failure mode:
- buckets are grouped by weekday labels instead of strict Monday-Sunday slots for the selected week
- previous-week days can leak into the current weekly chart

Evidence:
- [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L315)
- [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L323)
- [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L342)

#### D-05 High: weight still has multiple mutable sources of truth

Failure mode:
- manual weight updates touch profile/onboarding state, health store state, and analytics history
- different screens read different copies
- stale current weight and stale trend history can diverge

Evidence:
- [WeightEntryModal.tsx](/D:/FitAi/FitAI/src/components/progress/WeightEntryModal.tsx#L159)
- [WeightEntryModal.tsx](/D:/FitAi/FitAI/src/components/progress/WeightEntryModal.tsx#L170)
- [AnalyticsScreen.tsx](/D:/FitAi/FitAI/src/screens/main/AnalyticsScreen.tsx#L140)
- [useProgressScreen.ts](/D:/FitAi/FitAI/src/hooks/useProgressScreen.ts#L50)
- [useDashboardData.ts](/D:/FitAi/FitAI/src/hooks/useDashboardData.ts#L93)

### Subscription / Config / Auth

#### S-01 Critical: subscription usage has no single backend truth on the read path

Failure mode:
- the client reconstructs usage locally rather than reading live usage counters from the backend
- reinstall, device switch, stale storage, or missed local mutations can drift from backend truth

Evidence:
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L254)
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L420)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L788)
- [subscription.ts](/D:/FitAi/FitAI/fitai-workers/src/handlers/subscription.ts#L885)

#### S-02 High: subscription fallback precedence is inconsistent

Failure mode:
- one error path resets to free-tier defaults
- another preserves an optimistic premium snapshot
- effective truth depends on which caller encountered the failure

Evidence:
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L255)
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L355)
- [subscriptionStore.ts](/D:/FitAi/FitAI/src/stores/subscriptionStore.ts#L495)
- [usePaywall.ts](/D:/FitAi/FitAI/src/hooks/usePaywall.ts#L246)

#### S-03 High: public app-config is fail-open on both client and backend

Failure mode:
- missing or stale config values can re-enable features instead of disabling them
- infra failures become silent behavior changes

Evidence:
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L28)
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L87)
- [appConfig.ts](/D:/FitAi/FitAI/fitai-workers/src/utils/appConfig.ts#L113)
- [appConfig.ts](/D:/FitAi/FitAI/fitai-workers/src/utils/appConfig.ts#L166)

#### S-04 High: client and worker use different freshness models for the same app-config truth

Failure mode:
- the app can see a new config immediately via Supabase/realtime
- the worker can keep serving stale config from KV cache for minutes
- front-end and backend gating can disagree during the cache window

Evidence:
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L71)
- [useAppConfig.ts](/D:/FitAi/FitAI/src/hooks/useAppConfig.ts#L103)
- [appConfig.ts](/D:/FitAi/FitAI/fitai-workers/src/utils/appConfig.ts#L115)
- [appConfig.ts](/D:/FitAi/FitAI/fitai-workers/src/utils/appConfig.ts#L151)

#### S-05 High: subscription/payment auth uses weaker validation precedence than the main auth restore path

Failure mode:
- paywall/subscription mutations can rely on stale cached session tokens longer than the stricter auth restore flow

Evidence:
- [RazorpayService.ts](/D:/FitAi/FitAI/src/services/RazorpayService.ts#L95)
- [RazorpayService.ts](/D:/FitAi/FitAI/src/services/RazorpayService.ts#L122)
- [auth.ts](/D:/FitAi/FitAI/src/services/auth.ts#L403)
- [auth.ts](/D:/FitAi/FitAI/src/services/auth.ts#L432)

### Health / Profile / Global Invariants

#### H-01 Critical: HealthKit sync can report success while writing empty or duplicate data

Failure mode:
- sync state is marked successful
- the active path writes from an empty `HealthKitData` object and appends workouts without dedupe
- users can see stale/zero metrics with a "successful sync" state

Evidence:
- [healthDataStore.ts](/D:/FitAi/FitAI/src/stores/healthDataStore.ts#L495)
- [healthDataStore.ts](/D:/FitAi/FitAI/src/stores/healthDataStore.ts#L498)
- [healthDataStore.ts](/D:/FitAi/FitAI/src/stores/healthDataStore.ts#L502)
- [healthDataStore.ts](/D:/FitAi/FitAI/src/stores/healthDataStore.ts#L518)

#### H-02 High: current streak exists as multiple values across stores/services even though achievement store is intended to be authoritative

Failure mode:
- some paths rely on `achievementStore.currentStreak`
- other analytics/service layers still carry separate `currentStreak` fields/defaults
- stale derived values can diverge from the live streak

Evidence:
- [achievementStore.ts](/D:/FitAi/FitAI/src/stores/achievementStore.ts#L464)
- [analyticsStore.ts](/D:/FitAi/FitAI/src/stores/analyticsStore.ts#L136)
- [analytics/engine.ts](/D:/FitAi/FitAI/src/services/analytics/engine.ts#L131)
- [userProfile.ts](/D:/FitAi/FitAI/src/services/userProfile.ts#L668)

#### H-03 High: several schema-level "single active row" assumptions are still enforced only in app code

Failure mode:
- the app assumes only one active plan or active state row exists
- the database does not always enforce that assumption
- retries, multi-device writes, and backfills can create ambiguous rows that app readers then hide instead of rejecting

Evidence:
- [nutritionStore.ts](/D:/FitAi/FitAI/src/stores/nutritionStore.ts#L271)
- [persistence.ts](/D:/FitAi/FitAI/src/stores/nutrition/persistence.ts#L25)
- [20260124000001_add_missing_data_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260124000001_add_missing_data_tables.sql#L416)

#### H-04 High: older schema generations enforced single-active plan invariants that the newer weekly plan tables lost

Failure mode:
- the legacy `user_*_plans` tables had partial unique indexes for one active plan per user
- the newer `weekly_*_plans` tables were introduced without equivalent invariants
- the app now hides ambiguity with "latest active row wins" logic where the older schema prevented it

Evidence:
- [20250129000001_add_user_plan_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20250129000001_add_user_plan_tables.sql#L40)
- [20250129000001_add_user_plan_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20250129000001_add_user_plan_tables.sql#L111)
- [20260124000001_add_missing_data_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260124000001_add_missing_data_tables.sql#L358)
- [20260124000001_add_missing_data_tables.sql](/D:/FitAi/FitAI/supabase/migrations/20260124000001_add_missing_data_tables.sql#L391)

#### H-05 High: profile/body data still has duplicated fallback truths across stores and persisted onboarding payloads

Failure mode:
- consumers can read body/profile state from `profileStore`, `userStore.profile`, bridge-loaded onboarding payloads, or derived dashboard fallbacks
- different screens can disagree on profile-driven values depending on which fallback path was available first

Evidence:
- [DataBridge.ts](/D:/FitAi/FitAI/src/services/DataBridge.ts#L814)
- [useDashboardData.ts](/D:/FitAi/FitAI/src/hooks/useDashboardData.ts#L93)
- [useFitnessLogic.ts](/D:/FitAi/FitAI/src/hooks/useFitnessLogic.ts#L188)
- [useMealPlanning.ts](/D:/FitAi/FitAI/src/hooks/useMealPlanning.ts#L430)

### Tooling / Audit Contract

#### T-01 Low: repo orchestration guidance references files that are not present

Failure mode:
- delegated audit or execution workflows cannot follow the documented repo contract literally
- automation/agent guidance can diverge from the actual checked-in workspace

Evidence:
- [AGENTS.md](/D:/FitAi/FitAI/AGENTS.md)
- missing `D:\FitAi\FitAI\docs\shared\agent-tiers.md`
- missing `D:\FitAi\FitAI\.codex\prompts\`

## Cross-Cutting Patterns To Fix Once

These are recurring architecture smells that show up in multiple findings:

1. Planned-entity identity is not consistently first-class in historical tables.
2. Readers still mix local progress maps with canonical history tables.
3. App-side reconciliation preserves stale local state too often.
4. Local/offline sync is not uniformly idempotent.
5. Local day/week boundaries are not centralized and enforced.
6. Database invariants are missing for several "there should only be one active row" assumptions.
7. Legacy tables remain in live paths beside newer canonical tables.

## Recommended Fix Order

1. Nutrition identity and meal-plan invariants:
   - persist `plan_meal_id` on writes
   - add a single-active-plan DB invariant for `weekly_meal_plans`
   - remove `meals`/`meal_logs` split-brain behavior
2. Offline/data-bridge correctness:
   - make queue processing non-destructive and idempotent
   - complete canonical field mapping
   - make migration resume and rollback authoritative
3. Global date/scope unification:
   - replace UTC date slicing in user-facing daily/weekly logic with shared local-day helpers
4. Read-model cleanup:
   - move remaining stats/cards off `workoutProgress`
   - converge nutrition readers on one canonical daily/historical model
   - collapse duplicate weight and streak carriers
5. Subscription/config/auth:
   - make backend truth authoritative on reads
   - remove fail-open fallback behavior
   - align client and worker freshness/auth precedence

## Confidence And Remaining Blind Spots

### What this audit covers with high confidence

- Source-of-truth and identity issues in workout, nutrition, offline sync, analytics/date scoping, subscription/config/auth, and health/profile/schema layers.
- DB invariant gaps that are visible in the checked-in migrations and active read/write paths.
- Cross-screen read-model drift where different UI surfaces derive the same concept from different stores or tables.
- The main classes of architecture failures that are likely to create stale state, incorrect mapping, wrong aggregates, duplicate truths, or ambiguous ownership.

### What this audit does not prove yet

- It does not prove every runtime-only bug in the app has been found.
- It does not cover every native/device-specific edge path by execution evidence.
- It does not replay all real user journeys across multiple devices, clock boundaries, offline/online transitions, reinstall, logout/login, or app upgrades.
- It does not validate third-party behavior outside the code contract itself, such as HealthKit provider payload quirks, Razorpay webhook timing races, or OS-level persistence behavior.

### Additional passes still required before claiming “all issues”

1. End-to-end scenario matrix:
   - guest to signup
   - multi-device plan generation and completion
   - offline create/update/delete then reconnect
   - logout/login and cold-start hydration
   - plan regeneration after historical completions
2. Native and external integration validation:
   - HealthKit sync with real provider payloads
   - Razorpay subscription lifecycle and webhook races
   - push/notification-driven refresh paths
3. Time-boundary validation:
   - local midnight
   - week rollover
   - timezone change
   - device clock skew
4. Data-repair/backfill verification:
   - legacy rows created before the new invariants
   - old local caches surviving new hydration rules

### Practical conclusion

This document is strong enough to begin the architecture-fix implementation phase for the major root-cause classes. It should be treated as the canonical static architecture audit, not as proof that every runtime anomaly in production has already been observed.
