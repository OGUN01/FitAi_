import { supabase } from "./supabase";
import { estimateOneRepMax } from "../utils/oneRepMax";

export interface LastSessionData {
  sessionId: string;
  completedAt: string;
  sets: Array<{
    setNumber: number;
    weightKg: number | null;
    reps: number | null;
    setType: string;
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
  }>;
  estimated1RM?: number;
}

export interface ExercisePR {
  prType: "weight" | "estimated_1rm";
  value: number;
  achievedAt: string;
  sessionId?: string;
}

export class ExerciseHistoryService {
  async getLastSession(
    exerciseId: string,
    userId: string,
  ): Promise<LastSessionData | null> {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("exercise_sets")
      .select("session_id, set_number, weight_kg, reps, set_type, completed_at")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .eq("is_completed", true)
      .order("completed_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[ExerciseHistoryService] getLastSession error:", error);
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
      sets: sessionSets.map((row: any) => ({
        setNumber: row.set_number,
        weightKg: row.weight_kg,
        reps: row.reps,
        setType: row.set_type,
      })),
    };
  }

  async getHistory(
    exerciseId: string,
    userId: string,
    days: number = 90,
  ): Promise<ExerciseHistoryEntry[]> {
    if (!userId) return [];

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data, error } = await supabase
      .from("exercise_sets")
      .select("session_id, set_number, weight_kg, reps, set_type, completed_at")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .eq("is_completed", true)
      .gte("completed_at", sinceDate.toISOString())
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("[ExerciseHistoryService] getHistory error:", error);
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
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    );
    return entries;
  }

  async getPersonalRecords(
    exerciseId: string,
    userId: string,
  ): Promise<ExercisePR[]> {
    if (!userId) return [];

    const { data, error } = await supabase
      .from("exercise_prs")
      .select("pr_type, value, achieved_at, session_id")
      .eq("user_id", userId)
      .eq("exercise_id", exerciseId)
      .order("achieved_at", { ascending: false });

    if (error) {
      console.error(
        "[ExerciseHistoryService] getPersonalRecords error:",
        error,
      );
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((row: any) => ({
      prType: row.pr_type as "weight" | "estimated_1rm",
      value: row.value,
      achievedAt: row.achieved_at,
      sessionId: row.session_id ?? undefined,
    }));
  }
}

export const exerciseHistoryService = new ExerciseHistoryService();
