// AI Response Schemas for Google Gemini Structured Output
// This file defines JSON schemas for 100% reliable AI responses
// Using OpenAPI 3.0 schema format compatible with Gemini API

// ============================================================================
// WORKOUT GENERATION SCHEMA
// ============================================================================

export const WORKOUT_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: {
      type: "STRING",
      description: "Personalized workout name reflecting user goals"
    },
    description: {
      type: "STRING",
      description: "Detailed description explaining the workout's purpose and benefits"
    },
    category: {
      type: "STRING",
      enum: ["strength", "cardio", "flexibility", "hiit", "hybrid"],
      description: "Workout category"
    },
    difficulty: {
      type: "STRING",
      enum: ["beginner", "intermediate", "advanced"],
      description: "Difficulty level appropriate for user"
    },
    duration: {
      type: "NUMBER",
      description: "Workout duration in minutes"
    },
    estimatedCalories: {
      type: "NUMBER",
      description: "Estimated calories burned based on user profile"
    },
    exercises: {
      type: "ARRAY",
      description: "List of exercises in the workout",
      items: {
        type: "OBJECT",
        properties: {
          exerciseId: {
            type: "STRING",
            description: "Specific exercise identifier"
          },
          sets: {
            type: "NUMBER",
            description: "Number of sets appropriate for experience level"
          },
          reps: {
            type: "STRING",
            description: "Range or number based on goals (e.g., '8-12' or '10')"
          },
          restTime: {
            type: "NUMBER",
            description: "Rest time in seconds optimized for goals"
          },
          notes: {
            type: "STRING",
            description: "Specific coaching cues and modifications"
          },
          intensity: {
            type: "STRING",
            description: "Intensity level or percentage"
          }
        },
        required: ["exerciseId", "sets", "reps", "restTime", "notes", "intensity"],
        propertyOrdering: ["exerciseId", "sets", "reps", "restTime", "notes", "intensity"]
      }
    },
    equipment: {
      type: "ARRAY",
      description: "Required equipment for the workout",
      items: { type: "STRING" }
    },
    targetMuscleGroups: {
      type: "ARRAY",
      description: "Primary muscle groups targeted",
      items: { type: "STRING" }
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
  type: "OBJECT",
  properties: {
    meals: {
      type: "ARRAY",
      description: "Daily meal plan",
      items: {
        type: "OBJECT",
        properties: {
          type: {
            type: "STRING",
            enum: ["breakfast", "lunch", "dinner", "snack", "pre_workout", "post_workout"],
            description: "Meal type"
          },
          name: {
            type: "STRING",
            description: "Scientifically-crafted meal name"
          },
          description: {
            type: "STRING",
            description: "Nutritional rationale and benefits"
          },
          items: {
            type: "ARRAY",
            description: "Food items in the meal",
            items: {
              type: "OBJECT",
              properties: {
                name: {
                  type: "STRING",
                  description: "Specific food item"
                },
                quantity: {
                  type: "NUMBER",
                  description: "Precise amount"
                },
                unit: {
                  type: "STRING",
                  enum: ["g", "ml", "piece", "cup", "tbsp", "tsp", "oz"],
                  description: "Unit of measurement"
                },
                calories: {
                  type: "NUMBER",
                  description: "Accurate calories"
                },
                protein: {
                  type: "NUMBER",
                  description: "Grams of protein"
                },
                carbohydrates: {
                  type: "NUMBER",
                  description: "Grams of carbohydrates"
                },
                fat: {
                  type: "NUMBER",
                  description: "Grams of fat"
                }
              },
              required: ["name", "quantity", "unit", "calories", "protein", "carbohydrates", "fat"],
              propertyOrdering: ["name", "quantity", "unit", "calories", "protein", "carbohydrates", "fat"]
            }
          },
          totalCalories: {
            type: "NUMBER",
            description: "Total calories for the meal"
          },
          totalProtein: {
            type: "NUMBER",
            description: "Total protein for the meal"
          },
          totalCarbohydrates: {
            type: "NUMBER",
            description: "Total carbohydrates for the meal"
          },
          totalFat: {
            type: "NUMBER",
            description: "Total fat for the meal"
          }
        },
        required: ["type", "name", "description", "items", "totalCalories", "totalProtein", "totalCarbohydrates", "totalFat"],
        propertyOrdering: ["type", "name", "description", "items", "totalCalories", "totalProtein", "totalCarbohydrates", "totalFat"]
      }
    },
    dailyTotals: {
      type: "OBJECT",
      properties: {
        calories: { type: "NUMBER" },
        protein: { type: "NUMBER" },
        carbohydrates: { type: "NUMBER" },
        fat: { type: "NUMBER" }
      },
      required: ["calories", "protein", "carbohydrates", "fat"],
      propertyOrdering: ["calories", "protein", "carbohydrates", "fat"]
    },
    nutritionalInsights: {
      type: "ARRAY",
      description: "Key nutritional insights and recommendations",
      items: { type: "STRING" }
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
  type: "OBJECT",
  properties: {
    planTitle: {
      type: "STRING",
      description: "Personalized weekly meal plan title"
    },
    planDescription: {
      type: "STRING",
      description: "Brief description of the meal plan approach"
    },
    totalEstimatedCalories: {
      type: "NUMBER",
      description: "Total estimated calories for the week"
    },
    dietaryRestrictions: {
      type: "ARRAY",
      description: "List of dietary restrictions considered",
      items: { type: "STRING" }
    },
    weeklyGoals: {
      type: "ARRAY",
      description: "Weekly nutrition and fitness goals",
      items: { type: "STRING" }
    },
    meals: {
      type: "ARRAY",
      description: "Complete 7-day meal plan with breakfast, lunch, and dinner for each day",
      items: {
        type: "OBJECT",
        properties: {
          dayOfWeek: {
            type: "STRING",
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
            description: "Day of the week"
          },
          type: {
            type: "STRING",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Meal type"
          },
          name: {
            type: "STRING",
            description: "Meal name"
          },
          description: {
            type: "STRING",
            description: "Meal description and benefits"
          },
          items: {
            type: "ARRAY",
            description: "Food items in the meal with complete nutritional information",
            items: {
              type: "OBJECT",
              properties: {
                name: {
                  type: "STRING",
                  description: "Food item name"
                },
                quantity: {
                  type: "NUMBER",
                  description: "Quantity amount"
                },
                unit: {
                  type: "STRING",
                  description: "Unit of measurement"
                },
                calories: {
                  type: "NUMBER",
                  description: "Calories for this item"
                },
                macros: {
                  type: "OBJECT",
                  properties: {
                    protein: { type: "NUMBER" },
                    carbohydrates: { type: "NUMBER" },
                    fat: { type: "NUMBER" },
                    fiber: { type: "NUMBER" }
                  },
                  required: ["protein", "carbohydrates", "fat", "fiber"]
                },
                category: {
                  type: "STRING",
                  description: "Food category"
                },
                preparationTime: {
                  type: "NUMBER",
                  description: "Preparation time in minutes"
                }
              },
              required: ["name", "quantity", "unit", "calories", "macros", "category", "preparationTime"],
              propertyOrdering: ["name", "quantity", "unit", "calories", "macros", "category", "preparationTime"]
            }
          },
          totalCalories: {
            type: "NUMBER",
            description: "Total calories for the meal"
          },
          totalMacros: {
            type: "OBJECT",
            properties: {
              protein: { type: "NUMBER" },
              carbohydrates: { type: "NUMBER" },
              fat: { type: "NUMBER" },
              fiber: { type: "NUMBER" }
            },
            required: ["protein", "carbohydrates", "fat", "fiber"]
          },
          preparationTime: {
            type: "NUMBER",
            description: "Total preparation time in minutes"
          },
          difficulty: {
            type: "STRING",
            enum: ["easy", "medium", "hard"],
            description: "Cooking difficulty level"
          },
          tags: {
            type: "ARRAY",
            description: "Meal tags",
            items: { type: "STRING" }
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
  type: "OBJECT",
  properties: {
    dailyTip: {
      type: "STRING",
      description: "Practical fitness tip for the day"
    },
    encouragement: {
      type: "STRING",
      description: "Personalized motivational message"
    },
    challenge: {
      type: "OBJECT",
      description: "Daily or weekly challenge",
      properties: {
        title: {
          type: "STRING",
          description: "Challenge name"
        },
        description: {
          type: "STRING",
          description: "What the user needs to do"
        },
        reward: {
          type: "STRING",
          description: "What they'll gain from completing it"
        },
        duration: {
          type: "NUMBER",
          description: "Duration in days"
        }
      },
      required: ["title", "description", "reward", "duration"],
      propertyOrdering: ["title", "description", "reward", "duration"]
    },
    quote: {
      type: "STRING",
      description: "Inspirational quote"
    },
    factOfTheDay: {
      type: "STRING",
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
  type: "OBJECT",
  properties: {
    name: {
      type: "STRING",
      description: "Identified food name"
    },
    category: {
      type: "STRING",
      enum: ["protein", "carbohydrate", "vegetable", "fruit", "dairy", "fat", "beverage", "snack", "grain"],
      description: "Food category"
    },
    calories: {
      type: "NUMBER",
      description: "Calories per serving"
    },
    macros: {
      type: "OBJECT",
      properties: {
        protein: { type: "NUMBER" },
        carbohydrates: { type: "NUMBER" },
        fat: { type: "NUMBER" },
        fiber: { type: "NUMBER" }
      },
      required: ["protein", "carbohydrates", "fat", "fiber"],
      propertyOrdering: ["protein", "carbohydrates", "fat", "fiber"]
    },
    servingSize: {
      type: "NUMBER",
      description: "Standard serving size"
    },
    servingUnit: {
      type: "STRING",
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
  type: "OBJECT",
  properties: {
    insights: {
      type: "ARRAY",
      description: "Key insights from progress analysis",
      items: { type: "STRING" }
    },
    recommendations: {
      type: "ARRAY",
      description: "Actionable recommendations for improvement",
      items: { type: "STRING" }
    },
    motivationalMessage: {
      type: "STRING",
      description: "Encouraging message based on progress"
    }
  },
  required: ["insights", "recommendations", "motivationalMessage"],
  propertyOrdering: ["insights", "recommendations", "motivationalMessage"]
};
