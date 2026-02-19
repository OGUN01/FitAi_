import { ValidationResult } from "../types";

export function warnVeganProteinLimitations(
  dietType: string,
  allergies: string[],
  protein: number,
): ValidationResult {
  const VEGAN_SOURCES = [
    "soy",
    "tofu",
    "legumes",
    "beans",
    "nuts",
    "peanuts",
    "seeds",
  ];
  const hasProteinAllergies = allergies.some((a) =>
    VEGAN_SOURCES.some((source) => a.toLowerCase().includes(source)),
  );

  if (dietType === "vegan" && hasProteinAllergies && protein > 150) {
    return {
      status: "WARNING",
      code: "LIMITED_VEGAN_PROTEIN",
      message: "Limited vegan protein sources due to allergies",
      recommendations: [
        `Target protein (${protein}g) may be difficult - adjusted to ${Math.round(protein * 0.9)}g`,
        "💊 Consider pea/rice protein powder",
        "🌾 Focus on quinoa, hemp, chia",
        "🥦 Combine incomplete proteins",
        "🩺 May need B12, iron, omega-3 supplements",
      ],
      canProceed: true,
    };
  }
  return { status: "OK" };
}
