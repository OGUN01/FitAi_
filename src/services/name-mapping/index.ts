export {
  NameMappingResult,
  SemanticPattern,
  MappingStats,
  Indices,
} from "./types";
export { aiToDbMappings } from "./mappings";
export { semanticPatterns } from "./patterns";
export {
  cleanExerciseName,
  findExactMatch,
  findMappingMatch,
  findNormalizedMatch,
  findSemanticMatch,
  findFuzzyMatch,
  buildWordIndex,
} from "./matchers";
export {
  createNormalizedName,
  inferTargetMuscles,
  inferEquipment,
  inferCategory,
  inferBodyParts,
  generateFallbackGifUrl,
  generateInstructions,
  generateIntelligentFallback,
} from "./fallback";
export { normalizedNameMapping, default } from "./service";
