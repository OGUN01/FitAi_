// Simplified Workout Schemas for Google Gemini Structured Output
// Reduced complexity to avoid API errors while maintaining essential structure

// ============================================================================
// SIMPLIFIED WEEKLY PLAN SCHEMA
// ============================================================================

export const SIMPLIFIED_WEEKLY_PLAN_SCHEMA = {
  type: "object",
  properties: {
    planTitle: {
      type: "string",
      description: "Weekly plan title"
    },
    planDescription: {
      type: "string",
      description: "Brief plan overview"
    },
    experienceLevel: {
      type: "string",
      enum: ["beginner", "intermediate", "advanced"]
    },
    workoutsPerWeek: {
      type: "number",
      description: "Number of workout days (3-6)"
    },
    workouts: {
      type: "array",
      description: "List of workouts",
      items: {
        type: "object",
        properties: {
          dayOfWeek: {
            type: "string",
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
          },
          title: {
            type: "string",
            description: "Workout title"
          },
          category: {
            type: "string",
            enum: ["strength", "cardio", "flexibility", "hiit", "hybrid"]
          },
          duration: {
            type: "number",
            description: "Duration in minutes"
          },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exerciseId: {
                  type: "string",
                  description: "Exercise ID from database (7 chars)"
                },
                name: {
                  type: "string"
                },
                sets: {
                  type: "number"
                },
                reps: {
                  type: "string"
                },
                restTime: {
                  type: "number"
                }
              },
              required: ["exerciseId", "name", "sets", "reps"]
            }
          }
        },
        required: ["dayOfWeek", "title", "category", "duration", "exercises"]
      }
    },
    restDays: {
      type: "array",
      items: { type: "string" },
      description: "Rest days (e.g., ['sunday', 'wednesday'])"
    }
  },
  required: ["planTitle", "workouts", "experienceLevel"]
};

// ============================================================================
// ULTRA SIMPLE TEST SCHEMA
// ============================================================================

export const TEST_SIMPLE_SCHEMA = {
  type: "object",
  properties: {
    success: {
      type: "boolean"
    },
    message: {
      type: "string"
    },
    workoutCount: {
      type: "number"
    }
  },
  required: ["success", "message", "workoutCount"]
};

// ============================================================================
// DIAGNOSTIC WORKOUT SCHEMA (Minimal for debugging)
// ============================================================================

export const DIAGNOSTIC_WORKOUT_SCHEMA = {
  type: "object", 
  properties: {
    planTitle: {
      type: "string",
      description: "Simple plan title"
    },
    experienceLevel: {
      type: "string",
      enum: ["beginner", "intermediate", "advanced"]
    },
    workouts: {
      type: "array",
      description: "Simple workout list",
      items: {
        type: "object",
        properties: {
          dayOfWeek: {
            type: "string"
          },
          title: {
            type: "string"
          },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                sets: { type: "number" },
                reps: { type: "string" }
              },
              required: ["name", "sets", "reps"]
            }
          }
        },
        required: ["dayOfWeek", "title", "exercises"]
      }
    }
  },
  required: ["planTitle", "experienceLevel", "workouts"]
};

// ============================================================================
// MINIMAL WORKOUT SCHEMA (For testing)
// ============================================================================

export const MINIMAL_WORKOUT_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string"
    },
    exercises: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string"
          },
          sets: {
            type: "number"
          },
          reps: {
            type: "number"
          }
        },
        required: ["name", "sets", "reps"]
      }
    }
  },
  required: ["title", "exercises"]
};