/**
 * FitAI — Periodization Service (Workout Engine v2, Phase 5)
 *
 * A mesocycle is a 4-5 week block: 4 accumulation weeks of rising volume and
 * DESCENDING planned effort (starting further from failure, ending closer to
 * it) followed by a deload. This is standard block-periodization structure
 * (the same shape RP's and most modern hypertrophy programming literature
 * uses) — training far from failure early lets fatigue accumulate under
 * control; pushing closer to failure only once fitness has been built up
 * turns that fatigue into a supercompensation peak right before the deload.
 *
 * This module answers ONE question: "given the current mesocycle week, what
 * effort (RIR) and volume multiplier should this session target?" It does
 * NOT decide session content, replace deloadService's reactive/proactive
 * triggers, or generate a plan — it is one input those layers consume.
 * fitnessStore.getMesocycleWeek() already tracks which week the user is in;
 * this module turns that week number into a target.
 *
 * UPDATE (fixed): this now DOES repeat automatically. deloadService.
 * checkProactiveDeload(mesocycleWeek) previously returned a deload for
 * EVERY week >= 5 with no upper bound — getMesocycleWeek() is pure calendar
 * time from mesocycleStartDate and nothing ever rolled that date forward,
 * so it deloaded forever past week 5. checkProactiveDeload now treats the
 * mesocycle as a repeating DELOAD_CYCLE_WEEKS-week block (deload service
 * still owns the deload trigger itself; nothing here changed). This module
 * still does not own resetting mesocycleStartDate, and doesn't need to.
 */
import {
  checkProactiveDeload,
  checkReactiveDeload,
  RecentSessionForDeload,
  ACCUMULATION_WEEKS,
  DELOAD_CYCLE_WEEKS,
} from './deloadService';

// Re-exported for callers that import ACCUMULATION_WEEKS from this module
// (e.g. this file's own test suite) — deloadService.ts is the single
// source; this module never declares its own copy of the value.
export { ACCUMULATION_WEEKS };

export interface WeekTarget {
  /** 1-indexed position within the current accumulation block (1..ACCUMULATION_WEEKS), or 0 during a deload week. */
  weekInBlock: number;
  isDeloadWeek: boolean;
  /** Target RIR (Reps in Reserve) for this week — see src/utils/effortScale.ts for the RPE<->RIR relationship (RIR = 10 - RPE). Higher = further from failure. */
  targetRir: number;
  /** Multiplier on the mesocycle's baseline planned volume (1.0 = full accumulation-week volume). */
  volumeMultiplier: number;
  reason: string;
}

/**
 * Planned RIR curve across a 4-week accumulation block: week 1 starts at
 * RIR 3 (comfortably sub-maximal — building work capacity, not testing it),
 * descending by 1 RIR/week to RIR 0 by week 4 (training to or near failure
 * right before the deload, when fatigue is intentionally at its peak).
 * Volume rises 10%/week over the same span for the same reason.
 */
const ACCUMULATION_START_RIR = 3;
const WEEKLY_VOLUME_STEP = 0.1;

/**
 * Target effort/volume for a given mesocycle week, folding in
 * deloadService's own triggers as inputs rather than reimplementing them:
 *   - checkProactiveDeload: the 5th week of every DELOAD_CYCLE_WEEKS-week
 *     block (week 5, 10, 15, ...) forces a deload week regardless of the
 *     accumulation curve; every other week accumulates normally.
 *   - checkReactiveDeload (optional, if recentSessions is supplied): 2+
 *     consecutive failed sessions on record forces an early deload even
 *     mid-accumulation-block — persistent failure means the block ended
 *     early whether the calendar says so or not.
 */
export function getWeekTarget(
  mesocycleWeek: number,
  recentSessions?: { exerciseId: string; sessions: RecentSessionForDeload[] }[],
): WeekTarget {
  if (mesocycleWeek < 1) {
    return {
      weekInBlock: 0,
      isDeloadWeek: false,
      targetRir: ACCUMULATION_START_RIR,
      volumeMultiplier: 1.0,
      reason: 'No mesocycle in progress — using accumulation-week-1 defaults',
    };
  }

  const proactive = checkProactiveDeload(mesocycleWeek);
  if (proactive) {
    return {
      weekInBlock: 0,
      isDeloadWeek: true,
      targetRir: ACCUMULATION_START_RIR + 2, // deload = comfortably easy, not a grind
      volumeMultiplier: 1 - (proactive.volumeReductionPercent ?? 40) / 100,
      reason: proactive.reason,
    };
  }

  if (recentSessions) {
    for (const { exerciseId, sessions } of recentSessions) {
      const reactive = checkReactiveDeload(exerciseId, sessions, mesocycleWeek);
      if (reactive) {
        return {
          weekInBlock: 0,
          isDeloadWeek: true,
          targetRir: ACCUMULATION_START_RIR + 2,
          volumeMultiplier: 1 - (reactive.weightReductionPercent ?? 10) / 100,
          reason: `Reactive deload triggered early — ${reactive.reason}`,
        };
      }
    }
  }

  // Modulo by the FULL cycle (accumulation + deload), not just
  // ACCUMULATION_WEEKS — the deload week is already handled by the early
  // return above, so this line only ever runs for an accumulation week, but
  // it still needs the true cycle length to correctly read week 6 as "week
  // 1 of the next block" rather than "week 2" (which a mod-ACCUMULATION_WEEKS
  // divisor would wrongly produce once week 5 stopped short-circuiting into
  // the deload branch for every subsequent week).
  const weekInBlock = ((mesocycleWeek - 1) % DELOAD_CYCLE_WEEKS) + 1;
  const targetRir = Math.max(0, ACCUMULATION_START_RIR - (weekInBlock - 1));
  const volumeMultiplier = 1 + (weekInBlock - 1) * WEEKLY_VOLUME_STEP;

  return {
    weekInBlock,
    isDeloadWeek: false,
    targetRir,
    volumeMultiplier: Math.round(volumeMultiplier * 100) / 100,
    reason: `Accumulation week ${weekInBlock}/${ACCUMULATION_WEEKS} — target RIR ${targetRir}, ${Math.round((volumeMultiplier - 1) * 100)}% above baseline volume`,
  };
}
