/**
 * Energy Ledger Service — Phase D
 *
 * Client-side catch-up that backfills the `daily_energy_ledger` table from
 * already-durable sources (`meal_logs` + `workout_sessions`). Mirrors the
 * day-boundary pattern the app uses for fitness state
 * (`fitnessStore.checkAndResetProgressIfNewDay`): run on app open, NOT a new
 * server cron. The only existing cron (`fitai-workers/wrangler.jsonc`,
 * `* * * * *`) reclaims stuck diet jobs on the free-tier fallback — not a
 * place to hang a per-user nightly job, and a phone isn't reliably online at
 * midnight anyway.
 *
 * For each missing day from `MAX(daily_energy_ledger.date)` to yesterday
 * (local), it derives:
 *   - intake_kcal   = SUM(meal_logs.total_calories) for that LOCAL day
 *   - burn_kcal     = SUM(workout_sessions.calories_burned) for that LOCAL day
 *                     (same resolved value Home shows for a completed past
 *                     day — see "Burn resolution" below)
 *   - neat_tdee     = NEAT_TDEE recomputed from the day's CURRENT weight, not
 *                     the onboarding weight (a 10 kg loss cuts BMR ~100 kcal/day;
 *                     without this the projection drifts optimistic exactly
 *                     when the user is working hardest)
 *   - plan_burn     = computePlanBurnPerDay(activePlan, dayWeight).perDayOfWeek[dayOfWeek]
 *   - net_deficit   = neat_tdee + plan_burn - intake_kcal   (positive = deficit)
 *                     NOTE: the migration's column COMMENT says
 *                     "intake_kcal - (neat_tdee + plan_burn)" but the approved
 *                     Phase D spec defines positive = deficit, matching
 *                     customDietProjection's `dailyDeficit = tdee - intake`
 *                     convention. The code follows the spec + existing
 *                     convention; the comment is stale.
 *   - planned_deficit = neat_tdee + plan_burn - targetCalories (the plan's
 *                     intended deficit for that day; targetCalories =
 *                     advanced_review.daily_calories)
 *   - weight_kg     = the weight LOGGED that day (null if none)
 *   - had_logged_data = meal_logs count for that day > 0. A day with ZERO
 *                     meal_logs rows is EXCLUDED from adherence math (Phase E),
 *                     NEVER treated as a 0-kcal deficit day.
 *
 * Burn resolution — how the ledger matches Home's wearable precedence
 * (CLAUDE.md §9 + Phase C edge case):
 *   Home (`useHomeLogic.ts:~501`) prefers wearable `activeCalories` when the
 *   health snapshot is fresh — but that snapshot is a real-time fetch, not
 *   persisted per-day. The ledger only writes days up to YESTERDAY. For any
 *   completed past day the wearable fresh-snapshot is gone; only the durably
 *   persisted `workout_sessions.calories_burned` (WorkoutProgress.
 *   caloriesBurned at completion via the MET calculator — the actual-burn SSOT)
 *   remains. Home's `appCaloriesBurned` for a given day sums exactly
 *   `getCompletedSessionsForDate(completedSessions)` which filters
 *   `getLocalDateString(session.completedAt) === day`. The store's
 *   completedSessions hydrate from `workout_sessions` with caloriesBurned =
 *   calories_burned. So the ledger's `SUM(calories_burned) WHERE
 *   getLocalDateString(completed_at) = day` is the SAME number Home would show
 *   for that completed day — they agree by construction.
 *
 * Re-entry / loop guards: a module-level `catchingUp` flag prevents concurrent
 * runs (the service is idempotent — upsert on (user_id, date), only fills
 * missing days — so a re-run after a failure is a safe no-op for already-filled
 * days). The first run with no ledger rows is capped to MAX_BACKFILL_DAYS so the
 * walk can't loop forever.
 *
 * Offline: the catch-up runs on app open. If the Supabase calls fail (offline),
 * errors are logged with console.error (CLAUDE.md §5) and the missing days
 * simply remain missing — the next app-open catch-up retries them naturally
 * (MAX(daily_energy_ledger.date) hasn't advanced). Because ledger rows are a
 * pure derivation (not a user action), this natural retry replaces an explicit
 * offline queue; nothing is dropped.
 */

import { supabase } from "./supabase";
import { getLocalDateString } from "../utils/weekUtils";
import { computeEnergyBreakdown } from "./energy/energyModel";
import { useProfileStore } from "../stores/profileStore";
import { useFitnessStore } from "../stores/fitnessStore";
import { analyticsDataService } from "./analyticsData";
import { CALORIE_PER_KG } from "./energy/constants";

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

/** Cap on how far back the first-run backfill walks. Re-runs use MAX(date) so
 *  they only fill the gap since the last run; this only bounds the cold-start
 *  case where there is no prior ledger row. 90 days is well beyond the 28-day
 *  observed-projection window and the 14-day adherence window. */
const MAX_BACKFILL_DAYS = 90;

/** Local-day index mapping. computePlanBurnPerDay returns perDayOfWeek indexed
 *  0=Monday … 6=Sunday; JS Date.getDay() is 0=Sunday … 6=Saturday. */
function jsDayToMonIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

// ----------------------------------------------------------------------------
// RE-ENTRY GUARD
// ----------------------------------------------------------------------------

let catchingUp = false;

// ----------------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------------

interface MealRow {
  total_calories: number | null;
  logged_at: string;
}
interface SessionRow {
  calories_burned: number | null;
  completed_at: string | null;
  is_completed: boolean | null;
}

interface DayAggregates {
  intake: number;
  mealCount: number;
  burn: number;
}

/** Group rows by their LOCAL date and aggregate the numeric column. */
function aggregateByDay(
  meals: MealRow[],
  sessions: SessionRow[],
): Map<string, DayAggregates> {
  const byDay = new Map<string, DayAggregates>();

  for (const m of meals) {
    const day = getLocalDateString(m.logged_at);
    const agg = byDay.get(day) ?? { intake: 0, mealCount: 0, burn: 0 };
    agg.intake += Number(m.total_calories ?? 0);
    agg.mealCount += 1;
    byDay.set(day, agg);
  }

  // Burn is attributed to the day the workout COMPLETED — matches Home's
  // getCompletedSessionsForDate (getLocalDateString(session.completedAt)).
  // Only completed sessions with a completed_at timestamp count.
  for (const s of sessions) {
    if (!s.is_completed || !s.completed_at) continue;
    const day = getLocalDateString(s.completed_at);
    const agg = byDay.get(day) ?? { intake: 0, mealCount: 0, burn: 0 };
    agg.burn += Number(s.calories_burned ?? 0);
    byDay.set(day, agg);
  }

  return byDay;
}

/** Forward-filled weight for a day: the latest weight log with date <= day.
 *  Used to recompute NEAT_TDEE from the user's CURRENT weight, not onboarding. */
function weightForCalc(
  series: Array<{ date: string; weight: number }>,
  day: string,
): number | null {
  let result: number | null = null;
  for (const p of series) {
    if (p.date <= day) result = p.weight;
    else break; // series is ascending
  }
  return result;
}

/** Exact weight logged on a given day (null if none). Stored in weight_kg. */
function weightExact(
  series: Array<{ date: string; weight: number }>,
  day: string,
): number | null {
  for (const p of series) {
    if (p.date === day) return p.weight;
    if (p.date > day) break;
  }
  return null;
}

/** Build the energy-model profile inputs from the profile store. Returns null
 *  when the core anthropometric fields are missing — the ledger still records
 *  intake/burn/had_logged_data but skips the NEAT/plan recompute. */
function buildEnergyInput(weightKg: number) {
  const ps = useProfileStore.getState();
  const bodyAnalysis = ps.bodyAnalysis;
  const personalInfo = ps.personalInfo;
  const workoutPreferences = ps.workoutPreferences;
  const advancedReview = ps.advancedReview;
  const activePlan = useFitnessStore.getState().getActivePlan();

  const heightCm = bodyAnalysis?.height_cm;
  const age = personalInfo?.age;
  const gender = personalInfo?.gender;
  const activityLevel = workoutPreferences?.activity_level;

  if (
    !heightCm ||
    !age ||
    !gender ||
    !activityLevel ||
    !weightKg ||
    weightKg <= 0
  ) {
    return null;
  }

  return computeEnergyBreakdown({
    weightKg,
    heightCm,
    age,
    gender,
    activityLevel,
    medicalConditions: advancedReview?.medical_adjustments,
    pregnancyStatus: bodyAnalysis?.pregnancy_status,
    pregnancyTrimester: bodyAnalysis?.pregnancy_trimester,
    breastfeedingStatus: bodyAnalysis?.breastfeeding_status,
    workoutFrequencyPerWeek: workoutPreferences?.workout_frequency_per_week ?? 0,
    timePreference: workoutPreferences?.time_preference ?? 0,
    intensity: workoutPreferences?.intensity ?? "",
    workoutTypes: workoutPreferences?.workout_types ?? [],
    plan: activePlan,
  });
}

// ----------------------------------------------------------------------------
// PUBLIC API
// ----------------------------------------------------------------------------

/**
 * Backfill the daily energy ledger for the signed-in user.
 *
 * Walks from MAX(daily_energy_ledger.date)+1 to yesterday (local) and writes
 * one row per missing day. Idempotent — upsert on (user_id, date). Safe to call
 * on every app open.
 *
 * @param userId The Supabase auth user id. Guest/offline ids are ignored.
 */
export async function catchUpLedger(userId: string): Promise<void> {
  // Guest / local users have no Supabase rows to derive from.
  if (!userId || userId.startsWith("guest") || userId === "local-user") {
    return;
  }

  // Module-level re-entry guard.
  if (catchingUp) return;
  catchingUp = true;

  try {
    // ── 1. Determine the catch-up window ──
    const { data: existing, error: ledgerErr } = await supabase
      .from("daily_energy_ledger")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(1);

    if (ledgerErr) {
      console.error("[energyLedger] failed to read max date:", ledgerErr);
      return;
    }

    // Yesterday (local). The ledger never writes today — the day is in
    // progress and intake/burn are incomplete.
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = getLocalDateString(yesterdayDate);

    let startDate: string;
    if (existing && existing.length > 0) {
      // MAX(date) is a DATE column → "YYYY-MM-DD". Start the day AFTER it.
      const maxDate = existing[0].date as string;
      const start = new Date(`${maxDate}T00:00:00`);
      start.setDate(start.getDate() + 1);
      startDate = getLocalDateString(start);
    } else {
      // First run: cap the backfill.
      const start = new Date();
      start.setDate(start.getDate() - MAX_BACKFILL_DAYS);
      startDate = getLocalDateString(start);
    }

    if (startDate > yesterday) return; // already up to date

    // ── 2. Fetch durable sources for the window (grouped by LOCAL day in JS) ──
    // Use local-midnight boundaries converted to UTC ISO for the range filter,
    // then recompute the local date in JS so DB-timezone mismatches can't
    // shift a row across a day boundary (per the plan's getLocalDateString rule).
    const startBoundary = new Date(`${startDate}T00:00:00`);
    const endBoundary = new Date(`${yesterday}T00:00:00`);
    endBoundary.setDate(endBoundary.getDate() + 1); // exclusive = today midnight

    const [mealsRes, sessionsRes, weightSeries] = await Promise.all([
      supabase
        .from("meal_logs")
        .select("total_calories, logged_at")
        .eq("user_id", userId)
        .gte("logged_at", startBoundary.toISOString())
        .lt("logged_at", endBoundary.toISOString()),
      supabase
        .from("workout_sessions")
        .select("calories_burned, completed_at, is_completed")
        .eq("user_id", userId)
        .gte("completed_at", startBoundary.toISOString())
        .lt("completed_at", endBoundary.toISOString()),
      // Weight history covers the window (and a little before for forward-fill).
      analyticsDataService.getWeightHistory(userId, MAX_BACKFILL_DAYS + 7),
    ]);

    if (mealsRes.error) {
      console.error("[energyLedger] meal_logs fetch error:", mealsRes.error);
    }
    if (sessionsRes.error) {
      console.error("[energyLedger] workout_sessions fetch error:", sessionsRes.error);
    }

    const byDay = aggregateByDay(
      (mealsRes.data as MealRow[] | null) ?? [],
      (sessionsRes.data as SessionRow[] | null) ?? [],
    );
    const weightSeriesSorted = [...weightSeries].sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    // Target calories = the plan's intended daily intake (goal-derived target).
    const targetCalories = useProfileStore.getState().advancedReview?.daily_calories ?? null;

    // ── 3. Build one row per missing day ──
    const rows: Array<Record<string, unknown>> = [];
    const nowIso = new Date().toISOString();
    const cursor = new Date(`${startDate}T00:00:00`);

    while (getLocalDateString(cursor) <= yesterday) {
      const dayStr = getLocalDateString(cursor);
      const agg = byDay.get(dayStr) ?? { intake: 0, mealCount: 0, burn: 0 };
      const hadLoggedData = agg.mealCount > 0;

      // Weight: logged-that-day for the column; forward-filled for the recompute.
      const wExact = weightExact(weightSeriesSorted, dayStr);
      const wCalc =
        weightForCalc(weightSeriesSorted, dayStr) ??
        useProfileStore.getState().bodyAnalysis?.current_weight_kg ??
        null;

      let neatTdee: number | null = null;
      let planBurn = 0;
      if (wCalc) {
        const energy = buildEnergyInput(wCalc);
        if (energy) {
          neatTdee = energy.neatTdee;
          // Per-day plan burn for this day of week (Mon=0 … Sun=6).
          const monIdx = jsDayToMonIndex(new Date(`${dayStr}T00:00:00`).getDay());
          planBurn = energy.perDayOfWeek[monIdx] ?? energy.planBurnPerDay;
        }
      }

      const expenditure = (neatTdee ?? 0) + planBurn;
      // positive = deficit (matches customDietProjection convention).
      const netDeficit =
        neatTdee != null ? expenditure - agg.intake : null;
      const plannedDeficit =
        neatTdee != null && targetCalories != null
          ? expenditure - targetCalories
          : null;

      rows.push({
        user_id: userId,
        date: dayStr,
        intake_kcal: Math.round(agg.intake),
        burn_kcal: Math.round(agg.burn),
        neat_tdee: neatTdee,
        plan_burn: Math.round(planBurn),
        net_deficit: netDeficit != null ? Math.round(netDeficit) : null,
        planned_deficit: plannedDeficit != null ? Math.round(plannedDeficit) : null,
        weight_kg: wExact,
        had_logged_data: hadLoggedData,
        updated_at: nowIso,
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    if (rows.length === 0) return;

    // ── 4. Persist (idempotent upsert) ──
    const { error: upsertErr } = await supabase
      .from("daily_energy_ledger")
      .upsert(rows, { onConflict: "user_id,date" });

    if (upsertErr) {
      console.error("[energyLedger] upsert error:", upsertErr);
      // Missing days remain missing → next app-open catch-up retries them.
    }
  } catch (err) {
    console.error("[energyLedger] catchUpLedger failed:", err);
  } finally {
    catchingUp = false;
  }
}

// Re-export for callers / tests.
export { CALORIE_PER_KG, MAX_BACKFILL_DAYS };
