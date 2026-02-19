import { create } from "zustand";
import {
  subscribeWithSelector,
  persist,
  createJSONStorage,
} from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { analyticsEngine } from "../../services/analyticsEngine";
import {
  AnalyticsStore,
  AnalyticsSummary,
  FitnessMetrics,
  TimePeriod,
} from "./types";
import {
  getWorkoutFrequencyData,
  getWeightProgressData,
  getSleepPatternData,
  getPerformanceScoreData,
  generateChartData,
} from "./chartDataGenerators";
import {
  getTopInsights,
  getImprovementAreas,
  getPositiveTrends,
  getNegativeTrends,
  getAchievements,
} from "./insightsSelectors";

const initialSummary: AnalyticsSummary = {
  totalWorkouts: 0,
  averageScore: 0,
  currentStreak: 0,
  recentTrend: "No data",
};

export const useAnalyticsStore = create<AnalyticsStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      isLoading: false,
      isInitialized: false,
      currentAnalytics: null,
      analyticsSummary: initialSummary,
      selectedPeriod: "month",
      metricsHistory: [],

      chartData: {
        workoutFrequency: [],
        weightProgress: [],
        sleepPattern: [],
        caloriesBurned: [],
        waterIntake: [],
        performanceScore: [],
      },

      initialize: async () => {
        set({ isLoading: true });

        try {
          console.log("📊 Initializing analytics store...");

          await analyticsEngine.initialize();

          const metricsHistory = analyticsEngine.getMetricsHistory();

          const summary = await analyticsEngine.getAnalyticsSummary();

          if (metricsHistory.length > 0) {
            await get().generateAnalytics();
          }

          get().generateChartData();

          set({
            isInitialized: true,
            metricsHistory,
            analyticsSummary: summary,
            isLoading: false,
          });

          console.log(
            `✅ Analytics store initialized with ${metricsHistory.length} data points`,
          );
        } catch (error) {
          console.error("❌ Error initializing analytics store:", error);
          set({
            isLoading: false,
            analyticsSummary: initialSummary,
          });
        }
      },

      addDailyMetrics: async (metrics: FitnessMetrics) => {
        try {
          console.log(`📈 Adding metrics for ${metrics.date}`);

          await analyticsEngine.addDailyMetrics(metrics);

          const updatedHistory = analyticsEngine.getMetricsHistory();
          const updatedSummary = await analyticsEngine.getAnalyticsSummary();

          set({
            metricsHistory: updatedHistory,
            analyticsSummary: updatedSummary,
          });

          await get().generateAnalytics(get().selectedPeriod);
          get().generateChartData();

          console.log("✅ Metrics added and analytics updated");
        } catch (error) {
          console.error("❌ Error adding daily metrics:", error);
        }
      },

      generateAnalytics: async (period = get().selectedPeriod) => {
        set({ isLoading: true });

        try {
          console.log(`🔄 Generating ${period} analytics...`);

          const analytics = await analyticsEngine.generateAnalytics(period);

          set({
            currentAnalytics: analytics,
            selectedPeriod: period,
            isLoading: false,
          });

          console.log(
            `✅ ${period} analytics generated - Score: ${analytics.overallScore}/100`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage.includes("Insufficient data")) {
            console.log(
              "📊 No analytics data yet - user needs to log workouts/meals first",
            );
          } else {
            console.error("❌ Error generating analytics:", error);
          }
          set({
            isLoading: false,
            currentAnalytics: null,
          });
        }
      },

      setPeriod: (period) => {
        set({ selectedPeriod: period });
        get().generateAnalytics(period);
      },

      refreshAnalytics: async () => {
        await get().generateAnalytics(get().selectedPeriod);

        const updatedSummary = await analyticsEngine.getAnalyticsSummary();
        set({ analyticsSummary: updatedSummary });

        get().generateChartData();
      },

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

      generateChartData: () => {
        const state = get();
        const { metricsHistory } = state;

        const chartData = generateChartData(
          metricsHistory,
          (days) => getWorkoutFrequencyData(metricsHistory, days),
          (days) => getWeightProgressData(metricsHistory, days),
          (days) => getSleepPatternData(metricsHistory, days),
          (days) => getPerformanceScoreData(metricsHistory, days),
        );

        set({ chartData });
      },

      getWorkoutFrequencyData: (days: number) => {
        const { metricsHistory } = get();
        return getWorkoutFrequencyData(metricsHistory, days);
      },

      getWeightProgressData: (days: number) => {
        const { metricsHistory } = get();
        return getWeightProgressData(metricsHistory, days);
      },

      getSleepPatternData: (days: number) => {
        const { metricsHistory } = get();
        return getSleepPatternData(metricsHistory, days);
      },

      getPerformanceScoreData: (days: number) => {
        const { metricsHistory } = get();
        return getPerformanceScoreData(metricsHistory, days);
      },

      getTopInsights: () => {
        const { currentAnalytics } = get();
        return getTopInsights(currentAnalytics);
      },

      getImprovementAreas: () => {
        const { currentAnalytics } = get();
        return getImprovementAreas(currentAnalytics);
      },

      getPositiveTrends: () => {
        const { currentAnalytics } = get();
        return getPositiveTrends(currentAnalytics);
      },

      getNegativeTrends: () => {
        const { currentAnalytics } = get();
        return getNegativeTrends(currentAnalytics);
      },

      getAchievements: () => {
        const { currentAnalytics } = get();
        return getAchievements(currentAnalytics);
      },

      reset: () => {
        set({
          isLoading: false,
          isInitialized: false,
          currentAnalytics: null,
          analyticsSummary: initialSummary,
          selectedPeriod: "month",
          metricsHistory: [],
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
    })),
    {
      name: "analytics-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        metricsHistory: state.metricsHistory,
        analyticsSummary: state.analyticsSummary,
        chartData: state.chartData,
        selectedPeriod: state.selectedPeriod,
        isInitialized: state.isInitialized,
      }),
    },
  ),
);
