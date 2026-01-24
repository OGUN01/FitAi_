/**
 * HydrationData Service - Supabase sync for water intake
 *
 * SINGLE SOURCE OF TRUTH: water_logs table in Supabase
 *
 * Features:
 * - Log water intake to Supabase
 * - Get daily/weekly/monthly water history
 * - Aggregate daily totals for analytics
 */

import { supabase } from "./supabase";
import { getCurrentUserId } from "./StoreCoordinator";

interface WaterLogEntry {
  id: string;
  user_id: string;
  date: string;
  amount_ml: number;
  logged_at: string;
  created_at: string;
}

interface DailyWaterSummary {
  date: string;
  total_ml: number;
  log_count: number;
}

/**
 * Log water intake to Supabase
 */
export async function logWaterIntake(
  amountMl: number,
): Promise<{ success: boolean; data?: WaterLogEntry; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      console.warn("[HydrationData] No user ID available for water logging");
      return { success: false, error: "Not authenticated" };
    }

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const { data, error } = await supabase
      .from("water_logs")
      .insert({
        user_id: userId,
        date: today,
        amount_ml: amountMl,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[HydrationData] Failed to log water:", error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Water logged: ${amountMl}ml`);
    return { success: true, data };
  } catch (err) {
    console.error("[HydrationData] Error logging water:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get today's total water intake from Supabase
 */
export async function getTodayWaterIntake(): Promise<{
  success: boolean;
  total_ml: number;
  log_count: number;
  error?: string;
}> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return {
        success: false,
        total_ml: 0,
        log_count: 0,
        error: "Not authenticated",
      };
    }

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("water_logs")
      .select("amount_ml")
      .eq("user_id", userId)
      .eq("date", today);

    if (error) {
      console.error("[HydrationData] Failed to get today's water:", error);
      return {
        success: false,
        total_ml: 0,
        log_count: 0,
        error: error.message,
      };
    }

    const totalMl =
      data?.reduce((sum, log) => sum + (log.amount_ml || 0), 0) || 0;
    const logCount = data?.length || 0;

    return { success: true, total_ml: totalMl, log_count: logCount };
  } catch (err) {
    console.error("[HydrationData] Error getting today's water:", err);
    return {
      success: false,
      total_ml: 0,
      log_count: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Get water intake history for the last N days
 */
export async function getWaterHistory(days: number = 7): Promise<{
  success: boolean;
  data: DailyWaterSummary[];
  error?: string;
}> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, data: [], error: "Not authenticated" };
    }

    // Calculate start date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("water_logs")
      .select("date, amount_ml")
      .eq("user_id", userId)
      .gte("date", startDateStr)
      .order("date", { ascending: true });

    if (error) {
      console.error("[HydrationData] Failed to get water history:", error);
      return { success: false, data: [], error: error.message };
    }

    // Aggregate by date
    const dateMap = new Map<string, { total_ml: number; log_count: number }>();

    data?.forEach((log) => {
      const existing = dateMap.get(log.date) || { total_ml: 0, log_count: 0 };
      dateMap.set(log.date, {
        total_ml: existing.total_ml + (log.amount_ml || 0),
        log_count: existing.log_count + 1,
      });
    });

    // Convert to array
    const summaries: DailyWaterSummary[] = Array.from(dateMap.entries()).map(
      ([date, stats]) => ({
        date,
        total_ml: stats.total_ml,
        log_count: stats.log_count,
      }),
    );

    return { success: true, data: summaries };
  } catch (err) {
    console.error("[HydrationData] Error getting water history:", err);
    return {
      success: false,
      data: [],
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Delete a water log entry
 */
export async function deleteWaterLog(
  logId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("water_logs")
      .delete()
      .eq("id", logId)
      .eq("user_id", userId);

    if (error) {
      console.error("[HydrationData] Failed to delete water log:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[HydrationData] Error deleting water log:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Sync local hydration data with Supabase
 * Call this on app start to ensure local state matches remote
 */
export async function syncHydrationWithSupabase(): Promise<{
  success: boolean;
  total_ml: number;
  error?: string;
}> {
  const result = await getTodayWaterIntake();

  if (result.success) {
    console.log(
      `[HydrationData] Synced today's water: ${result.total_ml}ml from ${result.log_count} logs`,
    );
  }

  return {
    success: result.success,
    total_ml: result.total_ml,
    error: result.error,
  };
}

// Export service object for consistency with other services
export const hydrationDataService = {
  logWaterIntake,
  getTodayWaterIntake,
  getWaterHistory,
  deleteWaterLog,
  syncHydrationWithSupabase,
};

export default hydrationDataService;
