import NetInfo from "@react-native-community/netinfo";
import { advancedExerciseMatching } from "../advancedExerciseMatching";
import {
  ExerciseData,
  ExerciseMatchResult,
  ExerciseAPIResponse,
  CacheStats,
} from "./types";
import { cacheService, ExerciseCacheService } from "./cacheService";
import { findLocalExerciseMapping } from "./localMappings";
import {
  fixBrokenCdnUrl,
  normalizeFallbackExerciseName,
  getFallbackGifUrl,
  inferTargetMuscles,
} from "./urlUtils";
import {
  calculateSimilarity,
  findPartialMatchInCache,
  createEmergencyFallback,
} from "./matchingService";
import {
  fetchExercisePage,
  fetchExerciseById,
  fetchExercisesByBodyPart,
  fetchExercisesByEquipment,
  fetchBodyParts,
  fetchEquipments,
  BASE_URL,
} from "./apiService";
import {
  preloadPopularExercises,
  preloadWorkoutVisuals,
  preloadWorkoutPlanVisuals,
} from "./preloadService";

class ExerciseVisualService {
  private cacheService: ExerciseCacheService;

  constructor() {
    this.cacheService = cacheService;
    this.initializeCache();
  }

  private async initializeCache(): Promise<void> {
    await this.cacheService.initialize();
    if (this.cacheService.isCacheExpired()) {
      await preloadPopularExercises(this.cacheService);
    }
  }

  async searchExercises(query: string): Promise<ExerciseData[]> {
    try {
      const cacheMatch = this.cacheService.get(query.toLowerCase());
      if (cacheMatch) {
        console.log(`✅ Found cached exercise for "${query}"`);
        return [cacheMatch];
      }

      const localMatch = findLocalExerciseMapping(query);
      if (localMatch) {
        console.log(`✅ Found local mapping for "${query}"`);
        this.cacheService.set(query.toLowerCase(), localMatch);
        return [localMatch];
      }

      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        console.log(`🌐 Searching Vercel API for "${query}"`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        try {
          const searchUrl = `${BASE_URL}/exercises/search?q=${encodeURIComponent(query)}&limit=5`;
          const response = await fetch(searchUrl, {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result: ExerciseAPIResponse = await response.json();

          if (result.success && result.data?.length > 0) {
            console.log(
              `✅ Vercel API found ${result.data.length} exercises for "${query}"`,
            );

            result.data.forEach((exercise) => {
              if (exercise.gifUrl) {
                exercise.gifUrl = fixBrokenCdnUrl(exercise.gifUrl);
              }
              this.cacheService.set(exercise.name.toLowerCase(), exercise);
              this.cacheService.set(exercise.exerciseId, exercise);
            });

            return result.data;
          }
        } catch (apiError) {
          clearTimeout(timeoutId);
          console.warn(`❌ Vercel API search failed for "${query}":`, apiError);
        }
      }

      const netInfoFallback = await NetInfo.fetch();
      if (netInfoFallback.isConnected) {
        try {
          const fallbackUrl = `${BASE_URL}/exercises?limit=10`;
          const response = await fetch(fallbackUrl);

          if (response.ok) {
            const result: ExerciseAPIResponse = await response.json();
            if (result.success && result.data?.length > 0) {
              const filteredResults = result.data.filter(
                (exercise) =>
                  exercise.name.toLowerCase().includes(query.toLowerCase()) ||
                  exercise.targetMuscles.some((muscle) =>
                    muscle.toLowerCase().includes(query.toLowerCase()),
                  ),
              );

              if (filteredResults.length > 0) {
                return filteredResults;
              }
            }
          }
        } catch (fallbackError) {
          console.warn("❌ Fallback endpoint also failed:", fallbackError);
        }
      }

      const fallbackExercise: ExerciseData = {
        exerciseId: `fallback_${query.toLowerCase().replace(/\s+/g, "_")}`,
        name: normalizeFallbackExerciseName(query),
        gifUrl: getFallbackGifUrl(query),
        targetMuscles: inferTargetMuscles(query),
        bodyParts: ["full body"],
        equipments: ["body weight"],
        secondaryMuscles: [],
        instructions: [
          "Perform this exercise with proper form and technique",
          "Focus on controlled movements throughout the range of motion",
          "Maintain steady breathing during the exercise",
        ],
      };

      return [fallbackExercise];
    } catch (error) {
      console.error("Search exercises failed:", error);
      return [
        {
          exerciseId: `emergency_${query.toLowerCase().replace(/\s+/g, "_")}`,
          name: query,
          gifUrl: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
          targetMuscles: ["full body"],
          bodyParts: ["full body"],
          equipments: ["body weight"],
          secondaryMuscles: [],
          instructions: ["Perform with proper form"],
        },
      ];
    }
  }

  async getExerciseById(id: string): Promise<ExerciseData | null> {
    const cached = this.cacheService.get(id);
    if (cached) return cached;

    const exercise = await fetchExerciseById(id);
    if (exercise) {
      this.cacheService.set(exercise.exerciseId, exercise);
      this.cacheService.set(exercise.name.toLowerCase(), exercise);
    }
    return exercise;
  }

  async findExercise(
    exerciseName: string,
    useAdvancedMatching: boolean = true,
    preventCircularCalls: boolean = false,
  ): Promise<ExerciseMatchResult | null> {
    const cleanName = exerciseName.toLowerCase().trim();
    console.log(`🎯 BULLETPROOF SEARCH: "${exerciseName}" -> "${cleanName}"`);

    console.log(`🎯 Tier 1: Local mappings with working GIFs...`);
    const localExercise = findLocalExerciseMapping(cleanName);
    if (localExercise && localExercise.gifUrl) {
      console.log(`✅ TIER 1 SUCCESS: "${localExercise.name}" (Local mapping)`);
      return {
        exercise: localExercise,
        confidence: 1.0,
        matchType: "exact",
      };
    }

    console.log(`📋 Tier 2: Cache exact match...`);
    const exactMatch = this.cacheService.get(cleanName);
    if (exactMatch && exactMatch.gifUrl) {
      exactMatch.gifUrl = fixBrokenCdnUrl(exactMatch.gifUrl);
      console.log(`✅ TIER 2 SUCCESS: "${exactMatch.name}"`);
      return {
        exercise: exactMatch,
        confidence: 1.0,
        matchType: "exact",
      };
    }

    if (useAdvancedMatching && !preventCircularCalls) {
      try {
        console.log(`🧠 Tier 3: Advanced matching...`);
        const advancedResult =
          await advancedExerciseMatching.findExerciseWithFullCoverage(
            exerciseName,
          );
        if (
          advancedResult &&
          advancedResult.exercise &&
          advancedResult.exercise.gifUrl
        ) {
          console.log(`✅ TIER 3 SUCCESS: "${advancedResult.exercise.name}"`);
          return {
            exercise: advancedResult.exercise,
            confidence: advancedResult.confidence,
            matchType: advancedResult.matchType,
          };
        }
      } catch (error) {
        console.warn("Tier 3 (Advanced matching) failed:", error);
      }
    }

    console.log(`🌐 Tier 4: API search...`);
    const searchResults = await this.searchExercises(exerciseName);
    if (searchResults.length > 0) {
      let bestMatch = searchResults[0];

      if (bestMatch.gifUrl) {
        bestMatch = {
          ...bestMatch,
          gifUrl: fixBrokenCdnUrl(bestMatch.gifUrl),
        };
      }

      if (bestMatch.gifUrl) {
        const confidence = calculateSimilarity(
          cleanName,
          bestMatch.name.toLowerCase(),
        );
        console.log(
          `✅ TIER 4 SUCCESS: "${bestMatch.name}" (${Math.round(confidence * 100)}%)`,
        );
        return {
          exercise: bestMatch,
          confidence,
          matchType: confidence > 0.8 ? "fuzzy" : "partial",
        };
      }
    }

    console.log(`🔍 Tier 5: Cache partial matching...`);
    const partialMatch = findPartialMatchInCache(
      cleanName,
      this.cacheService.values(),
    );
    if (partialMatch && partialMatch.exercise.gifUrl) {
      console.log(`✅ TIER 5 SUCCESS: "${partialMatch.exercise.name}"`);
      return partialMatch;
    }

    console.error(
      `❌ BULLETPROOF FAILURE: All 5 tiers failed for "${exerciseName}"`,
    );
    return createEmergencyFallback(exerciseName);
  }

  async getExercisesByBodyPart(bodyPart: string): Promise<ExerciseData[]> {
    const exercises = await fetchExercisesByBodyPart(bodyPart);
    exercises.forEach((exercise) => {
      this.cacheService.set(exercise.name.toLowerCase(), exercise);
      this.cacheService.set(exercise.exerciseId, exercise);
    });
    return exercises;
  }

  async getExercisesByEquipment(equipment: string): Promise<ExerciseData[]> {
    const exercises = await fetchExercisesByEquipment(equipment);
    exercises.forEach((exercise) => {
      this.cacheService.set(exercise.name.toLowerCase(), exercise);
      this.cacheService.set(exercise.exerciseId, exercise);
    });
    return exercises;
  }

  async getBodyParts(): Promise<string[]> {
    return fetchBodyParts();
  }

  async getEquipments(): Promise<string[]> {
    return fetchEquipments();
  }

  async clearCache(): Promise<void> {
    await this.cacheService.clear();
  }

  async preloadWorkoutVisuals(
    exerciseNames: string[],
  ): Promise<Map<string, ExerciseMatchResult | null>> {
    return preloadWorkoutVisuals(exerciseNames, this.findExercise.bind(this));
  }

  async preloadWorkoutPlanVisuals(
    workoutPlan: { exercises: string[] }[],
  ): Promise<void> {
    return preloadWorkoutPlanVisuals(workoutPlan, this.findExercise.bind(this));
  }

  getAdvancedMatchingMetrics() {
    return advancedExerciseMatching.getPerformanceMetrics();
  }

  getCacheStats(): CacheStats {
    return this.cacheService.getStats();
  }
}

export const exerciseVisualService = new ExerciseVisualService();
export default exerciseVisualService;
