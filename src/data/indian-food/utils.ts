import { IndianFoodData } from "./types";
import { NORTH_INDIAN_DISHES } from "./northIndian";
import { SOUTH_INDIAN_DISHES } from "./southIndian";
import { EAST_WEST_INDIAN_DISHES } from "./eastWestIndian";
import { BREADS_AND_RICE } from "./breadsAndRice";
import { SNACKS_SWEETS_BEVERAGES } from "./snacksAndSweets";

const INDIAN_FOOD_DATABASE: Record<string, IndianFoodData> = {
  ...NORTH_INDIAN_DISHES,
  ...SOUTH_INDIAN_DISHES,
  ...EAST_WEST_INDIAN_DISHES,
  ...BREADS_AND_RICE,
  ...SNACKS_SWEETS_BEVERAGES,
};

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
    (food) => food.region === region || food.region === "pan-indian",
  );
};

export const getFoodsByCategory = (category: string): IndianFoodData[] => {
  return Object.values(INDIAN_FOOD_DATABASE).filter(
    (food) => food.category === category,
  );
};

export const getTotalFoods = (): number => {
  return Object.keys(INDIAN_FOOD_DATABASE).length;
};
