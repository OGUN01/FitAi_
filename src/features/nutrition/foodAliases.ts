// Curated aliases and normalization helpers for ingredient name mapping

export const FOOD_ALIASES: Record<string, string> = {
  // Legumes / pulses
  "garbanzo beans": "chickpeas",
  "chana": "chickpeas",
  "kabuli chana": "chickpeas",
  "rajma": "kidney beans",
  "urad dal": "black gram",
  "toor dal": "pigeon peas",
  "chole": "chickpeas",

  // Vegetables
  "aubergine": "eggplant",
  "brinjal": "eggplant",
  "ladyfinger": "okra",
  "bhindi": "okra",
  "capsicum": "bell pepper",
  "coriander": "cilantro",
  "curd": "yogurt",

  // Grains / breads
  "whole wheat roti": "whole wheat flatbread",
  "chapati": "whole wheat flatbread",
  "paratha": "whole wheat flatbread",

  // Dairy / substitutes
  "paneer": "cottage cheese",

  // General
  "bell peppers": "bell pepper",
  "mixed greens": "lettuce",
  "plant milk": "almond milk",
};

export function normalizeName(name: string): string {
  let s = (name || '').toLowerCase().trim();
  s = s.replace(/[^a-z0-9\s]/g, ' '); // remove punctuation/specials
  s = s.replace(/\b(grilled|spicy|fresh|organic|crispy|homemade|vegan|vegetarian|low-fat|low fat|roasted|baked|boiled|steamed)\b/g, '').trim();
  s = s.replace(/\s+/g, ' ');
  // singularize simple plurals
  if (s.endsWith('es')) s = s.slice(0, -2);
  else if (s.endsWith('s')) s = s.slice(0, -1);
  // alias
  if (FOOD_ALIASES[s]) return FOOD_ALIASES[s];
  return s;
}

