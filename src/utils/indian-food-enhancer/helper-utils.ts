import { IndianFoodData } from "../../data/indianFoodDatabase";
import { GeminiFoodData, FoodCategory, ServingDescription } from "./types";

export class HelperUtils {
  containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }

  standardizeFoodName(name: string): string {
    return name
      .replace(/biriyani/gi, "biryani")
      .replace(/daal/gi, "dal")
      .replace(/\bchana\b/gi, "chana")
      .trim();
  }

  categorizeFood(foodName: string): FoodCategory {
    if (
      this.containsAny(foodName, [
        "biryani",
        "curry",
        "dal",
        "sabji",
        "rice",
        "roti",
        "naan",
      ])
    ) {
      return "main";
    }

    if (
      this.containsAny(foodName, [
        "raita",
        "pickle",
        "chutney",
        "papad",
        "salad",
      ])
    ) {
      return "side";
    }

    if (
      this.containsAny(foodName, [
        "samosa",
        "pakora",
        "chaat",
        "bhaji",
        "tikki",
      ])
    ) {
      return "snack";
    }

    if (
      this.containsAny(foodName, [
        "sweet",
        "dessert",
        "halwa",
        "kheer",
        "gulab",
        "jalebi",
        "laddu",
      ])
    ) {
      return "sweet";
    }

    if (
      this.containsAny(foodName, ["lassi", "chai", "juice", "drink", "water"])
    ) {
      return "beverage";
    }

    return "main";
  }

  determineServingType(grams: number): ServingDescription {
    if (grams < 75) return "small";
    if (grams < 150) return "medium";
    if (grams < 250) return "large";
    return "traditional";
  }

  calculateConfidence(
    dbMatch: IndianFoodData | null,
    geminiFood: GeminiFoodData,
    region: string,
  ): number {
    let confidence = geminiFood.confidence || 70;

    if (dbMatch) {
      confidence += 20;
    }

    if (region) {
      confidence += 5;
    }

    return Math.min(95, Math.round(confidence));
  }

  enhanceIngredients(
    originalIngredients: string[],
    foodName: string,
    region: string,
  ): string[] {
    const ingredients = [...originalIngredients];

    const spiceMap = {
      biryani: [
        "basmati rice",
        "saffron",
        "cardamom",
        "cinnamon",
        "bay leaves",
        "fried onions",
      ],
      dal: ["lentils", "turmeric", "cumin", "mustard seeds", "curry leaves"],
      curry: ["onions", "tomatoes", "ginger", "garlic", "garam masala"],
      tandoori: [
        "yogurt",
        "red chili powder",
        "tandoori masala",
        "lemon juice",
      ],
    };

    const regionalIngredients = {
      south: ["coconut", "curry leaves", "tamarind", "mustard seeds"],
      north: ["ghee", "cream", "cashews", "cardamom"],
      east: ["mustard oil", "panch phoron", "poppy seeds"],
      west: ["jaggery", "kokum", "peanuts", "sesame seeds"],
    };

    for (const [pattern, spices] of Object.entries(spiceMap)) {
      if (foodName.includes(pattern)) {
        ingredients.push(
          ...spices.filter((spice) => !ingredients.includes(spice)),
        );
      }
    }

    const regionSpices =
      regionalIngredients[region as keyof typeof regionalIngredients] || [];
    ingredients.push(
      ...regionSpices.filter((spice) => !ingredients.includes(spice)),
    );

    return Array.from(new Set(ingredients));
  }
}

export const helperUtils = new HelperUtils();
