import { supabase } from "../supabase";
import { Food, NutritionDataResponse } from "./types";

export class FoodService {
  async getFoods(filters?: {
    category?: string;
    search?: string;
    barcode?: string;
  }): Promise<NutritionDataResponse<Food[]>> {
    try {
      let query = supabase.from("foods").select("*").order("name");

      if (filters?.category && filters.category !== "all") {
        query = query.ilike("category", `%${filters.category}%`);
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,category.ilike.%${filters.search}%`,
        );
      }

      if (filters?.barcode) {
        query = query.eq("barcode", filters.barcode);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching foods:", error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      console.error("Error in getFoods:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch foods",
      };
    }
  }

  async calculateNutrition(
    foods: { food_id: string; quantity_grams: number }[],
  ): Promise<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }> {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const foodItem of foods) {
      const { data: food } = await supabase
        .from("foods")
        .select(
          "calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g",
        )
        .eq("id", foodItem.food_id)
        .maybeSingle();

      if (food) {
        const multiplier = foodItem.quantity_grams / 100;
        totalCalories += food.calories_per_100g * multiplier;
        totalProtein += food.protein_per_100g * multiplier;
        totalCarbs += food.carbs_per_100g * multiplier;
        totalFat += food.fat_per_100g * multiplier;
      }
    }

    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
    };
  }
}
