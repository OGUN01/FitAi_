// Comprehensive Food Database for FitAI

import { Food, Macronutrients } from '../types/ai';

// ============================================================================
// FOOD DATABASE
// ============================================================================

export const FOODS: Food[] = [
  // PROTEINS
  {
    id: 'chicken_breast',
    name: 'Chicken Breast (Skinless)',
    category: 'protein',
    calories: 165,
    macros: {
      protein: 31,
      carbohydrates: 0,
      fat: 3.6,
      fiber: 0
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['high-protein', 'low-carb'],
    verified: true
  },
  {
    id: 'salmon',
    name: 'Atlantic Salmon',
    category: 'protein',
    calories: 208,
    macros: {
      protein: 25,
      carbohydrates: 0,
      fat: 12,
      fiber: 0
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: ['fish'],
    dietaryLabels: ['high-protein', 'omega-3', 'low-carb'],
    verified: true
  },
  {
    id: 'eggs',
    name: 'Large Eggs',
    category: 'protein',
    calories: 155,
    macros: {
      protein: 13,
      carbohydrates: 1.1,
      fat: 11,
      fiber: 0
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: ['eggs'],
    dietaryLabels: ['high-protein', 'complete-protein'],
    verified: true
  },
  {
    id: 'greek_yogurt',
    name: 'Greek Yogurt (Plain, Non-fat)',
    category: 'protein',
    calories: 59,
    macros: {
      protein: 10,
      carbohydrates: 3.6,
      fat: 0.4,
      fiber: 0
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: ['dairy'],
    dietaryLabels: ['high-protein', 'probiotic', 'low-fat'],
    verified: true
  },
  {
    id: 'tofu',
    name: 'Firm Tofu',
    category: 'protein',
    calories: 144,
    macros: {
      protein: 17,
      carbohydrates: 3,
      fat: 9,
      fiber: 2
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: ['soy'],
    dietaryLabels: ['vegan', 'plant-protein', 'low-carb'],
    verified: true
  },

  // CARBOHYDRATES
  {
    id: 'brown_rice',
    name: 'Brown Rice (Cooked)',
    category: 'grains',
    calories: 112,
    macros: {
      protein: 2.6,
      carbohydrates: 23,
      fat: 0.9,
      fiber: 1.8
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['whole-grain', 'gluten-free'],
    verified: true
  },
  {
    id: 'quinoa',
    name: 'Quinoa (Cooked)',
    category: 'grains',
    calories: 120,
    macros: {
      protein: 4.4,
      carbohydrates: 22,
      fat: 1.9,
      fiber: 2.8
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['complete-protein', 'gluten-free', 'superfood'],
    verified: true
  },
  {
    id: 'oats',
    name: 'Rolled Oats (Dry)',
    category: 'grains',
    calories: 389,
    macros: {
      protein: 16.9,
      carbohydrates: 66,
      fat: 6.9,
      fiber: 10.6
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: ['gluten'],
    dietaryLabels: ['whole-grain', 'high-fiber'],
    verified: true
  },
  {
    id: 'sweet_potato',
    name: 'Sweet Potato (Baked)',
    category: 'vegetables',
    calories: 90,
    macros: {
      protein: 2,
      carbohydrates: 21,
      fat: 0.2,
      fiber: 3.3
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['high-fiber', 'vitamin-a', 'complex-carbs'],
    verified: true
  },

  // VEGETABLES
  {
    id: 'broccoli',
    name: 'Broccoli (Raw)',
    category: 'vegetables',
    calories: 34,
    macros: {
      protein: 2.8,
      carbohydrates: 7,
      fat: 0.4,
      fiber: 2.6
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['low-calorie', 'high-fiber', 'vitamin-c'],
    verified: true
  },
  {
    id: 'spinach',
    name: 'Spinach (Raw)',
    category: 'vegetables',
    calories: 23,
    macros: {
      protein: 2.9,
      carbohydrates: 3.6,
      fat: 0.4,
      fiber: 2.2
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['low-calorie', 'iron', 'folate'],
    verified: true
  },
  {
    id: 'bell_pepper',
    name: 'Bell Pepper (Red)',
    category: 'vegetables',
    calories: 31,
    macros: {
      protein: 1,
      carbohydrates: 7,
      fat: 0.3,
      fiber: 2.5
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['low-calorie', 'vitamin-c', 'antioxidants'],
    verified: true
  },

  // FRUITS
  {
    id: 'banana',
    name: 'Banana (Medium)',
    category: 'fruits',
    calories: 89,
    macros: {
      protein: 1.1,
      carbohydrates: 23,
      fat: 0.3,
      fiber: 2.6
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['potassium', 'natural-sugar', 'pre-workout'],
    verified: true
  },
  {
    id: 'apple',
    name: 'Apple (Medium)',
    category: 'fruits',
    calories: 52,
    macros: {
      protein: 0.3,
      carbohydrates: 14,
      fat: 0.2,
      fiber: 2.4
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['low-calorie', 'high-fiber', 'antioxidants'],
    verified: true
  },
  {
    id: 'blueberries',
    name: 'Blueberries (Fresh)',
    category: 'fruits',
    calories: 57,
    macros: {
      protein: 0.7,
      carbohydrates: 14,
      fat: 0.3,
      fiber: 2.4
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['antioxidants', 'superfood', 'low-calorie'],
    verified: true
  },
  {
    id: 'avocado',
    name: 'Avocado',
    category: 'fruits',
    calories: 160,
    macros: {
      protein: 2,
      carbohydrates: 9,
      fat: 15,
      fiber: 7
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['healthy-fats', 'high-fiber', 'potassium'],
    verified: true
  },

  // NUTS & SEEDS
  {
    id: 'almonds',
    name: 'Almonds (Raw)',
    category: 'nuts_seeds',
    calories: 579,
    macros: {
      protein: 21,
      carbohydrates: 22,
      fat: 50,
      fiber: 12
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: ['tree_nuts'],
    dietaryLabels: ['healthy-fats', 'high-protein', 'vitamin-e'],
    verified: true
  },
  {
    id: 'chia_seeds',
    name: 'Chia Seeds',
    category: 'nuts_seeds',
    calories: 486,
    macros: {
      protein: 17,
      carbohydrates: 42,
      fat: 31,
      fiber: 34
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: [],
    dietaryLabels: ['omega-3', 'high-fiber', 'superfood'],
    verified: true
  },

  // DAIRY
  {
    id: 'milk_2percent',
    name: 'Milk (2% Fat)',
    category: 'dairy',
    calories: 50,
    macros: {
      protein: 3.3,
      carbohydrates: 4.8,
      fat: 2,
      fiber: 0
    },
    servingSize: 100,
    servingUnit: 'ml',
    allergens: ['dairy'],
    dietaryLabels: ['calcium', 'protein'],
    verified: true
  },
  {
    id: 'cottage_cheese',
    name: 'Cottage Cheese (Low-fat)',
    category: 'dairy',
    calories: 72,
    macros: {
      protein: 12,
      carbohydrates: 4.3,
      fat: 1,
      fiber: 0
    },
    servingSize: 100,
    servingUnit: 'g',
    allergens: ['dairy'],
    dietaryLabels: ['high-protein', 'low-fat', 'calcium'],
    verified: true
  },

  // OILS & FATS
  {
    id: 'olive_oil',
    name: 'Extra Virgin Olive Oil',
    category: 'oils_fats',
    calories: 884,
    macros: {
      protein: 0,
      carbohydrates: 0,
      fat: 100,
      fiber: 0
    },
    servingSize: 100,
    servingUnit: 'ml',
    allergens: [],
    dietaryLabels: ['healthy-fats', 'monounsaturated', 'antioxidants'],
    verified: true
  }
];

// ============================================================================
// FOOD CATEGORIES
// ============================================================================

export const FOOD_CATEGORIES = {
  PROTEIN: {
    id: 'protein',
    name: 'Protein Sources',
    description: 'High-protein foods for muscle building and repair',
    icon: '🥩',
    foods: FOODS.filter(food => food.category === 'protein')
  },
  GRAINS: {
    id: 'grains',
    name: 'Grains & Starches',
    description: 'Complex carbohydrates for sustained energy',
    icon: '🌾',
    foods: FOODS.filter(food => food.category === 'grains')
  },
  VEGETABLES: {
    id: 'vegetables',
    name: 'Vegetables',
    description: 'Nutrient-dense vegetables for vitamins and minerals',
    icon: '🥬',
    foods: FOODS.filter(food => food.category === 'vegetables')
  },
  FRUITS: {
    id: 'fruits',
    name: 'Fruits',
    description: 'Natural sugars and antioxidants',
    icon: '🍎',
    foods: FOODS.filter(food => food.category === 'fruits')
  },
  NUTS_SEEDS: {
    id: 'nuts_seeds',
    name: 'Nuts & Seeds',
    description: 'Healthy fats and plant proteins',
    icon: '🥜',
    foods: FOODS.filter(food => food.category === 'nuts_seeds')
  },
  DAIRY: {
    id: 'dairy',
    name: 'Dairy Products',
    description: 'Calcium and protein from dairy sources',
    icon: '🥛',
    foods: FOODS.filter(food => food.category === 'dairy')
  },
  OILS_FATS: {
    id: 'oils_fats',
    name: 'Oils & Fats',
    description: 'Essential fatty acids and cooking oils',
    icon: '🫒',
    foods: FOODS.filter(food => food.category === 'oils_fats')
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get foods by category
 */
export const getFoodsByCategory = (category: string): Food[] => {
  return FOODS.filter(food => food.category === category);
};

/**
 * Get foods by dietary label
 */
export const getFoodsByDietaryLabel = (label: string): Food[] => {
  return FOODS.filter(food => food.dietaryLabels.includes(label));
};

/**
 * Get high-protein foods
 */
export const getHighProteinFoods = (minProtein: number = 15): Food[] => {
  return FOODS.filter(food => food.macros.protein >= minProtein);
};

/**
 * Get low-calorie foods
 */
export const getLowCalorieFoods = (maxCalories: number = 100): Food[] => {
  return FOODS.filter(food => food.calories <= maxCalories);
};

/**
 * Search foods by name or category
 */
export const searchFoods = (query: string): Food[] => {
  const lowerQuery = query.toLowerCase();
  return FOODS.filter(food => 
    food.name.toLowerCase().includes(lowerQuery) ||
    food.category.toLowerCase().includes(lowerQuery) ||
    food.dietaryLabels.some(label => label.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Get food by ID
 */
export const getFoodById = (id: string): Food | undefined => {
  return FOODS.find(food => food.id === id);
};

/**
 * Calculate nutrition for quantity
 */
export const calculateNutrition = (food: Food, quantity: number): {
  calories: number;
  macros: Macronutrients;
} => {
  const multiplier = quantity / food.servingSize;
  return {
    calories: Math.round(food.calories * multiplier),
    macros: {
      protein: Math.round(food.macros.protein * multiplier * 10) / 10,
      carbohydrates: Math.round(food.macros.carbohydrates * multiplier * 10) / 10,
      fat: Math.round(food.macros.fat * multiplier * 10) / 10,
      fiber: Math.round(food.macros.fiber * multiplier * 10) / 10
    }
  };
};

export default FOODS;
