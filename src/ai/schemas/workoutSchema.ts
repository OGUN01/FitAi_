// Enhanced Workout Generation Schemas for Day-wise Weekly Plans
// Optimized for Google Gemini Structured Output with day assignment

// ============================================================================
// DAILY WORKOUT SCHEMA
// ============================================================================

export const DAILY_WORKOUT_SCHEMA = {
  type: "OBJECT",
  properties: {
    dayOfWeek: {
      type: "STRING",
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      description: "Specific day this workout is assigned to"
    },
    title: {
      type: "STRING", 
      description: "Personalized workout name including day context (e.g., 'Monday Power Strength')"
    },
    description: {
      type: "STRING",
      description: "Detailed description explaining workout purpose and how it fits in weekly plan"
    },
    category: {
      type: "STRING",
      enum: ["strength", "cardio", "flexibility", "hiit", "hybrid", "recovery"],
      description: "Primary workout category"
    },
    subCategory: {
      type: "STRING",
      description: "Specific focus (e.g., 'upper_body', 'legs', 'full_body', 'interval_training')"
    },
    difficulty: {
      type: "STRING",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Difficulty level appropriate for user experience"
    },
    duration: {
      type: "NUMBER",
      description: "Total workout duration in minutes including warm-up and cool-down"
    },
    estimatedCalories: {
      type: "NUMBER",
      description: "Estimated calories burned based on user profile and exercise intensity"
    },
    intensityLevel: {
      type: "STRING",
      enum: ["low", "moderate", "high", "variable"],
      description: "Overall workout intensity"
    },
    exercises: {
      type: "ARRAY",
      description: "Detailed exercise list with proper progression",
      items: {
        type: "OBJECT",
        properties: {
          name: {
            type: "STRING",
            description: "Specific exercise name (e.g., 'Push-ups', 'Squats', 'Plank')"
          },
          description: {
            type: "STRING",
            description: "Brief description of the exercise movement"
          },
          muscleGroups: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Primary muscle groups targeted"
          },
          equipment: {
            type: "ARRAY", 
            items: { type: "STRING" },
            description: "Equipment needed for this exercise"
          },
          sets: {
            type: "NUMBER",
            description: "Number of sets"
          },
          reps: {
            type: "STRING",
            description: "Reps per set (e.g., '8-12', '10', '30 seconds')"
          },
          weight: {
            type: "STRING",
            description: "Weight recommendation (e.g., 'bodyweight', '70% 1RM', '5-10kg')"
          },
          restTime: {
            type: "NUMBER",
            description: "Rest time between sets in seconds"
          },
          instructions: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Step-by-step exercise instructions"
          },
          tips: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Form tips and coaching cues"
          },
          modifications: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Easier and harder variations"
          },
          tempo: {
            type: "STRING",
            description: "Movement tempo (e.g., '2-1-2-1' for eccentric-pause-concentric-pause)"
          }
        },
        required: [
          "name", "description", "muscleGroups", "equipment", "sets", 
          "reps", "weight", "restTime", "instructions", "tips", "modifications"
        ],
        propertyOrdering: [
          "name", "description", "muscleGroups", "equipment", "sets", "reps", 
          "weight", "restTime", "instructions", "tips", "modifications", "tempo"
        ]
      }
    },
    warmUp: {
      type: "ARRAY",
      description: "Specific warm-up exercises for this workout",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          duration: { type: "NUMBER", description: "Duration in seconds" },
          instructions: { type: "STRING" }
        },
        required: ["name", "duration", "instructions"]
      }
    },
    coolDown: {
      type: "ARRAY",
      description: "Specific cool-down and stretching exercises",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          duration: { type: "NUMBER", description: "Duration in seconds" },
          instructions: { type: "STRING" }
        },
        required: ["name", "duration", "instructions"]
      }
    },
    equipment: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "All equipment needed for the entire workout"
    },
    targetMuscleGroups: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Primary and secondary muscle groups targeted"
    },
    progressionNotes: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "How to progress this workout over time"
    },
    safetyConsiderations: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Important safety notes and contraindications"
    },
    expectedBenefits: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "What benefits this workout provides"
    }
  },
  required: [
    "dayOfWeek", "title", "description", "category", "subCategory", "difficulty", 
    "duration", "estimatedCalories", "intensityLevel", "exercises", "warmUp", 
    "coolDown", "equipment", "targetMuscleGroups", "progressionNotes"
  ],
  propertyOrdering: [
    "dayOfWeek", "title", "description", "category", "subCategory", "difficulty",
    "duration", "estimatedCalories", "intensityLevel", "exercises", "warmUp",
    "coolDown", "equipment", "targetMuscleGroups", "progressionNotes", 
    "safetyConsiderations", "expectedBenefits"
  ]
};

// ============================================================================
// WEEKLY WORKOUT PLAN SCHEMA
// ============================================================================

export const WEEKLY_PLAN_SCHEMA = {
  type: "OBJECT",
  properties: {
    planTitle: {
      type: "STRING",
      description: "Overall plan name (e.g., 'Beginner Strength & Cardio Week 1')"
    },
    planDescription: {
      type: "STRING",
      description: "Brief overview of the weekly plan strategy and goals (max 200 characters)"
    },
    experienceLevel: {
      type: "STRING",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Target experience level"
    },
    totalDuration: {
      type: "STRING",
      description: "Plan duration (e.g., '1 week', '1.5 weeks', '2 weeks')"
    },
    workoutsPerWeek: {
      type: "NUMBER",
      description: "Total number of workout days"
    },
    weeklyGoals: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Primary fitness goals this week addresses (max 3 goals)"
    },
    workouts: {
      type: "ARRAY",
      description: "All workouts in the plan with day assignments (simplified structure)",
      items: {
        type: "OBJECT",
        properties: {
          dayOfWeek: {
            type: "STRING",
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            description: "Specific day this workout is assigned to"
          },
          title: {
            type: "STRING", 
            description: "Workout name (max 50 characters)"
          },
          description: {
            type: "STRING",
            description: "Brief workout description (max 150 characters)"
          },
          category: {
            type: "STRING",
            enum: ["strength", "cardio", "flexibility", "hiit", "hybrid"],
            description: "Primary workout category"
          },
          duration: {
            type: "NUMBER",
            description: "Total workout duration in minutes"
          },
          estimatedCalories: {
            type: "NUMBER",
            description: "Estimated calories burned"
          },
          equipment: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Required equipment (max 5 items)"
          },
          targetMuscleGroups: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Primary muscle groups targeted (max 4 groups)"
          },
          exercises: {
            type: "ARRAY",
            description: "Exercise list (simplified)",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "Exercise name" },
                sets: { type: "NUMBER", description: "Number of sets" },
                reps: { type: "STRING", description: "Reps per set" },
                restTime: { type: "NUMBER", description: "Rest time in seconds" }
              },
              required: ["name", "sets", "reps", "restTime"]
            }
          }
        },
        required: ["dayOfWeek", "title", "description", "category", "duration", "estimatedCalories", "equipment", "targetMuscleGroups", "exercises"]
      }
    },
    restDays: {
      type: "ARRAY",
      items: { 
        type: "STRING",
        enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
      },
      description: "Designated rest days"
    },
    estimatedWeeklyCalories: {
      type: "NUMBER",
      description: "Total estimated calories burned for the week"
    }
  },
  required: [
    "planTitle", "planDescription", "experienceLevel", "totalDuration", 
    "workoutsPerWeek", "weeklyGoals", "workouts", "restDays", 
    "estimatedWeeklyCalories"
  ]
};

// ============================================================================
// EXERCISE DATABASE SCHEMA (for exercise generation)
// ============================================================================

export const EXERCISE_GENERATION_SCHEMA = {
  type: "OBJECT",
  properties: {
    exercises: {
      type: "ARRAY",
      description: "Database of exercises with complete information",
      items: {
        type: "OBJECT",
        properties: {
          id: {
            type: "STRING",
            description: "Unique exercise identifier"
          },
          name: {
            type: "STRING",
            description: "Exercise name"
          },
          description: {
            type: "STRING",
            description: "What the exercise does and why it's beneficial"
          },
          category: {
            type: "STRING",
            enum: ["strength", "cardio", "flexibility", "balance", "plyometric"],
            description: "Exercise category"
          },
          primaryMuscles: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Primary muscles worked"
          },
          secondaryMuscles: {
            type: "ARRAY", 
            items: { type: "STRING" },
            description: "Secondary muscles worked"
          },
          equipment: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Required equipment"
          },
          difficulty: {
            type: "STRING",
            enum: ["beginner", "intermediate", "advanced"],
            description: "Exercise difficulty level"
          },
          instructions: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Step-by-step instructions"
          },
          commonMistakes: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Common form mistakes to avoid"
          },
          progressions: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "How to make the exercise harder"
          },
          regressions: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "How to make the exercise easier"
          },
          safetyNotes: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Important safety considerations"
          }
        },
        required: [
          "id", "name", "description", "category", "primaryMuscles", 
          "equipment", "difficulty", "instructions"
        ]
      }
    }
  },
  required: ["exercises"]
};