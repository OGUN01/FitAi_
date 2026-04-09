import { ProgressEntry, ProgressStats, ProgressDataResponse } from "./types";
import { getUserProgressEntries } from "./entries";

export async function getProgressStats(
  userId: string,
  timeRange: number = 30,
): Promise<ProgressDataResponse<ProgressStats>> {
  try {
    const entriesResponse = await getUserProgressEntries(userId);

    if (
      !entriesResponse.success ||
      !entriesResponse.data ||
      entriesResponse.data.length < 2
    ) {
      return {
        success: false,
        error: "Not enough data to calculate progress statistics",
      };
    }

    const entries = entriesResponse.data;
    const latest = entries[0];
    const previous = entries[1];

    const weightChange = {
      current: latest.weight_kg,
      previous: previous.weight_kg,
      change: latest.weight_kg - previous.weight_kg,
      changePercentage:
        ((latest.weight_kg - previous.weight_kg) / previous.weight_kg) * 100,
    };

    const bodyFatChange = {
      current: latest.body_fat_percentage || 0,
      previous: previous.body_fat_percentage || 0,
      change:
        (latest.body_fat_percentage || 0) - (previous.body_fat_percentage || 0),
    };

    const muscleChange = {
      current: latest.muscle_mass_kg || 0,
      previous: previous.muscle_mass_kg || 0,
      change: (latest.muscle_mass_kg || 0) - (previous.muscle_mass_kg || 0),
    };

    const measurementChanges: {
      [K in "chest" | "waist" | "hips" | "bicep" | "thigh" | "neck"]?: {
        current: number;
        previous: number;
        change: number;
      };
    } = {};
    const measurementKeys = [
      "chest",
      "waist",
      "hips",
      "bicep",
      "thigh",
      "neck",
    ] as const;

    measurementKeys.forEach((key) => {
      const current = latest.measurements?.[key] || 0;
      const prev = previous.measurements?.[key] || 0;
      measurementChanges[key] = {
        current,
        previous: prev,
        change: current - prev,
      };
    });

    const stats: ProgressStats = {
      totalEntries: entries.length,
      weightChange,
      bodyFatChange,
      muscleChange,
      measurementChanges,
      timeRange,
    };

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("Error in getProgressStats:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to calculate progress statistics",
    };
  }
}
