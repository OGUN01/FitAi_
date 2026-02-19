// AI Response Schemas for Google Gemini Structured Output
// Weekly meal plan schema definitions

// ============================================================================
// WEEKLY MEAL PLAN SCHEMA
// ============================================================================

// ULTRA-SIMPLIFIED schema for testing JSON parsing - minimal data to avoid truncation
export const WEEKLY_MEAL_PLAN_SCHEMA = {
  type: "object",
  properties: {
    planTitle: {
      type: "string",
      description: "Personalized weekly meal plan title",
    },
    planDescription: {
      type: "string",
      description: "Brief description of the meal plan approach",
    },
    totalEstimatedCalories: {
      type: "number",
      description: "Total estimated calories for the week",
    },
    dietaryRestrictions: {
      type: "array",
      description: "List of dietary restrictions considered",
      items: { type: "string" },
    },
    weeklyGoals: {
      type: "array",
      description: "Weekly nutrition and fitness goals",
      items: { type: "string" },
    },
    meals: {
      type: "array",
      description:
        "Complete 7-day meal plan with breakfast, lunch, and dinner for each day",
      items: {
        type: "object",
        properties: {
          dayOfWeek: {
            type: "string",
            enum: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
            description: "Day of the week",
          },
          type: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Meal type",
          },
          name: {
            type: "string",
            description: "Meal name",
          },
          description: {
            type: "string",
            description: "Meal description and benefits",
          },
          items: {
            type: "array",
            description:
              "Food items in the meal with complete nutritional information",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Food item name",
                },
                quantity: {
                  type: "number",
                  description: "Quantity amount",
                },
                unit: {
                  type: "string",
                  description: "Unit of measurement",
                },
                calories: {
                  type: "number",
                  description: "Calories for this item",
                },
                macros: {
                  type: "object",
                  properties: {
                    protein: { type: "number" },
                    carbohydrates: { type: "number" },
                    fat: { type: "number" },
                    fiber: { type: "number" },
                  },
                  required: ["protein", "carbohydrates", "fat", "fiber"],
                },
                category: {
                  type: "string",
                  description: "Food category",
                },
                preparationTime: {
                  type: "number",
                  description: "Preparation time in minutes",
                },
              },
              required: [
                "name",
                "quantity",
                "unit",
                "calories",
                "macros",
                "category",
                "preparationTime",
              ],
              propertyOrdering: [
                "name",
                "quantity",
                "unit",
                "calories",
                "macros",
                "category",
                "preparationTime",
              ],
            },
          },
          totalCalories: {
            type: "number",
            description: "Total calories for the meal",
          },
          totalMacros: {
            type: "object",
            properties: {
              protein: { type: "number" },
              carbohydrates: { type: "number" },
              fat: { type: "number" },
              fiber: { type: "number" },
            },
            required: ["protein", "carbohydrates", "fat", "fiber"],
          },
          preparationTime: {
            type: "number",
            description: "Total preparation time in minutes",
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
            description: "Cooking difficulty level",
          },
          tags: {
            type: "array",
            description: "Meal tags",
            items: { type: "string" },
          },
        },
        required: [
          "dayOfWeek",
          "type",
          "name",
          "description",
          "items",
          "totalCalories",
          "totalMacros",
          "preparationTime",
          "difficulty",
          "tags",
        ],
        propertyOrdering: [
          "dayOfWeek",
          "type",
          "name",
          "description",
          "items",
          "totalCalories",
          "totalMacros",
          "preparationTime",
          "difficulty",
          "tags",
        ],
      },
    },
  },
  required: [
    "planTitle",
    "planDescription",
    "totalEstimatedCalories",
    "dietaryRestrictions",
    "weeklyGoals",
    "meals",
  ],
  propertyOrdering: [
    "planTitle",
    "planDescription",
    "totalEstimatedCalories",
    "dietaryRestrictions",
    "weeklyGoals",
    "meals",
  ],
};
