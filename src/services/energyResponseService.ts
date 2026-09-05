/**
 * Energy Response Service — Goal Engine Phase E
 *
 * Under-performance response: compares the Phase D ledger actuals to the plan
 * over the trailing 14 days and, when adherence is below threshold, surfaces
 * an honest check-in. Plus one ALWAYS-ON safety trigger that ignores every
 * acknowledgment: intake < 1000 kcal on 3+ consecutive logged days.
 *
 * ── Adherence formula (documented per Phase E spec) ─────────────────────────
 *
 *   adherence = Σ net_deficit      /  Σ planned_deficit
 *               (over ELIGIBLE days only)
 *
 *   ELIGIBLE day = a `daily_energy_ledger` row in the trailing 14-day window
 *   where `had_logged_data = true` (days with zero meal_logs rows are EXCLUDED
 *   from the percentage — never scored as a 0-kcal deficit day, per the
 *   `had_logged_data` semantics Phase D established) AND the day's planned
 *   deficit is meaningful (|planned_deficit| ≥ MIN_PLANNED_DEFICIT_KCAL — a
 *   ~0 planned-deficit day is a maintenance day; dividing by it would explode
 *   the ratio, so it is skipped, per the spec's "skip days where planned ~0").
 *
 *   net_deficit / planned_deficit are the ledger's own columns (positive =
 *   deficit, matching customDietProjection's convention). Sums are SIGNED, so
 *   surplus days honestly drag the ratio down, and a gain goal (both sums
 *   negative) yields a positive ratio the same way.
 *
 *   The aggregate-ratio form (sum ÷ sum, not mean of per-day ratios) is
 *   deliberate: a per-day mean would give a 100-kcal-planned day the same
 *   weight as a 900-kcal-planned day. The aggregate answers the honest
 *   question directly: "what fraction of the promised deficit did you bank?"
 *
 *   Threshold: below 0.70 at the 14-day mark → prompt. The prompt NEVER
 *   auto-changes anything — no plan mutation, no target change. It shows the
 *   honest numbers (Σ/7700 kg promised vs. actual over the eligible days) and
 *   three buttons: Keep pushing / Rebuild a plan I'll actually hit / Don't ask
 *   again.
 *
 *   Gate: the prompt only fires once the ledger history spans the full 14-day
 *   window (earliest row ≤ window start) and at least one eligible day exists
 *   (enforced inside computeAdherenceSnapshot — ratio is null otherwise).
 *   "Don't ask again" persists to `plan_acknowledgments`
 *   (warning_codes ['UNDERPERFORMANCE_14D'], plan_id/plan_kind of the active
 *   plan, shown_payload = the adherence snapshot). Before showing, an existing
 *   acknowledgment for the CURRENT plan (same plan_id, or a plan_id-less row)
 *   suppresses the prompt.
 *
 * ── Safety trigger (always on — ignores every acknowledgment) ───────────────
 *
 *   intake < 1000 kcal on 3+ consecutive LOGGED ledger days → safety check-in.
 *   An unlogged day (had_logged_data = false) neither counts nor breaks the
 *   streak — it carries no intake signal either way, and skipping it means a
 *   genuinely unsafe user is never missed just because they skipped logging
 *   for a day. A logged day with intake ≥ 1000 kcal breaks the streak.
 *   Scanned over the most recent SAFETY_LOOKBACK_DAYS ledger rows.
 *
 *   Re-fire guard: the check-in is recorded in `plan_acknowledgments` with
 *   warning_codes ['LOW_INTAKE_SAFETY_3D'] and shown_payload.streak_end set to
 *   the NEWEST date of the qualifying streak. A later run skips only when a
 *   recorded streak_end falls at/after this streak's OLDEST low day (i.e. this
 *   exact streak already fired — including when it grew from 3 to 4+ days
 *   since). A NEW streak (after any logged ≥1000 day reset the chain) has an
 *   oldest day strictly after the recorded end, so it fires again. This is the
 *   only use the safety trigger makes of plan_acknowledgments — it NEVER reads
 *   (or respects) UNDERPERFORMANCE_14D acknowledgments, per the approved
 *   decision.
 *
 * Guest/offline: guest ids return null immediately; Supabase failures are
 * logged with console.error (CLAUDE.md §5) and surface as `null` — the prompt
 * simply doesn't show this open, and the next app-open check retries naturally.
 */

import { supabase } from './supabase';
import { getLocalDateString } from '../utils/weekUtils';
import { isValidUUID } from '../utils/uuid';
import { useNutritionStore } from '../stores/nutritionStore';
import { useFitnessStore } from '../stores/fitnessStore';
import { CALORIE_PER_KG, LEDGER_WINDOWS } from './energy/constants';

// ----------------------------------------------------------------------------
// CONSTANTS
// ----------------------------------------------------------------------------

/** Adherence threshold: below this fraction of the planned deficit actually
 *  banked over the trailing 14 days, the honest-number prompt shows. */
export const ADHERENCE_THRESHOLD = 0.7;

/** Days whose |planned_deficit| is below this are treated as maintenance days
 *  and skipped (never divide by a ~zero planned deficit). */
export const MIN_PLANNED_DEFICIT_KCAL = 50;

/** How many recent ledger days the safety streak scans. Generous beyond the
 *  3-day minimum so gaps in the ledger don't hide an ongoing pattern. */
export const SAFETY_LOOKBACK_DAYS = 30;

/** Warning code persisted for the 14-day under-performance acknowledgment. */
export const UNDERPERFORMANCE_WARNING_CODE = 'UNDERPERFORMANCE_14D';

/** Warning code used as the lightweight "already fired for this streak"
 *  marker of the safety check-in. NOTE: the safety trigger never reads
 *  UNDERPERFORMANCE_14D rows and never suppresses itself via any other
 *  acknowledgment — it is always-on by design. */
export const SAFETY_WARNING_CODE = 'LOW_INTAKE_SAFETY_3D';

// ----------------------------------------------------------------------------
// TYPES
// ----------------------------------------------------------------------------

export interface AdherenceSnapshot {
  /** Calendar-day span of ledger history actually available (≤ 14). */
  historyDays: number;
  /** Ledger rows in the window that had logged data. */
  loggedDays: number;
  /** Logged days with a meaningful planned deficit (the adherence sample). */
  eligibleDays: number;
  /** Σ planned_deficit over eligible days (kcal, signed). */
  plannedDeficitTotalKcal: number;
  /** Σ net_deficit over eligible days (kcal, signed). */
  actualDeficitTotalKcal: number;
  /** Σactual / Σplanned over eligible days. null when nothing is evaluable. */
  adherenceRatio: number | null;
  /** The honest fortnight numbers: Σ/7700 kg (kcal→kg via CALORIE_PER_KG). */
  promisedKg: number;
  actualKg: number;
  belowThreshold: boolean;
}

export interface SafetyStreak {
  /** Consecutive logged low-intake days (unlogged days skipped, not counted). */
  streakLength: number;
  /** Newest date of the streak (the re-fire marker's key). */
  streakEnd: string;
  /** Oldest date of the streak. */
  streakStart: string;
  qualifies: boolean;
}

export type EnergyResponseCheck =
  | { kind: 'adherence'; snapshot: AdherenceSnapshot }
  | { kind: 'safety'; streak: SafetyStreak };

// ----------------------------------------------------------------------------
// ROW TYPES + FETCH
// ----------------------------------------------------------------------------

interface LedgerRow {
  date: string;
  intake_kcal: number | null;
  net_deficit: number | null;
  planned_deficit: number | null;
  had_logged_data: boolean | null;
}

async function fetchRecentLedger(userId: string, days: number): Promise<LedgerRow[] | null> {
  const end = new Date();
  end.setDate(end.getDate() - 1); // yesterday — the ledger never writes today
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const { data, error } = await supabase
    .from('daily_energy_ledger')
    .select('date, intake_kcal, net_deficit, planned_deficit, had_logged_data')
    .eq('user_id', userId)
    .gte('date', getLocalDateString(start))
    .lte('date', getLocalDateString(end))
    .order('date', { ascending: true });

  if (error) {
    console.error('[energyResponse] ledger fetch error:', error);
    return null;
  }
  return (data as LedgerRow[] | null) ?? [];
}

interface AckRow {
  id: string;
  plan_id: string | null;
  plan_kind: string | null;
  warning_codes: string[] | null;
  shown_payload: Record<string, unknown> | null;
}

async function fetchAcknowledgments(userId: string): Promise<AckRow[]> {
  const { data, error } = await supabase
    .from('plan_acknowledgments')
    .select('id, plan_id, plan_kind, warning_codes, shown_payload')
    .eq('user_id', userId)
    .order('acknowledged_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[energyResponse] acknowledgment fetch error:', error);
    return [];
  }
  return (data as AckRow[] | null) ?? [];
}

// ----------------------------------------------------------------------------
// ACTIVE PLAN REFERENCE
// ----------------------------------------------------------------------------

/**
 * The plan reference the acknowledgment attaches to. The `plan_id` column is a
 * plain UUID with no FK (Phase A.2): client-side plan ids ("plan-…") are NOT
 * UUIDs, so only the persisted `databaseId` is stored — null otherwise. The
 * under-performance gap is intake-led, so the acknowledgment attaches to the
 * active DIET plan.
 */
function getActivePlanRef(): {
  planId: string | null;
  planKind: 'diet' | 'workout';
} {
  const ns = useNutritionStore.getState();
  const activeDietPlan =
    ns.activeDietSource === 'custom' ? ns.customWeeklyMealPlan : ns.weeklyMealPlan;

  return {
    planId:
      activeDietPlan?.databaseId && isValidUUID(String(activeDietPlan.databaseId))
        ? String(activeDietPlan.databaseId)
        : null,
    planKind: 'diet',
  };
}

function hasCode(row: AckRow, code: string): boolean {
  return Array.isArray(row.warning_codes) && row.warning_codes.includes(code);
}

// ----------------------------------------------------------------------------
// 14-DAY ADHERENCE
// ----------------------------------------------------------------------------

/** Pure adherence math over ledger rows — exported for tests. */
export function computeAdherenceSnapshot(
  rows: LedgerRow[],
  historyDays: number
): AdherenceSnapshot {
  const loggedRows = rows.filter((r) => r.had_logged_data === true);
  const eligible = loggedRows.filter(
    (r) =>
      r.planned_deficit != null && Math.abs(Number(r.planned_deficit)) >= MIN_PLANNED_DEFICIT_KCAL
  );

  const plannedTotal = eligible.reduce((sum, r) => sum + Number(r.planned_deficit), 0);
  const actualTotal = eligible.reduce((sum, r) => sum + Number(r.net_deficit ?? 0), 0);

  const ratio =
    eligible.length > 0 && Math.abs(plannedTotal) >= MIN_PLANNED_DEFICIT_KCAL
      ? actualTotal / plannedTotal
      : null;

  return {
    historyDays,
    loggedDays: loggedRows.length,
    eligibleDays: eligible.length,
    plannedDeficitTotalKcal: Math.round(plannedTotal),
    actualDeficitTotalKcal: Math.round(actualTotal),
    adherenceRatio: ratio,
    promisedKg: plannedTotal / CALORIE_PER_KG,
    actualKg: actualTotal / CALORIE_PER_KG,
    belowThreshold:
      ratio != null &&
      historyDays >= LEDGER_WINDOWS.adherenceCheckDays &&
      ratio < ADHERENCE_THRESHOLD,
  };
}

/**
 * Evaluate the 14-day under-performance check.
 *
 * Returns null when the user already acknowledged it for the current plan, or
 * when there isn't a full 14-day window / no evaluable data yet.
 */
export async function evaluateAdherence(userId: string): Promise<AdherenceSnapshot | null> {
  const rows = await fetchRecentLedger(userId, LEDGER_WINDOWS.adherenceCheckDays);
  if (!rows || rows.length === 0) return null;

  // Full-window gate: the earliest row must be at or before the window start
  // (yesterday − 13 days), i.e. the trailing 14 complete days are covered.
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const windowStart = new Date(yesterday);
  windowStart.setDate(windowStart.getDate() - (LEDGER_WINDOWS.adherenceCheckDays - 1));
  if (rows[0].date > getLocalDateString(windowStart)) return null;

  const historyDays =
    Math.round(
      (new Date(`${getLocalDateString(yesterday)}T00:00:00`).getTime() -
        new Date(`${rows[0].date}T00:00:00`).getTime()) /
        86_400_000
    ) + 1;
  const snapshot = computeAdherenceSnapshot(rows, Math.min(14, historyDays));
  if (!snapshot.belowThreshold) return null;

  // "Don't ask again" check — skip when the current plan already has one.
  // Matching: same plan_kind AND (same plan_id OR the existing row has a null
  // plan_id — a null-id ack covers the target-less AI-plan case).
  const acks = await fetchAcknowledgments(userId);
  const { planId, planKind } = getActivePlanRef();
  const alreadyAcked = acks.some(
    (a) =>
      hasCode(a, UNDERPERFORMANCE_WARNING_CODE) &&
      a.plan_kind === planKind &&
      ((a.plan_id ?? null) === planId || (a.plan_id ?? null) === null)
  );
  if (alreadyAcked) return null;

  return snapshot;
}

// ----------------------------------------------------------------------------
// SAFETY TRIGGER — intake < 1000 kcal, 3+ consecutive logged days
// ----------------------------------------------------------------------------

/** Pure streak math over ledger rows — exported for tests. */
export function computeSafetyStreak(rows: LedgerRow[]): SafetyStreak {
  // Newest-first scan. An unlogged day neither counts nor breaks the streak
  // (no signal — see module header); a logged day at/above the threshold
  // breaks it.
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  let streakLength = 0;
  let newest: string | null = null;
  let oldest: string | null = null;

  for (const row of sorted) {
    if (row.had_logged_data !== true) continue; // unlogged: skip silently
    const intake = Number(row.intake_kcal ?? 0);
    if (intake >= LEDGER_WINDOWS.lowIntakeThresholdKcal) break; // chain broken
    streakLength += 1;
    if (newest === null) newest = row.date;
    oldest = row.date;
  }

  return {
    streakLength,
    streakEnd: newest ?? '',
    streakStart: oldest ?? '',
    qualifies:
      streakLength >= LEDGER_WINDOWS.lowIntakeConsecutiveDays && newest !== null && oldest !== null,
  };
}

/**
 * Evaluate the always-on safety check-in. Returns null when the current
 * streak doesn't qualify OR was already fired for (the per-streak marker in
 * plan_acknowledgments covers it). NEVER suppressed by any other
 * acknowledgment — the only thing read here is this trigger's own marker.
 */
export async function evaluateSafetyCheckIn(userId: string): Promise<SafetyStreak | null> {
  const rows = await fetchRecentLedger(userId, SAFETY_LOOKBACK_DAYS);
  if (!rows || rows.length === 0) return null;

  const streak = computeSafetyStreak(rows);
  if (!streak.qualifies) return null;

  // Re-fire guard: a marker whose streak_end is at/after this streak's OLDEST
  // low day means this same streak already fired (the marker moves forward as
  // the streak grows, so 3→4 days does not re-fire; a brand-new streak after
  // a ≥1000 kcal day starts strictly later and fires fresh).
  const acks = await fetchAcknowledgments(userId);
  const fired = acks.some(
    (a) =>
      hasCode(a, SAFETY_WARNING_CODE) &&
      typeof a.shown_payload?.streak_end === 'string' &&
      (a.shown_payload.streak_end as string) >= streak.streakStart
  );
  if (fired) return null;

  return streak;
}

// ----------------------------------------------------------------------------
// COMBINED CHECK + PERSISTENCE
// ----------------------------------------------------------------------------

/**
 * Run both checks. Safety first (it outranks and ignores acknowledgments);
 * the 14-day adherence prompt only when the safety check-in isn't firing.
 * Returns null when nothing should surface.
 */
export async function checkEnergyResponse(userId: string): Promise<EnergyResponseCheck | null> {
  if (!userId || userId.startsWith('guest') || userId === 'local-user') {
    return null;
  }

  try {
    const streak = await evaluateSafetyCheckIn(userId);
    if (streak) return { kind: 'safety', streak };

    const snapshot = await evaluateAdherence(userId);
    if (snapshot) return { kind: 'adherence', snapshot };

    return null;
  } catch (err) {
    console.error('[energyResponse] check failed:', err);
    return null;
  }
}

/**
 * Persist "Don't ask again" for the 14-day under-performance prompt.
 * Non-fatal: a failed write (guest/offline) is logged and swallowed — the
 * prompt may re-show on a later open, which is acceptable for an advisory
 * prompt (never a data-loss path).
 */
export async function acknowledgeUnderperformance(
  userId: string,
  snapshot: AdherenceSnapshot
): Promise<void> {
  try {
    const { planId, planKind } = getActivePlanRef();
    const { error } = await supabase.from('plan_acknowledgments').insert({
      user_id: userId,
      plan_id: planId,
      plan_kind: planKind,
      warning_codes: [UNDERPERFORMANCE_WARNING_CODE],
      shown_payload: {
        adherence_ratio: snapshot.adherenceRatio,
        eligible_days: snapshot.eligibleDays,
        logged_days: snapshot.loggedDays,
        planned_deficit_total_kcal: snapshot.plannedDeficitTotalKcal,
        actual_deficit_total_kcal: snapshot.actualDeficitTotalKcal,
        promised_kg: Number(snapshot.promisedKg.toFixed(2)),
        actual_kg: Number(snapshot.actualKg.toFixed(2)),
      },
    });
    if (error) {
      console.error('[energyResponse] failed to persist underperformance acknowledgment:', error);
    }
  } catch (err) {
    console.error('[energyResponse] acknowledgeUnderperformance failed:', err);
  }
}

/**
 * Lightweight per-streak marker for the safety check-in (fires at most once
 * per qualifying streak). Persisted to the same `plan_acknowledgments` table —
 * the safety trigger only reads these rows to dedupe ITSELF, never to
 * suppress anything (it ignores "don't ask again" by design).
 */
export async function markSafetyCheckInShown(userId: string, streak: SafetyStreak): Promise<void> {
  try {
    const { planId, planKind } = getActivePlanRef();
    const { error } = await supabase.from('plan_acknowledgments').insert({
      user_id: userId,
      plan_id: planId,
      plan_kind: planKind,
      warning_codes: [SAFETY_WARNING_CODE],
      shown_payload: {
        streak_end: streak.streakEnd,
        streak_start: streak.streakStart,
        streak_length: streak.streakLength,
      },
    });
    if (error) {
      console.error('[energyResponse] failed to persist safety check-in marker:', error);
    }
  } catch (err) {
    console.error('[energyResponse] markSafetyCheckInShown failed:', err);
  }
}

/**
 * Where "Rebuild a plan I'll actually hit" should land. The under-performance
 * gap is intake-led, so a custom diet plan rebuilds in the Meal Builder; with
 * no active diet plan, the workout builder is the lever (burn side).
 */
export function getRebuildRoute(): 'MealBuilder' | 'WeeklyBuilder' {
  const ns = useNutritionStore.getState();
  const fs = useFitnessStore.getState();
  const activeDietPlan =
    ns.activeDietSource === 'custom' ? ns.customWeeklyMealPlan : ns.weeklyMealPlan;

  if (activeDietPlan) return 'MealBuilder';
  if (fs.getActivePlan()) return 'WeeklyBuilder';
  return 'MealBuilder';
}
