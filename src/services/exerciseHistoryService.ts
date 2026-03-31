/**
 * FitAI — Exercise History Service
 *
 * Reads exercise_sets (the SSOT for all historical set data) and exposes
 * clean interfaces for the progression and warm-up systems to consume.
 *
 * KEY RULES:
 *   - is_calibration sets are EXCLUDED from getLastSession and getHistory.
 *     They are stored (so we know the exercise has been attempted) but must
 *     never influence progression or deload calculations.
 *   - rpe is read and returned — progressionService uses it to modulate speed.
 *   - estimated_1RM is computed live here (not stored in DB) via estimateOneRepMax().
 */

import { supabase } from './supabase';
import { estimateOneRepMax } from '../utils/oneRepMax';

// ============================================================================
// INTERFACES
// ============================================================================

export interface LastSessionData {
  sessionId: string;
  completedAt: string;
  /** True only when ALL sets in this session were calibration sets */
  isCalibration: boolean;
  sets: Array<{
    setNumber: number;
    weightKg: number | null;
    reps: number | null;
    setType: string;
    /** 1=easy, 2=just right, 3=hard. null if not captured (pre-RPE sessions) */
    rpe: 1 | 2 | 3 | null;
  }>;
}

export interface ExerciseHistoryEntry {
  sessionId: string;
  completedAt: string;
  sets: Array<{
    setNumber: number;
    weightKg: number | null;
    reps: number | null;
    setType: string;
    rpe: 1 | 2 | 3 | null;
  }>;
  estimated1RM?: number;
}

export interface ExercisePR {
  prType: 'weight' | 'estimated_1rm';
  value: number;
  achievedAt: string;
  sessionId?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

export class ExerciseHistoryService {
  /**
   * Returns the last NON-CALIBRATION session for an exercise.
   * Used by SetLogModal to display "Previous session" context.
   * Also used by progressionService for weight suggestion.
   */
  async getLastSession(
    exerciseId: string,
    userId: string,
  ): Promise<LastSessionData | null> {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('exercise_sets')
      .select('session_id, set_number, weight_kg, reps, set_type, rpe, is_calibration, completed_at')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('is_completed', true)
      .eq('is_calibration', false)   // ← CRITICAL: exclude calibration sets
      .order('completed_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[ExerciseHistoryService] getLastSession error:', error);
      return null;
    }

    if (!data || data.length === 0) return null;

    const latestSessionId = data[0].session_id;
    const sessionSets = data
      .filter((row: any) => row.session_id === latestSessionId)
      .sort((a: any, b: any) => a.set_number - b.set_number);

    return {
      sessionId: latestSessionId,
      completedAt: sessionSets[0].completed_at,
      isCalibration: false, // getLastSession always excludes calibration sessions
      sets: sessionSets.map((row: any) => ({
        setNumber: row.set_number,
        weightKg: row.weight_kg,
        reps: row.reps,
        setType: row.set_type,
        rpe: (row.rpe as 1 | 2 | 3 | null) ?? null,
      })),
    };
  }

  /**
   * Returns RPE of the last set of the last non-calibration session.
   * Used by progressionService as the tiebreaker for weight increase decisions.
   * Returns null if no sessions exist or RPE was not captured.
   */
  async getLastWorkingSetRPE(
    exerciseId: string,
    userId: string,
  ): Promise<1 | 2 | 3 | null> {
    if (!userId) return null;

    const { data, error } = await supabase
      .from('exercise_sets')
      .select('rpe, set_number')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('is_completed', true)
      .eq('is_calibration', false)
      .not('rpe', 'is', null)
      .order('completed_at', { ascending: false })
      .order('set_number', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;

    return (data[0].rpe as 1 | 2 | 3) ?? null;
  }

  /**
   * Returns last N sessions for an exercise (non-calibration only).
   * Used by deloadService and analytics.
   */
  async getHistory(
    exerciseId: string,
    userId: string,
    days: number = 90,
  ): Promise<ExerciseHistoryEntry[]> {
    if (!userId) return [];

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data, error } = await supabase
      .from('exercise_sets')
      .select('session_id, set_number, weight_kg, reps, set_type, rpe, completed_at')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .eq('is_completed', true)
      .eq('is_calibration', false)   // ← CRITICAL: exclude calibration sets
      .gte('completed_at', sinceDate.toISOString())
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('[ExerciseHistoryService] getHistory error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const sessionMap = new Map<string, any[]>();
    for (const row of data) {
      const existing = sessionMap.get(row.session_id) || [];
      existing.push(row);
      sessionMap.set(row.session_id, existing);
    }

    const entries: ExerciseHistoryEntry[] = [];
    for (const [sessionId, rows] of sessionMap) {
      const sorted = rows.sort((a: any, b: any) => a.set_number - b.set_number);
      const sets = sorted.map((r: any) => ({
        setNumber: r.set_number,
        weightKg: r.weight_kg,
        reps: r.reps,
        setType: r.set_type,
        rpe: (r.rpe as 1 | 2 | 3 | null) ?? null,
      }));

      let estimated1RM: number | undefined;
      for (const s of sets) {
        if (s.weightKg && s.reps && s.reps > 0) {
          const e1rm = estimateOneRepMax(s.weightKg, s.reps);
          if (!estimated1RM || e1rm > estimated1RM) {
            estimated1RM = e1rm;
          }
        }
      }

      entries.push({
        sessionId,
        completedAt: sorted[0].completed_at,
        sets,
        estimated1RM,
      });
    }

    entries.sort(
      (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
    return entries;
  }

  /**
   * Returns the best estimated 1RM across all sessions (non-calibration).
   * Used by warmupService to generate warm-up sets for the next session.
   */
  async getBestEstimated1RM(
    exerciseId: string,
    userId: string,
  ): Promise<number> {
    if (!userId) return 0;

    // Look at the last 3 sessions to get a recent and accurate estimate
    const history = await this.getHistory(exerciseId, userId, 90);
    const recent = history.slice(0, 3);

    let best1RM = 0;
    for (const session of recent) {
      if (session.estimated1RM && session.estimated1RM > best1RM) {
        best1RM = session.estimated1RM;
      }
    }
    return best1RM;
  }

  async getPersonalRecords(
    exerciseId: string,
    userId: string,
  ): Promise<ExercisePR[]> {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('exercise_prs')
      .select('pr_type, value, achieved_at, session_id')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .order('achieved_at', { ascending: false });

    if (error) {
      console.error('[ExerciseHistoryService] getPersonalRecords error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any) => ({
      prType: row.pr_type as 'weight' | 'estimated_1rm',
      value: row.value,
      achievedAt: row.achieved_at,
      sessionId: row.session_id ?? undefined,
    }));
  }
}

export const exerciseHistoryService = new ExerciseHistoryService();
