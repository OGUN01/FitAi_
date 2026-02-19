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

    console.log(
      `🎯 Normalized Name Mapping initialized in fallback mode (bundle size optimization)`,
    );
  }

  async findBestMatch(aiGeneratedName: string): Promise<NameMappingResult> {
    const cleanName = cleanExerciseName(aiGeneratedName);

    console.log(`🔍 Finding match for: "${aiGeneratedName}" -> "${cleanName}"`);

    const exactMatch = findExactMatch(
      cleanName,
      this.exercises,
      this.nameIndex,
    );
    if (exactMatch) {
      console.log(`✅ Exact match found: "${exactMatch.exercise.name}"`);
      return exactMatch;
    }

    const mappingMatch = findMappingMatch(
      cleanName,
      this.exercises,
      this.nameIndex,
    );
    if (mappingMatch) {
      console.log(`✅ Mapping match found: "${mappingMatch.exercise.name}"`);
      return mappingMatch;
    }

    const normalizedMatch = findNormalizedMatch(
      cleanName,
      this.exercises,
      this.nameIndex,
    );
    if (normalizedMatch) {
      console.log(
        `✅ Normalized match found: "${normalizedMatch.exercise.name}"`,
      );
      return normalizedMatch;
    }

    const semanticMatch = findSemanticMatch(
      cleanName,
      this.exercises,
      this.nameIndex,
    );
    if (semanticMatch) {
      console.log(`✅ Semantic match found: "${semanticMatch.exercise.name}"`);
      return semanticMatch;
    }

    const fuzzyMatch = findFuzzyMatch(
      cleanName,
      this.exercises,
      this.wordIndex,
    );
    if (fuzzyMatch) {
      console.log(`✅ Fuzzy match found: "${fuzzyMatch.exercise.name}"`);
      return fuzzyMatch;
    }

    console.log(`🔄 Creating intelligent fallback for "${aiGeneratedName}"`);
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
