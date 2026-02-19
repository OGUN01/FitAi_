import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  AdvancedMatchResult,
  GeneratedExerciseData,
  PerformanceMetrics,
} from "./types";
import { ExerciseMatchers } from "./matchers";
import { AIGenerator } from "./ai-generator";
import { createResult, loadSemanticCache, saveSemanticCache } from "./utils";

class AdvancedExerciseMatchingService {
  private semanticCache = new Map<string, GeneratedExerciseData>();
  private performanceMetrics: PerformanceMetrics = {
    totalRequests: 0,
    tierUsage: {
      exact: 0,
      fuzzy: 0,
      semantic: 0,
      classification: 0,
      generated: 0,
    },
    averageResponseTime: 0,
  };

  private matchers: ExerciseMatchers;
  private aiGenerator: AIGenerator;

  constructor() {
    this.matchers = new ExerciseMatchers(this.semanticCache);
    this.aiGenerator = new AIGenerator();
    this.loadSemanticCache();
  }

  async findExerciseWithFullCoverage(
    exerciseName: string,
  ): Promise<AdvancedMatchResult> {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;

    try {
      const exactMatch = await this.matchers.tryExactMatch(exerciseName);
      if (exactMatch) {
        this.performanceMetrics.tierUsage.exact++;
        return createResult(
          exactMatch,
          "exact",
          startTime,
          this.updatePerformanceMetrics.bind(this),
        );
      }

      const fuzzyMatch = await this.matchers.tryFuzzyMatch(exerciseName);
      if (fuzzyMatch && fuzzyMatch.confidence >= 0.75) {
        this.performanceMetrics.tierUsage.fuzzy++;
        return createResult(
          fuzzyMatch,
          "fuzzy",
          startTime,
          this.updatePerformanceMetrics.bind(this),
        );
      }

      const semanticMatch = await this.matchers.trySemanticMatch(
        exerciseName,
        this.aiGenerator.generateSemanticMapping.bind(this.aiGenerator),
        this.saveSemanticCache.bind(this),
      );
      if (semanticMatch) {
        this.performanceMetrics.tierUsage.semantic++;
        return createResult(
          semanticMatch,
          "semantic",
          startTime,
          this.updatePerformanceMetrics.bind(this),
        );
      }

      const classificationMatch =
        await this.matchers.tryClassificationMatch(exerciseName);
      if (classificationMatch) {
        this.performanceMetrics.tierUsage.classification++;
        return createResult(
          classificationMatch,
          "classification",
          startTime,
          this.updatePerformanceMetrics.bind(this),
        );
      }

      const generatedMatch = await this.aiGenerator.generateExerciseData(
        exerciseName,
        this.matchers.classifyExercise.bind(this.matchers),
      );
      this.performanceMetrics.tierUsage.generated++;
      return createResult(
        generatedMatch,
        "generated",
        startTime,
        this.updatePerformanceMetrics.bind(this),
      );
    } catch (error) {
      console.error(`Advanced matching failed for ${exerciseName}:`, error);

      const fallback = await this.matchers.tryClassificationMatch(exerciseName);
      return createResult(
        fallback,
        "classification",
        startTime,
        this.updatePerformanceMetrics.bind(this),
      );
    }
  }

  private updatePerformanceMetrics(processingTime: number): void {
    const total = this.performanceMetrics.totalRequests;
    const current = this.performanceMetrics.averageResponseTime;
    this.performanceMetrics.averageResponseTime =
      (current * (total - 1) + processingTime) / total;
  }

  private async loadSemanticCache(): Promise<void> {
    this.semanticCache = await loadSemanticCache();
  }

  private async saveSemanticCache(): Promise<void> {
    await saveSemanticCache(this.semanticCache);
  }

  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.semanticCache.size,
      coverageRate:
        ((this.performanceMetrics.tierUsage.exact +
          this.performanceMetrics.tierUsage.fuzzy +
          this.performanceMetrics.tierUsage.semantic) /
          Math.max(this.performanceMetrics.totalRequests, 1)) *
        100,
    };
  }

  async clearCaches(): Promise<void> {
    this.semanticCache.clear();
    await AsyncStorage.removeItem("semantic_exercise_cache");
    console.log("🧹 Advanced matching caches cleared");
  }
}

export const advancedExerciseMatching = new AdvancedExerciseMatchingService();
export default advancedExerciseMatching;
