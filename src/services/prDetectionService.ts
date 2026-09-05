import { supabase } from "./supabase";
import { estimateOneRepMax } from "../utils/oneRepMax";

interface SetData {
  weightKg: number;
  reps: number;
}

interface CurrentPRs {
  weight?: number;
  estimated1rm?: number;
}

export interface PRCheckResult {
  isWeightPR: boolean;
  is1RMPR: boolean;
  newWeightPR?: number;
  new1RMPR?: number;
}

class PRDetectionService {
  checkForPR(
    _exerciseId: string,
    newSet: SetData,
    currentPRs: CurrentPRs,
  ): PRCheckResult | null {
    if (newSet.weightKg <= 0) return null;

    const currentWeight = currentPRs.weight ?? 0;
    const current1RM = currentPRs.estimated1rm ?? 0;

    const isWeightPR = newSet.weightKg > currentWeight;
    // estimateOneRepMax returns null above MAX_RELIABLE_REPS (e.g. a 20-rep
    // set) — the formulas diverge badly past that, so treat "unreliable" as
    // "no 1RM PR this set", never fabricate a number.
    const estimated1rm = estimateOneRepMax(newSet.weightKg, newSet.reps);
    const is1RMPR = estimated1rm !== null && estimated1rm > current1RM;

    if (!isWeightPR && !is1RMPR) return null;

    return {
      isWeightPR,
      is1RMPR,
      newWeightPR: isWeightPR ? newSet.weightKg : undefined,
      new1RMPR: is1RMPR ? (estimated1rm as number) : undefined,
    };
  }

  async recordPR(
    userId: string,
    exerciseId: string,
    prType: "weight" | "estimated_1rm",
    value: number,
    sessionId?: string,
    exerciseName?: string,
    reps?: number,
  ): Promise<void> {
    const { error } = await supabase.from("exercise_prs").upsert(
      {
        user_id: userId,
        exercise_id: exerciseId,
        exercise_name: exerciseName ?? null,
        pr_type: prType,
        value,
        reps: reps ?? null,
        session_id: sessionId ?? null,
        achieved_at: new Date().toISOString(),
      },
      { onConflict: "user_id,exercise_id,pr_type" },
    );

    if (error) {
      console.error("[PRDetectionService] recordPR error:", error);
    }
  }
}

export const prDetectionService = new PRDetectionService();
