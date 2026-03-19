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
        return true;
      }

      const { error } = await supabase.from("analytics_metrics").upsert(
        {
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
        },
        { onConflict: "user_id,metric_date" },
      );

      if (error) {
        console.error("[analyticsData] saveDailyMetrics upsert error:", error);
        return false;
      }

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
        console.error("[analyticsData] loadMetricsHistory error:", error);
        return [];
      }

      if (data && data.length > 0) {
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
   * Get weight history for charts.
   *
   * Primary source : analytics_metrics  (fast, pre-aggregated).
   * Fallback source: progress_entries   (source of truth).
   *
   * The fallback fires when:
   *   - analytics_metrics has no weight rows for the period (first use, sync lag)
   *   - updateTodaysMetrics() failed silently in a previous session
   *
   * After using the fallback, each entry is back-filled into analytics_metrics
   * in the background so the fast path works on the very next chart load.
   */
  async getWeightHistory(
    userId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; weight: number }>> {
    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      return [];
    }

    // --- Fast path: analytics_metrics ---
    const metrics = await this.loadMetricsHistory(userId, days);
    const analyticsWeights = metrics
      .filter((m) => m.weightKg !== null)
      .map((m) => ({ date: m.metricDate, weight: m.weightKg! }));

    if (analyticsWeights.length > 0) {
      return analyticsWeights;
    }

    // --- Fallback path: progress_entries ---
    // analytics_metrics has no weight data for this period. Read directly from
    // the source-of-truth table so the chart is never empty after a failed sync.
    console.warn(
      "[getWeightHistory] analytics_metrics has no weight rows for",
      days,
      "days — falling back to progress_entries.",
    );

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("progress_entries")
        .select("entry_date, weight_kg")
        .eq("user_id", userId)
        .gte("entry_date", startDateStr)
        .not("weight_kg", "is", null)
        .order("entry_date", { ascending: true });

      if (error || !data || data.length === 0) {
        return [];
      }

      const fallbackWeights = data.map((row) => ({
        date: row.entry_date as string,
        weight: row.weight_kg as number,
      }));

      // Back-fill analytics_metrics in the background — fast path works next time.
      this.backFillWeightToAnalytics(userId, fallbackWeights).catch((err) =>
        console.warn("[getWeightHistory] back-fill failed:", err),
      );

      return fallbackWeights;
    } catch (err) {
      console.error(
        "[getWeightHistory] progress_entries fallback failed:",
        err,
      );
      return [];
    }
  }

  /**
   * Back-fill weight entries from progress_entries into analytics_metrics.
   * Only sets weight_kg — leaves all other columns of existing rows intact
   * (upsert with onConflict means: insert if missing, update weight_kg if exists).
   */
  private async backFillWeightToAnalytics(
    userId: string,
    entries: Array<{ date: string; weight: number }>,
  ): Promise<void> {
    for (const entry of entries) {
      const rowId = `${userId}_${entry.date}`;
      const { error } = await supabase.from("analytics_metrics").upsert(
        {
          id: rowId,
          user_id: userId,
          metric_date: entry.date,
          weight_kg: entry.weight,
        },
        { onConflict: "user_id,metric_date" },
      );
      if (error) {
        console.warn(
          "[backFillWeightToAnalytics] Failed for",
          entry.date,
          ":",
          error.message,
        );
      }
    }
  }

  /**
   * Get calorie history for charts.
   *
   * Primary source: analytics_metrics (fast, pre-aggregated).
   * Fallback source: meals table (source of truth for all logged meals).
   *
   * The fallback fires when analytics_metrics has no calorie rows (e.g. the
   * meal_logs insert was broken in older app versions, or a manual meal was
   * logged through food recognition which writes to meals, not analytics_metrics).
   */
  async getCalorieHistory(
    userId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; consumed: number; burned: number }>> {
    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      return [];
    }

    // --- Fast path: analytics_metrics ---
    const metrics = await this.loadMetricsHistory(userId, days);
    const hasCalorieData = metrics.some((m) => (m.caloriesConsumed || 0) > 0);

    if (hasCalorieData) {
      return metrics.map((m) => ({
        date: m.metricDate,
        consumed: m.caloriesConsumed || 0,
        burned: m.caloriesBurned || 0,
      }));
    }

    // --- Fallback: meals table ---
    console.warn(
      "[getCalorieHistory] analytics_metrics has no calorie rows for",
      days,
      "days — falling back to meals table.",
    );

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("meals")
        .select("consumed_at, total_calories")
        .eq("user_id", userId)
        .gte("consumed_at", startDateStr)
        .order("consumed_at", { ascending: true });

      if (error || !data || data.length === 0) {
        return [];
      }

      // Group by date and sum calories
      const grouped: Record<string, number> = {};
      for (const row of data) {
        if (!row.consumed_at) continue;
        const dateKey = row.consumed_at.split("T")[0];
        grouped[dateKey] =
          (grouped[dateKey] || 0) + (Number(row.total_calories) || 0);
      }

      return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, consumed]) => ({
          date,
          consumed: Math.round(consumed),
          burned: 0,
        }));
    } catch (err) {
      console.error("[getCalorieHistory] meals fallback failed:", err);
      return [];
    }
  }

  /**
   * Returns calories burned split by session type for a given date (YYYY-MM-DD).
   * Reads from workout_sessions table with is_extra filter.
   * Returns { planned: 0, extra: 0 } on guest/error.
   */
  async getSessionCaloriesByType(
    userId: string,
    dateStr: string,
  ): Promise<{ planned: number; extra: number }> {
    if (!userId || userId.startsWith("guest") || userId === "local-user") {
      return { planned: 0, extra: 0 };
    }
    try {
      const dayStart = new Date(`${dateStr}T00:00:00`); // local midnight
      const dayEnd = new Date(`${dateStr}T23:59:59.999`); // local end of day
      const { data, error } = await supabase
        .from("workout_sessions")
        .select("calories_burned, is_extra")
        .eq("user_id", userId)
        .eq("is_completed", true)
        .gte("completed_at", dayStart.toISOString())
        .lte("completed_at", dayEnd.toISOString());

      if (error) {
        console.error("[analyticsData] getSessionCaloriesByType error:", error);
        return { planned: 0, extra: 0 };
      }

      let planned = 0;
      let extra = 0;
      for (const row of data || []) {
        const cal = row.calories_burned || 0;
        if (row.is_extra) {
          extra += cal;
        } else {
          planned += cal;
        }
      }
      return { planned, extra };
    } catch (err) {
      console.error("[analyticsData] getSessionCaloriesByType threw:", err);
      return { planned: 0, extra: 0 };
    }
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
        .maybeSingle();

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
      const rowId = `${userId}_${today}`;

      // For ACCUMULATING fields (calories, meals, workouts), we must read first
      // then add. A bare upsert would overwrite and lose prior data from the same day.
      const incrementalFields = [
        "caloriesConsumed",
        "caloriesBurned",
        "workoutsCompleted",
        "mealsLogged",
        "waterIntakeMl",
      ] as const;
      const hasIncrementalUpdate = incrementalFields.some(
        (f) => updates[f as keyof DailyMetrics] !== undefined,
      );

      if (hasIncrementalUpdate) {
        // Fetch existing row to accumulate
        const { data: existing } = await supabase
          .from("analytics_metrics")
          .select(
            "calories_consumed, calories_burned, workouts_completed, meals_logged, water_intake_ml",
          )
          .eq("id", rowId)
          .maybeSingle();

        const row: Record<string, unknown> = {
          id: rowId,
          user_id: userId,
          metric_date: today,
        };

        // Accumulate incremental fields
        if (updates.caloriesConsumed !== undefined) {
          row.calories_consumed =
            (existing?.calories_consumed ?? 0) + updates.caloriesConsumed;
        }
        if (updates.caloriesBurned !== undefined) {
          row.calories_burned =
            (existing?.calories_burned ?? 0) + updates.caloriesBurned;
        }
        if (updates.workoutsCompleted !== undefined) {
          row.workouts_completed =
            (existing?.workouts_completed ?? 0) + updates.workoutsCompleted;
        }
        if (updates.mealsLogged !== undefined) {
          row.meals_logged =
            (existing?.meals_logged ?? 0) + updates.mealsLogged;
        }
        if (updates.waterIntakeMl !== undefined) {
          row.water_intake_ml =
            (existing?.water_intake_ml ?? 0) + updates.waterIntakeMl;
        }

        // Non-accumulating fields (overwrite is correct)
        if (updates.weightKg !== undefined) row.weight_kg = updates.weightKg;
        if (updates.steps !== undefined) row.steps = updates.steps;
        if (updates.sleepHours !== undefined)
          row.sleep_hours = updates.sleepHours;

        const { error } = await supabase
          .from("analytics_metrics")
          .upsert(row, { onConflict: "user_id,metric_date" });

        if (error) {
          console.error("❌ Metrics accumulate-upsert error:", error);
          return false;
        }
      } else {
        // No incremental fields — safe to overwrite directly
        const row: Record<string, unknown> = {
          id: rowId,
          user_id: userId,
          metric_date: today,
        };

        if (updates.weightKg !== undefined) row.weight_kg = updates.weightKg;
        if (updates.steps !== undefined) row.steps = updates.steps;
        if (updates.sleepHours !== undefined)
          row.sleep_hours = updates.sleepHours;

        const { error } = await supabase
          .from("analytics_metrics")
          .upsert(row, { onConflict: "user_id,metric_date" });

        if (error) {
          console.error("❌ Metrics upsert error:", error);
          return false;
        }
      }

      return true;
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
