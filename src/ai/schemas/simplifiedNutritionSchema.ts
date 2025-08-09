// Simplified Nutrition Schemas for Google Gemini Structured Output
// Reduced complexity to avoid API errors while maintaining essential nutrition structure

// ============================================================================
// SIMPLIFIED MEAL SCHEMA
// ============================================================================

export const SIMPLIFIED_MEAL_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Meal name"
    },
    description: {
      type: "string", 
      description: "Brief meal description"
    },
    items: {
      type: "array",
      description: "Simple food items",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Food item name"
          },
          quantity: {
            type: "string",
            description: "Amount (e.g., '1 cup', '200g', '2 pieces')"
          },
          calories: {
            type: "number",
            description: "Estimated calories"
          }
        },
        required: ["name", "quantity", "calories"]
      }
    },
    totalCalories: {
      type: "number",
      description: "Total meal calories"
    }
  },
  required: ["name", "description", "items", "totalCalories"]
};

// ============================================================================
// SIMPLIFIED DAILY NUTRITION SCHEMA
// ============================================================================

export const SIMPLIFIED_DAILY_NUTRITION_SCHEMA = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      description: "Daily meals",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Meal type"
          },
          name: {
            type: "string",
            description: "Meal name"
          },
          items: {
            type: "array",
            items: {
              type: "object", 
              properties: {
                name: { type: "string" },
                quantity: { type: "string" },
                calories: { type: "number" }
              },
              required: ["name", "quantity", "calories"]
            }
          },
          totalCalories: {
            type: "number"
          }
        },
        required: ["type", "name", "items", "totalCalories"]
      }
    },
    dailyTotal: {
      type: "number",
      description: "Total daily calories"
    }
  },
  required: ["meals", "dailyTotal"]
};

// ============================================================================
// SIMPLIFIED WEEKLY MEAL PLAN SCHEMA 
// ============================================================================

export const SIMPLIFIED_WEEKLY_NUTRITION_SCHEMA = {
  type: "object",
  properties: {
    planTitle: {
      type: "string",
      description: "Weekly meal plan title"
    },
    planDescription: {
      type: "string", 
      description: "Brief plan overview"
    },
    targetCaloriesPerDay: {
      type: "number",
      description: "Daily calorie target"
    },
    meals: {
      type: "array",
      description: "Weekly meals (21 total: 7 days × 3 meals)",
      items: {
        type: "object",
        properties: {
          dayOfWeek: {
            type: "string",
            enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
          },
          mealType: {
            type: "string", 
            enum: ["breakfast", "lunch", "dinner"]
          },
          name: {
            type: "string",
            description: "Meal name"
          },
          description: {
            type: "string",
            description: "Brief description"
          },
          mainIngredients: {
            type: "array",
            items: { type: "string" },
            description: "Key ingredients (max 5)"
          },
          estimatedCalories: {
            type: "number",
            description: "Estimated calories"
          },
          prepTime: {
            type: "number", 
            description: "Prep time in minutes"
          }
        },
        required: ["dayOfWeek", "mealType", "name", "mainIngredients", "estimatedCalories"]
      }
    }
  },
  required: ["planTitle", "planDescription", "targetCaloriesPerDay", "meals"]
};

// ============================================================================
// DIAGNOSTIC NUTRITION SCHEMA (Minimal for testing)
// ============================================================================

export const DIAGNOSTIC_NUTRITION_SCHEMA = {
  type: "object",
  properties: {
    planTitle: {
      type: "string"
    },
    dailyCalories: {
      type: "number"
    },
    meals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string" },
          calories: { type: "number" }
        },
        required: ["name", "type", "calories"]
      }
    }
  },
  required: ["planTitle", "dailyCalories", "meals"]
};

// ============================================================================
// ULTRA SIMPLE FOOD ANALYSIS SCHEMA
// ============================================================================

export const SIMPLE_FOOD_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Food name"
    },
    category: {
      type: "string",
      description: "Food category"
    },
    estimatedCalories: {
      type: "number",
      description: "Estimated calories per serving"
    },
    servingSize: {
      type: "string", 
      description: "Typical serving size"
    }
  },
  required: ["name", "category", "estimatedCalories", "servingSize"]
};