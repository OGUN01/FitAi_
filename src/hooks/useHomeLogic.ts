/**
 * useHomeLogic - Business logic for HomeScreen
 * Extracted to reduce HomeScreen.tsx complexity
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Platform, InteractionManager, AppState, AppStateStatus } from 'react-native';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { haptics } from '../utils/haptics';
import { useDashboardIntegration } from '../utils/integration';
import { useAuth } from './useAuth';
import { useCalculatedMetrics } from './useCalculatedMetrics';
import { calculatePersonalizedStepGoal } from '../utils/healthCalculations/calculators/stepGoalCalculator';
import { computePlanBurnPerDay } from '../services/energy/planBurn';
import {
  useFitnessStore,
  useNutritionStore,
  useAchievementStore,
  useHealthDataStore,
  useAnalyticsStore,
  useHydrationStore,
} from '../stores';
import { buildTodaysData } from './progress-screen/data';
import { useProfileStore } from '../stores/profileStore';
import { completionTrackingService } from '../services/completionTracking';
import { analyticsDataService } from '../services/analyticsData';
import { resolveCurrentWeight } from '../services/currentWeight';
import { catchUpLedger } from '../services/energyLedgerService';
import {
  checkEnergyResponse,
  acknowledgeUnderperformance,
  markSafetyCheckInShown,
  getRebuildRoute,
  type EnergyResponseCheck,
} from '../services/energyResponseService';
import {
  findCompletedSessionForWorkout,
  getCompletedSessionsForDate,
  hasCompletedSessionForDay,
} from '../utils/workoutIdentity';
import { getCurrentWeekStart, getLocalDateString, getLocalDayName } from '../utils/weekUtils';
import { type WeightUnit } from '../utils/units';
import { useReducedMotion } from '../utils/accessibility/hooks';

export const isHealthSnapshotFromToday = (lastUpdated?: string | null): boolean => {
  if (!lastUpdated) {
    return false;
  }

  return getLocalDateString(lastUpdated) === getLocalDateString();
};

export const useHomeLogic = (onNavigateToBuilder?: (screen: string) => void) => {
  const { profile } = useDashboardIntegration();
  const { user, isGuestMode } = useAuth();
  const bodyAnalysis = useProfileStore((s) => s.bodyAnalysis);
  const personalInfo = useProfileStore((s) => s.personalInfo);
  const workoutPreferences = useProfileStore((s) => s.workoutPreferences);

  // Derived weight unit from user preferences
  const weightUnit: WeightUnit = personalInfo?.units === 'imperial' ? 'lbs' : 'kg';

  // Stores
  const loadFitnessData = useFitnessStore((s) => s.loadData);
  const weeklyWorkoutPlan = useFitnessStore((s) => s.weeklyWorkoutPlan);
  // Goal Engine Phase C: the active WORKOUT plan (AI or custom) drives the
  // Home burn gap (today's planned burn vs actual). Subscribed reactively so
  // the gap recomputes when the user toggles plan source or edits the plan.
  const activePlanSource = useFitnessStore((s) => s.activePlanSource);
  const customWeeklyPlan = useFitnessStore((s) => s.customWeeklyPlan);
  const loadNutritionData = useNutritionStore((s) => s.loadData);
  const weeklyMealPlan = useNutritionStore((s) => s.weeklyMealPlan);
  // Dual AI/custom diet plan support: buildTodaysData() (progress-screen/data.ts)
  // reads getActiveWeeklyMealPlan() internally, so these two must be
  // subscribed here purely to make the todaysData useMemo below recompute
  // when either changes — buildTodaysData() itself is a plain function, not
  // a hook, so it can't subscribe on its own.
  const activeDietSource = useNutritionStore((s) => s.activeDietSource);
  const customWeeklyMealPlan = useNutritionStore((s) => s.customWeeklyMealPlan);
  const achievementStreak = useAchievementStore((s) => s.currentStreak);
  const initializeAchievements = useAchievementStore((s) => s.initialize);
  const achievementsInitialized = useAchievementStore((s) => s.isInitialized);
  const healthMetrics = useHealthDataStore((s) => s.metrics);
  const isHealthKitAuthorized = useHealthDataStore((s) => s.isHealthKitAuthorized);
  const isHealthConnectAuthorized = useHealthDataStore((s) => s.isHealthConnectAuthorized);
  const initializeHealthKit = useHealthDataStore((s) => s.initializeHealthKit);
  const syncHealthData = useHealthDataStore((s) => s.syncHealthData);
  const initializeHealthConnect = useHealthDataStore((s) => s.initializeHealthConnect);
  const syncFromHealthConnect = useHealthDataStore((s) => s.syncFromHealthConnect);
  const healthSettings = useHealthDataStore((s) => s.settings);
  const analyticsInitialized = useAnalyticsStore((s) => s.isInitialized);
  const initializeAnalytics = useAnalyticsStore((s) => s.initialize);
  const refreshAnalytics = useAnalyticsStore((s) => s.refreshAnalytics);
  const setHistoryData = useAnalyticsStore((s) => s.setHistoryData);
  const calorieHistory = useAnalyticsStore((s) => s.calorieHistory);

  // Hydration
  const waterIntakeML = useHydrationStore((s) => s.waterIntakeML);
  const waterGoal = useHydrationStore((s) => s.dailyGoalML);
  const checkAndResetIfNewDay = useHydrationStore((s) => s.checkAndResetIfNewDay);
  const syncHydrationWithSupabase = useHydrationStore((s) => s.syncWithSupabase);

  const { metrics: calculatedMetrics } = useCalculatedMetrics();

  // P1-10 (H22): Hydration goal is set EXCLUSIVELY in useNutritionTracking
  // (the SSOT) via setHydrationGoal (which marks isGoalUserSet=true). That hook
  // only mounts on DietScreen, so on Home the water ring reads dailyGoalML=null
  // and shows "0.0L Goal" even though advanced_review.daily_water_ml exists.
  // Use the metrics-only setter here: it respects a user override
  // (isGoalUserSet) and only fills the goal when none is set yet, so it cannot
  // race with or clobber useNutritionTracking's explicit setHydrationGoal.
  const setDailyGoalFromMetrics = useHydrationStore((s) => s.setDailyGoalFromMetrics);
  useEffect(() => {
    const goalML = calculatedMetrics?.dailyWaterML;
    if (goalML && goalML > 0) {
      setDailyGoalFromMetrics(goalML);
    }
  }, [calculatedMetrics?.dailyWaterML, setDailyGoalFromMetrics]);

  // stepsGoal is normally set once at onboarding completion (useOnboardingLogic)
  // via setStepsGoal, then persisted in healthDataStore. Users who onboarded
  // before that existed, or whose local store was cleared/reinstalled, are
  // stuck at stepsGoal=0 forever since onboarding never re-runs. Backfill it
  // here from the same profileStore SSOT inputs, only when unset, so it can
  // never clobber a value onboarding (or the user) already set.
  const setHealthStepsGoal = useHealthDataStore((s) => s.setStepsGoal);
  useEffect(() => {
    if (healthMetrics?.stepsGoal) return;
    if (!calculatedMetrics?.activityLevel) return;
    setHealthStepsGoal(
      calculatePersonalizedStepGoal({
        activityLevel: calculatedMetrics.activityLevel,
        primaryGoals: calculatedMetrics.primaryGoals ?? undefined,
        age: calculatedMetrics.age ?? undefined,
        experienceLevel: workoutPreferences?.intensity,
      })
    );
  }, [
    healthMetrics?.stepsGoal,
    calculatedMetrics?.activityLevel,
    calculatedMetrics?.primaryGoals,
    calculatedMetrics?.age,
    workoutPreferences?.intensity,
    setHealthStepsGoal,
  ]);

  const completedSessions = useFitnessStore((s) => s.completedSessions);
  const workoutProgress = useFitnessStore((s) => s.workoutProgress);
  const checkAndResetProgressIfNewDay = useFitnessStore((s) => s.checkAndResetProgressIfNewDay);
  const mealProgress = useNutritionStore((s) => s.mealProgress);
  const dailyMeals = useNutritionStore((s) => s.dailyMeals);
  const getTodaysConsumedNutrition = useNutritionStore((s) => s.getTodaysConsumedNutrition);
  const todaysConsumedNutrition = useMemo(
    () => getTodaysConsumedNutrition(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mealProgress, dailyMeals]
  );

  // Entrance fade — Reanimated shared value (replaces legacy Animated.Value).
  const fadeAnim = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const dataLoadRequestRef = useRef(0);
  const completionReloadInFlightRef = useRef(false);
  const refreshInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  // Phase D: ledger catch-up re-entry guard (mirrors the service's module flag).
  const ledgerCatchUpInFlightRef = useRef(false);
  // Keep a ref to the current user id so the subscription callback always reads
  // the latest value without needing to re-subscribe when user changes.
  const userIdRef = useRef(user?.id);
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);
  // Phase E: guard so the response check runs once per mount / day-boundary —
  // the effect re-fires on todayDateString changes (midnight), where the check
  // may legitimately re-evaluate, but never concurrently.
  const energyResponseInFlightRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showGuestSignUp, setShowGuestSignUp] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Phase E: the under-performance / safety check to surface on Home. Null =
  // nothing to show (guest, offline failure, acknowledged, or healthy data).
  const [energyResponseCheck, setEnergyResponseCheck] = useState<EnergyResponseCheck | null>(null);
  const weightHistory = useAnalyticsStore((s) => s.weightHistory);
  const [todayDateString, setTodayDateString] = useState(() => getLocalDateString());

  useEffect(() => {
    mountedRef.current = true;
    const refreshDate = () => {
      const nextDate = getLocalDateString();
      setTodayDateString((currentDate) => (currentDate === nextDate ? currentDate : nextDate));
    };
    const interval = setInterval(refreshDate, 60_000);
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshDate();
    });
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  // SSOT Fix 17: todaysData computed reactively from stores, not snapshotted
  // Include todayDateString so this recomputes if the date changes (e.g., midnight boundary)
  const todaysData = useMemo(
    () => buildTodaysData(),
    [
      weeklyWorkoutPlan,
      workoutProgress,
      weeklyMealPlan,
      customWeeklyMealPlan,
      activeDietSource,
      mealProgress,
      todayDateString,
    ]
  );
  // Hydration day-boundary resets & Supabase sync
  // NOTE: hydration goal is set exclusively in useNutritionTracking (SSOT)
  useEffect(() => {
    checkAndResetIfNewDay();
    checkAndResetProgressIfNewDay();

    syncHydrationWithSupabase().catch((err) => {
      console.warn('[HomeScreen] Failed to sync hydration from Supabase:', err);
    });

    // Phase D: backfill the daily energy ledger on app open / day-boundary.
    // Mirrors checkAndResetProgressIfNewDay (runs on rehydration + day tick).
    // The service is idempotent (upsert on (user_id, date), only fills missing
    // days) and guarded by a module flag, so a redundant call is a no-op.
    const uid = userIdRef.current;
    if (uid && !ledgerCatchUpInFlightRef.current) {
      ledgerCatchUpInFlightRef.current = true;
      catchUpLedger(uid)
        .catch((err) => {
          console.error('[HomeScreen] Ledger catch-up failed:', err);
        })
        .finally(() => {
          ledgerCatchUpInFlightRef.current = false;
        });
    }
  }, [
    checkAndResetIfNewDay,
    checkAndResetProgressIfNewDay,
    syncHydrationWithSupabase,
    todayDateString,
  ]);

  // Wave 5A: populate metricsHistory (30 days) on mount so the new
  // HealthTrendChart / VitalsCard read-paths on Home have data. Fire-and-
  // forget — failure here doesn't break the dashboard, just leaves the
  // trend chart in its empty-state (handled by HealthTrendChart). Reads
  // the store action directly via getState() to avoid subscribing this
  // effect to the action reference (which would re-trigger on any store
  // update). Empty dep array = runs once on mount.
  useEffect(() => {
    useHealthDataStore
      .getState()
      .loadHealthMetricsHistory(30)
      .catch((err) => {
        console.error('[useHomeLogic] Failed to load health metrics history:', err);
      });
  }, []);

  useEffect(() => {
    // P1-17: achievementsInitialized is intentionally NOT in the dep array.
    // initialize() sets isInitialized=true, which would re-trigger this effect
    // (effect reads isInitialized, its own call mutates it) — a latent
    // infinite loop, currently safe only because of the early-return guard
    // below. Dropping it from deps keeps the guard as the sole loop-preventer
    // and removes the re-render cycle. The guard (if achievementsInitialized
    // return) still prevents double-init: once initialize() resolves and flips
    // isInitialized, a subsequent render re-runs this effect, hits the guard,
    // and returns immediately — no second initialize() call.
    if (!user?.id || achievementsInitialized) {
      return;
    }

    initializeAchievements(user.id).catch((err) => {
      console.warn('[HomeScreen] Failed to initialize achievements:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, initializeAchievements]);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++dataLoadRequestRef.current;

    const loadData = async () => {
      try {
        if (!cancelled && requestId === dataLoadRequestRef.current) {
          setIsLoading(true);
          setError(null);
        }
        await Promise.all([
          useFitnessStore.getState().loadData(),
          useNutritionStore.getState().loadData(),
        ]);

        // Phase D: after stores hydrate (active plan + profile available),
        // backfill the energy ledger. Idempotent + module-guarded.
        const uid = userIdRef.current;
        if (uid && !ledgerCatchUpInFlightRef.current) {
          ledgerCatchUpInFlightRef.current = true;
          catchUpLedger(uid)
            .catch((err) => {
              console.error('[HomeScreen] Ledger catch-up failed:', err);
            })
            .finally(() => {
              ledgerCatchUpInFlightRef.current = false;
            });
        }
      } catch (err) {
        console.error('Load error:', err);
        if (!cancelled && requestId === dataLoadRequestRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled && requestId === dataLoadRequestRef.current) {
          setIsLoading(false);
        }
      }
    };

    // Defer data loading so UI renders first, then fetch
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      loadData();
    });

    fadeAnim.value = reducedMotion ? 1 : withTiming(1, { duration: 250 });
    // Completion events update the stores; useMemo consumers re-render automatically.
    const unsubscribe = completionTrackingService.subscribe(() => {
      if (!completionReloadInFlightRef.current) {
        completionReloadInFlightRef.current = true;
        void Promise.all([
          useFitnessStore.getState().loadData(),
          useNutritionStore.getState().loadData(),
        ])
          .catch((loadError) => {
            console.error('[useHomeLogic] Completion reload failed:', loadError);
          })
          .finally(() => {
            completionReloadInFlightRef.current = false;
          });
      }
      if (userIdRef.current) {
        void Promise.resolve(
          useAchievementStore.getState().reconcileWithCurrentData(userIdRef.current)
        ).catch((reconcileError) => {
          console.error('[useHomeLogic] Achievement reconciliation failed:', reconcileError);
        });
      }
    });
    return () => {
      cancelled = true;
      if (requestId === dataLoadRequestRef.current) {
        dataLoadRequestRef.current += 1;
      }
      interactionTask.cancel();
      unsubscribe();
    };
  }, [fadeAnim, reducedMotion, user?.id]);
  // NOTE: fadeAnim is a Reanimated SharedValue (stable across renders); kept
  // in deps only to satisfy exhaustive-deps lint without functional change.

  // Phase E — under-performance response (runs on app open, after the ledger
  // catch-up above has backfilled any missing days; the check re-reads the
  // ledger from Supabase so it always evaluates the caught-up state).
  // Runs after the first paint (InteractionManager) so it never blocks Home.
  // The service returns null for guests/offline errors and handles its own
  // acknowledgment suppression — see energyResponseService.ts.
  useEffect(() => {
    const uid = userIdRef.current;
    if (!uid || energyResponseInFlightRef.current) return;

    energyResponseInFlightRef.current = true;
    const task = InteractionManager.runAfterInteractions(() => {
      checkEnergyResponse(uid)
        .then((result) => {
          if (!result) return;
          // The safety check-in fires at most once per qualifying streak:
          // persist its per-streak marker the moment it is scheduled to
          // display (a later run must not re-fire for the same streak, even
          // if the user never taps the modal).
          if (result.kind === 'safety') {
            markSafetyCheckInShown(uid, result.streak).catch((err) => {
              console.error('[useHomeLogic] Failed to mark safety check-in:', err);
            });
          }
          setEnergyResponseCheck(result);
        })
        .catch((err) => {
          console.error('[useHomeLogic] Energy response check failed:', err);
        })
        .finally(() => {
          energyResponseInFlightRef.current = false;
        });
    });

    return () => task.cancel();
  }, [user?.id, todayDateString]);

  // Phase E handlers — all three close the prompt; only "Don't ask again"
  // persists anything, and "Rebuild" only navigates. Nothing auto-changes.
  const dismissEnergyResponse = useCallback(() => {
    setEnergyResponseCheck(null);
  }, []);

  const dontAskAgainEnergyResponse = useCallback(() => {
    const uid = userIdRef.current;
    const check = energyResponseCheck;
    setEnergyResponseCheck(null);
    if (!uid || check?.kind !== 'adherence') return;
    acknowledgeUnderperformance(uid, check.snapshot).catch((err) => {
      console.error('[useHomeLogic] Failed to persist acknowledgment:', err);
    });
  }, [energyResponseCheck]);

  const rebuildFromEnergyResponse = useCallback(() => {
    setEnergyResponseCheck(null);
    onNavigateToBuilder?.(getRebuildRoute());
  }, [onNavigateToBuilder]);
  useEffect(() => {
    let cancelled = false;
    const analyticsTask = InteractionManager.runAfterInteractions(() => {
      const loadAnalytics = async () => {
        if (Platform.OS === 'ios' && healthSettings.healthKitEnabled) {
          if (isHealthKitAuthorized) {
            await syncHealthData();
          } else {
            await initializeHealthKit();
          }
        } else if (Platform.OS === 'android' && healthSettings.healthConnectEnabled) {
          if (isHealthConnectAuthorized) {
            await syncFromHealthConnect(7);
          } else {
            await initializeHealthConnect();
          }
        }

        if (analyticsInitialized) {
          await refreshAnalytics();
        } else {
          await initializeAnalytics();
        }

        if (!user?.id) {
          return;
        }

        const weightData = await analyticsDataService.getWeightHistory(user.id, 90);
        if (cancelled) return;
        setHistoryData(weightData, useAnalyticsStore.getState().calorieHistory);
      };

      loadAnalytics().catch((error) => {
        console.warn('[useHomeLogic] Failed to load analytics history:', error);
      });
    });

    return () => {
      cancelled = true;
      analyticsTask.cancel();
    };
  }, [
    analyticsInitialized,
    healthSettings.healthConnectEnabled,
    healthSettings.healthKitEnabled,
    initializeAnalytics,
    initializeHealthConnect,
    initializeHealthKit,
    isHealthConnectAuthorized,
    isHealthKitAuthorized,
    refreshAnalytics,
    syncFromHealthConnect,
    syncHealthData,
    setHistoryData,
    user?.id,
  ]);

  // Android-only: resume-sync via AppState. Mirrors the iOS HealthKit pattern
  // in useHealthKitSync.ts but for Health Connect. When the user returns to
  // the app after using a watch/health app, refresh HC data — but debounce so
  // a quick app-switch doesn't hammer the sync. Gate: HC authorized + enabled.
  // SEPARATE useEffect (do not merge with the mount/auto-sync effect above —
  // another agent may be editing this file for history-load).
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!isHealthConnectAuthorized) return;
    if (!healthSettings.healthConnectEnabled) return;

    const RESUME_SYNC_DEBOUNCE_MS = 60_000;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState !== 'active') return;

      try {
        const store = useHealthDataStore.getState();
        const last = store.lastSyncTime;
        const now = Date.now();
        if (last) {
          const lastMs = new Date(last).getTime();
          if (!isNaN(lastMs) && now - lastMs < RESUME_SYNC_DEBOUNCE_MS) {
            // Synced recently — skip to avoid duplicate work.
            return;
          }
        }
        // Fire and forget; the store handles its own loading/error state.
        // Errors are logged inside syncFromHealthConnect (no silent swallow).
        store.syncFromHealthConnect(7).catch((err) => {
          console.error(
            '[useHomeLogic] HC resume-sync failed:',
            err instanceof Error ? err.message : String(err)
          );
        });
      } catch (err) {
        console.error(
          '[useHomeLogic] HC resume-sync handler error:',
          err instanceof Error ? err.message : String(err)
        );
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
    // hcLastSyncTime intentionally NOT in deps: reading it would re-subscribe
    // on every sync (it updates after each sync). We read the latest value
    // via getState() inside the handler instead — see CLAUDE.md #10.
  }, [isHealthConnectAuthorized, healthSettings.healthConnectEnabled]);

  // Memoized values
  const appCaloriesBurned = useMemo(
    () =>
      getCompletedSessionsForDate(completedSessions).reduce(
        (sum, s) => sum + (s.caloriesBurned ?? 0),
        0
      ),
    [completedSessions]
  );

  const wearableConnected = isHealthKitAuthorized || isHealthConnectAuthorized;
  const hasFreshWearableMetrics = useMemo(
    () => wearableConnected && isHealthSnapshotFromToday(healthMetrics?.lastUpdated),
    [wearableConnected, healthMetrics?.lastUpdated]
  );

  const realCaloriesBurned = useMemo(() => {
    // The Move ring goal is TDEE - BMR (active-only calories — see
    // HomeScreen caloriesGoal). Wearable providers expose two calorie
    // metrics: `activeCalories` (activity only) and `totalCalories`
    // (BMR + activity). Prefer `activeCalories` so the burned value matches
    // the active-only goal; only fall back to `totalCalories` if the
    // provider doesn't surface active calories (e.g. HealthKit sometimes
    // omits it). Using totalCalories here inflated the ring to ~360% because
    // it counted resting metabolism against an activity-only goal.
    if (hasFreshWearableMetrics) {
      if (healthMetrics?.activeCalories && healthMetrics.activeCalories > 0) {
        return healthMetrics.activeCalories;
      }
      if (healthMetrics?.totalCalories && healthMetrics.totalCalories > 0) {
        return healthMetrics.totalCalories;
      }
    }
    return appCaloriesBurned;
  }, [
    hasFreshWearableMetrics,
    healthMetrics?.activeCalories,
    healthMetrics?.totalCalories,
    appCaloriesBurned,
  ]);

  // Goal Engine Phase C: today's PLANNED burn — the active workout plan's
  // per-day-of-week burn for today (not the weekly average). The Home burn
  // gap compares this against `realCaloriesBurned` (the resolved, wearable-
  // precedence actual). `computePlanBurnPerDay` returns perDayOfWeek
  // indexed 0=Monday…6=Sunday; JS getDay() is 0=Sunday…6=Saturday, so the
  // Monday-based index is (getDay() + 6) % 7. No plan / no weight → 0
  // (rest phase is not an error state — see plan Edge Cases).
  const plannedBurnToday = useMemo(() => {
    const activePlan = activePlanSource === 'custom' ? customWeeklyPlan : weeklyWorkoutPlan;
    if (!activePlan) return 0;
    // weightData (declared below) is a useMemo over the same weightHistory +
    // bodyAnalysis inputs; here the resolution must run inline to avoid a
    // use-before-declaration (weightData is declared later in the hook).
    const resolvedCurrentWeight = resolveCurrentWeight({
      weightHistory,
      bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
    });
    const weightKg = resolvedCurrentWeight.value ?? undefined;
    const { perDayOfWeek } = computePlanBurnPerDay(activePlan, weightKg);
    const mondayBasedIndex = (new Date().getDay() + 6) % 7;
    return Math.round(perDayOfWeek[mondayBasedIndex] ?? 0);
  }, [activePlanSource, customWeeklyPlan, weeklyWorkoutPlan, weightHistory, bodyAnalysis]);

  const currentSteps = useMemo(
    () => (hasFreshWearableMetrics ? (healthMetrics?.steps ?? 0) : 0),
    [hasFreshWearableMetrics, healthMetrics?.steps]
  );

  // BUG FIX: HealthIntelligenceHub's `activeCalories` prop previously reused
  // `realCaloriesBurned` (below), which deliberately falls back to
  // `appCaloriesBurned` (app-tracked workout calories, no wearable involved
  // at all) when there's no fresh wearable snapshot — correct for the Move
  // ring's "how many calories did you burn today, from any source" purpose,
  // but wrong for the Health Intelligence card, which uses `activeCalories`
  // as one of its `hasRealData` signals (see useHealthIntelligenceLogic) to
  // decide whether to show real vitals or the "Connect Health Data"
  // placeholder. Feeding it workout calories made `hasRealData` true for
  // users with NO wearable connected at all, showing a broken-looking
  // all-"--" populated card instead of the correct placeholder. This mirrors
  // realCaloriesBurned's own active->total wearable-preference fallback
  // (fixing the ORIGINAL problem it was solving — a wearable that only
  // reports totalCalories) but — unlike realCaloriesBurned — never falls
  // through to app-tracked workout calories; `undefined` here correctly
  // means "no wearable-sourced active-calorie data exists."
  const wearableActiveCalories = useMemo(() => {
    if (!hasFreshWearableMetrics) return undefined;
    if (healthMetrics?.activeCalories && healthMetrics.activeCalories > 0) {
      return healthMetrics.activeCalories;
    }
    if (healthMetrics?.totalCalories && healthMetrics.totalCalories > 0) {
      return healthMetrics.totalCalories;
    }
    return undefined;
  }, [
    hasFreshWearableMetrics,
    healthMetrics?.activeCalories,
    healthMetrics?.totalCalories,
  ]);

  const realStreak = achievementStreak;

  const todaysWorkoutInfo = useMemo(() => {
    const fs = useFitnessStore.getState();
    const w = todaysData?.workout ?? null;
    const hasPlan = !!weeklyWorkoutPlan;
    const tidx = new Date().getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayMon = tidx === 0 ? 6 : tidx - 1;
    const isRest =
      (hasPlan &&
        fs.weeklyWorkoutPlan?.restDays?.some((d: number | string) =>
          typeof d === 'string' ? d === days[tidx] : d === todayMon
        )) ||
      false;
    const wType = !hasPlan ? 'none' : isRest ? 'rest' : (w?.category ?? 'workout');
    const dStatus = !hasPlan
      ? 'No Plan'
      : isRest
        ? 'Rest Day'
        : w?.category
          ? `${w.category[0].toUpperCase()}${w.category.slice(1)} Day`
          : 'Workout Day';
    const completedSession = w
      ? findCompletedSessionForWorkout({
          completedSessions,
          workout: w,
          plan: weeklyWorkoutPlan,
          weekStart: getCurrentWeekStart(),
        })
      : null;
    return {
      workout: w,
      hasWorkout: !!w,
      isCompleted: !!completedSession,
      hasWeeklyPlan: hasPlan,
      isRestDay: isRest,
      workoutType: wType,
      dayStatus: dStatus,
    };
  }, [todaysData, weeklyWorkoutPlan, completedSessions]);

  const userName = useMemo(() => {
    // SSOT: profileStore.personalInfo is authoritative; compute from first+last, fallback to userStore
    const profileName = `${personalInfo?.first_name || ''} ${personalInfo?.last_name || ''}`.trim();
    const legacyPersonalInfo = profile?.personalInfo as { name?: string } | undefined;
    return profileName || personalInfo?.name || legacyPersonalInfo?.name || '';
  }, [personalInfo, profile]);

  const weightData = useMemo(() => {
    const goalWeight = bodyAnalysis?.target_weight_kg;

    const chartHistory = weightHistory.length > 0 ? weightHistory : [];
    const resolvedCurrentWeight = resolveCurrentWeight({
      weightHistory: chartHistory,
      bodyAnalysisWeight: bodyAnalysis?.current_weight_kg,
    });
    const currentWeight = resolvedCurrentWeight.value ?? undefined;

    const startingWeight = chartHistory.length > 0 ? chartHistory[0].weight : currentWeight;

    return {
      currentWeight: currentWeight && currentWeight > 0 ? currentWeight : undefined,
      goalWeight: goalWeight && goalWeight > 0 ? goalWeight : undefined,
      startingWeight,
      weightHistory: chartHistory,
    };
  }, [bodyAnalysis, weightHistory]);

  const caloriesConsumed = useMemo(() => {
    return todaysConsumedNutrition.calories;
  }, [todaysConsumedNutrition]);

  const workoutMinutes = useMemo(() => {
    const todaysCompletedDuration = getCompletedSessionsForDate(completedSessions).reduce(
      (sum, session) => sum + (session.durationMinutes ?? 0),
      0
    );
    if (todaysCompletedDuration > 0) {
      return todaysCompletedDuration;
    }
    const workout = todaysWorkoutInfo.workout;
    if (!workout) return 0;
    const progress = todaysData?.progress?.workoutProgress ?? 0;
    return Math.round((workout.duration || 0) * (progress / 100));
  }, [todaysWorkoutInfo, todaysData, completedSessions]);

  const weekCalendarData = useMemo(() => {
    const startOfWeek = new Date(`${getCurrentWeekStart()}T00:00:00`);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dayName = getLocalDayName(date);
      const workout = weeklyWorkoutPlan?.workouts?.find(
        (w: any) => w.dayOfWeek?.toLowerCase() === dayName
      );
      const weekStart = getCurrentWeekStart();

      return {
        date,
        hasWorkout: !!workout && !workout.isRestDay,
        workoutCompleted: hasCompletedSessionForDay({
          completedSessions,
          dayKey: dayName,
          weekStart,
        }),
        isRestDay: weeklyWorkoutPlan ? !!workout?.isRestDay || !workout : false,
      };
    });
  }, [weeklyWorkoutPlan, completedSessions]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setRefreshing(true);
    haptics.light();
    setError(null);
    try {
      await Promise.all([loadFitnessData(), loadNutritionData()]);
      // todaysData updates reactively via useMemo

      if (user?.id) {
        const weightData = await analyticsDataService.getWeightHistory(user.id, 90);
        setHistoryData(weightData, calorieHistory);
      }

      if (Platform.OS === 'ios' && isHealthKitAuthorized) {
        await syncHealthData(true);
      } else if (Platform.OS === 'android' && isHealthConnectAuthorized) {
        await syncFromHealthConnect(7);
      }
    } catch (err) {
      console.error('Refresh error:', err);
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to refresh data');
      }
    } finally {
      refreshInFlightRef.current = false;
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [
    loadFitnessData,
    loadNutritionData,
    calorieHistory,
    isHealthKitAuthorized,
    isHealthConnectAuthorized,
    setHistoryData,
    syncHealthData,
    syncFromHealthConnect,
    user?.id,
  ]);

  return {
    // State
    isLoading,
    error,
    refreshing,
    showGuestSignUp,
    showWeightModal,
    setShowGuestSignUp,
    setShowWeightModal,
    fadeAnim,

    // Profile data
    isGuestMode,
    realStreak,
    userName,

    // Health metrics
    healthMetrics,
    wearableConnected,
    realCaloriesBurned,
    wearableActiveCalories,
    // Goal Engine Phase C: today's planned burn (active plan's per-day-of-
    // week value) for the Home burn gap. Reused by the Phase D ledger.
    plannedBurnToday,
    currentSteps,

    // Workout/nutrition data
    todaysWorkoutInfo,
    todaysData,
    caloriesConsumed,
    workoutMinutes,
    weekCalendarData,

    // Hydration
    waterIntakeML,
    waterGoal,

    // Weight data
    weightData,

    // Weight unit preference
    weightUnit,

    // Workout preferences (live SSOT for user-selected duration)
    workoutPreferences,
    // Calculated metrics
    calculatedMetrics,

    // Handlers
    handleRefresh,

    // Phase E — under-performance response
    energyResponseCheck,
    dismissEnergyResponse,
    dontAskAgainEnergyResponse,
    rebuildFromEnergyResponse,
  };
};
