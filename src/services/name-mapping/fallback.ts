import { ExerciseData } from "../exerciseVisualService";
import { NameMappingResult } from "./types";
import { cleanExerciseName } from "./matchers";

export function createNormalizedName(originalName: string): string {
  return originalName
    .replace(/[_-]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function inferTargetMuscles(name: string): string[] {
  const musclePatterns = [
    { pattern: /push|chest|press/, muscles: ["pectorals"] },
    { pattern: /squat|leg|thigh/, muscles: ["quads", "glutes"] },
    { pattern: /pull|back|row/, muscles: ["lats", "upper back"] },
    { pattern: /shoulder|raise/, muscles: ["delts"] },
    { pattern: /curl|bicep/, muscles: ["biceps"] },
    { pattern: /dip|tricep/, muscles: ["triceps"] },
    { pattern: /core|abs|plank|crunch/, muscles: ["abs"] },
    { pattern: /glute|hip|bridge/, muscles: ["glutes"] },
    { pattern: /calf/, muscles: ["calves"] },
    { pattern: /cardio|run|jump|jack/, muscles: ["cardiovascular system"] },
  ];

  for (const pattern of musclePatterns) {
    if (pattern.pattern.test(name)) {
      return pattern.muscles;
    }
  }

  return ["full body"];
}

export function inferEquipment(name: string): string {
  if (/dumbbell/i.test(name)) return "dumbbell";
  if (/barbell/i.test(name)) return "barbell";
  if (/kettlebell/i.test(name)) return "kettlebell";
  if (/band|resistance/i.test(name)) return "band";
  if (/cable/i.test(name)) return "cable";
  if (/machine/i.test(name)) return "machine";
  return "body weight";
}

export function inferCategory(name: string): string {
  if (/cardio|run|jump|jack|climb/i.test(name)) return "cardio";
  if (/stretch|yoga|flexibility/i.test(name)) return "flexibility";
  if (/dumbbell|barbell|weight|press|curl|row/i.test(name)) return "strength";
  if (/plank|crunch|abs|core/i.test(name)) return "core";
  return "general";
}

export function inferBodyParts(muscles: string[]): string[] {
  const bodyPartMap: { [key: string]: string } = {
    pectorals: "chest",
    lats: "back",
    "upper back": "back",
    delts: "shoulders",
    biceps: "upper arms",
    triceps: "upper arms",
    quads: "upper legs",
    glutes: "upper legs",
    hamstrings: "upper legs",
    calves: "lower legs",
    abs: "waist",
    "cardiovascular system": "cardio",
  };

  const bodyParts = muscles.map((muscle) => bodyPartMap[muscle] || "full body");
  return [...new Set(bodyParts)];
}

export function generateFallbackGifUrl(name: string, category: string): string {
  const gifMap: { [key: string]: string } = {
    cardio: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
    strength: "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif",
    core: "https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif",
    flexibility: "https://media.giphy.com/media/3oEjI5TqjzqZWQzKus/giphy.gif",
    general: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  };

  if (/jump.*jack/i.test(name))
    return "https://media.giphy.com/media/3oEduGGZhLKWtfHJYc/giphy.gif";
  if (/push.*up/i.test(name))
    return "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif";
  if (/plank/i.test(name))
    return "https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif";
  if (/mountain.*climb/i.test(name))
    return "https://media.giphy.com/media/3oEjI8Kq5HhZLCrqBW/giphy.gif";
  if (/burpee/i.test(name))
    return "https://media.giphy.com/media/3oEjI0ZBtK8e6XG1qg/giphy.gif";

  return gifMap[category] || gifMap["general"];
}

export function generateInstructions(name: string, category: string): string[] {
  const baseInstructions = [
    "Maintain proper form throughout the exercise",
    "Control the movement in both directions",
    "Breathe steadily and avoid holding your breath",
  ];

  const categoryInstructions: { [key: string]: string[] } = {
    cardio: [
      "Keep a steady pace",
      "Land softly if jumping",
      "Stay light on your feet",
    ],
    strength: [
      "Use appropriate weight",
      "Full range of motion",
      "Focus on the target muscles",
    ],
    core: [
      "Engage your core muscles",
      "Keep your back neutral",
      "Don't strain your neck",
    ],
    flexibility: [
      "Hold stretches for 15-30 seconds",
      "Don't bounce",
      "Breathe deeply",
    ],
  };

  const specific = categoryInstructions[category] || [
    "Follow proper technique",
  ];
  return [...baseInstructions, ...specific];
}

export function generateIntelligentFallback(
  originalName: string,
): NameMappingResult {
  const cleanName = cleanExerciseName(originalName);

  const muscles = inferTargetMuscles(cleanName);
  const equipment = inferEquipment(cleanName);
  const category = inferCategory(cleanName);

  const gifUrl = generateFallbackGifUrl(cleanName, category);

  const normalizedName = createNormalizedName(originalName);

  const fallbackExercise: ExerciseData = {
    exerciseId: `ai_generated_${cleanName.replace(/\s+/g, "_")}`,
    name: normalizedName,
    gifUrl,
    targetMuscles: muscles,
    bodyParts: inferBodyParts(muscles),
    equipments: [equipment],
    secondaryMuscles: [],
    instructions: generateInstructions(normalizedName, category),
  };

  return {
    exercise: fallbackExercise,
    confidence: 0.7,
    matchType: "fallback",
    source: "generated",
  };
}
