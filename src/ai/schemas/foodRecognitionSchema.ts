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
  type: 'object',
  properties: {
    foods: {
      type: 'array',
      description: 'List of recognized food items',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: "Specific food name (e.g., 'Chicken Biryani', 'Caesar Salad')",
          },
          localName: {
            type: 'string',
            description: 'Local/native name if applicable',
          },
          category: {
            type: 'string',
            enum: ['main', 'side', 'snack', 'sweet', 'beverage'],
            description: 'Food category',
          },
          cuisine: {
            type: 'string',
            enum: [
              'indian',
              'chinese',
              'japanese',
              'korean',
              'thai',
              'vietnamese',
              'italian',
              'mexican',
              'american',
              'mediterranean',
              'middle_eastern',
              'african',
              'french',
              'other',
            ],
            description: 'Cuisine type',
          },
          estimatedGrams: {
            type: 'number',
            description: 'Estimated portion weight in grams',
          },
          servingDescription: {
            type: 'string',
            description: "Human-readable serving (e.g., '1 bowl', '2 pieces')",
          },
          calories: {
            type: 'number',
            description: 'Calories for the estimated portion',
          },
          protein: {
            type: 'number',
            description: 'Protein in grams',
          },
          carbs: {
            type: 'number',
            description: 'Carbohydrates in grams',
          },
          fat: {
            type: 'number',
            description: 'Fat in grams',
          },
          fiber: {
            type: 'number',
            description: 'Fiber in grams',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Recognition confidence (0-100)',
          },
        },
        required: [
          'name',
          'category',
          'cuisine',
          'estimatedGrams',
          'servingDescription',
          'calories',
          'protein',
          'carbs',
          'fat',
          'fiber',
          'confidence',
        ],
      },
    },
    overallConfidence: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: 'Overall confidence score',
    },
    totalCalories: {
      type: 'number',
      description: 'Sum of all food calories',
    },
    mealType: {
      type: 'string',
      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
      description: 'Meal type',
    },
  },
  required: ['foods', 'overallConfidence', 'totalCalories', 'mealType'],
};

// Cuisine types for global support
export const CUISINE_TYPES = [
  { id: 'indian', label: 'Indian', emoji: '🇮🇳' },
  { id: 'chinese', label: 'Chinese', emoji: '🇨🇳' },
  { id: 'japanese', label: 'Japanese', emoji: '🇯🇵' },
  { id: 'korean', label: 'Korean', emoji: '🇰🇷' },
  { id: 'thai', label: 'Thai', emoji: '🇹🇭' },
  { id: 'vietnamese', label: 'Vietnamese', emoji: '🇻🇳' },
  { id: 'italian', label: 'Italian', emoji: '🇮🇹' },
  { id: 'mexican', label: 'Mexican', emoji: '🇲🇽' },
  { id: 'american', label: 'American', emoji: '🇺🇸' },
  { id: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
  { id: 'middle_eastern', label: 'Middle Eastern', emoji: '🧆' },
  { id: 'african', label: 'African', emoji: '🌍' },
  { id: 'french', label: 'French', emoji: '🇫🇷' },
  { id: 'other', label: 'Other', emoji: '🍽️' },
] as const;

// Food categories
export const FOOD_CATEGORIES = [
  { id: 'main', label: 'Main Dish', emoji: '🍛' },
  { id: 'side', label: 'Side Dish', emoji: '🥗' },
  { id: 'snack', label: 'Snack', emoji: '🍿' },
  { id: 'sweet', label: 'Dessert/Sweet', emoji: '🍰' },
  { id: 'beverage', label: 'Beverage', emoji: '🥤' },
] as const;

// Meal types
export const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
  { id: 'snack', label: 'Snack', emoji: '🍎' },
] as const;

// Common portion references for user guidance
export const PORTION_REFERENCES = [
  { description: 'Small bowl', grams: 150 },
  { description: 'Medium bowl', grams: 250 },
  { description: 'Large bowl', grams: 400 },
  { description: '1 roti/tortilla', grams: 30 },
  { description: '1 slice bread', grams: 30 },
  { description: '1 cup rice', grams: 180 },
  { description: 'Palm-sized meat', grams: 100 },
  { description: '1 egg', grams: 50 },
  { description: '1 banana', grams: 120 },
  { description: '1 apple', grams: 180 },
] as const;
