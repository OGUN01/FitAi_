/**
 * Comprehensive Indian Food Nutrition Database
 * Curated from ICMR, NIN, and traditional nutrition sources
 * All nutrition values are per 100g serving
 */

export interface IndianFoodData {
  name: string;
  hindiName?: string;
  regionalName?: string;
  region: 'north' | 'south' | 'east' | 'west' | 'pan-indian';
  category: 'main' | 'side' | 'snack' | 'sweet' | 'beverage';
  spiceLevel: 'mild' | 'medium' | 'hot' | 'extra_hot';
  cookingMethod: 'fried' | 'steamed' | 'baked' | 'curry' | 'grilled' | 'raw' | 'boiled';
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar?: number;
    sodium?: number;
  };
  commonIngredients: string[];
  traditionalServing: number; // in grams
  tags: string[];
}

export const INDIAN_FOOD_DATABASE: Record<string, IndianFoodData> = {
  // === NORTH INDIAN MAIN DISHES ===
  biryani: {
    name: 'Biryani',
    hindiName: 'बिरयानी',
    region: 'north',
    category: 'main',
    spiceLevel: 'medium',
    cookingMethod: 'baked',
    nutritionPer100g: {
      calories: 200,
      protein: 8,
      carbs: 35,
      fat: 4,
      fiber: 2,
      sugar: 2,
      sodium: 450,
    },
    commonIngredients: [
      'basmati rice',
      'meat/chicken',
      'saffron',
      'fried onions',
      'yogurt',
      'spices',
    ],
    traditionalServing: 200,
    tags: ['rice', 'festive', 'non-veg', 'aromatic'],
  },

  'chicken biryani': {
    name: 'Chicken Biryani',
    hindiName: 'चिकन बिरयानी',
    region: 'north',
    category: 'main',
    spiceLevel: 'medium',
    cookingMethod: 'baked',
    nutritionPer100g: {
      calories: 220,
      protein: 12,
      carbs: 30,
      fat: 6,
      fiber: 2,
      sugar: 2,
      sodium: 480,
    },
    commonIngredients: [
      'basmati rice',
      'chicken',
      'saffron',
      'fried onions',
      'yogurt',
      'garam masala',
    ],
    traditionalServing: 250,
    tags: ['rice', 'non-veg', 'protein-rich', 'festive'],
  },

  'butter chicken': {
    name: 'Butter Chicken',
    hindiName: 'बटर चिकन',
    regionalName: 'Murgh Makhani',
    region: 'north',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'curry',
    nutritionPer100g: {
      calories: 180,
      protein: 15,
      carbs: 8,
      fat: 12,
      fiber: 1,
      sugar: 6,
      sodium: 520,
    },
    commonIngredients: ['chicken', 'tomatoes', 'cream', 'butter', 'cashews', 'spices'],
    traditionalServing: 150,
    tags: ['curry', 'non-veg', 'creamy', 'mild'],
  },

  'dal makhani': {
    name: 'Dal Makhani',
    hindiName: 'दाल मखनी',
    region: 'north',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'curry',
    nutritionPer100g: {
      calories: 140,
      protein: 8,
      carbs: 18,
      fat: 4,
      fiber: 6,
      sugar: 3,
      sodium: 400,
    },
    commonIngredients: ['black dal', 'kidney beans', 'cream', 'butter', 'tomatoes', 'spices'],
    traditionalServing: 120,
    tags: ['dal', 'vegetarian', 'protein-rich', 'creamy'],
  },

  rajma: {
    name: 'Rajma',
    hindiName: 'राजमा',
    region: 'north',
    category: 'main',
    spiceLevel: 'medium',
    cookingMethod: 'curry',
    nutritionPer100g: {
      calories: 120,
      protein: 9,
      carbs: 22,
      fat: 1,
      fiber: 8,
      sugar: 2,
      sodium: 380,
    },
    commonIngredients: ['kidney beans', 'onions', 'tomatoes', 'ginger-garlic', 'spices'],
    traditionalServing: 150,
    tags: ['beans', 'vegetarian', 'protein-rich', 'fiber-rich'],
  },

  chole: {
    name: 'Chole',
    hindiName: 'छोले',
    regionalName: 'Chana Masala',
    region: 'north',
    category: 'main',
    spiceLevel: 'medium',
    cookingMethod: 'curry',
    nutritionPer100g: {
      calories: 130,
      protein: 8,
      carbs: 20,
      fat: 3,
      fiber: 7,
      sugar: 3,
      sodium: 420,
    },
    commonIngredients: ['chickpeas', 'onions', 'tomatoes', 'chole masala', 'ginger-garlic'],
    traditionalServing: 150,
    tags: ['chickpeas', 'vegetarian', 'protein-rich', 'spicy'],
  },

  'paneer butter masala': {
    name: 'Paneer Butter Masala',
    hindiName: 'पनीर बटर मसाला',
    region: 'north',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'curry',
    nutritionPer100g: {
      calories: 190,
      protein: 12,
      carbs: 10,
      fat: 14,
      fiber: 2,
      sugar: 5,
      sodium: 450,
    },
    commonIngredients: ['paneer', 'tomatoes', 'cream', 'butter', 'cashews', 'spices'],
    traditionalServing: 120,
    tags: ['paneer', 'vegetarian', 'creamy', 'protein-rich'],
  },

  // === SOUTH INDIAN MAIN DISHES ===
  dosa: {
    name: 'Dosa',
    hindiName: 'डोसा',
    region: 'south',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'grilled',
    nutritionPer100g: {
      calories: 165,
      protein: 4,
      carbs: 32,
      fat: 2,
      fiber: 1,
      sugar: 1,
      sodium: 350,
    },
    commonIngredients: ['rice', 'urad dal', 'fenugreek seeds', 'salt'],
    traditionalServing: 80,
    tags: ['fermented', 'vegetarian', 'crispy', 'healthy'],
  },

  idli: {
    name: 'Idli',
    hindiName: 'इडली',
    region: 'south',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'steamed',
    nutritionPer100g: {
      calories: 156,
      protein: 4,
      carbs: 30,
      fat: 1,
      fiber: 2,
      sugar: 1,
      sodium: 280,
    },
    commonIngredients: ['rice', 'urad dal', 'fenugreek seeds', 'salt'],
    traditionalServing: 60,
    tags: ['steamed', 'vegetarian', 'fermented', 'low-fat'],
  },

  sambar: {
    name: 'Sambar',
    hindiName: 'सांबर',
    region: 'south',
    category: 'main',
    spiceLevel: 'medium',
    cookingMethod: 'boiled',
    nutritionPer100g: {
      calories: 85,
      protein: 4,
      carbs: 12,
      fat: 2,
      fiber: 4,
      sugar: 3,
      sodium: 420,
    },
    commonIngredients: ['toor dal', 'tamarind', 'vegetables', 'sambar powder', 'curry leaves'],
    traditionalServing: 150,
    tags: ['dal', 'vegetarian', 'tangy', 'vegetables'],
  },

  rasam: {
    name: 'Rasam',
    hindiName: 'रसम',
    region: 'south',
    category: 'main',
    spiceLevel: 'hot',
    cookingMethod: 'boiled',
    nutritionPer100g: {
      calories: 45,
      protein: 2,
      carbs: 8,
      fat: 1,
      fiber: 1,
      sugar: 2,
      sodium: 350,
    },
    commonIngredients: ['tamarind', 'tomatoes', 'rasam powder', 'curry leaves', 'coriander'],
    traditionalServing: 200,
    tags: ['soup', 'vegetarian', 'tangy', 'digestive'],
  },

  vada: {
    name: 'Vada',
    hindiName: 'वडा',
    region: 'south',
    category: 'snack',
    spiceLevel: 'medium',
    cookingMethod: 'fried',
    nutritionPer100g: {
      calories: 245,
      protein: 8,
      carbs: 30,
      fat: 10,
      fiber: 4,
      sugar: 2,
      sodium: 380,
    },
    commonIngredients: ['urad dal', 'ginger', 'green chilies', 'curry leaves', 'oil'],
    traditionalServing: 50,
    tags: ['fried', 'vegetarian', 'crispy', 'snack'],
  },

  // === EAST INDIAN DISHES ===
  'fish curry': {
    name: 'Fish Curry',
    hindiName: 'मछली करी',
    regionalName: 'Maacher Jhol',
    region: 'east',
    category: 'main',
    spiceLevel: 'medium',
    cookingMethod: 'curry',
    nutritionPer100g: {
      calories: 110,
      protein: 18,
      carbs: 5,
      fat: 3,
      fiber: 1,
      sugar: 2,
      sodium: 420,
    },
    commonIngredients: ['fish', 'mustard oil', 'turmeric', 'onions', 'tomatoes', 'spices'],
    traditionalServing: 150,
    tags: ['fish', 'non-veg', 'protein-rich', 'bengali'],
  },

  'mishti doi': {
    name: 'Mishti Doi',
    hindiName: 'मिष्टि दोई',
    region: 'east',
    category: 'sweet',
    spiceLevel: 'mild',
    cookingMethod: 'raw',
    nutritionPer100g: {
      calories: 140,
      protein: 4,
      carbs: 22,
      fat: 4,
      fiber: 0,
      sugar: 20,
      sodium: 50,
    },
    commonIngredients: ['milk', 'sugar', 'yogurt culture', 'cardamom'],
    traditionalServing: 100,
    tags: ['sweet', 'vegetarian', 'dessert', 'bengali'],
  },

  // === WEST INDIAN DISHES ===
  dhokla: {
    name: 'Dhokla',
    hindiName: 'ढोकला',
    region: 'west',
    category: 'snack',
    spiceLevel: 'mild',
    cookingMethod: 'steamed',
    nutritionPer100g: {
      calories: 160,
      protein: 6,
      carbs: 28,
      fat: 3,
      fiber: 2,
      sugar: 4,
      sodium: 380,
    },
    commonIngredients: ['gram flour', 'yogurt', 'ginger', 'green chilies', 'mustard seeds'],
    traditionalServing: 80,
    tags: ['steamed', 'vegetarian', 'healthy', 'gujarati'],
  },

  'pav bhaji': {
    name: 'Pav Bhaji',
    hindiName: 'पाव भाजी',
    region: 'west',
    category: 'main',
    spiceLevel: 'medium',
    cookingMethod: 'curry',
    nutritionPer100g: {
      calories: 180,
      protein: 5,
      carbs: 25,
      fat: 7,
      fiber: 3,
      sugar: 5,
      sodium: 520,
    },
    commonIngredients: ['mixed vegetables', 'pav bhaji masala', 'butter', 'bread', 'onions'],
    traditionalServing: 200,
    tags: ['street food', 'vegetarian', 'spicy', 'mumbai'],
  },

  // === ROTIS AND BREADS ===
  roti: {
    name: 'Roti',
    hindiName: 'रोटी',
    regionalName: 'Chapati',
    region: 'pan-indian',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'grilled',
    nutritionPer100g: {
      calories: 280,
      protein: 9,
      carbs: 58,
      fat: 2,
      fiber: 8,
      sugar: 2,
      sodium: 5,
    },
    commonIngredients: ['whole wheat flour', 'water', 'salt'],
    traditionalServing: 40,
    tags: ['bread', 'vegetarian', 'fiber-rich', 'staple'],
  },

  naan: {
    name: 'Naan',
    hindiName: 'नान',
    region: 'north',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'baked',
    nutritionPer100g: {
      calories: 310,
      protein: 9,
      carbs: 55,
      fat: 6,
      fiber: 3,
      sugar: 4,
      sodium: 480,
    },
    commonIngredients: ['refined flour', 'yogurt', 'ghee', 'yeast', 'salt'],
    traditionalServing: 80,
    tags: ['bread', 'vegetarian', 'tandoori', 'soft'],
  },

  paratha: {
    name: 'Paratha',
    hindiName: 'पराठा',
    region: 'north',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'grilled',
    nutritionPer100g: {
      calories: 320,
      protein: 8,
      carbs: 50,
      fat: 10,
      fiber: 6,
      sugar: 2,
      sodium: 420,
    },
    commonIngredients: ['whole wheat flour', 'ghee', 'salt', 'water'],
    traditionalServing: 60,
    tags: ['bread', 'vegetarian', 'ghee', 'layered'],
  },

  // === RICE DISHES ===
  pulao: {
    name: 'Pulao',
    hindiName: 'पुलाव',
    region: 'pan-indian',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'boiled',
    nutritionPer100g: {
      calories: 185,
      protein: 4,
      carbs: 38,
      fat: 3,
      fiber: 1,
      sugar: 2,
      sodium: 380,
    },
    commonIngredients: ['basmati rice', 'vegetables', 'whole spices', 'ghee'],
    traditionalServing: 150,
    tags: ['rice', 'vegetarian', 'aromatic', 'mild'],
  },

  'jeera rice': {
    name: 'Jeera Rice',
    hindiName: 'जीरा राइस',
    region: 'pan-indian',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'boiled',
    nutritionPer100g: {
      calories: 170,
      protein: 3,
      carbs: 35,
      fat: 2,
      fiber: 1,
      sugar: 1,
      sodium: 320,
    },
    commonIngredients: ['basmati rice', 'cumin seeds', 'ghee', 'salt'],
    traditionalServing: 150,
    tags: ['rice', 'vegetarian', 'simple', 'aromatic'],
  },

  // === STREET FOOD ===
  samosa: {
    name: 'Samosa',
    hindiName: 'समोसा',
    region: 'pan-indian',
    category: 'snack',
    spiceLevel: 'medium',
    cookingMethod: 'fried',
    nutritionPer100g: {
      calories: 308,
      protein: 6,
      carbs: 35,
      fat: 15,
      fiber: 3,
      sugar: 2,
      sodium: 450,
    },
    commonIngredients: ['refined flour', 'potatoes', 'peas', 'spices', 'oil'],
    traditionalServing: 50,
    tags: ['fried', 'vegetarian', 'snack', 'crispy'],
  },

  chaat: {
    name: 'Chaat',
    hindiName: 'चाट',
    region: 'north',
    category: 'snack',
    spiceLevel: 'medium',
    cookingMethod: 'raw',
    nutritionPer100g: {
      calories: 180,
      protein: 5,
      carbs: 25,
      fat: 8,
      fiber: 4,
      sugar: 6,
      sodium: 520,
    },
    commonIngredients: ['sev', 'chutneys', 'yogurt', 'onions', 'tomatoes', 'spices'],
    traditionalServing: 100,
    tags: ['street food', 'vegetarian', 'tangy', 'crunchy'],
  },

  // === SWEETS ===
  'gulab jamun': {
    name: 'Gulab Jamun',
    hindiName: 'गुलाब जामुन',
    region: 'pan-indian',
    category: 'sweet',
    spiceLevel: 'mild',
    cookingMethod: 'fried',
    nutritionPer100g: {
      calories: 387,
      protein: 6,
      carbs: 55,
      fat: 16,
      fiber: 1,
      sugar: 50,
      sodium: 45,
    },
    commonIngredients: ['milk powder', 'flour', 'sugar syrup', 'cardamom', 'ghee'],
    traditionalServing: 30,
    tags: ['sweet', 'vegetarian', 'dessert', 'festive'],
  },

  jalebi: {
    name: 'Jalebi',
    hindiName: 'जलेबी',
    region: 'pan-indian',
    category: 'sweet',
    spiceLevel: 'mild',
    cookingMethod: 'fried',
    nutritionPer100g: {
      calories: 416,
      protein: 3,
      carbs: 68,
      fat: 15,
      fiber: 0,
      sugar: 60,
      sodium: 25,
    },
    commonIngredients: ['refined flour', 'sugar syrup', 'saffron', 'cardamom', 'ghee'],
    traditionalServing: 40,
    tags: ['sweet', 'vegetarian', 'crispy', 'syrupy'],
  },

  kheer: {
    name: 'Kheer',
    hindiName: 'खीर',
    region: 'pan-indian',
    category: 'sweet',
    spiceLevel: 'mild',
    cookingMethod: 'boiled',
    nutritionPer100g: {
      calories: 180,
      protein: 4,
      carbs: 28,
      fat: 6,
      fiber: 0,
      sugar: 25,
      sodium: 55,
    },
    commonIngredients: ['milk', 'rice', 'sugar', 'cardamom', 'nuts'],
    traditionalServing: 100,
    tags: ['sweet', 'vegetarian', 'creamy', 'dessert'],
  },

  // === BEVERAGES ===
  lassi: {
    name: 'Lassi',
    hindiName: 'लस्सी',
    region: 'north',
    category: 'beverage',
    spiceLevel: 'mild',
    cookingMethod: 'raw',
    nutritionPer100g: {
      calories: 89,
      protein: 3,
      carbs: 12,
      fat: 3,
      fiber: 0,
      sugar: 11,
      sodium: 45,
    },
    commonIngredients: ['yogurt', 'water', 'sugar', 'salt', 'mint'],
    traditionalServing: 200,
    tags: ['drink', 'vegetarian', 'cooling', 'probiotic'],
  },

  chai: {
    name: 'Chai',
    hindiName: 'चाय',
    region: 'pan-indian',
    category: 'beverage',
    spiceLevel: 'mild',
    cookingMethod: 'boiled',
    nutritionPer100g: {
      calories: 45,
      protein: 2,
      carbs: 7,
      fat: 1,
      fiber: 0,
      sugar: 6,
      sodium: 15,
    },
    commonIngredients: ['tea leaves', 'milk', 'sugar', 'cardamom', 'ginger'],
    traditionalServing: 150,
    tags: ['drink', 'vegetarian', 'hot', 'spiced'],
  },

  // === VEGETABLES (SABJI) ===
  'aloo gobi': {
    name: 'Aloo Gobi',
    hindiName: 'आलू गोभी',
    region: 'north',
    category: 'main',
    spiceLevel: 'medium',
    cookingMethod: 'curry',
    nutritionPer100g: {
      calories: 90,
      protein: 3,
      carbs: 15,
      fat: 3,
      fiber: 4,
      sugar: 3,
      sodium: 380,
    },
    commonIngredients: ['potatoes', 'cauliflower', 'onions', 'tomatoes', 'spices'],
    traditionalServing: 120,
    tags: ['vegetarian', 'vegetables', 'dry curry', 'healthy'],
  },

  'palak paneer': {
    name: 'Palak Paneer',
    hindiName: 'पालक पनीर',
    region: 'north',
    category: 'main',
    spiceLevel: 'mild',
    cookingMethod: 'curry',
    nutritionPer100g: {
      calories: 145,
      protein: 9,
      carbs: 8,
      fat: 10,
      fiber: 3,
      sugar: 3,
      sodium: 420,
    },
    commonIngredients: ['spinach', 'paneer', 'onions', 'tomatoes', 'cream', 'spices'],
    traditionalServing: 120,
    tags: ['vegetarian', 'paneer', 'spinach', 'protein-rich'],
  },
};

// Export functions for easier access
export const getIndianFood = (name: string): IndianFoodData | null => {
  const key = name.toLowerCase();
  return INDIAN_FOOD_DATABASE[key] || null;
};

export const searchIndianFoods = (query: string): IndianFoodData[] => {
  const results: IndianFoodData[] = [];
  const searchTerm = query.toLowerCase();

  for (const [key, food] of Object.entries(INDIAN_FOOD_DATABASE)) {
    if (
      key.includes(searchTerm) ||
      food.name.toLowerCase().includes(searchTerm) ||
      food.hindiName?.includes(searchTerm) ||
      food.regionalName?.toLowerCase().includes(searchTerm) ||
      food.tags.some((tag) => tag.includes(searchTerm))
    ) {
      results.push(food);
    }
  }

  return results;
};

export const getFoodsByRegion = (region: string): IndianFoodData[] => {
  return Object.values(INDIAN_FOOD_DATABASE).filter(
    (food) => food.region === region || food.region === 'pan-indian'
  );
};

export const getFoodsByCategory = (category: string): IndianFoodData[] => {
  return Object.values(INDIAN_FOOD_DATABASE).filter((food) => food.category === category);
};

export const getTotalFoods = (): number => {
  return Object.keys(INDIAN_FOOD_DATABASE).length;
};

console.log(`✅ Indian Food Database loaded with ${getTotalFoods()} dishes`);
