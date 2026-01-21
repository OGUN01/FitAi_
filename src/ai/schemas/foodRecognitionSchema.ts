/**
 * Food Recognition Schema - Simplified
 *
 * Focuses on what AI does reliably:
 * - Food identification (name, category, cuisine)
 * - Basic nutrition estimation
 * - Portion suggestion (user can override)
 */

// Schema for food recognition response (used by mobile app for validation)
export const FOOD_RECOGNITION_SCHEMA = {
  type: "object",
  properties: {
    foods: {
      type: "array",
      description: "List of recognized food items",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Specific food name (e.g., 'Chicken Biryani', 'Caesar Salad')",
          },
          localName: {
            type: "string",
            description: "Local/native name if applicable",
          },
          category: {
            type: "string",
            enum: ["main", "side", "snack", "sweet", "beverage"],
            description: "Food category",
          },
          cuisine: {
            type: "string",
            enum: [
              "indian",
              "chinese",
              "japanese",
              "korean",
              "thai",
              "vietnamese",
              "italian",
              "mexican",
              "american",
              "mediterranean",
              "middle_eastern",
              "african",
              "french",
              "other",
            ],
            description: "Cuisine type",
          },
          estimatedGrams: {
            type: "number",
            description: "Estimated portion weight in grams",
          },
          servingDescription: {
            type: "string",
            description: "Human-readable serving (e.g., '1 bowl', '2 pieces')",
          },
          calories: {
            type: "number",
            description: "Calories for the estimated portion",
          },
          protein: {
            type: "number",
            description: "Protein in grams",
          },
          carbs: {
            type: "number",
            description: "Carbohydrates in grams",
          },
          fat: {
            type: "number",
            description: "Fat in grams",
          },
          fiber: {
            type: "number",
            description: "Fiber in grams",
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Recognition confidence (0-100)",
          },
        },
        required: [
          "name",
          "category",
          "cuisine",
          "estimatedGrams",
          "servingDescription",
          "calories",
          "protein",
          "carbs",
          "fat",
          "fiber",
          "confidence",
        ],
      },
    },
    overallConfidence: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Overall confidence score",
    },
    totalCalories: {
      type: "number",
      description: "Sum of all food calories",
    },
    mealType: {
      type: "string",
      enum: ["breakfast", "lunch", "dinner", "snack"],
      description: "Meal type",
    },
  },
  required: ["foods", "overallConfidence", "totalCalories", "mealType"],
};

// Cuisine types for global support
export const CUISINE_TYPES = [
  { id: "indian", label: "Indian", emoji: "🇮🇳" },
  { id: "chinese", label: "Chinese", emoji: "🇨🇳" },
  { id: "japanese", label: "Japanese", emoji: "🇯🇵" },
  { id: "korean", label: "Korean", emoji: "🇰🇷" },
  { id: "thai", label: "Thai", emoji: "🇹🇭" },
  { id: "vietnamese", label: "Vietnamese", emoji: "🇻🇳" },
  { id: "italian", label: "Italian", emoji: "🇮🇹" },
  { id: "mexican", label: "Mexican", emoji: "🇲🇽" },
  { id: "american", label: "American", emoji: "🇺🇸" },
  { id: "mediterranean", label: "Mediterranean", emoji: "🫒" },
  { id: "middle_eastern", label: "Middle Eastern", emoji: "🧆" },
  { id: "african", label: "African", emoji: "🌍" },
  { id: "french", label: "French", emoji: "🇫🇷" },
  { id: "other", label: "Other", emoji: "🍽️" },
] as const;

// Food categories
export const FOOD_CATEGORIES = [
  { id: "main", label: "Main Dish", emoji: "🍛" },
  { id: "side", label: "Side Dish", emoji: "🥗" },
  { id: "snack", label: "Snack", emoji: "🍿" },
  { id: "sweet", label: "Dessert/Sweet", emoji: "🍰" },
  { id: "beverage", label: "Beverage", emoji: "🥤" },
] as const;

// Meal types
export const MEAL_TYPES = [
  { id: "breakfast", label: "Breakfast", emoji: "🌅" },
  { id: "lunch", label: "Lunch", emoji: "☀️" },
  { id: "dinner", label: "Dinner", emoji: "🌙" },
  { id: "snack", label: "Snack", emoji: "🍎" },
] as const;

// Common portion references for user guidance
export const PORTION_REFERENCES = [
  { description: "Small bowl", grams: 150 },
  { description: "Medium bowl", grams: 250 },
  { description: "Large bowl", grams: 400 },
  { description: "1 roti/tortilla", grams: 30 },
  { description: "1 slice bread", grams: 30 },
  { description: "1 cup rice", grams: 180 },
  { description: "Palm-sized meat", grams: 100 },
  { description: "1 egg", grams: 50 },
  { description: "1 banana", grams: 120 },
  { description: "1 apple", grams: 180 },
] as const;

// Schema for meal generation (AI-powered meal plan generation)
export const MEAL_GENERATION_SCHEMA = {
  type: "object",
  properties: {
    meals: {
      type: "array",
      description: "Generated meal plan",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Meal name",
          },
          mealType: {
            type: "string",
            enum: ["breakfast", "lunch", "dinner", "snack"],
            description: "Meal type",
          },
          calories: {
            type: "number",
            description: "Total calories",
          },
          protein: {
            type: "number",
            description: "Protein in grams",
          },
          carbs: {
            type: "number",
            description: "Carbs in grams",
          },
          fat: {
            type: "number",
            description: "Fat in grams",
          },
        },
        required: ["name", "mealType", "calories", "protein", "carbs", "fat"],
      },
    },
  },
  required: ["meals"],
};

// Schema for recipe creation (AI-powered recipe generation)
export const RECIPE_CREATION_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Recipe name",
    },
    ingredients: {
      type: "array",
      description: "List of ingredients",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Ingredient name",
          },
          amount: {
            type: "string",
            description: 'Amount (e.g., "1 cup", "2 tbsp")',
          },
        },
        required: ["name", "amount"],
      },
    },
    instructions: {
      type: "array",
      description: "Cooking instructions",
      items: {
        type: "string",
      },
    },
    prepTime: {
      type: "number",
      description: "Preparation time in minutes",
    },
    cookTime: {
      type: "number",
      description: "Cooking time in minutes",
    },
    servings: {
      type: "number",
      description: "Number of servings",
    },
    calories: {
      type: "number",
      description: "Calories per serving",
    },
    protein: {
      type: "number",
      description: "Protein per serving in grams",
    },
    carbs: {
      type: "number",
      description: "Carbs per serving in grams",
    },
    fat: {
      type: "number",
      description: "Fat per serving in grams",
    },
  },
  required: [
    "name",
    "ingredients",
    "instructions",
    "prepTime",
    "cookTime",
    "servings",
    "calories",
    "protein",
    "carbs",
    "fat",
  ],
};
