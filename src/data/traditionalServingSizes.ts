/**
 * Traditional Indian Serving Sizes
 * Based on authentic Indian portion standards, not Western portions
 * All measurements in grams
 */

export const TRADITIONAL_SERVING_SIZES = {
  // General serving sizes (pan-Indian)
  general: {
    'rice': 150,
    'dal': 100,
    'curry': 120,
    'sabji': 80,
    'roti': 40,
    'naan': 80,
    'paratha': 60,
    'dosa': 80,
    'idli': 60,
    'samosa': 50,
    'sweet': 30,
    'lassi': 200,
    'chai': 150
  },

  // North Indian serving sizes
  north: {
    'biryani': 200,
    'pulao': 150,
    'dal makhani': 120,
    'butter chicken': 150,
    'paneer curry': 120,
    'rajma': 150,
    'chole': 150,
    'naan': 80,
    'roti': 40,
    'paratha': 60,
    'kulcha': 70,
    'lassi': 200,
    'chai': 150,
    'gulab jamun': 30,
    'kheer': 100,
    'raita': 60,
    'pickle': 10,
    'papad': 15
  },

  // South Indian serving sizes
  south: {
    'dosa': 80,
    'idli': 60,
    'vada': 50,
    'uttapam': 90,
    'sambar': 150,
    'rasam': 200,
    'coconut chutney': 30,
    'fish curry': 150,
    'rice': 150,
    'curd rice': 120,
    'pongal': 100,
    'payasam': 80,
    'banana leaf meal': 300, // Complete meal
    'filter coffee': 100,
    'buttermilk': 180,
    'appam': 60,
    'puttu': 80
  },

  // East Indian serving sizes
  east: {
    'fish curry': 150,
    'prawn curry': 120,
    'rice': 150,
    'dal': 100,
    'aloo posto': 80,
    'shukto': 100,
    'mishti doi': 100,
    'rosogolla': 25,
    'sandesh': 20,
    'rasgulla': 25,
    'kathi roll': 120,
    'fish fry': 80,
    'ilish fish': 100,
    'chingri malai': 120,
    'luchi': 30,
    'paratha': 50
  },

  // West Indian serving sizes
  west: {
    'dhokla': 80,
    'thepla': 50,
    'pav bhaji': 200, // Including pav
    'vada pav': 100,
    'misal pav': 180,
    'bhel puri': 100,
    'pani puri': 80, // 6-8 pieces
    'dahi puri': 90,
    'undhiyu': 120,
    'handvo': 70,
    'fafda': 60,
    'jalebi': 40,
    'puran poli': 80,
    'sol kadhi': 150,
    'kokum drink': 180,
    'modak': 35,
    'shrikhand': 80
  },

  // Street food serving sizes
  street_food: {
    'pani puri': 80, // 6-8 pieces
    'bhel puri': 100,
    'dahi puri': 90,
    'aloo tikki': 60,
    'chaat': 100,
    'samosa': 50,
    'kachori': 60,
    'chole kulche': 200,
    'vada pav': 100,
    'pav bhaji': 200,
    'dosa': 80,
    'uttapam': 90,
    'momos': 80, // 6-8 pieces
    'rolls': 120,
    'frankies': 150
  },

  // Festive/special occasion serving sizes
  festive: {
    'biryani': 250, // Festive portion
    'pulao': 180,
    'gulab jamun': 40, // 2 pieces
    'jalebi': 50,
    'kheer': 120,
    'halwa': 80,
    'laddu': 25, // 1 piece
    'barfi': 20, // 1 piece
    'rasgulla': 35, // 2 pieces
    'sandesh': 30,
    'payasam': 100,
    'shrikhand': 100,
    'modak': 50, // 2 pieces
    'peda': 15, // 1 piece
    'kaju katli': 10, // 1 piece
    'mysore pak': 25
  },

  // Snack serving sizes
  snacks: {
    'namkeen': 30,
    'mixture': 40,
    'bhujia': 25,
    'mathri': 20,
    'shakkar pare': 30,
    'murmura': 25,
    'poha': 80,
    'upma': 100,
    'sevaiyan': 80,
    'daliya': 100,
    'khichdi': 120,
    'rajgira laddu': 20,
    'chivda': 35,
    'dry fruits': 20,
    'nuts': 15
  },

  // Beverage serving sizes
  beverages: {
    'chai': 150,
    'coffee': 100,
    'lassi': 200,
    'buttermilk': 180,
    'nimbu pani': 200,
    'sugarcane juice': 200,
    'coconut water': 200,
    'aam panna': 180,
    'thandai': 150,
    'masala milk': 200,
    'filter coffee': 100,
    'solkadhi': 150,
    'kokum drink': 180,
    'jaljeera': 200,
    'aam panna': 180
  }
};

// Regional meal combinations (complete meals)
export const TRADITIONAL_MEAL_COMBINATIONS = {
  north_indian_thali: {
    totalServing: 450,
    components: {
      'rice': 100,
      'dal': 80,
      'sabji': 70,
      'roti': 80, // 2 pieces
      'raita': 50,
      'pickle': 10,
      'sweet': 25,
      'papad': 10
    }
  },

  south_indian_meal: {
    totalServing: 400,
    components: {
      'rice': 120,
      'sambar': 100,
      'rasam': 80,
      'vegetables': 60,
      'curd': 40,
      'pickle': 5,
      'papad': 10
    }
  },

  gujarati_thali: {
    totalServing: 380,
    components: {
      'rice': 80,
      'dal': 60,
      'sabji': 100, // 2 varieties
      'roti': 60, // 2 pieces
      'raita': 40,
      'pickle': 5,
      'sweet': 30,
      'farsan': 15
    }
  },

  punjabi_meal: {
    totalServing: 500,
    components: {
      'rice': 100,
      'dal': 100,
      'curry': 120,
      'roti': 80, // 2 pieces
      'raita': 50,
      'pickle': 10,
      'lassi': 200,
      'sweet': 30
    }
  }
};

// Helper functions
export const getServingSize = (foodName: string, region?: string): number => {
  const lowerFoodName = foodName.toLowerCase();
  
  // Check region-specific first
  if (region && TRADITIONAL_SERVING_SIZES[region as keyof typeof TRADITIONAL_SERVING_SIZES]) {
    const regionalSizes = TRADITIONAL_SERVING_SIZES[region as keyof typeof TRADITIONAL_SERVING_SIZES];
    for (const [food, size] of Object.entries(regionalSizes)) {
      if (lowerFoodName.includes(food)) {
        return size;
      }
    }
  }
  
  // Check general serving sizes
  for (const [food, size] of Object.entries(TRADITIONAL_SERVING_SIZES.general)) {
    if (lowerFoodName.includes(food)) {
      return size;
    }
  }
  
  // Check category-based serving sizes
  const categories = ['street_food', 'festive', 'snacks', 'beverages'];
  for (const category of categories) {
    const categorySizes = TRADITIONAL_SERVING_SIZES[category as keyof typeof TRADITIONAL_SERVING_SIZES];
    for (const [food, size] of Object.entries(categorySizes)) {
      if (lowerFoodName.includes(food)) {
        return size;
      }
    }
  }
  
  // Default serving size based on food type
  if (lowerFoodName.includes('sweet') || lowerFoodName.includes('dessert')) return 30;
  if (lowerFoodName.includes('drink') || lowerFoodName.includes('juice')) return 200;
  if (lowerFoodName.includes('bread') || lowerFoodName.includes('roti')) return 40;
  if (lowerFoodName.includes('rice') || lowerFoodName.includes('biryani')) return 150;
  if (lowerFoodName.includes('dal') || lowerFoodName.includes('curry')) return 100;
  
  return 100; // Default serving
};

export const getRegionalServingSizes = (region: string): Record<string, number> => {
  return TRADITIONAL_SERVING_SIZES[region as keyof typeof TRADITIONAL_SERVING_SIZES] || 
         TRADITIONAL_SERVING_SIZES.general;
};

export const isSmallServing = (grams: number): boolean => {
  return grams < 75;
};

export const isMediumServing = (grams: number): boolean => {
  return grams >= 75 && grams < 150;
};

export const isLargeServing = (grams: number): boolean => {
  return grams >= 150 && grams < 250;
};

export const isTraditionalServing = (grams: number): boolean => {
  return grams >= 250;
};

export const categorizeServingSize = (grams: number): 'small' | 'medium' | 'large' | 'traditional' => {
  if (isSmallServing(grams)) return 'small';
  if (isMediumServing(grams)) return 'medium';
  if (isLargeServing(grams)) return 'large';
  return 'traditional';
};

export default TRADITIONAL_SERVING_SIZES;