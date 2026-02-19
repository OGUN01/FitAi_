import {
  INDIAN_FOOD_DATABASE,
  IndianFoodData,
} from "../../data/indianFoodDatabase";

export class DatabaseMatcher {
  findDatabaseMatch(foodName: string): IndianFoodData | null {
    let match = INDIAN_FOOD_DATABASE[foodName];
    if (match) return match;

    const variations = this.generateFoodVariations(foodName);
    for (const variation of variations) {
      match = INDIAN_FOOD_DATABASE[variation];
      if (match) return match;
    }

    for (const [dbName, data] of Object.entries(INDIAN_FOOD_DATABASE)) {
      if (this.isPartialMatch(foodName, dbName)) {
        return data;
      }
    }

    return null;
  }

  generateFoodVariations(foodName: string): string[] {
    const variations: string[] = [];

    const cleanName = foodName
      .replace(/\b(chicken|mutton|paneer|veg|vegetable)\s*/gi, "")
      .replace(/\s*(curry|masala|fry|dry|gravy)\b/gi, "")
      .trim();

    variations.push(cleanName);

    const commonVariations = {
      biriyani: "biryani",
      daal: "dal",
      roti: "chapati",
      sabzi: "sabji",
      aloo: "potato",
      palak: "spinach",
    };

    for (const [from, to] of Object.entries(commonVariations)) {
      if (foodName.includes(from)) {
        variations.push(foodName.replace(from, to));
      }
      if (foodName.includes(to)) {
        variations.push(foodName.replace(to, from));
      }
    }

    return Array.from(new Set(variations));
  }

  isPartialMatch(name1: string, name2: string): boolean {
    const words1 = name1.split(" ");
    const words2 = name2.split(" ");

    for (const word1 of words1) {
      if (word1.length > 3) {
        for (const word2 of words2) {
          if (word2.includes(word1) || word1.includes(word2)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}

export const databaseMatcher = new DatabaseMatcher();
