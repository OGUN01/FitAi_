import { ExerciseData } from "../exerciseVisualService";
import { NameMappingResult, Indices } from "./types";
import { aiToDbMappings } from "./mappings";
import { semanticPatterns } from "./patterns";

export function cleanExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

export function findExactMatch(
  cleanName: string,
  exercises: ExerciseData[],
  nameIndex: { [key: string]: number },
): NameMappingResult | null {
  const index = nameIndex[cleanName];
  if (typeof index === "number" && exercises[index]) {
    return {
      exercise: exercises[index],
      confidence: 1.0,
      matchType: "exact",
      source: "database",
    };
  }
  return null;
}

export function findMappingMatch(
  cleanName: string,
  exercises: ExerciseData[],
  nameIndex: { [key: string]: number },
): NameMappingResult | null {
  const mappedName = aiToDbMappings.get(cleanName.replace(/\s+/g, "_"));
  if (mappedName) {
    const index = nameIndex[mappedName.toLowerCase()];
    if (typeof index === "number" && exercises[index]) {
      return {
        exercise: exercises[index],
        confidence: 0.95,
        matchType: "normalized",
        source: "database",
      };
    }
  }

  const variations = [
    cleanName.replace(/\s+/g, "_"),
    cleanName.replace(/\s+/g, ""),
    cleanName.replace(/s$/, ""),
    cleanName + "s",
  ];

  for (const variation of variations) {
    const mapped = aiToDbMappings.get(variation);
    if (mapped) {
      const index = nameIndex[mapped.toLowerCase()];
      if (typeof index === "number" && exercises[index]) {
        return {
          exercise: exercises[index],
          confidence: 0.9,
          matchType: "normalized",
          source: "database",
        };
      }
    }
  }

  return null;
}

export function findNormalizedMatch(
  cleanName: string,
  exercises: ExerciseData[],
  nameIndex: { [key: string]: number },
): NameMappingResult | null {
  const words = cleanName.split(" ");

  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j <= words.length; j++) {
      const phrase = words.slice(i, j).join(" ");
      if (phrase.length > 2) {
        const index = nameIndex[phrase];
        if (typeof index === "number" && exercises[index]) {
          return {
            exercise: exercises[index],
            confidence: 0.8 - (i + words.length - j) * 0.1,
            matchType: "normalized",
            source: "database",
          };
        }
      }
    }
  }

  return null;
}

export function findSemanticMatch(
  cleanName: string,
  exercises: ExerciseData[],
  nameIndex: { [key: string]: number },
): NameMappingResult | null {
  for (const pattern of semanticPatterns) {
    if (pattern.pattern.test(cleanName)) {
      const index = nameIndex[pattern.target.toLowerCase()];
      if (typeof index === "number" && exercises[index]) {
        return {
          exercise: exercises[index],
          confidence: pattern.confidence,
          matchType: "semantic",
          source: "database",
        };
      }
    }
  }
  return null;
}

export function findFuzzyMatch(
  cleanName: string,
  exercises: ExerciseData[],
  wordIndex: { [key: string]: number[] },
): NameMappingResult | null {
  const words = cleanName.split(" ");
  const candidates: { exercise: ExerciseData; score: number }[] = [];

  for (const word of words) {
    if (word.length > 2 && wordIndex[word]) {
      for (const exerciseIndex of wordIndex[word]) {
        const exercise = exercises[exerciseIndex];
        if (exercise) {
          const existing = candidates.find(
            (c) => c.exercise.exerciseId === exercise.exerciseId,
          );
          if (existing) {
            existing.score += word.length;
          } else {
            candidates.push({ exercise, score: word.length });
          }
        }
      }
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const confidence = Math.min(0.8, best.score / cleanName.length);

    if (confidence > 0.3) {
      return {
        exercise: best.exercise,
        confidence,
        matchType: "fuzzy",
        source: "database",
      };
    }
  }

  return null;
}

export function buildWordIndex(exercises: ExerciseData[]): {
  [key: string]: number[];
} {
  const index: { [key: string]: number[] } = {};

  exercises.forEach((exercise, idx) => {
    const words = exercise.name.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 2) {
        if (!index[word]) index[word] = [];
        if (!index[word].includes(idx)) {
          index[word].push(idx);
        }
      }
    });
  });

  return index;
}
