/**
 * Regional Indian Cuisine Classification Data
 * Helps identify regional variations and cooking styles
 */

export const REGIONAL_CUISINE_DATA = {
  north: {
    states: ['punjab', 'haryana', 'delhi', 'uttar pradesh', 'rajasthan', 'himachal pradesh'],
    characteristics: {
      primaryFats: ['ghee', 'butter', 'cream'],
      commonSpices: ['garam masala', 'cardamom', 'cinnamon', 'cumin', 'coriander'],
      cookingMethods: ['tandoori', 'dum', 'tawa', 'curry'],
      grains: ['wheat', 'basmati rice'],
      proteins: ['paneer', 'chicken', 'mutton', 'dal'],
      specialIngredients: ['saffron', 'cashews', 'almonds', 'cream'],
      calorieModifier: 1.15, // Generally higher calories due to ghee/cream
      fatModifier: 1.25,
    },
    signature_dishes: [
      'butter chicken',
      'dal makhani',
      'biryani',
      'naan',
      'tandoori chicken',
      'rajma',
      'chole',
      'paratha',
      'kulcha',
      'sarson ka saag',
    ],
    flavor_profile: 'rich, creamy, aromatic, mild to medium spice',
  },

  south: {
    states: ['tamil nadu', 'kerala', 'karnataka', 'andhra pradesh', 'telangana'],
    characteristics: {
      primaryFats: ['coconut oil', 'sesame oil', 'ghee'],
      commonSpices: ['curry leaves', 'mustard seeds', 'fenugreek', 'tamarind', 'coriander'],
      cookingMethods: ['steaming', 'tempering', 'fermenting', 'coconut-based'],
      grains: ['rice', 'ragi', 'semolina'],
      proteins: ['fish', 'prawns', 'lentils', 'coconut'],
      specialIngredients: ['coconut', 'tamarind', 'curry leaves', 'kokum'],
      calorieModifier: 1.05, // Moderate calories, coconut-based
      fatModifier: 1.1,
    },
    signature_dishes: [
      'dosa',
      'idli',
      'sambar',
      'rasam',
      'fish curry',
      'vada',
      'uttapam',
      'coconut chutney',
      'avial',
      'pongal',
      'chettinad chicken',
    ],
    flavor_profile: 'tangy, coconutty, fermented, hot to medium spice',
  },

  east: {
    states: ['west bengal', 'odisha', 'jharkhand', 'bihar', 'assam'],
    characteristics: {
      primaryFats: ['mustard oil', 'ghee'],
      commonSpices: ['panch phoron', 'mustard seeds', 'nigella seeds', 'turmeric'],
      cookingMethods: ['steaming', 'light curry', 'fish preparation'],
      grains: ['rice', 'wheat'],
      proteins: ['fish', 'prawns', 'mutton', 'paneer'],
      specialIngredients: ['mustard oil', 'poppy seeds', 'hilsa fish', 'jaggery'],
      calorieModifier: 1.0, // Baseline calories
      fatModifier: 1.0,
    },
    signature_dishes: [
      'fish curry',
      'prawn malai curry',
      'mishti doi',
      'rosogolla',
      'kathi roll',
      'aloo posto',
      'shukto',
      'chingri machher jhol',
    ],
    flavor_profile: 'subtle, sweet, fish-forward, mild spice',
  },

  west: {
    states: ['gujarat', 'maharashtra', 'rajasthan', 'goa'],
    characteristics: {
      primaryFats: ['groundnut oil', 'coconut oil', 'ghee'],
      commonSpices: ['jaggery', 'tamarind', 'mustard seeds', 'sesame seeds'],
      cookingMethods: ['steaming', 'dry roasting', 'fermenting'],
      grains: ['bajra', 'jowar', 'rice', 'wheat'],
      proteins: ['legumes', 'fish', 'chicken', 'paneer'],
      specialIngredients: ['jaggery', 'kokum', 'peanuts', 'sesame'],
      calorieModifier: 1.08, // Moderate to high due to fried items
      fatModifier: 1.15,
    },
    signature_dishes: [
      'dhokla',
      'thepla',
      'pav bhaji',
      'vada pav',
      'undhiyu',
      'fish curry',
      'puran poli',
      'misal pav',
      'bhel puri',
    ],
    flavor_profile: 'sweet-savory, tangy, street food style, medium spice',
  },

  northeast: {
    states: [
      'assam',
      'manipur',
      'nagaland',
      'mizoram',
      'arunachal pradesh',
      'tripura',
      'meghalaya',
      'sikkim',
    ],
    characteristics: {
      primaryFats: ['mustard oil', 'sesame oil'],
      commonSpices: ['ginger', 'garlic', 'green chili', 'turmeric'],
      cookingMethods: ['steaming', 'boiling', 'fermenting', 'smoking'],
      grains: ['rice', 'millet'],
      proteins: ['fish', 'pork', 'chicken', 'bamboo shoots'],
      specialIngredients: ['bamboo shoots', 'fermented fish', 'bhut jolokia'],
      calorieModifier: 0.95, // Generally lighter preparations
      fatModifier: 0.9,
    },
    signature_dishes: [
      'fish tenga',
      'bamboo shoot curry',
      'thukpa',
      'momos',
      'pitha',
      'khar',
      'masor tenga',
    ],
    flavor_profile: 'simple, fermented, extremely spicy, unique ingredients',
  },
};

// Regional spice level defaults
export const REGIONAL_SPICE_LEVELS = {
  north: 'medium',
  south: 'hot',
  east: 'mild',
  west: 'medium',
  northeast: 'extra_hot',
} as const;

// Regional cooking method preferences
export const REGIONAL_COOKING_METHODS = {
  north: ['tandoori', 'dum', 'curry', 'fried'],
  south: ['steamed', 'tempering', 'curry', 'fermented'],
  east: ['curry', 'steamed', 'fried', 'boiled'],
  west: ['steamed', 'fried', 'dry roasted', 'curry'],
  northeast: ['steamed', 'boiled', 'smoked', 'fermented'],
} as const;

// Helper functions
export const getRegionalCharacteristics = (region: keyof typeof REGIONAL_CUISINE_DATA) => {
  return (
    REGIONAL_CUISINE_DATA[region]?.characteristics || REGIONAL_CUISINE_DATA.north.characteristics
  );
};

export const isRegionalDish = (
  dishName: string,
  region: keyof typeof REGIONAL_CUISINE_DATA
): boolean => {
  const regionData = REGIONAL_CUISINE_DATA[region];
  if (!regionData) return false;

  const lowerDishName = dishName.toLowerCase();
  return regionData.signature_dishes.some(
    (dish) =>
      lowerDishName.includes(dish.toLowerCase()) || dish.toLowerCase().includes(lowerDishName)
  );
};

export const detectRegionFromDish = (
  dishName: string
): keyof typeof REGIONAL_CUISINE_DATA | null => {
  const lowerDishName = dishName.toLowerCase();

  for (const [region, data] of Object.entries(REGIONAL_CUISINE_DATA)) {
    if (
      data.signature_dishes.some(
        (dish) =>
          lowerDishName.includes(dish.toLowerCase()) || dish.toLowerCase().includes(lowerDishName)
      )
    ) {
      return region as keyof typeof REGIONAL_CUISINE_DATA;
    }
  }

  return null;
};

export const getCalorieModifier = (region: keyof typeof REGIONAL_CUISINE_DATA): number => {
  return REGIONAL_CUISINE_DATA[region]?.characteristics.calorieModifier || 1.0;
};

export const getFatModifier = (region: keyof typeof REGIONAL_CUISINE_DATA): number => {
  return REGIONAL_CUISINE_DATA[region]?.characteristics.fatModifier || 1.0;
};

export default REGIONAL_CUISINE_DATA;
