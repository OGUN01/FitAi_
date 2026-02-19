// AI Response Schemas for Google Gemini Structured Output
// Workout generation schema definitions

// ============================================================================
// WORKOUT GENERATION SCHEMA
// ============================================================================

export const WORKOUT_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Personalized workout name reflecting user goals",
    },
    description: {
      type: "string",
      description:
        "Detailed description explaining the workout's purpose and benefits",
    },
    category: {
      type: "string",
      enum: ["strength", "cardio", "flexibility", "hiit", "hybrid"],
      description: "Workout category",
    },
    difficulty: {
      type: "string",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Difficulty level appropriate for user",
    },
    duration: {
      type: "number",
      description: "Workout duration in minutes",
    },
    estimatedCalories: {
      type: "number",
      description: "Estimated calories burned based on user profile",
    },
    exercises: {
      type: "array",
      description: "List of exercises in the workout",
      items: {
        type: "object",
        properties: {
          exerciseId: {
            type: "string",
            description: "Specific exercise identifier",
          },
          sets: {
            type: "number",
            description: "Number of sets appropriate for experience level",
          },
          reps: {
            type: "string",
            description:
              "Range or number based on goals (e.g., '8-12' or '10')",
          },
          restTime: {
            type: "number",
            description: "Rest time in seconds optimized for goals",
          },
          notes: {
            type: "string",
            description: "Specific coaching cues and modifications",
          },
          intensity: {
            type: "string",
            description: "Intensity level or percentage",
          },
        },
        required: [
          "exerciseId",
          "sets",
          "reps",
          "restTime",
          "notes",
          "intensity",
        ],
        propertyOrdering: [
          "exerciseId",
          "sets",
          "reps",
          "restTime",
          "notes",
          "intensity",
        ],
      },
    },
    equipment: {
      type: "array",
      description: "Required equipment for the workout",
      items: { type: "string" },
    },
    targetMuscleGroups: {
      type: "array",
      description: "Primary muscle groups targeted",
      items: { type: "string" },
    },
  },
  required: [
    "title",
    "description",
    "category",
    "difficulty",
    "duration",
    "estimatedCalories",
    "exercises",
    "equipment",
    "targetMuscleGroups",
  ],
  propertyOrdering: [
    "title",
    "description",
    "category",
    "difficulty",
    "duration",
    "estimatedCalories",
    "exercises",
    "equipment",
    "targetMuscleGroups",
  ],
};
