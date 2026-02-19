import exerciseVisualService, {
  ExerciseMatchResult,
} from "../exerciseVisualService";
import {
  EXERCISE_PATTERNS,
  ExercisePattern,
  GeneratedExerciseData,
} from "./types";

export class ExerciseMatchers {
  private semanticCache: Map<string, GeneratedExerciseData>;

  constructor(semanticCache: Map<string, GeneratedExerciseData>) {
    this.semanticCache = semanticCache;
  }

  async tryExactMatch(
    exerciseName: string,
  ): Promise<ExerciseMatchResult | null> {
    const cleanName = exerciseName.toLowerCase().trim();

    const exactMatch = await exerciseVisualService.findExercise(
      cleanName,
      false,
      true,
    );

    if (exactMatch && exactMatch.matchType === "exact") {
      return exactMatch;
    }

    return null;
  }

  async tryFuzzyMatch(
    exerciseName: string,
  ): Promise<ExerciseMatchResult | null> {
    try {
      const fuzzyMatch = await exerciseVisualService.findExercise(
        exerciseName,
        false,
        true,
      );

      if (fuzzyMatch && fuzzyMatch.confidence >= 0.75) {
        return fuzzyMatch;
      }

      return null;
    } catch (error) {
      console.warn(`Fuzzy matching failed for ${exerciseName}:`, error);
      return null;
    }
  }

  async trySemanticMatch(
    exerciseName: string,
    generateSemanticMapping: (
      name: string,
    ) => Promise<GeneratedExerciseData | null>,
    saveSemanticCache: () => Promise<void>,
  ): Promise<ExerciseMatchResult | null> {
    try {
      const cached = this.semanticCache.get(exerciseName.toLowerCase());
      if (cached) {
        const standardMatch = await exerciseVisualService.findExercise(
          cached.alternatives[0],
          false,
          true,
        );
        if (standardMatch) {
          return {
            ...standardMatch,
            confidence: 0.85,
            matchType: "fuzzy",
          };
        }
      }

      const semanticData = await generateSemanticMapping(exerciseName);
      if (semanticData && semanticData.alternatives.length > 0) {
        for (const alternative of semanticData.alternatives) {
          const match = await exerciseVisualService.findExercise(
            alternative,
            false,
            true,
          );
          if (match && match.confidence >= 0.7) {
            this.semanticCache.set(exerciseName.toLowerCase(), semanticData);
            await saveSemanticCache();

            return {
              ...match,
              confidence: Math.min(match.confidence + 0.1, 1.0),
              matchType: "fuzzy",
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.warn(`Semantic matching failed for ${exerciseName}:`, error);
      return null;
    }
  }

  async tryClassificationMatch(
    exerciseName: string,
  ): Promise<ExerciseMatchResult | null> {
    try {
      const classification = this.classifyExercise(exerciseName);
      if (!classification) return null;

      const fallbackMatch = await exerciseVisualService.findExercise(
        classification.fallbackExercise,
        false,
        true,
      );

      if (fallbackMatch) {
        return {
          exercise: {
            ...fallbackMatch.exercise,
            name: `${exerciseName} (Similar to ${fallbackMatch.exercise.name})`,
            instructions: [
              `This is a variation of ${fallbackMatch.exercise.name}.`,
              `Follow the demonstration while adapting for "${exerciseName}".`,
              ...fallbackMatch.exercise.instructions,
            ],
          },
          confidence: 0.6,
          matchType: "partial",
        };
      }

      return null;
    } catch (error) {
      console.warn(
        `Classification matching failed for ${exerciseName}:`,
        error,
      );
      return null;
    }
  }

  classifyExercise(exerciseName: string): ExercisePattern | null {
    const name = exerciseName.toLowerCase();

    for (const pattern of EXERCISE_PATTERNS) {
      if (pattern.keywords.some((keyword) => name.includes(keyword))) {
        return pattern;
      }
    }

    return null;
  }
}
