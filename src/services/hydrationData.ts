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
import { getCurrentUserId } from "./authUtils";
import { getLocalDateString } from "../utils/weekUtils";

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
      return { success: false, error: "Not authenticated" };
    }

    const today = getLocalDateString();

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

    const today = getLocalDateString();

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
    const startDateStr = getLocalDateString(startDate);

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
 * P3-16: Remove the most recent water log for today (used by the "remove water"
 * UI button). Filters by `date` = today (getLocalDateString) for timezone
 * consistency with logWaterIntake, NOT by `logged_at` gte today's ISO date
 * (which drifted across timezones). Returns the amount_ml of the deleted row so
 * the caller can decrement local state by exactly what was removed.
 */
export async function removeLastTodayWaterLog(): Promise<{
  success: boolean;
  deletedAmountMl?: number;
  error?: string;
}> {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      return { success: false, error: "Not authenticated" };
    }

    const today = getLocalDateString();

    // Find the most recent log for today (consistent date filter).
    const { data: logs, error: fetchError } = await supabase
      .from("water_logs")
      .select("id, amount_ml")
      .eq("user_id", userId)
      .eq("date", today)
      .order("logged_at", { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error("[HydrationData] Failed to fetch last water log:", fetchError);
      return { success: false, error: fetchError.message };
    }

    if (!logs || logs.length === 0) {
      return { success: true, deletedAmountMl: 0 };
    }

    const target = logs[0];
    const { error: deleteError } = await supabase
      .from("water_logs")
      .delete()
      .eq("id", target.id)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("[HydrationData] Failed to delete last water log:", deleteError);
      return { success: false, error: deleteError.message };
    }

    return {
      success: true,
      deletedAmountMl: Number(target.amount_ml) || 0,
    };
  } catch (err) {
    console.error("[HydrationData] Error removing last water log:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Sync local hydration data with Supabase.
 * P3-17: Previously had a dead `if (result.success) {}` empty block. This is a
 * thin wrapper over getTodayWaterIntake kept for callers that want a sync-style
 * API returning only { success, total_ml }. Removed the dead empty branch.
 */
export async function syncHydrationWithSupabase(): Promise<{
  success: boolean;
  total_ml: number;
  error?: string;
}> {
  const result = await getTodayWaterIntake();
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
  removeLastTodayWaterLog,
  syncHydrationWithSupabase,
};

export default hydrationDataService;
