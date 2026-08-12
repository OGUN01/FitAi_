// Water Goal Days Hit — Supabase persistence
//
// Durable backing for achievementStore.totalWaterGoalDaysHit (the lifetime
// count of distinct calendar days the water intake goal was hit, feeding the
// "Water Week" / hydration-week achievement, target: 7).
//
// Mirrors the analyticsDataService.loadNutritionStreaks / persistNutritionStreaks
// pattern already used in achievementStore.ts for nutritionStreak: a cumulative
// metric that can't be recomputed from a single bounded local read, so it gets
// its own durable counter + load/save path instead of relying solely on the
// local AsyncStorage `persist` middleware (which resets to 0 on reinstall /
// device switch, silently rolling an already-progressed achievement backward).
//
// SSOT writer: achievementStore.recordWaterGoalHit.

import { supabase } from "../supabase";
import { getLocalDateString } from "../../utils/weekUtils";

export interface WaterGoalDaysHitRecord {
  totalWaterGoalDaysHit: number;
  lastWaterGoalHitDate: string | null;
}

const isGuestOrLocalId = (userId: string): boolean =>
  !userId || userId.startsWith("guest") || userId === "local-user";

/**
 * Load the most recently persisted totalWaterGoalDaysHit for a user.
 * Guests never have a cloud row (persistWaterGoalDaysHit skips them below),
 * so this returns the zero-state for guest/local IDs without a network call.
 */
export async function loadWaterGoalDaysHit(
  userId: string,
): Promise<WaterGoalDaysHitRecord> {
  if (isGuestOrLocalId(userId)) {
    return { totalWaterGoalDaysHit: 0, lastWaterGoalHitDate: null };
  }
  try {
    const { data, error } = await supabase
      .from("analytics_metrics")
      .select("total_water_goal_days_hit, last_water_goal_hit_date")
      .eq("user_id", userId)
      .not("total_water_goal_days_hit", "is", null)
      .order("metric_date", { ascending: false })
      .limit(1);
    if (error) {
      console.error(
        "[waterGoalPersistence] loadWaterGoalDaysHit error:",
        error,
      );
      return { totalWaterGoalDaysHit: 0, lastWaterGoalHitDate: null };
    }
    if (!data || data.length === 0) {
      return { totalWaterGoalDaysHit: 0, lastWaterGoalHitDate: null };
    }
    const row = data[0];
    return {
      totalWaterGoalDaysHit: Number(row.total_water_goal_days_hit) || 0,
      lastWaterGoalHitDate:
        (row.last_water_goal_hit_date as string | null) || null,
    };
  } catch (error) {
    console.error(
      "[waterGoalPersistence] loadWaterGoalDaysHit threw:",
      error,
    );
    return { totalWaterGoalDaysHit: 0, lastWaterGoalHitDate: null };
  }
}

/**
 * Persist the running totalWaterGoalDaysHit counter to the
 * analytics_metrics row for lastWaterGoalHitDate (defaults to today when
 * omitted/falsy). Single writer: achievementStore.recordWaterGoalHit, which
 * always passes the current local date today — but the metric_date the row
 * is written against must match the date the caller says the goal was hit
 * for, not silently default to "now", or a future backdated caller would
 * have its value written under the wrong day.
 */
export async function persistWaterGoalDaysHit(
  userId: string,
  totalWaterGoalDaysHit: number,
  lastWaterGoalHitDate: string,
): Promise<boolean> {
  if (isGuestOrLocalId(userId)) {
    return true;
  }
  try {
    const metricDate = lastWaterGoalHitDate || getLocalDateString();
    const rowId = `${userId}_${metricDate}`;
    const { error } = await supabase.from("analytics_metrics").upsert(
      {
        id: rowId,
        user_id: userId,
        metric_date: metricDate,
        total_water_goal_days_hit: totalWaterGoalDaysHit,
        last_water_goal_hit_date: lastWaterGoalHitDate || metricDate,
      },
      { onConflict: "user_id,metric_date" },
    );
    if (error) {
      console.error(
        "[waterGoalPersistence] persistWaterGoalDaysHit error:",
        error,
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "[waterGoalPersistence] persistWaterGoalDaysHit threw:",
      error,
    );
    return false;
  }
}

export const waterGoalPersistence = {
  loadWaterGoalDaysHit,
  persistWaterGoalDaysHit,
};

export default waterGoalPersistence;
