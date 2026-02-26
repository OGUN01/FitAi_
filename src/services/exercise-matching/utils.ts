import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExerciseMatchResult } from "../exerciseVisualService";
import { AdvancedMatchResult, GeneratedExerciseData } from "./types";

export function mapMuscleGroupsToBodyParts(muscles: string[]): string[] {
  const mapping: Record<string, string> = {
    chest: "chest",
    back: "back",
    shoulders: "shoulders",
    biceps: "upper arms",
    triceps: "upper arms",
    legs: "lower body",
    glutes: "lower body",
    core: "waist",
    abs: "waist",
  };

  return muscles.map((muscle) => mapping[muscle.toLowerCase()] || "full body");
}

export function createResult(
  baseResult: ExerciseMatchResult | null,
  tier: AdvancedMatchResult["tier"],
  startTime: number,
  updatePerformanceMetrics: (time: number) => void,
): AdvancedMatchResult {
  const processingTime = Date.now() - startTime;
  updatePerformanceMetrics(processingTime);

  if (!baseResult) {
    return {
      exercise: {
        exerciseId: "unknown",
        name: "Unknown Exercise",
        gifUrl: "",
        targetMuscles: ["full body"],
        bodyParts: ["full body"],
        equipments: ["body weight"],
        secondaryMuscles: [],
        instructions: ["Custom exercise - use proper form"],
      },
      confidence: 0.1,
      matchType: "partial",
      tier,
      processingTime,
    };
  }

  return {
    ...baseResult,
    tier,
    processingTime,
  };
}

export async function loadSemanticCache(): Promise<
  Map<string, GeneratedExerciseData>
> {
  try {
    const cached = await AsyncStorage.getItem("semantic_exercise_cache");
    if (cached) {
      const data = JSON.parse(cached);
      const cache = new Map<string, GeneratedExerciseData>(
        Object.entries(data),
      );
      return cache;
    }
  } catch (error) {
  }
  return new Map<string, GeneratedExerciseData>();
}

export async function saveSemanticCache(
  cache: Map<string, GeneratedExerciseData>,
): Promise<void> {
  try {
    const data = Object.fromEntries(cache);
    await AsyncStorage.setItem("semantic_exercise_cache", JSON.stringify(data));
  } catch (error) {
  }
}
