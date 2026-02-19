// AI Response Schemas for Google Gemini Structured Output
// Analysis schema definitions (food and progress)

// ============================================================================
// FOOD ANALYSIS SCHEMA
// ============================================================================

export const FOOD_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Identified food name",
    },
    category: {
      type: "string",
      enum: [
        "protein",
        "carbohydrate",
        "vegetable",
        "fruit",
        "dairy",
        "fat",
        "beverage",
        "snack",
        "grain",
      ],
      description: "Food category",
    },
    calories: {
      type: "number",
      description: "Calories per serving",
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
      propertyOrdering: ["protein", "carbohydrates", "fat", "fiber"],
    },
    servingSize: {
      type: "number",
      description: "Standard serving size",
    },
    servingUnit: {
      type: "string",
      enum: ["g", "ml", "piece", "cup", "tbsp", "tsp", "oz"],
      description: "Unit for serving size",
    },
  },
  required: [
    "name",
    "category",
    "calories",
    "macros",
    "servingSize",
    "servingUnit",
  ],
  propertyOrdering: [
    "name",
    "category",
    "calories",
    "macros",
    "servingSize",
    "servingUnit",
  ],
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
      items: { type: "string" },
    },
    recommendations: {
      type: "array",
      description: "Actionable recommendations for improvement",
      items: { type: "string" },
    },
    motivationalMessage: {
      type: "string",
      description: "Encouraging message based on progress",
    },
  },
  required: ["insights", "recommendations", "motivationalMessage"],
  propertyOrdering: ["insights", "recommendations", "motivationalMessage"],
};
