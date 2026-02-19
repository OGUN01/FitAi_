/**
 * Type definitions for the Normalized Name Mapping System
 */

import { ExerciseData } from "../exerciseVisualService";

export interface NameMappingResult {
  exercise: ExerciseData;
  confidence: number;
  matchType: "exact" | "normalized" | "fuzzy" | "semantic" | "fallback";
  source: "database" | "local_mapping" | "generated";
}

export interface SemanticPattern {
  pattern: RegExp;
  target: string;
  confidence: number;
}

export interface MappingStats {
  totalExercises: number;
  aiMappings: number;
  semanticPatterns: number;
  wordIndexSize: number;
}

export interface Indices {
  nameIndex: { [key: string]: number };
  wordIndex: { [key: string]: number[] };
  muscleIndex: { [key: string]: number[] };
  equipmentIndex: { [key: string]: number[] };
}
