import { crudOperations } from "../crudOperations";
import { FoodService } from "./food-service";
import { MealService } from "./meal-service";
import { GoalsService } from "./goals-service";
import {
  Food,
  Meal,
  UserDietPreferences,
  NutritionGoals,
  NutritionDataResponse,
} from "./types";

class NutritionDataService {
  private static instance: NutritionDataService;
  private foodService: FoodService;
  private mealService: MealService;
  private goalsService: GoalsService;

  private constructor() {
    this.foodService = new FoodService();
    this.mealService = new MealService(this.foodService);
    this.goalsService = new GoalsService();
  }

  static getInstance(): NutritionDataService {
    if (!NutritionDataService.instance) {
      NutritionDataService.instance = new NutritionDataService();
    }
    return NutritionDataService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await crudOperations.initialize();
      console.log(
        "Nutrition Data Service initialized with Track B integration",
      );
    } catch (error) {
      console.error("Failed to initialize Nutrition Data Service:", error);
      throw error;
    }
  }

  async getFoods(filters?: {
    category?: string;
    search?: string;
    barcode?: string;
  }): Promise<NutritionDataResponse<Food[]>> {
    return this.foodService.getFoods(filters);
  }

  async getUserMeals(
    userId: string,
    date?: string,
    limit?: number,
  ): Promise<NutritionDataResponse<Meal[]>> {
    return this.mealService.getUserMeals(userId, date, limit);
  }

  async getUserDietPreferences(
    userId: string,
  ): Promise<NutritionDataResponse<UserDietPreferences>> {
    return this.goalsService.getUserDietPreferences(userId);
  }

  async getUserNutritionGoals(
    userId: string,
  ): Promise<NutritionDataResponse<NutritionGoals>> {
    return this.goalsService.getUserNutritionGoals(userId);
  }

  async logMeal(
    userId: string,
    mealData: {
      name: string;
      type: "breakfast" | "lunch" | "dinner" | "snack";
      foods: {
        food_id: string;
        quantity_grams: number;
      }[];
    },
  ): Promise<NutritionDataResponse<Meal>> {
    return this.mealService.logMeal(userId, mealData);
  }
}

export const nutritionDataService = NutritionDataService.getInstance();
