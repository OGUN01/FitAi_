import { ExerciseData, ExerciseMatchResult } from "./types";

export function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

export function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i += 1) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j += 1) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }

  return matrix[str2.length][str1.length];
}

export function findPartialMatchInCache(
  query: string,
  cacheValues: IterableIterator<ExerciseData>,
): ExerciseMatchResult | null {
  const queryWords = query.split(" ");
  let bestMatch: ExerciseData | null = null;
  let bestScore = 0;

  for (const exercise of cacheValues) {
    if (exercise.exerciseId === exercise.name) continue;

    const exerciseName = exercise.name.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (exerciseName.includes(word)) {
        score += word.length;
      }
    }

    const normalizedScore = score / query.length;

    if (normalizedScore > bestScore && normalizedScore > 0.3) {
      bestScore = normalizedScore;
      bestMatch = exercise;
    }
  }

  if (bestMatch) {
    return {
      exercise: bestMatch,
      confidence: bestScore,
      matchType: "partial",
    };
  }

  return null;
}

export function createEmergencyFallback(
  exerciseName: string,
): ExerciseMatchResult {
  const cleanName = exerciseName.toLowerCase().trim();
  return {
    exercise: {
      exerciseId: `emergency_${cleanName.replace(/\s+/g, "_")}`,
      name: exerciseName,
      gifUrl: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
      targetMuscles: ["full body"],
      bodyParts: ["full body"],
      equipments: ["body weight"],
      secondaryMuscles: [],
      instructions: ["Perform with proper form"],
    },
    confidence: 0.5,
    matchType: "partial",
  };
}
