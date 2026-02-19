import { supabase } from "../supabase";
import { FitnessDataResponse } from "./types";

export class StatsService {
  private static instance: StatsService;

  private constructor() {}

  static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  async getWorkoutStats(
    userId: string,
    timeRange?: "week" | "month" | "year",
  ): Promise<
    FitnessDataResponse<{
      totalWorkouts: number;
      totalDuration: number;
      totalCalories: number;
      averageDuration: number;
      workoutsByType: Record<string, number>;
    }>
  > {
    try {
      let query = supabase
        .from("workouts")
        .select("type, duration_minutes, calories_burned, completed_at")
        .eq("user_id", userId)
        .not("completed_at", "is", null);

      if (timeRange) {
        const now = new Date();
        let startDate: Date;

        switch (timeRange) {
          case "week":
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case "year":
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }

        query = query.gte("completed_at", startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching workout stats:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      const workouts = data || [];
      const totalWorkouts = workouts.length;
      const totalDuration = workouts.reduce(
        (sum, w) => sum + (w.duration_minutes || 0),
        0,
      );
      const totalCalories = workouts.reduce(
        (sum, w) => sum + (w.calories_burned || 0),
        0,
      );
      const averageDuration =
        totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;

      const workoutsByType = workouts.reduce(
        (acc, w) => {
          acc[w.type] = (acc[w.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        success: true,
        data: {
          totalWorkouts,
          totalDuration,
          totalCalories,
          averageDuration,
          workoutsByType,
        },
      };
    } catch (error) {
      console.error("Error in getWorkoutStats:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch workout stats",
      };
    }
  }
}

export const statsService = StatsService.getInstance();
