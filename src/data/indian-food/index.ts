import { IndianFoodData } from "./types";
import { NORTH_INDIAN_DISHES } from "./northIndian";
import { SOUTH_INDIAN_DISHES } from "./southIndian";
import { EAST_WEST_INDIAN_DISHES } from "./eastWestIndian";
import { BREADS_AND_RICE } from "./breadsAndRice";
import { SNACKS_SWEETS_BEVERAGES } from "./snacksAndSweets";

export { IndianFoodData } from "./types";

export const INDIAN_FOOD_DATABASE: Record<string, IndianFoodData> = {
  ...NORTH_INDIAN_DISHES,
  ...SOUTH_INDIAN_DISHES,
  ...EAST_WEST_INDIAN_DISHES,
  ...BREADS_AND_RICE,
  ...SNACKS_SWEETS_BEVERAGES,
};

export * from "./utils";
