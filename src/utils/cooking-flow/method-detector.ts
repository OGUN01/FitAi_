import { CookingMethod } from "./types";

export function detectCookingMethod(mealName: string): CookingMethod {
  const name = mealName.toLowerCase();

  if (name.includes("scrambled") || name.includes("scramble"))
    return "scrambled";
  if (name.includes("grilled") || name.includes("grill")) return "grilled";
  if (name.includes("stir-fry") || name.includes("stir fry")) return "stir-fry";
  if (name.includes("curry")) return "curry";
  if (name.includes("salad")) return "salad";
  if (name.includes("smoothie") || name.includes("shake")) return "smoothie";
  if (name.includes("soup")) return "soup";
  if (name.includes("roasted") || name.includes("roast")) return "roasted";
  if (name.includes("steamed")) return "steamed";
  if (name.includes("boiled")) return "boiled";
  if (name.includes("baked") || name.includes("bake")) return "baked";
  if (name.includes("fried") || name.includes("fry")) return "fried";
  if (name.includes("sautéed") || name.includes("saute")) return "sauteed";

  return "general";
}
