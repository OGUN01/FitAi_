// AI Response Schemas for Google Gemini Structured Output
// Nutrition analysis schema definitions

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
            enum: [
              "breakfast",
              "lunch",
              "dinner",
              "snack",
              "pre_workout",
              "post_workout",
            ],
            description: "Meal type",
          },
          name: {
            type: "string",
            description: "Scientifically-crafted meal name",
          },
          description: {
            type: "string",
            description: "Nutritional rationale and benefits",
          },
          items: {
            type: "array",
            description: "Food items in the meal",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Specific food item",
                },
                quantity: {
                  type: "number",
                  description: "Precise amount",
                },
                unit: {
                  type: "string",
                  enum: ["g", "ml", "piece", "cup", "tbsp", "tsp", "oz"],
                  description: "Unit of measurement",
                },
                calories: {
                  type: "number",
                  description: "Accurate calories",
                },
                protein: {
                  type: "number",
                  description: "Grams of protein",
                },
                carbohydrates: {
                  type: "number",
                  description: "Grams of carbohydrates",
                },
                fat: {
                  type: "number",
                  description: "Grams of fat",
                },
              },
              required: [
                "name",
                "quantity",
                "unit",
                "calories",
                "protein",
                "carbohydrates",
                "fat",
              ],
              propertyOrdering: [
                "name",
                "quantity",
                "unit",
                "calories",
                "protein",
                "carbohydrates",
                "fat",
              ],
            },
          },
          totalCalories: {
            type: "number",
            description: "Total calories for the meal",
          },
          totalProtein: {
            type: "number",
            description: "Total protein for the meal",
          },
          totalCarbohydrates: {
            type: "number",
            description: "Total carbohydrates for the meal",
          },
          totalFat: {
            type: "number",
            description: "Total fat for the meal",
          },
        },
        required: [
          "type",
          "name",
          "description",
          "items",
          "totalCalories",
          "totalProtein",
          "totalCarbohydrates",
          "totalFat",
        ],
        propertyOrdering: [
          "type",
          "name",
          "description",
          "items",
          "totalCalories",
          "totalProtein",
          "totalCarbohydrates",
          "totalFat",
        ],
      },
    },
    dailyTotals: {
      type: "object",
      properties: {
        calories: { type: "number" },
        protein: { type: "number" },
        carbohydrates: { type: "number" },
        fat: { type: "number" },
      },
      required: ["calories", "protein", "carbohydrates", "fat"],
      propertyOrdering: ["calories", "protein", "carbohydrates", "fat"],
    },
    nutritionalInsights: {
      type: "array",
      description: "Key nutritional insights and recommendations",
      items: { type: "string" },
    },
  },
  required: ["meals", "dailyTotals", "nutritionalInsights"],
  propertyOrdering: ["meals", "dailyTotals", "nutritionalInsights"],
};
