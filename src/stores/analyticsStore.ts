// Analytics Store for FitAI
// Zustand store for managing analytics data and insights

import { create } from "zustand";
import {
  subscribeWithSelector,
  persist,
} from "zustand/middleware";
import { logger } from "../utils/logger";
import { createDebouncedStorage } from "../utils/safeAsyncStorage";
import { supabase } from "../services/supabase";
import { getCurrentUserId } from "../services/authUtils";
import { analyticsDataService } from "../services/analyticsData";
import {
  analyticsEngine,
  ComprehensiveAnalytics,
  FitnessMetrics,
  WorkoutAnalytics,
  NutritionAnalytics,
  BodyCompositionAnalytics,
  SleepWellnessAnalytics,
  PredictiveInsights,
} from "../services/analyticsEngine";

// LAZY IMPORTS: Avoid circular dependency with StoreCoordinator
// These functions get store data without creating import cycles
let _hydrationStoreModule: any = null;
let _healthDataStoreModule: any = null;

const getHydrationGoal = (): number | null => {
  if (!_hydrationStoreModule) {
    _hydrationStoreModule = require("./hydrationStore");
  }
  return _hydrationStoreModule.useHydrationStore.getState().dailyGoalML;
};

const getHealthMetrics = () => {
  if (!_healthDataStoreModule) {
    _healthDataStoreModule = require("./healthDataStore");
  }
  return _healthDataStoreModule.useHealthDataStore.getState().metrics;
};

interface AnalyticsStore {
  // State
  isLoading: boolean;
  isInitialized: boolean;
  currentAnalytics: ComprehensiveAnalytics | null;
  analyticsSummary: {
    totalWorkouts: number;
    averageScore: number;
    currentStreak: number;
    recentTrend: string;
  };
  selectedPeriod: "week" | "month" | "quarter" | "year";
  metricsHistory: FitnessMetrics[];

  // Chart Data
  chartData: {
    workoutFrequency: Array<{ date: string; count: number }>;
    weightProgress: Array<{ date: string; weight: number }>;
    sleepPattern: Array<{ date: string; hours: number; quality?: number }>;
    caloriesBurned: Array<{ date: string; calories: number }>;
    waterIntake: Array<{ date: string; milliliters: number }>; // STANDARDIZED: Always use ML
    performanceScore: Array<{ date: string; score: number }>;
  };

  // SSOT fix: Supabase-fetched history lives in the store so Analytics tab
  // shows cached data immediately on re-mount instead of showing a loading spinner.
  weightHistory: Array<{ date: string; weight: number }>;
  calorieHistory: Array<{ date: string; consumed: number; burned: number }>;

  // Fix 21: DailyMetrics[] from analytics_metrics Supabase table.
  dailyMetricsHistory: import('../services/analyticsData').DailyMetrics[];
  dailyMetricsHistoryPeriod: number;

  // GAP-06: Exercise-level analytics from exercise_sets + exercise_prs
  exerciseVolumeHistory: Array<{
    exerciseId: string;
    exerciseName: string;
    date: string;
    totalVolume: number; // sets * reps * weight
    maxWeight: number;
    totalSets: number;
  }>;
  personalRecords: Array<{
    exerciseId: string;
    exerciseName: string;
    weightKg: number;
    reps: number;
    achievedAt: string;
  }>;
  // P3-23: Loading flag for exercise analytics so consumers can show a loading
  // state instead of an empty list with no indication that data is still
  // fetching. loadExerciseAnalytics runs on initialize() and after login/reset.
  isLoadingExerciseAnalytics: boolean;

  // Actions
  initialize: () => Promise<void>;
  addDailyMetrics: (metrics: FitnessMetrics) => Promise<void>;
  generateAnalytics: (
    targetPeriod?: "week" | "month" | "quarter" | "year",
  ) => Promise<void>;
  setPeriod: (period: "week" | "month" | "quarter" | "year") => void;
  refreshAnalytics: () => Promise<void>;
  getWorkoutAnalytics: () => WorkoutAnalytics | null;
  getNutritionAnalytics: () => NutritionAnalytics | null;
  getBodyCompositionAnalytics: () => BodyCompositionAnalytics | null;
  getSleepWellnessAnalytics: () => SleepWellnessAnalytics | null;
  getPredictiveInsights: () => PredictiveInsights | null;
  // GAP-06: load exercise_sets + exercise_prs from Supabase
  loadExerciseAnalytics: (days?: number) => Promise<void>;

  // Chart Data Generators
  generateChartData: () => void;
  getWorkoutFrequencyData: (
    days: number,
  ) => Array<{ date: string; count: number }>;
  getWeightProgressData: (
    days: number,
  ) => Array<{ date: string; weight: number }>;
  getSleepPatternData: (
    days: number,
  ) => Array<{ date: string; hours: number; quality?: number }>;
  getPerformanceScoreData: (
    days: number,
  ) => Array<{ date: string; score: number }>;

  // Insights & Recommendations
  getTopInsights: () => string[];
  getImprovementAreas: () => string[];
  getPositiveTrends: () => string[];
  getNegativeTrends: () => string[];
  getAchievements: () => string[];

  // SSOT: Store history data fetched from Supabase so re-mounts show cached values
  setHistoryData: (
    weightHistory: Array<{ date: string; weight: number }>,
    calorieHistory: Array<{ date: string; consumed: number; burned: number }>,
  ) => void;
  setDailyMetricsHistory: (
    data: import('../services/analyticsData').DailyMetrics[],
    periodDays: number,
  ) => void;

  // Reset store (for logout)
  reset: () => void;
}

export const useAnalyticsStore = create<AnalyticsStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      // Initial State
      isLoading: false,
      isInitialized: false,
      currentAnalytics: null,
      analyticsSummary: {
        totalWorkouts: 0,
        averageScore: 0,
        currentStreak: 0,
        recentTrend: "No data",
      },
      selectedPeriod: "month",
      metricsHistory: [],
      weightHistory: [],
      calorieHistory: [],
      dailyMetricsHistory: [],
      dailyMetricsHistoryPeriod: 0,
      // GAP-06 initial state
      exerciseVolumeHistory: [],
      personalRecords: [],
      // P3-23: true while exercise analytics are being fetched from Supabase.
      isLoadingExerciseAnalytics: false,

      chartData: {
        workoutFrequency: [],
        weightProgress: [],
        sleepPattern: [],
        caloriesBurned: [],
        waterIntake: [],
        performanceScore: [],
      },

      // Initialize analytics system
      initialize: async () => {
        set({ isLoading: true });

        try {
          // Initialize analytics engine
          await analyticsEngine.initialize();

          // Load metrics history
          const metricsHistory = analyticsEngine.getMetricsHistory();

          // Get summary data
          const summary = await analyticsEngine.getAnalyticsSummary();

          // P2-12: Load persisted streaks from Supabase so a fresh launch shows
          // the user's real streak immediately (before any recompute). The
          // analyticsSummary from the engine is 0 until metrics are loaded,
          // so prefer the persisted value when the engine has no data yet.
          const userId = getCurrentUserId();
          if (userId && !userId.startsWith("guest")) {
            try {
              const persisted =
                await analyticsDataService.loadStreaks(userId);
              if (
                metricsHistory.length === 0 ||
                summary.currentStreak === 0
              ) {
                summary.currentStreak = persisted.currentStreak;
              }
            } catch (streakErr) {
              console.warn(
                "[analyticsStore] loadStreaks failed, will recompute:",
                streakErr,
              );
            }
          }

          // Generate initial analytics if we have data
          if (metricsHistory.length > 0) {
            await get().generateAnalytics();
          }

          // Generate chart data
          get().generateChartData();

          // GAP-06: Load exercise-level analytics from Supabase
          await get().loadExerciseAnalytics(90);

          set({
            isInitialized: true,
            metricsHistory,
            analyticsSummary: summary,
            isLoading: false,
          });

        } catch (error) {
          console.error("❌ Error initializing analytics store:", error);
          set({
            isLoading: false,
            analyticsSummary: {
              totalWorkouts: 0,
              averageScore: 0,
              currentStreak: 0,
              recentTrend: "No data",
            },
          });
        }
      },

      // Add daily fitness metrics
      addDailyMetrics: async (metrics: FitnessMetrics) => {
        try {
          // Add to analytics engine
          await analyticsEngine.addDailyMetrics(metrics);

          // Update local state
          const updatedHistory = analyticsEngine.getMetricsHistory();
          const updatedSummary = await analyticsEngine.getAnalyticsSummary();

          // Prune metricsHistory to keep only the last 365 entries to prevent unbounded growth
          const prunedHistory = updatedHistory.length > 365
            ? updatedHistory.slice(-365)
            : updatedHistory;

          set({
            metricsHistory: prunedHistory,
            analyticsSummary: updatedSummary,
          });

          // Regenerate analytics and charts
          await get().generateAnalytics(get().selectedPeriod);
          get().generateChartData();

          logger.info("Metrics added and analytics updated", { status: "success" });
        } catch (error) {
          console.error("❌ Error adding daily metrics:", error);
        }
      },

      // Generate comprehensive analytics
      generateAnalytics: async (targetPeriod = get().selectedPeriod) => {
        set({ isLoading: true });

        try {
          logger.debug(`🔄 Generating ${targetPeriod} analytics...`);

          const analytics = await analyticsEngine.generateAnalytics(targetPeriod);

          set({
            currentAnalytics: analytics,
            selectedPeriod: targetPeriod,
            isLoading: false,
          });

          // P0-strk-1 SSOT: analyticsStore NO LONGER persists streaks to
          // Supabase. achievementStore.updateCurrentStreak is now the SOLE
          // writer of analytics_metrics.current_streak / longest_streak (it
          // computes the streak reactively from fitnessStore.completedSessions
          // and is invoked on workout completion / extra-workout completion).
          //
          // Previously analyticsStore.saveStreaks and achievementStore BOTH
          // wrote the same Supabase column → last-writer-wins with conflicting
          // values, and analyticsStore's value could be wrong (non-consecutive
          // days counted). The streak computed here by analyticsEngine is kept
          // READABLE for the analytics UI (analyticsSummary.currentStreak and
          // currentAnalytics.workout.streakCurrent) but is NOT persisted — the
          // persisted canonical value is whatever achievementStore wrote. On
          // initialize() we read the persisted streak back via loadStreaks and
          // use it to seed analyticsSummary, so the UI never loses the value.
          //
          // Do NOT re-add a saveStreaks call here — that re-introduces the
          // dual-writer conflict. If persistence is needed, route through
          // achievementStore.updateCurrentStreak.

          logger.info("Analytics generated", {
            period: targetPeriod,
            score: analytics.overallScore,
          });
        } catch (error) {
          // P2-13: Handle "Insufficient data" gracefully WITHOUT clobbering the
          // existing analyticsSummary / streak with zeros. A recompute failure
          // (e.g. new user with no data) must not wipe a previously-persisted
          // streak. Keep the last known good summary.
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("Insufficient data")) {
            logger.debug(
              "📊 No analytics data yet - user needs to log workouts/meals first",
            );
          } else {
            console.error("❌ Error generating analytics:", error);
          }
          set({
            isLoading: false,
            // P2-13: Do NOT set currentAnalytics to null here — preserve the
            // last known good value so a transient recompute failure doesn't
            // wipe the UI. Only clear on explicit reset().
          });
        }
      },

      // Set selected time period
      setPeriod: (period) => {
        set({ selectedPeriod: period });
        get().generateAnalytics(period);
      },

      // Refresh all analytics data
      refreshAnalytics: async () => {
        await get().generateAnalytics(get().selectedPeriod);

        const updatedSummary = await analyticsEngine.getAnalyticsSummary();
        set({ analyticsSummary: updatedSummary });

        get().generateChartData();
      },

      // Get specific analytics sections
      getWorkoutAnalytics: () => {
        return get().currentAnalytics?.workout || null;
      },

      getNutritionAnalytics: () => {
        return get().currentAnalytics?.nutrition || null;
      },

      getBodyCompositionAnalytics: () => {
        return get().currentAnalytics?.bodyComposition || null;
      },

      getSleepWellnessAnalytics: () => {
        return get().currentAnalytics?.sleepWellness || null;
      },

      getPredictiveInsights: () => {
        return get().currentAnalytics?.predictiveInsights || null;
      },

      // Generate all chart data
      generateChartData: () => {
        const state = get();
        const { metricsHistory } = state;

        if (metricsHistory.length === 0) {
          set({
            chartData: {
              workoutFrequency: [],
              weightProgress: [],
              sleepPattern: [],
              caloriesBurned: [],
              waterIntake: [],
              performanceScore: [],
            },
          });
          return;
        }

        const chartData = {
          workoutFrequency: state.getWorkoutFrequencyData(30),
          weightProgress: state.getWeightProgressData(90),
          sleepPattern: state.getSleepPatternData(30),
          caloriesBurned: metricsHistory
            .slice(0, 30)
            .map((m) => ({
              date: m.date,
              calories: m.caloriesBurned,
            }))
            .reverse(),
          waterIntake: metricsHistory
            .slice(0, 30)
            .map((m) => ({
              date: m.date,
              milliliters: m.waterIntake, // STANDARDIZED: Always use ML
            }))
            .reverse(),
          performanceScore: state.getPerformanceScoreData(30),
        };

        set({ chartData });
      },

      // Chart data generators
      getWorkoutFrequencyData: (days: number) => {
        const { metricsHistory } = get();

        return metricsHistory
          .slice(0, days)
          .map((m) => ({
            date: m.date,
            count: m.workoutCount,
          }))
          .reverse();
      },

      getWeightProgressData: (days: number) => {
        const { metricsHistory } = get();

        return metricsHistory
          .slice(0, days)
          .filter((m) => m.weight !== undefined)
          .map((m) => ({
            date: m.date,
            weight: m.weight!,
          }))
          .reverse();
      },

      getSleepPatternData: (days: number) => {
        const { metricsHistory } = get();

        return metricsHistory
          .slice(0, days)
          .map((m) => ({
            date: m.date,
            hours: m.sleepHours,
            quality: m.sleepQuality,
          }))
          .reverse();
      },

      getPerformanceScoreData: (days: number) => {
        const { metricsHistory } = get();

        // Calculate daily performance score based on multiple factors
        return metricsHistory
          .slice(0, days)
          .map((m) => {
            let score = 50; // Base score

            // Workout contribution (0-30 points)
            score += Math.min(30, m.workoutCount * 10);

            // Sleep contribution (0-25 points)
            const sleepOptimal = 8;
            const sleepScore = Math.max(
              0,
              25 - Math.abs(m.sleepHours - sleepOptimal) * 5,
            );
            score += sleepScore;

            // Water intake contribution (0-15 points)
            // Use user's water goal from StoreCoordinator, or skip if not set
            const waterGoalML = getHydrationGoal();
            if (waterGoalML && m.waterIntake) {
              const waterScore = Math.min(
                15,
                (m.waterIntake / (waterGoalML / 1000)) * 15,
              );
              score += waterScore;
            }

            // Steps contribution (0-15 points)
            // Use user's steps goal from StoreCoordinator, or skip if not set
            const healthMetrics = getHealthMetrics();
            if (healthMetrics?.stepsGoal && m.steps) {
              const stepsScore = Math.min(
                15,
                (m.steps / healthMetrics.stepsGoal) * 15,
              );
              score += stepsScore;
            }

            // Mood/energy contribution (0-15 points)
            if (m.mood && m.energyLevel) {
              score += ((m.mood + m.energyLevel) / 2 - 5) * 3;
            }

            return {
              date: m.date,
              score: Math.round(Math.min(100, Math.max(0, score))),
            };
          })
          .reverse();
      },

      // Insights and recommendations
      getTopInsights: () => {
        const { currentAnalytics } = get();
        if (!currentAnalytics) return [];

        const insights: string[] = [];

        // Workout insights
        if (currentAnalytics.workout.progressTrend === "improving") {
          insights.push(
            `🚀 Your workout frequency is trending upward with ${currentAnalytics.workout.averageWorkoutsPerWeek.toFixed(1)} sessions per week`,
          );
        }

        // Sleep insights
        if (currentAnalytics.sleepWellness.averageSleepHours >= 7.5) {
          insights.push(
            `😴 Excellent sleep habits with ${currentAnalytics.sleepWellness.averageSleepHours.toFixed(1)} hours average`,
          );
        }

        // Consistency insights
        if (currentAnalytics.workout.streakCurrent >= 7) {
          insights.push(
            `🔥 Amazing ${currentAnalytics.workout.streakCurrent}-day workout streak!`,
          );
        }

        // Nutrition insights
        if (currentAnalytics.nutrition.nutritionScore >= 80) {
          insights.push(
            `🥗 Great nutrition quality with ${currentAnalytics.nutrition.nutritionScore}/100 score`,
          );
        }

        // Overall performance
        if (currentAnalytics.overallScore >= 80) {
          insights.push(
            `⭐ Outstanding overall performance at ${currentAnalytics.overallScore}/100`,
          );
        }

        return insights.slice(0, 3); // Return top 3 insights
      },

      getImprovementAreas: () => {
        const { currentAnalytics } = get();
        if (!currentAnalytics) return [];

        return currentAnalytics.improvementSuggestions || [];
      },

      getPositiveTrends: () => {
        const { currentAnalytics } = get();
        if (!currentAnalytics) return [];

        return currentAnalytics.trends.positive || [];
      },

      getNegativeTrends: () => {
        const { currentAnalytics } = get();
        if (!currentAnalytics) return [];

        return currentAnalytics.trends.negative || [];
      },

      getAchievements: () => {
        const { currentAnalytics } = get();
        if (!currentAnalytics) return [];

        return currentAnalytics.achievements || [];
      },

      // Reset store to initial state (for logout)
      reset: () => {
        // P0 double-count fix: clear the idempotency guard so a re-login
        // (potentially replaying today's workout events) starts fresh.
        analyticsHelpers._clearCountedWorkouts();
        set({
          isLoading: false,
          isInitialized: false,
          currentAnalytics: null,
          analyticsSummary: {
            totalWorkouts: 0,
            averageScore: 0,
            currentStreak: 0,
            recentTrend: "No data",
          },
          selectedPeriod: "month",
          metricsHistory: [],
          weightHistory: [],
          calorieHistory: [],
          // Fix 21: clear Supabase-fetched daily metrics cache on logout
          dailyMetricsHistory: [],
          dailyMetricsHistoryPeriod: 0,
          // GAP-06: clear exercise analytics on logout
          exerciseVolumeHistory: [],
          personalRecords: [],
          // P3-23: reset the loading flag on logout.
          isLoadingExerciseAnalytics: false,
          chartData: {
            workoutFrequency: [],
            weightProgress: [],
            sleepPattern: [],
            caloriesBurned: [],
            waterIntake: [],
            performanceScore: [],
          },
        });
      },

      setHistoryData: (
        weightHistory: Array<{ date: string; weight: number }>,
        calorieHistory: Array<{ date: string; consumed: number; burned: number }>,
      ) => {
        const sortedWeightHistory = [...weightHistory].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        );
        set({ weightHistory: sortedWeightHistory, calorieHistory });
      },

      // Fix 21: Cache DailyMetrics fetched from analytics_metrics Supabase table
      setDailyMetricsHistory: (data, periodDays) => {
        // P3-22: Re-derive weightHistory / calorieHistory from dailyMetricsHistory
        // so the two flattened projections can't diverge from the canonical
        // DailyMetrics[] (which carries weightKg / caloriesConsumed / caloriesBurned).
        // setHistoryData (the other writer) is kept for the progress_entries /
        // meals fallback paths that dailyMetricsHistory doesn't cover, but when
        // dailyMetricsHistory is the source we project from it directly.
        const derivedWeight = data
          .filter((m) => m.weightKg !== null && m.weightKg !== undefined)
          .map((m) => ({ date: m.metricDate, weight: m.weightKg as number }))
          .sort((a, b) => a.date.localeCompare(b.date));
        const derivedCalorie = data
          .map((m) => ({
            date: m.metricDate,
            consumed: m.caloriesConsumed ?? 0,
            burned: m.caloriesBurned ?? 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
        set({
          dailyMetricsHistory: data,
          dailyMetricsHistoryPeriod: periodDays,
          weightHistory: derivedWeight,
          calorieHistory: derivedCalorie,
        });
      },

      // GAP-06: Load exercise_sets + exercise_prs from Supabase
      loadExerciseAnalytics: async (days = 90) => {
        const userId = getCurrentUserId();
        if (!userId) {
          console.warn('[AnalyticsStore] loadExerciseAnalytics: no userId, skipping');
          return;
        }

        // P3-23: set the loading flag so consumers can show a loading state
        // instead of an empty list with no indication that data is fetching.
        set({ isLoadingExerciseAnalytics: true });

        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

        // Load exercise volume from exercise_sets
        try {
          const { data: sets, error: setsError } = await supabase
            .from('exercise_sets')
            .select('exercise_id, exercise_name, weight_kg, reps, completed_at')
            .eq('user_id', userId)
            .eq('is_completed', true)
            .gte('completed_at', since)
            .order('completed_at', { ascending: false })
            .limit(500);

          if (setsError) {
            console.error('[analyticsStore] Failed to load exercise_sets:', setsError);
          } else if (sets && sets.length > 0) {
            // Group by (exerciseId, date) and aggregate volume
            const volumeMap = new Map<string, {
              exerciseId: string;
              exerciseName: string;
              date: string;
              totalVolume: number;
              maxWeight: number;
              totalSets: number;
            }>();

            sets.forEach((row: any) => {
              const date = (row.completed_at || '').split('T')[0] || '';
              const key = `${row.exercise_id}__${date}`;
              const weight = Number(row.weight_kg) || 0;
              const reps = Number(row.reps) || 0;
              const existing = volumeMap.get(key);
              if (existing) {
                existing.totalVolume += weight * reps;
                existing.maxWeight = Math.max(existing.maxWeight, weight);
                existing.totalSets += 1;
              } else {
                volumeMap.set(key, {
                  exerciseId: row.exercise_id || '',
                  exerciseName: row.exercise_name || row.exercise_id || '',
                  date,
                  totalVolume: weight * reps,
                  maxWeight: weight,
                  totalSets: 1,
                });
              }
            });

            set({ exerciseVolumeHistory: Array.from(volumeMap.values()) });
          }
        } catch (err) {
          console.error('[analyticsStore] Exception loading exercise_sets:', err);
        }

        // Load personal records from exercise_prs
        try {
          const { data: prs, error: prsError } = await supabase
            .from('exercise_prs')
            .select('exercise_id, exercise_name, pr_type, value, reps, achieved_at')
            .eq('user_id', userId)
            .order('achieved_at', { ascending: false })
            .limit(200);

          if (prsError) {
            console.error('[analyticsStore] Failed to load exercise_prs:', prsError);
          } else if (prs && prs.length > 0) {
            set({
              personalRecords: prs.map((pr: any) => ({
                exerciseId: pr.exercise_id || '',
                exerciseName: pr.exercise_name || pr.exercise_id || '',
                weightKg: pr.pr_type === 'max_weight' ? Number(pr.value) || 0 : 0,
                reps: Number(pr.reps) || 0,
                prType: pr.pr_type || '',
                value: Number(pr.value) || 0,
                achievedAt: pr.achieved_at || '',
              })),
            });
          }
        } catch (err) {
          console.error('[analyticsStore] Exception loading exercise_prs:', err);
        } finally {
          // P3-23: clear the loading flag once both queries finish (success or fail).
          set({ isLoadingExerciseAnalytics: false });
        }
      },
    })),
    {
      name: "analytics-storage",
      storage: createDebouncedStorage(),
      partialize: (state) => ({
        // Persist critical analytics state
        metricsHistory: state.metricsHistory,
        analyticsSummary: state.analyticsSummary,
        // P3-21: chartData is NOT persisted — it is fully derived from
        // metricsHistory via generateChartData(). Persisting a stale copy
        // would diverge if the generator logic ever changes. Always regenerate
        // on load (initialize() calls generateChartData()).
        selectedPeriod: state.selectedPeriod,
        isInitialized: state.isInitialized,
        // Cache history to survive tab switches
        weightHistory: state.weightHistory,
        calorieHistory: state.calorieHistory,
        // Fix 21: Persist daily metrics so trends screen shows data on re-mount
        dailyMetricsHistory: state.dailyMetricsHistory,
        dailyMetricsHistoryPeriod: state.dailyMetricsHistoryPeriod,
      }),
    },
  ),
);

// Analytics helpers for easy integration
export const analyticsHelpers = {
  // P0 double-count fix: idempotency guard. Tracks workout identities already
  // counted in this session so a re-fired realtime event (or a duplicate call
  // from a screen) cannot re-accumulate calories into metricsHistory. The key
  // is date + duration + caloriesBurned + type — the strongest identity
  // available given the caller does not pass a sessionId. The Set lives only
  // for the process lifetime (cleared on logout via _clearCountedWorkouts
  // below), which is the window in which a realtime re-fire could double-count.
  _countedWorkoutKeys: new Set<string>(),

  // Reset the idempotency guard (called on logout / store reset).
  _clearCountedWorkouts: () => {
    analyticsHelpers._countedWorkoutKeys.clear();
  },

  // Track workout completion
  trackWorkoutCompleted: async (workoutData: {
    date: string;
    duration: number;
    caloriesBurned: number;
    type: string;
    heartRate?: number;
  }) => {
    // P0 double-count fix: idempotency guard. If this exact workout identity
    // was already counted (same date + duration + calories + type), skip the
    // in-memory accumulation. The Supabase analytics_metrics write
    // (analyticsDataService.updateTodaysMetrics) is the canonical SSOT; this
    // in-memory path is a derived cache only.
    const idempotencyKey = `${workoutData.date}|${workoutData.duration}|${workoutData.caloriesBurned}|${workoutData.type}`;
    if (analyticsHelpers._countedWorkoutKeys.has(idempotencyKey)) {
      console.warn(
        "[analyticsStore] trackWorkoutCompleted: duplicate workout event ignored (idempotency guard)",
        idempotencyKey,
      );
      return;
    }
    analyticsHelpers._countedWorkoutKeys.add(idempotencyKey);

    const store = useAnalyticsStore.getState();

    // Get existing metrics for the day or create new
    const existingMetrics = store.metricsHistory.find(
      (m) => m.date === workoutData.date,
    );

    const updatedMetrics: FitnessMetrics = {
      ...existingMetrics,
      date: workoutData.date,
      workoutCount: (existingMetrics?.workoutCount || 0) + 1,
      totalWorkoutTime:
        (existingMetrics?.totalWorkoutTime || 0) + workoutData.duration,
      caloriesBurned:
        (existingMetrics?.caloriesBurned || 0) + workoutData.caloriesBurned,
      averageHeartRate:
        workoutData.heartRate || existingMetrics?.averageHeartRate,
      steps: existingMetrics?.steps || 0,
      distance: existingMetrics?.distance || 0,
      activeMinutes:
        (existingMetrics?.activeMinutes || 0) + workoutData.duration,
      // NO FALLBACK: Keep existing value or undefined - don't invent fake data
      sleepHours: existingMetrics?.sleepHours as number,
      waterIntake: existingMetrics?.waterIntake as number,
    };

    await store.addDailyMetrics(updatedMetrics);
  },

  // Track daily wellness metrics
  trackWellnessMetrics: async (wellnessData: {
    date: string;
    sleepHours: number;
    sleepQuality?: number;
    mood?: number;
    energyLevel?: number;
    stressLevel?: number;
    waterIntake: number;
  }) => {
    const store = useAnalyticsStore.getState();

    const existingMetrics = store.metricsHistory.find(
      (m) => m.date === wellnessData.date,
    );

    const updatedMetrics: FitnessMetrics = {
      ...existingMetrics,
      date: wellnessData.date,
      sleepHours: wellnessData.sleepHours,
      sleepQuality: wellnessData.sleepQuality,
      mood: wellnessData.mood,
      energyLevel: wellnessData.energyLevel,
      stressLevel: wellnessData.stressLevel,
      waterIntake: wellnessData.waterIntake,
      workoutCount: existingMetrics?.workoutCount || 0,
      totalWorkoutTime: existingMetrics?.totalWorkoutTime || 0,
      caloriesBurned: existingMetrics?.caloriesBurned || 0,
      steps: existingMetrics?.steps || 0,
      distance: existingMetrics?.distance || 0,
      activeMinutes: existingMetrics?.activeMinutes || 0,
    };

    await store.addDailyMetrics(updatedMetrics);
  },

  // Track body composition changes
  trackBodyComposition: async (bodyData: {
    date: string;
    weight?: number;
    bodyFat?: number;
    muscleMass?: number;
  }) => {
    const store = useAnalyticsStore.getState();

    const existingMetrics = store.metricsHistory.find(
      (m) => m.date === bodyData.date,
    );

    const updatedMetrics: FitnessMetrics = {
      ...existingMetrics,
      date: bodyData.date,
      weight: bodyData.weight,
      bodyFat: bodyData.bodyFat,
      muscleMass: bodyData.muscleMass,
      workoutCount: existingMetrics?.workoutCount || 0,
      totalWorkoutTime: existingMetrics?.totalWorkoutTime || 0,
      caloriesBurned: existingMetrics?.caloriesBurned || 0,
      steps: existingMetrics?.steps || 0,
      distance: existingMetrics?.distance || 0,
      activeMinutes: existingMetrics?.activeMinutes || 0,
      // NO FALLBACK: Keep existing value or undefined - don't invent fake data
      sleepHours: (existingMetrics?.sleepHours || 0) as number,
      waterIntake: (existingMetrics?.waterIntake || 0) as number,
    };

    await store.addDailyMetrics(updatedMetrics);
  },

  // Get analytics for specific time period
  getAnalyticsForPeriod: async (
    period: "week" | "month" | "quarter" | "year",
  ) => {
    const store = useAnalyticsStore.getState();
    await store.generateAnalytics(period);
    return store.currentAnalytics;
  },

  // Get recommendation based on current trends
  getPersonalizedRecommendation: (): string => {
    const store = useAnalyticsStore.getState();
    const { currentAnalytics } = store;

    if (!currentAnalytics) {
      return "Start logging your workouts and wellness metrics to get personalized recommendations!";
    }

    // Prioritize recommendations based on biggest impact
    if (currentAnalytics.workout.consistencyScore < 50) {
      return "Focus on workout consistency - even 15 minutes daily can create lasting habits!";
    }

    if (currentAnalytics.sleepWellness.averageSleepHours < 7) {
      return "Prioritize sleep - aim for 7-9 hours to boost recovery and performance!";
    }

    if (currentAnalytics.nutrition.waterIntakeAverage < 2.5) {
      return "Increase your water intake to at least 2.5L daily for better performance!";
    }

    if (currentAnalytics.workout.averageWorkoutsPerWeek < 3) {
      return "Try to increase your workout frequency to 3-4 sessions per week!";
    }

    return "You're doing great! Keep maintaining your current habits and consider challenging yourself with new goals!";
  },
};

export default useAnalyticsStore;
