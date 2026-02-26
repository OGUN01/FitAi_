import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventEmitter } from "../../utils/EventEmitter";
import { FitnessMetrics, ComprehensiveAnalytics } from "./types";
import {
  getDateRange,
  getMetricsInRange,
  analyzeTrendDirection,
} from "./helpers";
import { analyzeNutrition } from "./nutritionAnalytics";
import { analyzeBodyComposition } from "./weightAnalytics";
import { analyzeWorkouts } from "./workoutAnalytics";
import {
  calculateWorkoutStreaks,
  identifyAchievements,
} from "./streakAnalytics";
import {
  analyzeSleepWellness,
  generatePredictiveInsights,
  calculateOverallScore,
  generateImprovementSuggestions,
  analyzeTrends,
} from "./progressAnalytics";

class AnalyticsEngine extends EventEmitter {
  private readonly STORAGE_KEY = "fitai_analytics_data";
  private readonly METRICS_HISTORY_KEY = "fitai_metrics_history";

  private metricsHistory: FitnessMetrics[] = [];
  private isInitialized = false;

  constructor() {
    super();
    this.initializeAnalytics();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await this.initializeAnalytics();
  }

  getMetricsHistory(): FitnessMetrics[] {
    return [...this.metricsHistory];
  }

  private async initializeAnalytics(): Promise<void> {

    try {
      await this.loadMetricsHistory();
      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Analytics initialization failed:", error);
    }
  }

  async addDailyMetrics(metrics: FitnessMetrics): Promise<void> {
    try {
      this.metricsHistory = this.metricsHistory.filter(
        (m) => m.date !== metrics.date,
      );

      this.metricsHistory.push(metrics);

      this.metricsHistory.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      this.metricsHistory = this.metricsHistory.slice(0, 365);

      await this.saveMetricsHistory();

      this.emit("metricsUpdated", metrics);

    } catch (error) {
      console.error("❌ Error adding daily metrics:", error);
    }
  }

  async generateAnalytics(
    period: "week" | "month" | "quarter" | "year" = "month",
    endDate: Date = new Date(),
  ): Promise<ComprehensiveAnalytics> {
    const dateRange = getDateRange(period, endDate);
    const relevantMetrics = getMetricsInRange(
      this.metricsHistory,
      dateRange.start,
      dateRange.end,
    );

    if (relevantMetrics.length === 0) {
      throw new Error("Insufficient data for analytics generation");
    }


    const analytics: ComprehensiveAnalytics = {
      period,
      dateRange: {
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      },
      workout: analyzeWorkouts(relevantMetrics),
      nutrition: analyzeNutrition(relevantMetrics),
      bodyComposition: analyzeBodyComposition(relevantMetrics),
      sleepWellness: analyzeSleepWellness(relevantMetrics),
      predictiveInsights: await generatePredictiveInsights(relevantMetrics),
      overallScore: 0,
      improvementSuggestions: [],
      achievements: [],
      trends: { positive: [], negative: [], neutral: [] },
    };

    analytics.overallScore = calculateOverallScore(analytics);
    analytics.improvementSuggestions =
      generateImprovementSuggestions(analytics);
    analytics.achievements = identifyAchievements(relevantMetrics);
    analytics.trends = analyzeTrends(relevantMetrics);


    return analytics;
  }

  async getAnalyticsSummary(): Promise<{
    totalWorkouts: number;
    averageScore: number;
    currentStreak: number;
    recentTrend: string;
  }> {
    if (this.metricsHistory.length === 0) {
      return {
        totalWorkouts: 0,
        averageScore: 0,
        currentStreak: 0,
        recentTrend: "No data",
      };
    }

    const recentMetrics = this.metricsHistory.slice(0, 30);
    const totalWorkouts = recentMetrics.reduce(
      (sum, m) => sum + m.workoutCount,
      0,
    );
    const workoutTrend = analyzeTrendDirection(
      recentMetrics.map((m) => m.workoutCount),
    );
    const { currentStreak } = calculateWorkoutStreaks(recentMetrics);

    const averageScore = 75 + workoutTrend * 10 + currentStreak * 2;

    let recentTrend = "Stable";
    if (workoutTrend > 0.1) recentTrend = "Improving";
    else if (workoutTrend < -0.1) recentTrend = "Declining";

    return {
      totalWorkouts,
      averageScore: Math.round(Math.min(100, Math.max(0, averageScore))),
      currentStreak,
      recentTrend,
    };
  }

  private async loadMetricsHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.METRICS_HISTORY_KEY);
      if (stored) {
        this.metricsHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error("❌ Error loading metrics history:", error);
    }
  }

  private async saveMetricsHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.METRICS_HISTORY_KEY,
        JSON.stringify(this.metricsHistory),
      );
    } catch (error) {
      console.error("❌ Error saving metrics history:", error);
    }
  }
}

export const analyticsEngine = new AnalyticsEngine();
export default analyticsEngine;
