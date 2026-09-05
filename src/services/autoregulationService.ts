/**
 * FitAI — Autoregulation Service (Workout Engine v2, Phase 5)
 *
 * A progression SCHEME already decides increase/hold/deload from THIS
 * session's numbers (see src/services/progression/). Autoregulation looks
 * one layer up — across the last few sessions — for accumulating fatigue
 * the single-session view can't see: reported effort creeping upward at
 * the same prescribed load/reps is the textbook early sign of a recovery
 * deficit, well before performance itself drops enough to fail a set (which
 * is what the scheme's own hold/deload logic reacts to). Catching it a
 * session or two earlier is the whole point of autoregulating.
 *
 * Deliberately conservative: this can only DAMPEN an 'increase' decision
 * down to a 'hold' (or a double jump down to a single jump), never invent
 * an increase the scheme itself didn't already decide on. The scheme has
 * already correctly evaluated this session's actual sets/reps — a fatigue
 * signal from history is grounds to hold back, not grounds to override a
 * scheme's genuine "hold" into a fabricated "increase".
 */
import { ProgressionPrescription } from './progression/types';

export interface RpeTrendPoint {
  /** Average rpe10 across the session's rated sets. null = session had no RPE data. */
  avgRpe10: number | null;
}

export type AutoregulationBias = 'suppress_increase' | 'neutral';

export interface AutoregulationSignal {
  bias: AutoregulationBias;
  reason: string;
}

const RISING_RPE_SESSION_COUNT = 3;
const LOW_SLEEP_THRESHOLD_HOURS = 6;

/**
 * recentSessions must be ordered MOST RECENT FIRST (matches
 * exerciseHistoryService.getHistory's own ordering). Only non-calibration
 * sessions should be passed in — same caller responsibility
 * progressionService.suggestNextWeight already documents for lastSets.
 */
export function computeAutoregulationSignal(
  recentSessions: RpeTrendPoint[],
  sleepHoursLastNight?: number | null,
): AutoregulationSignal {
  const rated = recentSessions
    .slice(0, RISING_RPE_SESSION_COUNT)
    .map((s) => s.avgRpe10)
    .filter((v): v is number => v != null);

  // Strictly rising RPE (most-recent-first, so strictly DEcreasing through
  // the array = strictly INcreasing over time) across all available rated
  // sessions, requiring at least 2 to have a trend at all.
  let risingTrend = false;
  if (rated.length >= 2) {
    risingTrend = rated.every((v, i) => i === 0 || v < rated[i - 1]);
  }

  const lowSleep =
    sleepHoursLastNight != null && sleepHoursLastNight < LOW_SLEEP_THRESHOLD_HOURS;

  if (risingTrend && lowSleep) {
    return {
      bias: 'suppress_increase',
      reason: `Effort has trended up across your last ${rated.length} sessions and you slept under ${LOW_SLEEP_THRESHOLD_HOURS}h last night — holding back this jump to protect recovery`,
    };
  }
  if (risingTrend) {
    return {
      bias: 'suppress_increase',
      reason: `Effort has trended up across your last ${rated.length} sessions — holding at this weight before pushing further`,
    };
  }
  if (lowSleep) {
    return {
      bias: 'suppress_increase',
      reason: `Slept under ${LOW_SLEEP_THRESHOLD_HOURS}h last night — holding back this jump to protect recovery`,
    };
  }

  return { bias: 'neutral', reason: 'No fatigue signal — proceeding with the scheme\'s suggestion' };
}

/**
 * Apply an autoregulation signal to a scheme's prescription. A 'neutral'
 * signal returns the prescription unchanged. 'suppress_increase' downgrades
 * an 'increase' to a 'hold' at whatever weight/reps/duration the PREVIOUS
 * session actually used — never touches a 'hold' or 'deload' decision
 * (those are already the scheme being conservative; there's nothing to
 * dampen further).
 *
 * Does not attempt to "halve" a double-jump increase into a single-step
 * increase — ProgressionPrescription doesn't carry the increment separately
 * from the already-computed suggestedWeightKg, so there's no way to derive
 * a correct intermediate value here without guessing. Holding at the prior
 * session's numbers is the always-correct, honest downgrade.
 */
export function applyAutoregulation(
  prescription: ProgressionPrescription,
  signal: AutoregulationSignal,
  previousSessionWeightKg: number,
): ProgressionPrescription {
  if (signal.bias !== 'suppress_increase' || prescription.action !== 'increase') {
    return prescription;
  }

  return {
    ...prescription,
    action: 'hold',
    suggestedWeightKg: previousSessionWeightKg,
    doubleJump: false,
    reason: `${signal.reason} (the numbers alone said: ${prescription.reason})`,
  };
}
