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
    const estimated1rm = estimateOneRepMax(newSet.weightKg, newSet.reps);
    const is1RMPR = estimated1rm > current1RM;

    if (!isWeightPR && !is1RMPR) return null;

    return {
      isWeightPR,
      is1RMPR,
      newWeightPR: isWeightPR ? newSet.weightKg : undefined,
      new1RMPR: is1RMPR ? estimated1rm : undefined,
    };
  }

  async recordPR(
    userId: string,
    exerciseId: string,
    prType: "weight" | "estimated_1rm",
    value: number,
    sessionId?: string,
  ): Promise<void> {
    const { error } = await supabase.from("exercise_prs").upsert(
      {
        user_id: userId,
        exercise_id: exerciseId,
        pr_type: prType,
        value,
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
