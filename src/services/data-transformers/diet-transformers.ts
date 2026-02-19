import { generateUUID } from "../../utils/uuid";
import { DayMeal } from "../../types/ai";
import { Meal, MealItem, Food, FoodCategory } from "../../types/diet";
import { WorkersDietResponse, WorkersMeal, WorkersFood } from "./types";
import { getDayOfWeek } from "./helpers";

export function transformDietResponse(
  workersResponse: WorkersDietResponse,
  userId: string,
  date: string = new Date().toISOString(),
): DayMeal {
  if (!workersResponse.success) {
    throw new Error("Workers API returned unsuccessful response");
  }

  const { data, metadata } = workersResponse;

  const meals: Meal[] = data.meals.map((workersMeal) => {
    return transformWorkersMealToAppMeal(workersMeal);
  });

  const dayMeal: DayMeal = {
    id: generateUUID(),
    type: "breakfast",
    name: data.title || "Daily Meal Plan",
    description: metadata.cuisine
      ? `${metadata.cuisine} cuisine meal plan`
      : "AI-generated meal plan",
    items: [],
    totalCalories: data.dailyTotals.calories,
    totalMacros: {
      protein: data.dailyTotals.protein,
      carbohydrates: data.dailyTotals.carbs,
      fat: data.dailyTotals.fat,
      fiber: 0,
    },
    preparationTime: calculateTotalPrepTime(data.meals),
    cookingTime: calculateTotalCookingTime(data.meals),
    cookingInstructions: buildCombinedCookingInstructions(data.meals),
    difficulty: determineDifficulty(data.meals),
    tags: buildTags(data.meals, metadata),
    dayOfWeek: getDayOfWeek(date),
    isPersonalized: true,
    aiGenerated: true,
    createdAt: new Date().toISOString(),
  };

  return dayMeal;
}

function transformWorkersMealToAppMeal(workersMeal: WorkersMeal): Meal {
  const mealId = generateUUID();

  const items: MealItem[] = workersMeal.foods.map((workersFood) => {
    return transformWorkersFoodToMealItem(workersFood);
  });

  const meal: Meal = {
    id: mealId,
    type: workersMeal.type,
    name: workersMeal.name,
    items,
    totalCalories: workersMeal.totalNutrition.calories,
    totalMacros: {
      protein: workersMeal.totalNutrition.protein,
      carbohydrates: workersMeal.totalNutrition.carbs,
      fat: workersMeal.totalNutrition.fat,
      fiber: 0,
    },
    prepTime: workersMeal.preparationTime || 15,
    cookTime: workersMeal.cookingInstructions ? 30 : undefined,
    difficulty:
      workersMeal.cookingInstructions &&
      workersMeal.cookingInstructions.length > 5
        ? "medium"
        : "easy",
    tags: buildMealTags(workersMeal),
    isPersonalized: true,
    aiGenerated: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (
    workersMeal.cookingInstructions &&
    workersMeal.cookingInstructions.length > 0
  ) {
    meal.recipe = {
      instructions: workersMeal.cookingInstructions,
      ingredients: workersMeal.foods.map((food) => ({
        foodId: generateUUID(),
        name: food.name,
        quantity: food.quantity,
        unit: food.unit,
      })),
      cookingMethods: [determineCookingMethod(workersMeal.cookingMethod)],
      nutritionTips: workersMeal.tips,
    };
  }

  return meal;
}

function transformWorkersFoodToMealItem(workersFood: WorkersFood): MealItem {
  const foodId = generateUUID();

  const food: Food = {
    id: foodId,
    name: workersFood.name,
    category: categorizeFoodByName(workersFood.name),
    nutrition: {
      calories: workersFood.nutrition.calories,
      macros: {
        protein: workersFood.nutrition.protein,
        carbohydrates: workersFood.nutrition.carbs,
        fat: workersFood.nutrition.fat,
        fiber: 0,
      },
      servingSize: workersFood.quantity,
      servingUnit: workersFood.unit,
    },
    allergens: [],
    dietaryLabels: [],
    verified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mealItem: MealItem = {
    foodId,
    food,
    name: workersFood.name,
    quantity: workersFood.quantity,
    unit: workersFood.unit,
    calories: workersFood.nutrition.calories,
    macros: {
      protein: workersFood.nutrition.protein,
      carbohydrates: workersFood.nutrition.carbs,
      fat: workersFood.nutrition.fat,
      fiber: 0,
    },
  };

  return mealItem;
}

function calculateTotalPrepTime(meals: WorkersMeal[]): number {
  return meals.reduce((total, meal) => total + (meal.preparationTime || 15), 0);
}

function calculateTotalCookingTime(meals: WorkersMeal[]): number | undefined {
  const total = meals.reduce((sum, meal) => {
    const hasCooking =
      meal.cookingInstructions && meal.cookingInstructions.length > 0;
    return sum + (hasCooking ? 30 : 0);
  }, 0);

  return total > 0 ? total : undefined;
}

function buildCombinedCookingInstructions(
  meals: WorkersMeal[],
):
  | Array<{ step: number; instruction: string; timeRequired?: number }>
  | undefined {
  const instructions: Array<{
    step: number;
    instruction: string;
    timeRequired?: number;
  }> = [];

  let stepNumber = 1;
  meals.forEach((meal) => {
    if (meal.cookingInstructions && meal.cookingInstructions.length > 0) {
      instructions.push({
        step: stepNumber++,
        instruction: `${meal.name}:`,
        timeRequired: meal.preparationTime,
      });

      meal.cookingInstructions.forEach((instruction) => {
        instructions.push({
          step: stepNumber++,
          instruction,
        });
      });
    }
  });

  return instructions.length > 0 ? instructions : undefined;
}

function determineDifficulty(meals: WorkersMeal[]): "easy" | "medium" | "hard" {
  const maxInstructions = Math.max(
    ...meals.map((m) => m.cookingInstructions?.length || 0),
  );

  if (maxInstructions > 8) return "hard";
  if (maxInstructions > 4) return "medium";
  return "easy";
}

function buildTags(
  meals: WorkersMeal[],
  metadata: WorkersDietResponse["metadata"],
): string[] {
  const tags: string[] = ["ai-generated", "personalized"];

  if (metadata.cuisine) {
    tags.push(metadata.cuisine.toLowerCase());
  }

  const mealTypes = new Set(meals.map((m) => m.type));
  tags.push(...Array.from(mealTypes));

  meals.forEach((meal) => {
    if (meal.cookingMethod) {
      tags.push(meal.cookingMethod.toLowerCase());
    }
  });

  return [...new Set(tags)];
}

function buildMealTags(meal: WorkersMeal): string[] {
  const tags: string[] = [meal.type];

  if (meal.cookingMethod) {
    tags.push(meal.cookingMethod.toLowerCase());
  }

  if ((meal.preparationTime || 0) < 20) {
    tags.push("quick");
  }

  if (!meal.cookingInstructions || meal.cookingInstructions.length < 3) {
    tags.push("easy");
  }

  if (meal.totalNutrition.protein > 30) {
    tags.push("high-protein");
  }

  return tags;
}

function determineCookingMethod(
  method?: string,
):
  | "baking"
  | "grilling"
  | "frying"
  | "steaming"
  | "boiling"
  | "sauteing"
  | "roasting"
  | "raw"
  | "blending"
  | "microwaving" {
  if (!method) return "raw";

  const methodLower = method.toLowerCase();

  if (methodLower.includes("bak")) return "baking";
  if (methodLower.includes("grill")) return "grilling";
  if (methodLower.includes("fry")) return "frying";
  if (methodLower.includes("steam")) return "steaming";
  if (methodLower.includes("boil")) return "boiling";
  if (methodLower.includes("saut")) return "sauteing";
  if (methodLower.includes("roast")) return "roasting";
  if (methodLower.includes("blend")) return "blending";
  if (methodLower.includes("microwave")) return "microwaving";

  return "raw";
}

function categorizeFoodByName(name: string): FoodCategory {
  const nameLower = name.toLowerCase();

  if (/apple|banana|orange|berry|grape|mango|pineapple|melon/.test(nameLower)) {
    return "fruits";
  }

  if (
    /broccoli|carrot|spinach|lettuce|tomato|cucumber|pepper|onion|garlic/.test(
      nameLower,
    )
  ) {
    return "vegetables";
  }

  if (/rice|bread|pasta|oat|quinoa|wheat|roti|naan/.test(nameLower)) {
    return "grains";
  }

  if (/chicken|beef|pork|fish|egg|tofu|paneer|dal|lentil/.test(nameLower)) {
    return "proteins";
  }

  if (/milk|cheese|yogurt|butter|cream/.test(nameLower)) {
    return "dairy";
  }

  if (/juice|tea|coffee|water|smoothie/.test(nameLower)) {
    return "beverages";
  }

  return "other";
}

export function isValidDietResponse(
  response: any,
): response is WorkersDietResponse {
  return (
    response !== null &&
    response !== undefined &&
    typeof response === "object" &&
    "success" in response &&
    "data" in response &&
    response.data &&
    typeof response.data === "object" &&
    "meals" in response.data &&
    Array.isArray(response.data.meals)
  );
}

export function generateMealId(): string {
  return `meal_${generateUUID()}`;
}
