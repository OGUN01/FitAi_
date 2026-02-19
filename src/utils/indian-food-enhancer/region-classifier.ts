import { RegionType } from "./types";

export class RegionClassifier {
  classifyRegion(foodName: string): RegionType {
    const name = foodName.toLowerCase();

    if (
      this.containsAny(name, [
        "naan",
        "tandoori",
        "butter",
        "paneer",
        "rajma",
        "chole",
        "kulcha",
        "paratha",
      ])
    ) {
      return "north";
    }

    if (
      this.containsAny(name, [
        "dosa",
        "idli",
        "sambar",
        "rasam",
        "vada",
        "uttapam",
        "coconut",
        "curry leaf",
      ])
    ) {
      return "south";
    }

    if (
      this.containsAny(name, [
        "fish",
        "prawn",
        "mishti",
        "doi",
        "rosogolla",
        "rasgulla",
        "bengali",
      ])
    ) {
      return "east";
    }

    if (
      this.containsAny(name, [
        "dhokla",
        "thepla",
        "pav bhaji",
        "vada pav",
        "gujarati",
        "undhiyu",
      ])
    ) {
      return "west";
    }

    return "north";
  }

  private containsAny(text: string, keywords: string[]): boolean {
    return keywords.some((keyword) => text.includes(keyword));
  }
}

export const regionClassifier = new RegionClassifier();
