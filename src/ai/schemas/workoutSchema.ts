// Enhanced Workout Generation Schemas for Day-wise Weekly Plans
// Optimized for Google Gemini Structured Output with day assignment

// ============================================================================
// DAILY WORKOUT SCHEMA
// ============================================================================

export const DAILY_WORKOUT_SCHEMA = {
  type: 'object',
  properties: {
    dayOfWeek: {
      type: 'string',
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      description: 'Specific day this workout is assigned to',
    },
    title: {
      type: 'string',
      description:
        "Personalized workout name including day context (e.g., 'Monday Power Strength')",
    },
    description: {
      type: 'string',
      description: 'Detailed description explaining workout purpose and how it fits in weekly plan',
    },
    category: {
      type: 'string',
      enum: ['strength', 'cardio', 'flexibility', 'hiit', 'hybrid', 'recovery'],
      description: 'Primary workout category',
    },
    subCategory: {
      type: 'string',
      description: "Specific focus (e.g., 'upper_body', 'legs', 'full_body', 'interval_training')",
    },
    difficulty: {
      type: 'string',
      enum: ['beginner', 'intermediate', 'advanced'],
      description: 'Difficulty level appropriate for user experience',
    },
    duration: {
      type: 'number',
      description: 'Total workout duration in minutes including warm-up and cool-down',
    },
    estimatedCalories: {
      type: 'number',
      description: 'Estimated calories burned based on user profile and exercise intensity',
    },
    intensityLevel: {
      type: 'string',
      enum: ['low', 'moderate', 'high', 'variable'],
      description: 'Overall workout intensity',
    },
    exercises: {
      type: 'array',
      description: 'Detailed exercise list with proper progression',
      items: {
        type: 'object',
        properties: {
          exerciseId: {
            type: 'string',
            pattern: '^[A-Za-z0-9]*[A-Z][A-Za-z0-9]*$',
            description:
              "🚨 MANDATORY: Exact 7-character alphanumeric exercise ID from the provided exercise database (e.g., 'VPPtusI', '8d8qJQI'). Must contain at least one uppercase letter. DO NOT create new IDs or use descriptive names like 'push_ups' or 'dynamic_elevators'. MUST be from the provided exercise list only.",
          },
          name: {
            type: 'string',
            description:
              "Display name for the exercise - can be creative (e.g., 'Power Push-ups', 'Core Crusher Squats')",
          },
          description: {
            type: 'string',
            description: 'Brief description of the exercise movement',
          },
          muscleGroups: {
            type: 'array',
            items: { type: 'string' },
            description: 'Primary muscle groups targeted',
          },
          equipment: {
            type: 'array',
            items: { type: 'string' },
            description: 'Equipment needed for this exercise',
          },
          sets: {
            type: 'number',
            description: 'Number of sets',
          },
          reps: {
            type: 'string',
            description: "Reps per set (e.g., '8-12', '10', '30 seconds')",
          },
          weight: {
            type: 'string',
            description: "Weight recommendation (e.g., 'bodyweight', '70% 1RM', '5-10kg')",
          },
          restTime: {
            type: 'number',
            description: 'Rest time between sets in seconds',
          },
          instructions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Step-by-step exercise instructions',
          },
          tips: {
            type: 'array',
            items: { type: 'string' },
            description: 'Form tips and coaching cues',
          },
          modifications: {
            type: 'array',
            items: { type: 'string' },
            description: 'Easier and harder variations',
          },
          tempo: {
            type: 'string',
            description: "Movement tempo (e.g., '2-1-2-1' for eccentric-pause-concentric-pause)",
          },
        },
        required: [
          'exerciseId',
          'name',
          'description',
          'muscleGroups',
          'equipment',
          'sets',
          'reps',
          'weight',
          'restTime',
          'instructions',
          'tips',
          'modifications',
        ],
        propertyOrdering: [
          'name',
          'description',
          'muscleGroups',
          'equipment',
          'sets',
          'reps',
          'weight',
          'restTime',
          'instructions',
          'tips',
          'modifications',
          'tempo',
        ],
      },
    },
    warmUp: {
      type: 'array',
      description: 'Specific warm-up exercises for this workout',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          duration: { type: 'number', description: 'Duration in seconds' },
          instructions: { type: 'string' },
        },
        required: ['name', 'duration', 'instructions'],
      },
    },
    coolDown: {
      type: 'array',
      description: 'Specific cool-down and stretching exercises',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          duration: { type: 'number', description: 'Duration in seconds' },
          instructions: { type: 'string' },
        },
        required: ['name', 'duration', 'instructions'],
      },
    },
    equipment: {
      type: 'array',
      items: { type: 'string' },
      description: 'All equipment needed for the entire workout',
    },
    targetMuscleGroups: {
      type: 'array',
      items: { type: 'string' },
      description: 'Primary and secondary muscle groups targeted',
    },
    progressionNotes: {
      type: 'array',
      items: { type: 'string' },
      description: 'How to progress this workout over time',
    },
    safetyConsiderations: {
      type: 'array',
      items: { type: 'string' },
      description: 'Important safety notes and contraindications',
    },
    expectedBenefits: {
      type: 'array',
      items: { type: 'string' },
      description: 'What benefits this workout provides',
    },
  },
  required: [
    'dayOfWeek',
    'title',
    'description',
    'category',
    'subCategory',
    'difficulty',
    'duration',
    'estimatedCalories',
    'intensityLevel',
    'exercises',
    'warmUp',
    'coolDown',
    'equipment',
    'targetMuscleGroups',
    'progressionNotes',
  ],
  propertyOrdering: [
    'dayOfWeek',
    'title',
    'description',
    'category',
    'subCategory',
    'difficulty',
    'duration',
    'estimatedCalories',
    'intensityLevel',
    'exercises',
    'warmUp',
    'coolDown',
    'equipment',
    'targetMuscleGroups',
    'progressionNotes',
    'safetyConsiderations',
    'expectedBenefits',
  ],
};

// ============================================================================
// WEEKLY WORKOUT PLAN SCHEMA
// ============================================================================

export const WEEKLY_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    planTitle: {
      type: 'string',
      description: "Overall plan name (e.g., 'Beginner Strength & Cardio Week 1')",
    },
    planDescription: {
      type: 'string',
      description: 'Brief overview of the weekly plan strategy and goals (max 200 characters)',
    },
    experienceLevel: {
      type: 'string',
      enum: ['beginner', 'intermediate', 'advanced'],
      description: 'Target experience level',
    },
    totalDuration: {
      type: 'string',
      description: "Plan duration (e.g., '1 week', '1.5 weeks', '2 weeks')",
    },
    workoutsPerWeek: {
      type: 'number',
      description: 'Total number of workout days',
    },
    weeklyGoals: {
      type: 'array',
      items: { type: 'string' },
      description: 'Primary fitness goals this week addresses (max 3 goals)',
    },
    workouts: {
      type: 'array',
      description: 'All workouts in the plan with day assignments (simplified structure)',
      items: {
        type: 'object',
        properties: {
          dayOfWeek: {
            type: 'string',
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
            description: 'Specific day this workout is assigned to',
          },
          title: {
            type: 'string',
            description: 'Workout name (max 50 characters)',
          },
          description: {
            type: 'string',
            description: 'Brief workout description (max 150 characters)',
          },
          category: {
            type: 'string',
            enum: ['strength', 'cardio', 'flexibility', 'hiit', 'hybrid'],
            description: 'Primary workout category',
          },
          duration: {
            type: 'number',
            description: 'Total workout duration in minutes',
          },
          estimatedCalories: {
            type: 'number',
            description: 'Estimated calories burned',
          },
          equipment: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required equipment (max 5 items)',
          },
          targetMuscleGroups: {
            type: 'array',
            items: { type: 'string' },
            description: 'Primary muscle groups targeted (max 4 groups)',
          },
          exercises: {
            type: 'array',
            description: 'Exercise list (simplified)',
            items: {
              type: 'object',
              properties: {
                exerciseId: {
                  type: 'string',
                  pattern: '^[A-Za-z0-9]*[A-Z][A-Za-z0-9]*$',
                  description:
                    "🚨 CRITICAL: Must be exact 7-character database ID from provided exercise list (format: alphanumeric like 'VPPtusI'). Must contain at least one uppercase letter. Never use descriptive names like 'mountain_climbers' or 'dynamic_elevators'. Copy exact ID from exercise database.",
                },
                name: {
                  type: 'string',
                  description: 'Display name for the exercise (can be creative)',
                },
                sets: { type: 'number', description: 'Number of sets' },
                reps: { type: 'string', description: 'Reps per set' },
                restTime: { type: 'number', description: 'Rest time in seconds' },
                notes: { type: 'string', description: 'Additional notes or modifications' },
              },
              required: ['exerciseId', 'name', 'sets', 'reps', 'restTime'],
            },
          },
        },
        required: [
          'dayOfWeek',
          'title',
          'description',
          'category',
          'duration',
          'estimatedCalories',
          'equipment',
          'targetMuscleGroups',
          'exercises',
        ],
      },
    },
    restDays: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      },
      description: 'Designated rest days',
    },
    estimatedWeeklyCalories: {
      type: 'number',
      description: 'Total estimated calories burned for the week',
    },
  },
  required: [
    'planTitle',
    'planDescription',
    'experienceLevel',
    'totalDuration',
    'workoutsPerWeek',
    'weeklyGoals',
    'workouts',
    'restDays',
    'estimatedWeeklyCalories',
  ],
};

// ============================================================================
// EXERCISE DATABASE SCHEMA (for exercise generation)
// ============================================================================

export const EXERCISE_GENERATION_SCHEMA = {
  type: 'object',
  properties: {
    exercises: {
      type: 'array',
      description: 'Database of exercises with complete information',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique exercise identifier',
          },
          name: {
            type: 'string',
            description: 'Exercise name',
          },
          description: {
            type: 'string',
            description: "What the exercise does and why it's beneficial",
          },
          category: {
            type: 'string',
            enum: ['strength', 'cardio', 'flexibility', 'balance', 'plyometric'],
            description: 'Exercise category',
          },
          primaryMuscles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Primary muscles worked',
          },
          secondaryMuscles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Secondary muscles worked',
          },
          equipment: {
            type: 'array',
            items: { type: 'string' },
            description: 'Required equipment',
          },
          difficulty: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced'],
            description: 'Exercise difficulty level',
          },
          instructions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Step-by-step instructions',
          },
          commonMistakes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Common form mistakes to avoid',
          },
          progressions: {
            type: 'array',
            items: { type: 'string' },
            description: 'How to make the exercise harder',
          },
          regressions: {
            type: 'array',
            items: { type: 'string' },
            description: 'How to make the exercise easier',
          },
          safetyNotes: {
            type: 'array',
            items: { type: 'string' },
            description: 'Important safety considerations',
          },
        },
        required: [
          'id',
          'name',
          'description',
          'category',
          'primaryMuscles',
          'equipment',
          'difficulty',
          'instructions',
        ],
      },
    },
  },
  required: ['exercises'],
};
