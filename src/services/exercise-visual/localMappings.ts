import { ExerciseData } from "./types";

export const LOCAL_EXERCISE_MAPPING = new Map<string, ExerciseData>([
  [
    "jumping_jacks",
    {
      exerciseId: "local_jumping_jacks",
      name: "Jumping Jacks",
      gifUrl: "https://media.giphy.com/media/3oEduGGZhLKWtfHJYc/giphy.gif",
      targetMuscles: ["cardiovascular"],
      bodyParts: ["full body"],
      equipments: ["body weight"],
      secondaryMuscles: ["legs", "arms"],
      instructions: [
        "Start standing with feet together and arms at sides",
        "Jump while spreading legs and raising arms overhead",
        "Jump back to starting position",
        "Repeat for desired reps",
      ],
    },
  ],
  [
    "light_jogging_intervals",
    {
      exerciseId: "local_jogging_intervals",
      name: "Light Jogging Intervals",
      gifUrl: "https://media.giphy.com/media/3o7WTCmEF0Zcw1zYWY/giphy.gif",
      targetMuscles: ["cardiovascular"],
      bodyParts: ["full body"],
      equipments: ["body weight"],
      secondaryMuscles: ["legs", "core"],
      instructions: [
        "Start with light jogging pace",
        "Alternate between jogging and walking",
        "Maintain steady breathing",
        "Keep arms relaxed and moving naturally",
      ],
    },
  ],
  [
    "butt_kicks",
    {
      exerciseId: "local_butt_kicks",
      name: "Butt Kicks",
      gifUrl: "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif",
      targetMuscles: ["hamstrings"],
      bodyParts: ["legs"],
      equipments: ["body weight"],
      secondaryMuscles: ["calves", "glutes"],
      instructions: [
        "Stand with feet hip-width apart",
        "Jog in place while kicking heels to glutes",
        "Keep core engaged",
        "Pump arms naturally",
      ],
    },
  ],
  [
    "high_knees",
    {
      exerciseId: "local_high_knees",
      name: "High Knees",
      gifUrl: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
      targetMuscles: ["quadriceps"],
      bodyParts: ["legs"],
      equipments: ["body weight"],
      secondaryMuscles: ["hip flexors", "core"],
      instructions: [
        "Stand with feet hip-width apart",
        "Jog in place lifting knees toward chest",
        "Keep core tight",
        "Pump arms opposite to legs",
      ],
    },
  ],
  [
    "dumbbell_goblet_squat",
    {
      exerciseId: "local_goblet_squat",
      name: "Dumbbell Goblet Squat",
      gifUrl: "https://media.giphy.com/media/1qfDiTQ8NURS8rSHUF/giphy.gif",
      targetMuscles: ["quadriceps"],
      bodyParts: ["legs"],
      equipments: ["dumbbell"],
      secondaryMuscles: ["glutes", "core"],
      instructions: [
        "Hold dumbbell at chest level",
        "Stand with feet shoulder-width apart",
        "Squat down keeping chest up",
        "Drive through heels to stand",
      ],
    },
  ],
  [
    "dumbbell_lunges",
    {
      exerciseId: "local_dumbbell_lunges",
      name: "Dumbbell Lunges",
      gifUrl: "https://media.giphy.com/media/xUA7aN1MTCZx97V1Ic/giphy.gif",
      targetMuscles: ["quadriceps"],
      bodyParts: ["legs"],
      equipments: ["dumbbell"],
      secondaryMuscles: ["glutes", "hamstrings"],
      instructions: [
        "Hold dumbbells at sides",
        "Step forward into lunge position",
        "Lower until both knees at 90 degrees",
        "Push back to starting position",
      ],
    },
  ],
  [
    "push_ups",
    {
      exerciseId: "local_push_ups",
      name: "Push-ups",
      gifUrl: "https://media.giphy.com/media/l1J9EdzfOSgfyueLm/giphy.gif",
      targetMuscles: ["chest"],
      bodyParts: ["upper body"],
      equipments: ["body weight"],
      secondaryMuscles: ["triceps", "shoulders"],
      instructions: [
        "Start in plank position",
        "Lower chest to floor",
        "Push back up to starting position",
        "Keep body straight throughout",
      ],
    },
  ],
  [
    "plank",
    {
      exerciseId: "local_plank",
      name: "Plank",
      gifUrl: "https://media.giphy.com/media/ZAOJHWhgLdHEI/giphy.gif",
      targetMuscles: ["core"],
      bodyParts: ["core"],
      equipments: ["body weight"],
      secondaryMuscles: ["shoulders", "back"],
      instructions: [
        "Start in forearm plank position",
        "Keep body straight from head to heels",
        "Engage core muscles",
        "Hold for desired time",
      ],
    },
  ],
  [
    "mountain_climbers",
    {
      exerciseId: "local_mountain_climbers",
      name: "Mountain Climbers",
      gifUrl: "https://media.giphy.com/media/3oEjI8Kq5HhZLCrqBW/giphy.gif",
      targetMuscles: ["core"],
      bodyParts: ["full body"],
      equipments: ["body weight"],
      secondaryMuscles: ["shoulders", "legs"],
      instructions: [
        "Start in plank position",
        "Alternate bringing knees to chest",
        "Keep hips level",
        "Maintain fast pace",
      ],
    },
  ],
  [
    "mountain_climber",
    {
      exerciseId: "local_mountain_climber",
      name: "Mountain Climber",
      gifUrl: "https://media.giphy.com/media/3oEjI8Kq5HhZLCrqBW/giphy.gif",
      targetMuscles: ["cardiovascular system"],
      bodyParts: ["full body"],
      equipments: ["body weight"],
      secondaryMuscles: ["shoulders", "legs", "core"],
      instructions: [
        "Start in plank position",
        "Alternate bringing knees to chest",
        "Keep hips level",
        "Maintain fast pace",
      ],
    },
  ],
  [
    "burpees",
    {
      exerciseId: "local_burpees",
      name: "Burpees",
      gifUrl: "https://media.giphy.com/media/3oEjI0ZBtK8e6XG1qg/giphy.gif",
      targetMuscles: ["full body"],
      bodyParts: ["full body"],
      equipments: ["body weight"],
      secondaryMuscles: ["cardiovascular"],
      instructions: [
        "Start standing",
        "Drop to squat and place hands on floor",
        "Jump feet back to plank",
        "Do push-up, jump feet in, jump up",
      ],
    },
  ],
]);

export function findLocalExerciseMapping(
  exerciseName: string,
): ExerciseData | null {
  const cleanName = exerciseName.toLowerCase().trim();

  if (LOCAL_EXERCISE_MAPPING.has(cleanName)) {
    const exercise = LOCAL_EXERCISE_MAPPING.get(cleanName)!;
    console.log(`✅ Direct local match found for "${cleanName}"`);
    return exercise;
  }

  const fuzzyMatches = [
    cleanName.replace(/_+/g, " ").replace(/\s+/g, " "),
    cleanName.replace(/dumbbell_/g, "").replace(/_+/g, " "),
    cleanName.replace(/bodyweight_/g, "").replace(/_+/g, " "),
    cleanName.replace(/\(.*?\)/g, "").trim(),
    cleanName.replace(/_each_leg|_per_leg|_alternating/g, ""),
    cleanName.replace(/_intervals?|_sets?|_reps?/g, ""),
    cleanName.includes("jump") && cleanName.includes("jack")
      ? "jumping_jacks"
      : null,
    cleanName.includes("jog") || cleanName.includes("running")
      ? "light_jogging_intervals"
      : null,
    cleanName.includes("butt") && cleanName.includes("kick")
      ? "butt_kicks"
      : null,
    cleanName.includes("high") && cleanName.includes("knee")
      ? "high_knees"
      : null,
    cleanName.includes("goblet") && cleanName.includes("squat")
      ? "dumbbell_goblet_squat"
      : null,
    cleanName.includes("lunge") ? "dumbbell_lunges" : null,
    cleanName.includes("push") && cleanName.includes("up") ? "push_ups" : null,
    cleanName.includes("plank") ? "plank" : null,
    cleanName.includes("mountain") && cleanName.includes("climb")
      ? "mountain_climbers"
      : null,
    cleanName.includes("burpee") ? "burpees" : null,
  ].filter(Boolean);

  for (const fuzzyName of fuzzyMatches) {
    if (fuzzyName && LOCAL_EXERCISE_MAPPING.has(fuzzyName)) {
      console.log(`🔍 Fuzzy matched "${cleanName}" to "${fuzzyName}"`);
      return LOCAL_EXERCISE_MAPPING.get(fuzzyName)!;
    }
  }

  return null;
}
