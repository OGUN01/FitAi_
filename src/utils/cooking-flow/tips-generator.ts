import { CookingMethod, DayMeal } from "./types";

export function generateProTips(
  meal: DayMeal,
  method: CookingMethod,
): string[] {
  const tips: string[] = [];
  const ingredients =
    meal.items
      ?.map((item) => (item.name ?? "").toLowerCase())
      .filter((name) => name.length > 0) || [];

  switch (method) {
    case "scrambled":
      tips.push(
        "Remove from heat while slightly underdone - residual heat will finish cooking",
      );
      break;
    case "stir-fry":
      tips.push(
        "Have all ingredients prepped before you start - stir-frying is fast!",
      );
      break;
    case "curry":
      tips.push(
        "Let curry rest off heat for 5-10 minutes before serving for flavors to meld",
      );
      break;
    case "salad":
      tips.push("Dress salad just before serving to prevent wilting");
      break;
  }

  ingredients.forEach((ingredient) => {
    if (
      ingredient.includes("protein") ||
      ingredient.includes("chicken") ||
      ingredient.includes("paneer")
    ) {
      tips.push(
        "Cook protein thoroughly but avoid overcooking to maintain tenderness",
      );
    }
    if (
      ingredient.includes("vegetable") ||
      ingredient.includes("spinach") ||
      ingredient.includes("broccoli")
    ) {
      tips.push(
        "Cook vegetables until tender-crisp to retain nutrients and texture",
      );
    }
    if (
      ingredient.includes("spice") ||
      ingredient.includes("garlic") ||
      ingredient.includes("onion")
    ) {
      tips.push("Sauté aromatics until fragrant to develop deep flavors");
    }
  });

  if (meal.difficulty === "easy") {
    tips.push("Take your time - simple dishes rely on good technique");
  } else if (meal.difficulty === "hard") {
    tips.push("Read through all steps before starting");
  }

  if (meal.preparationTime && meal.preparationTime < 15) {
    tips.push("Quick meals benefit from having everything prepped first");
  }

  return tips.slice(0, 3);
}
