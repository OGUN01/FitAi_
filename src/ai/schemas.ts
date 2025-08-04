// AI Response Schemas for Google Gemini Structured Output
// This file defines JSON schemas for 100% reliable AI responses
// Using OpenAPI 3.0 schema format compatible with Gemini API

// ============================================================================
// WORKOUT GENERATION SCHEMA
// ============================================================================

export const WORKOUT_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Personalized workout name reflecting user goals"
    },
    description: {
      type: "string",
      description: "Detailed description explaining the workout's purpose and benefits"
    },
    category: {
      type: "string",
      enum: ["strength", "cardio", "flexibility", "hiit", "hybrid"],
      description: "Workout category"
    },
    difficulty: {
      type: "string",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Difficulty level appropriate for user"
    },
    duration: {
      type: "number",
      description: "Workout duration in minutes"
    },
    estimatedCalories: {
      type: "number",
      description: "Estimated calories burned based on user profile"
    },
    exercises: {
      type: "array",
      description: "List of exercises in the workout",
      items: {
        type: "object",
        properties: {
          exerciseId: {
            type: "string",
            description: "Specific exercise identifier"
          },
          sets: {
            type: "number",
            description: "Number of sets appropriate for experience level"
          },
          reps: {
            type: "string",
            description: "Range or number based on goals (e.g., '8-12' or '10')"
          },
          restTime: {
            type: "number",
            description: "Rest time in seconds optimized for goals"
          },
          notes: {
            type: "string",
            description: "Specific coaching cues and modifications"
          },
          intensity: {
            type: "string",
            description: "Intensity level or percentage"
          }
        },
        required: ["exerciseId", "sets", "reps", "restTime", "notes", "intensity"],
        propertyOrdering: ["exerciseId", "sets", "reps", "restTime", "notes", "intensity"]
      }
    },
    equipment: {
      type: "array",
      description: "Required equipment for the workout",
      items: { type: "string" }
    },
    targetMuscleGroups: {
      type: "array",
      description: "Primary muscle groups targeted",
      items: { type: "string" }
    }
  },
  required: [
    "title", "description", "category", "difficulty", "duration", 
    "estimatedCalories", "exercises", "equipment", "targetMuscleGroups"
  ],
  propertyOrdering: [
    "title", "description", "category", "difficulty", "duration", "estimatedCalories",
    "exercises", "equipment", "targetMuscleGroups"
  ]
};

// ============================================================================
// NUTRITION ANALYSIS SCHEMA
// ============================================================================

export const NUTRITION_SCHEMA = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      description: "Daily meal plan",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"],
            description: "Meal type"
          },
          name: {
            type: "string",
            description: "Scientifically-crafted meal name"
          },
          description: {
            type: "string",
            description: "Nutritional rationale and benefits"
          },
          items: {
            type: "array",
            description: "Food items in the meal",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Specific food item"
                },
                quantity: {
                  type: "number",
                  description: "Precise amount"
                },
                unit: {
                  type: "string",
                  enum: ["g", "ml", "piece", "cup", "tbsp", "tsp", "oz"],
                  description: "Unit of measurement"
                },
                calories: {
                  type: "number",
                  description: "Accurate calories"
                },
                protein: {
                  type: "number",
                  description: "Grams of protein"
                },
                carbohydrates: {
                  type: "number",
                  description: "Grams of carbohydrates"
                },
                fat: {
                  type: "number",
                  description: "Grams of fat"
                }
              },
              required: ["name", "quantity", "unit", "calories", "protein", "carbohydrates", "fat"],
              propertyOrdering: ["name", "quantity", "unit", "calories", "protein", "carbohydrates", "fat"]
            }
          },
          totalCalories: {
            type: "number",
            description: "Total calories for the meal"
          },
          totalProtein: {
            type: "number",
            description: "Total protein for the meal"
          },
          totalCarbohydrates: {
            type: "number",
            description: "Total carbohydrates for the meal"
          },
          totalFat: {
            type: "number",
            description: "Total fat for the meal"
          }
        },
        required: ["type", "name", "description", "items", "totalCalories", "totalProtein", "totalCarbohydrates", "totalFat"],
        propertyOrdering: ["type", "name", "description", "items", "totalCalories", "totalProtein", "totalCarbohydrates", "totalFat"]
      }
    },
    dailyTotals: {
      type: "object",
      properties: {
        calories: { type: "number" },
        protein: { type: "number" },
        carbohydrates: { type: "number" },
        fat: { type: "number" }
      },
      required: ["calories", "protein", "carbohydrates", "fat"],
      propertyOrdering: ["calories", "protein", "carbohydrates", "fat"]
    },
    nutritionalInsights: {
      type: "array",
      description: "Key nutritional insights and recommendations",
      items: { type: "string" }
    }
  },
  required: ["meals", "dailyTotals", "nutritionalInsights"],
  propertyOrdering: ["meals", "dailyTotals", "nutritionalInsights"]
};

// ============================================================================
// WEEKLY MEAL PLAN SCHEMA
// ============================================================================

// ULTRA-SIMPLIFIED schema for testing JSON parsing - minimal data to avoid truncation
export const WEEKLY_MEAL_PLAN_SCHEMA = {
  type: "object",
  properties: {
    planTitle: {
      type: "string",
      description: "Personalized weekly meal plan title"
    },
    planDescription: {
      type: "string",
      description: "Brief description of the meal plan approach"
    },
    totalEstimatedCalories: {
      type: "number",
      description: "Total estimated calories for the week"
    },
    dietaryRestrictions: {
      type: "array",
      description: "List of dietary restrictions considered",
      items: { type: "string" }
    },
    weeklyGoals: {
      type: "array",
      description: "Weekly nutrition and fitness goals",
      items: { type: "string" }
    },
    meals: {
      type: "array",
      description: "Complete 7-day meal plan with breakfast, lunch, and dinner for each day",
      items: {
        type: "object",
        properties: {
          dayOfWeek: {
            type: "string",
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            description: "Day of the week"
          },
          type: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Meal type"
          },
          name: {
            type: "string",
            description: "Meal name"
          },
          description: {
            type: "string",
            description: "Meal description and benefits"
          },
          items: {
            type: "array",
            description: "Food items in the meal with complete nutritional information",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Food item name"
                },
                quantity: {
                  type: "number",
                  description: "Quantity amount"
                },
                unit: {
                  type: "string",
                  description: "Unit of measurement"
                },
                calories: {
                  type: "number",
                  description: "Calories for this item"
                },
                macros: {
                  type: "object",
                  properties: {
                    protein: { type: "number" },
                    carbohydrates: { type: "number" },
                    fat: { type: "number" },
                    fiber: { type: "number" }
                  },
                  required: ["protein", "carbohydrates", "fat", "fiber"]
                },
                category: {
                  type: "string",
                  description: "Food category"
                },
                preparationTime: {
                  type: "number",
                  description: "Preparation time in minutes"
                }
              },
              required: ["name", "quantity", "unit", "calories", "macros", "category", "preparationTime"],
              propertyOrdering: ["name", "quantity", "unit", "calories", "macros", "category", "preparationTime"]
            }
          },
          totalCalories: {
            type: "number",
            description: "Total calories for the meal"
          },
          totalMacros: {
            type: "object",
            properties: {
              protein: { type: "number" },
              carbohydrates: { type: "number" },
              fat: { type: "number" },
              fiber: { type: "number" }
            },
            required: ["protein", "carbohydrates", "fat", "fiber"]
          },
          preparationTime: {
            type: "number",
            description: "Total preparation time in minutes"
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
            description: "Cooking difficulty level"
          },
          tags: {
            type: "array",
            description: "Meal tags",
            items: { type: "string" }
          }
        },
        required: ["dayOfWeek", "type", "name", "description", "items", "totalCalories", "totalMacros", "preparationTime", "difficulty", "tags"],
        propertyOrdering: ["dayOfWeek", "type", "name", "description", "items", "totalCalories", "totalMacros", "preparationTime", "difficulty", "tags"]
      }
    }
  },
  required: ["planTitle", "planDescription", "totalEstimatedCalories", "dietaryRestrictions", "weeklyGoals", "meals"],
  propertyOrdering: ["planTitle", "planDescription", "totalEstimatedCalories", "dietaryRestrictions", "weeklyGoals", "meals"]
};

// ============================================================================
// MOTIVATIONAL CONTENT SCHEMA
// ============================================================================

export const MOTIVATIONAL_CONTENT_SCHEMA = {
  type: "object",
  properties: {
    dailyTip: {
      type: "string",
      description: "Practical fitness tip for the day"
    },
    encouragement: {
      type: "string",
      description: "Personalized motivational message"
    },
    challenge: {
      type: "object",
      description: "Daily or weekly challenge",
      properties: {
        title: {
          type: "string",
          description: "Challenge name"
        },
        description: {
          type: "string",
          description: "What the user needs to do"
        },
        reward: {
          type: "string",
          description: "What they'll gain from completing it"
        },
        duration: {
          type: "number",
          description: "Duration in days"
        }
      },
      required: ["title", "description", "reward", "duration"],
      propertyOrdering: ["title", "description", "reward", "duration"]
    },
    quote: {
      type: "string",
      description: "Inspirational quote"
    },
    factOfTheDay: {
      type: "string",
      description: "Interesting fitness or health fact"
    }
  },
  required: ["dailyTip", "encouragement", "challenge", "quote", "factOfTheDay"],
  propertyOrdering: ["dailyTip", "encouragement", "challenge", "quote", "factOfTheDay"]
};

// ============================================================================
// FOOD ANALYSIS SCHEMA
// ============================================================================

export const FOOD_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Identified food name"
    },
    category: {
      type: "string",
      enum: ["protein", "carbohydrate", "vegetable", "fruit", "dairy", "fat", "beverage", "snack", "grain"],
      description: "Food category"
    },
    calories: {
      type: "number",
      description: "Calories per serving"
    },
    macros: {
      type: "object",
      properties: {
        protein: { type: "number" },
        carbohydrates: { type: "number" },
        fat: { type: "number" },
        fiber: { type: "number" }
      },
      required: ["protein", "carbohydrates", "fat", "fiber"],
      propertyOrdering: ["protein", "carbohydrates", "fat", "fiber"]
    },
    servingSize: {
      type: "number",
      description: "Standard serving size"
    },
    servingUnit: {
      type: "string",
      enum: ["g", "ml", "piece", "cup", "tbsp", "tsp", "oz"],
      description: "Unit for serving size"
    }
  },
  required: ["name", "category", "calories", "macros", "servingSize", "servingUnit"],
  propertyOrdering: ["name", "category", "calories", "macros", "servingSize", "servingUnit"]
};

// ============================================================================
// PROGRESS ANALYSIS SCHEMA
// ============================================================================

export const PROGRESS_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    insights: {
      type: "array",
      description: "Key insights from progress analysis",
      items: { type: "string" }
    },
    recommendations: {
      type: "array",
      description: "Actionable recommendations for improvement",
      items: { type: "string" }
    },
    motivationalMessage: {
      type: "string",
      description: "Encouraging message based on progress"
    }
  },
  required: ["insights", "recommendations", "motivationalMessage"],
  propertyOrdering: ["insights", "recommendations", "motivationalMessage"]
};
