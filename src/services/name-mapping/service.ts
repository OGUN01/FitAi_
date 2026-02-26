import { ExerciseData } from "../exerciseVisualService";
import { NameMappingResult, MappingStats } from "./types";
import { aiToDbMappings } from "./mappings";
import { semanticPatterns } from "./patterns";
import {
  cleanExerciseName,
  findExactMatch,
  findMappingMatch,
  findNormalizedMatch,
  findSemanticMatch,
  findFuzzyMatch,
  buildWordIndex,
} from "./matchers";
import { generateIntelligentFallback } from "./fallback";

class NormalizedNameMappingService {
  private exercises: ExerciseData[];
  private nameIndex: { [key: string]: number };
  private wordIndex: { [key: string]: number[] };
  private muscleIndex: { [key: string]: number[] };
  private equipmentIndex: { [key: string]: number[] };

  constructor() {
    this.exercises = [];
    this.nameIndex = {};
    this.wordIndex = buildWordIndex(this.exercises);
    this.muscleIndex = {};
    this.equipmentIndex = {};

  }

  async findBestMatch(aiGeneratedName: string): Promise<NameMappingResult> {
    const cleanName = cleanExerciseName(aiGeneratedName);


    const exactMatch = findExactMatch(
      cleanName,
      this.exercises,
      this.nameIndex,
    );
    if (exactMatch) {
      return exactMatch;
    }

    const mappingMatch = findMappingMatch(
      cleanName,
      this.exercises,
      this.nameIndex,
    );
    if (mappingMatch) {
      return mappingMatch;
    }

    const normalizedMatch = findNormalizedMatch(
      cleanName,
      this.exercises,
      this.nameIndex,
    );
    if (normalizedMatch) {
      return normalizedMatch;
    }

    const semanticMatch = findSemanticMatch(
      cleanName,
      this.exercises,
      this.nameIndex,
    );
    if (semanticMatch) {
      return semanticMatch;
    }

    const fuzzyMatch = findFuzzyMatch(
      cleanName,
      this.exercises,
      this.wordIndex,
    );
    if (fuzzyMatch) {
      return fuzzyMatch;
    }

    return generateIntelligentFallback(aiGeneratedName);
  }

  getStats(): MappingStats {
    return {
      totalExercises: this.exercises.length,
      aiMappings: aiToDbMappings.size,
      semanticPatterns: semanticPatterns.length,
      wordIndexSize: Object.keys(this.wordIndex).length,
    };
  }
}

export const normalizedNameMapping = new NormalizedNameMappingService();
export default normalizedNameMapping;
