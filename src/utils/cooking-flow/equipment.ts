import { CookingMethod } from "./types";

export function getEquipment(
  method: CookingMethod,
  ingredients: string[],
): string[] {
  const baseEquipment = ["Knife", "Cutting board"];

  switch (method) {
    case "scrambled":
      return [...baseEquipment, "Non-stick pan", "Spatula", "Whisk"];
    case "grilled":
      return [...baseEquipment, "Grill pan", "Tongs"];
    case "stir-fry":
      return [...baseEquipment, "Wok or large pan", "Wooden spoon"];
    case "curry":
      return [...baseEquipment, "Heavy-bottomed pot", "Wooden spoon"];
    case "salad":
      return [...baseEquipment, "Large bowl", "Salad tongs"];
    case "smoothie":
      return ["Blender", "Measuring cups"];
    case "soup":
      return [...baseEquipment, "Large pot", "Ladle", "Immersion blender"];
    case "roasted":
      return [...baseEquipment, "Oven", "Roasting pan", "Meat thermometer"];
    case "steamed":
      return [...baseEquipment, "Steamer basket", "Large pot with lid"];
    case "baked":
      return [...baseEquipment, "Oven", "Baking dish"];
    default:
      return [...baseEquipment, "Medium pan"];
  }
}
