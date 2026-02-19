import { CookingFlow, CookingStep, DayMeal } from "./types";
import { detectCookingMethod } from "./method-detector";
import { getEquipment } from "./equipment";
import { generateStepsByMethod } from "./step-generators";
import { generateProTips } from "./tips-generator";

class CookingFlowGenerator {
  public generateCookingFlow(meal: DayMeal): CookingFlow {
    const method = detectCookingMethod(meal.name);
    const steps = generateStepsByMethod(method, meal);
    const equipment = getEquipment(
      method,
      meal.items
        ?.map((item) => item.name ?? "")
        .filter((name) => name.length > 0) || [],
    );
    const proTips = generateProTips(meal, method);

    const totalTime = steps.reduce(
      (sum, step) => sum + (step.timeRequired || 0),
      0,
    );

    let difficulty: "easy" | "medium" | "hard" = "easy";
    if (steps.length > 6 || totalTime > 30) {
      difficulty = "hard";
    } else if (steps.length > 4 || totalTime > 15) {
      difficulty = "medium";
    }

    return {
      steps,
      totalTime,
      difficulty,
      equipmentNeeded: equipment,
      proTips,
    };
  }

  public getStepSpecificTips(step: CookingStep, meal: DayMeal): string[] {
    const tips: string[] = [];

    if (step.tips) {
      tips.push(step.tips);
    }

    if (step.timeRequired && step.timeRequired > 5) {
      tips.push(
        `⏰ This step takes ${step.timeRequired} minutes - perfect time to prep the next step`,
      );
    }

    if (step.instruction.toLowerCase().includes("high heat")) {
      tips.push(
        "🔥 Stay attentive with high heat - things can go from perfect to burnt quickly",
      );
    }

    return tips.filter(Boolean);
  }

  public getCookingEncouragement(
    currentStep: number,
    totalSteps: number,
  ): string {
    const progress = (currentStep / totalSteps) * 100;

    if (progress <= 20) {
      return "🚀 Great start! You're building the foundation of something delicious!";
    } else if (progress <= 40) {
      return "👏 Looking good! The aromas should start developing soon!";
    } else if (progress <= 60) {
      return "🔥 Fantastic progress! You're really hitting your stride now!";
    } else if (progress <= 80) {
      return "⚡ Almost there! The final touches make all the difference!";
    } else {
      return "🎉 You're a cooking champion! Time to enjoy your masterpiece!";
    }
  }
}

export const cookingFlowGenerator = new CookingFlowGenerator();
