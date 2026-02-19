import { CookingMethod, SpiceLevel, GeminiFoodData } from "./types";

export class CookingMethodDetector {
  detectCookingMethod(geminiFood: GeminiFoodData): CookingMethod {
    const description = (
      geminiFood.name +
      " " +
      (geminiFood.analysisNotes || "")
    ).toLowerCase();

    if (
      this.containsAny(description, [
        "fried",
        "pakora",
        "bhaji",
        "samosa",
        "kachori",
      ])
    ) {
      return "fried";
    }

    if (this.containsAny(description, ["steamed", "idli", "dhokla", "modak"])) {
      return "steamed";
    }

    if (
      this.containsAny(description, ["tandoori", "baked", "naan", "kulcha"])
    ) {
      return "baked";
    }

    if (this.containsAny(description, ["grilled", "tikka", "kebab", "seekh"])) {
      return "grilled";
    }

    if (
      this.containsAny(description, [
        "curry",
        "gravy",
        "masala",
        "dal",
        "sabji",
      ])
    ) {
      return "curry";
    }

    return "curry";
  }

  detectSpiceLevel(geminiFood: GeminiFoodData, region: string): SpiceLevel {
    const name = geminiFood.name.toLowerCase();

    if (this.containsAny(name, ["vindaloo", "madras", "chettinad"])) {
      return "extra_hot";
    }

    if (this.containsAny(name, ["pepper", "chili", "spicy", "hot"])) {
      return "hot";
    }

    if (this.containsAny(name, ["korma", "malai", "makhani", "shahi"])) {
      return "mild";
    }

    const regionalDefaults = {
      south: "hot",
      north: "medium",
      west: "medium",
      east: "medium",
    };

    return (regionalDefaults[region as keyof typeof regionalDefaults] ||
      "medium") as SpiceLevel;
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}

export const cookingMethodDetector = new CookingMethodDetector();
