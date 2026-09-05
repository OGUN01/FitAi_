/**
 * Meal Builder draft persistence — crash-safe autosave for `dietBuilderStore`.
 *
 * Mirrors `workoutTemplateService.saveDraft/loadDraft/clearDraft`
 * (workoutTemplateService.ts:434-513) exactly, targeting `weekly_meal_plans`
 * instead of `weekly_workout_plans`. Built for real and wired into
 * `dietBuilderStore` — unlike the workout side, where `saveDraft`/`loadDraft`
 * are documented but have zero call sites today (verified: `is_draft` is a
 * dead column there). `is_draft=true` rows are excluded from the
 * `idx_weekly_meal_plans_user_source_active` partial index (Phase 1
 * migration), so a draft never collides with the active custom plan.
 */

import { supabase } from "./supabase";
import { generateUUID } from "../utils/uuid";
import type { WeeklyMealPlan } from "../ai";

/**
 * Save a builder draft. Only one draft per (user, plan_source='custom') is
 * preserved — re-saving overwrites.
 */
export async function saveDietBuilderDraft(
  userId: string,
  plan: WeeklyMealPlan
): Promise<void> {
  const { data: existing } = await supabase
    .from("weekly_meal_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("plan_source", "custom")
    .eq("is_draft", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const rowId = (existing as { id?: string } | null)?.id ?? generateUUID();
  const now = new Date().toISOString();

  const { error } = await supabase.from("weekly_meal_plans").upsert({
    id: rowId,
    user_id: userId,
    plan_title: plan.planTitle ?? "Draft",
    plan_description: plan.planDescription ?? "",
    week_number: plan.weekNumber ?? 1,
    total_meals: plan.meals?.length ?? 0,
    total_calories: plan.totalEstimatedCalories ?? 0,
    plan_data: plan,
    is_active: false,
    plan_source: "custom",
    is_draft: true,
    updated_at: now,
  });

  if (error) {
    console.error("[mealPlanDraftService] Failed to save builder draft:", error);
    throw new Error(error.message);
  }
}

/**
 * Load the most recent builder draft (if any). Returns null if no draft
 * exists — caller should hydrate from customWeeklyMealPlan or the AI plan
 * instead.
 */
export async function loadDietBuilderDraft(
  userId: string
): Promise<WeeklyMealPlan | null> {
  const { data, error } = await supabase
    .from("weekly_meal_plans")
    .select("plan_data")
    .eq("user_id", userId)
    .eq("plan_source", "custom")
    .eq("is_draft", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[mealPlanDraftService] Failed to load builder draft:", error);
    return null;
  }

  return (data as { plan_data?: WeeklyMealPlan } | null)?.plan_data ?? null;
}

/**
 * Delete a builder draft (called on successful save — the saved plan becomes
 * the active custom row, the draft is no longer needed).
 */
export async function clearDietBuilderDraft(userId: string): Promise<void> {
  const { error } = await supabase
    .from("weekly_meal_plans")
    .delete()
    .eq("user_id", userId)
    .eq("plan_source", "custom")
    .eq("is_draft", true);

  if (error) {
    console.error("[mealPlanDraftService] Failed to clear builder draft:", error);
  }
}
