// Analytics Data Service for Supabase Sync
// Provides cloud persistence for fitness metrics history to prevent data loss on app reinstall

import { supabase } from "./supabase";

export interface DailyMetrics {
  id?: string;
  userId: string;
  metricDate: string;
  weightKg: number | null;
  caloriesConsumed: number | null;
  caloriesBurned: number | null;
  workoutsCompleted: number;
  mealsLogged: number;
  waterIntakeMl: number;
  steps: number | null;
  sleepHours: number | null;
}

export interface MetricsSyncResult {
  success: boolean;
  synced: number;
  errors: string[];
}

class AnalyticsDataService {
  private static instance: AnalyticsDataService;

  static getInstance(): AnalyticsDataService {
    if (!AnalyticsDataService.instance) {
      AnalyticsDataService.instance = new AnalyticsDataService();
    }
    return AnalyticsDataService.instance;
  }

  /**
   * Save daily metrics to Supabase
   */
  async saveDailyMetrics(metrics: DailyMetrics): Promise<boolean> {
    try {
      const userId = metrics.userId;

      if (!userId || userId.startsWith("guest") || userId === "local-user") {
        console.log("⏭️ Skipping metrics sync for guest/local user");
        return true;
      }

      const { error } = await supabase.from("analytics_metrics").upsert({
        id: `${userId}_${metrics.metricDate}`,
        user_id: userId,
        metric_date: metrics.metricDate,
        weight_kg: metrics.weightKg,
        calories_consumed: metrics.caloriesConsumed,
        calories_burned: metrics.caloriesBurned,
        workouts_completed: metrics.workoutsCompleted || 0,
        meals_logged: metrics.mealsLogged || 0,
        water_intake_ml: metrics.waterIntakeMl || 0,
        steps: metrics.steps,
        sleep_hours: metrics.sleepHours,
      });

      if (error) {
        console.warn("⚠️ Failed to sync metrics to Supabase:", error.message);
        return false;
      }

      console.log(`✅ Daily metrics synced for ${metrics.metricDate}`);
      return true;
    } catch (error) {
      console.error("❌ Metrics sync error:", error);
      return false;
    }
  }

  /**
   * Load metrics history from Supabase
   */
  async loadMetricsHistory(
    userId: string,
    days: number = 30,
  ): Promise<DailyMetrics[]> {
    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      console.log("⏭️ Skipping metrics load for guest/local user");
      return [];
    }

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("analytics_metrics")
        .select("*")
        .eq("user_id", userId)
        .gte("metric_date", startDateStr)
        .order("metric_date", { ascending: true });

      if (error) {
        console.warn("⚠️ Failed to load metrics from Supabase:", error.message);
        return [];
      }

      if (data && data.length > 0) {
        console.log(`✅ Loaded ${data.length} days of metrics from Supabase`);
        return data.map((row) => ({
          id: row.id,
          userId: row.user_id,
          metricDate: row.metric_date,
          weightKg: row.weight_kg,
          caloriesConsumed: row.calories_consumed,
          caloriesBurned: row.calories_burned,
          workoutsCompleted: row.workouts_completed,
          mealsLogged: row.meals_logged,
          waterIntakeMl: row.water_intake_ml,
          steps: row.steps,
          sleepHours: row.sleep_hours,
        }));
      }

      return [];
    } catch (error) {
      console.error("❌ Error loading metrics from Supabase:", error);
      return [];
    }
  }

  /**
   * Get weight history for charts
   */
  async getWeightHistory(
    userId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; weight: number }>> {
    const metrics = await this.loadMetricsHistory(userId, days);
    return metrics
      .filter((m) => m.weightKg !== null)
      .map((m) => ({
        date: m.metricDate,
        weight: m.weightKg!,
      }));
  }

  /**
   * Get calorie history for charts
   */
  async getCalorieHistory(
    userId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; consumed: number; burned: number }>> {
    const metrics = await this.loadMetricsHistory(userId, days);
    return metrics.map((m) => ({
      date: m.metricDate,
      consumed: m.caloriesConsumed || 0,
      burned: m.caloriesBurned || 0,
    }));
  }

  /**
   * Get workout history for charts
   */
  async getWorkoutHistory(
    userId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; count: number }>> {
    const metrics = await this.loadMetricsHistory(userId, days);
    return metrics.map((m) => ({
      date: m.metricDate,
      count: m.workoutsCompleted || 0,
    }));
  }

  /**
   * Get today's metrics
   */
  async getTodaysMetrics(userId: string): Promise<DailyMetrics | null> {
    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      return null;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("analytics_metrics")
        .select("*")
        .eq("user_id", userId)
        .eq("metric_date", today)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        metricDate: data.metric_date,
        weightKg: data.weight_kg,
        caloriesConsumed: data.calories_consumed,
        caloriesBurned: data.calories_burned,
        workoutsCompleted: data.workouts_completed,
        mealsLogged: data.meals_logged,
        waterIntakeMl: data.water_intake_ml,
        steps: data.steps,
        sleepHours: data.sleep_hours,
      };
    } catch (error) {
      console.error("❌ Error getting today's metrics:", error);
      return null;
    }
  }

  /**
   * Update today's metrics (incremental update)
   */
  async updateTodaysMetrics(
    userId: string,
    updates: Partial<DailyMetrics>,
  ): Promise<boolean> {
    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      return true;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      const existingMetrics = await this.getTodaysMetrics(userId);

      const mergedMetrics: DailyMetrics = {
        userId,
        metricDate: today,
        weightKg: updates.weightKg ?? existingMetrics?.weightKg ?? null,
        caloriesConsumed:
          updates.caloriesConsumed ?? existingMetrics?.caloriesConsumed ?? null,
        caloriesBurned:
          updates.caloriesBurned ?? existingMetrics?.caloriesBurned ?? null,
        workoutsCompleted:
          (updates.workoutsCompleted ?? 0) +
          (existingMetrics?.workoutsCompleted ?? 0),
        mealsLogged:
          (updates.mealsLogged ?? 0) + (existingMetrics?.mealsLogged ?? 0),
        waterIntakeMl:
          (updates.waterIntakeMl ?? 0) + (existingMetrics?.waterIntakeMl ?? 0),
        steps: updates.steps ?? existingMetrics?.steps ?? null,
        sleepHours: updates.sleepHours ?? existingMetrics?.sleepHours ?? null,
      };

      return await this.saveDailyMetrics(mergedMetrics);
    } catch (error) {
      console.error("❌ Error updating today's metrics:", error);
      return false;
    }
  }

  /**
   * Get summary statistics
   */
  async getStatsSummary(
    userId: string,
    days: number = 7,
  ): Promise<{
    avgCaloriesConsumed: number;
    avgCaloriesBurned: number;
    totalWorkouts: number;
    avgWaterIntake: number;
    weightChange: number | null;
  }> {
    const metrics = await this.loadMetricsHistory(userId, days);

    if (metrics.length === 0) {
      return {
        avgCaloriesConsumed: 0,
        avgCaloriesBurned: 0,
        totalWorkouts: 0,
        avgWaterIntake: 0,
        weightChange: null,
      };
    }

    const caloriesConsumed = metrics.filter((m) => m.caloriesConsumed !== null);
    const caloriesBurned = metrics.filter((m) => m.caloriesBurned !== null);
    const weights = metrics.filter((m) => m.weightKg !== null);

    return {
      avgCaloriesConsumed:
        caloriesConsumed.length > 0
          ? caloriesConsumed.reduce(
              (sum, m) => sum + (m.caloriesConsumed || 0),
              0,
            ) / caloriesConsumed.length
          : 0,
      avgCaloriesBurned:
        caloriesBurned.length > 0
          ? caloriesBurned.reduce(
              (sum, m) => sum + (m.caloriesBurned || 0),
              0,
            ) / caloriesBurned.length
          : 0,
      totalWorkouts: metrics.reduce(
        (sum, m) => sum + (m.workoutsCompleted || 0),
        0,
      ),
      avgWaterIntake:
        metrics.length > 0
          ? metrics.reduce((sum, m) => sum + (m.waterIntakeMl || 0), 0) /
            metrics.length
          : 0,
      weightChange:
        weights.length >= 2
          ? weights[weights.length - 1].weightKg! - weights[0].weightKg!
          : null,
    };
  }
}

export const analyticsDataService = AnalyticsDataService.getInstance();
export default analyticsDataService;
