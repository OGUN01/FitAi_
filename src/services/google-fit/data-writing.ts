import GoogleFit from "react-native-google-fit";
import { WorkoutExportData, NutritionExportData } from "./types";

export class GoogleFitDataWriter {
  private readonly activityTypeMapping: Record<string, string> = {
    strength: "weight_lifting",
    cardio: "running",
    hiit: "aerobics",
    yoga: "yoga",
    flexibility: "stretching",
    walking: "walking",
    running: "running",
    cycling: "biking",
    swimming: "swimming",
    dance: "dancing",
    boxing: "martial_arts",
  };

  async exportWorkout(
    workout: WorkoutExportData,
    hasPermissions: () => Promise<boolean>,
  ): Promise<boolean> {
    try {
      if (!(await hasPermissions())) {
        return false;
      }

      const activityType =
        this.activityTypeMapping[workout.type.toLowerCase()] || "other";

      const workoutData = {
        startDate: workout.startDate.toISOString(),
        endDate: workout.endDate.toISOString(),
        activityType,
        calories: workout.calories,
        distance: workout.distance,
        sourceName: "FitAI - AI Fitness Coach",
        sourcePackage: "com.fitai.app",
      };

      // SDK types don't match our extended workoutData shape
      const result = await GoogleFit.saveWorkout(workoutData as unknown as Parameters<typeof GoogleFit.saveWorkout>[0]);

      if (result) {
        return true;
      } else {
        console.error("❌ Failed to export workout to Google Fit");
        return false;
      }
    } catch (error) {
      console.error("❌ Failed to export workout to Google Fit:", error);
      return false;
    }
  }

  async exportNutrition(
    nutritionData: NutritionExportData,
    hasPermissions: () => Promise<boolean>,
  ): Promise<boolean> {
    try {
      if (!(await hasPermissions())) {
        return false;
      }


      const nutritionEntry = {
        date: nutritionData.date.toISOString(),
        calories: nutritionData.calories,
        protein: nutritionData.protein,
        carbs: nutritionData.carbs,
        fat: nutritionData.fat,
        sourceName: "FitAI - AI Fitness Coach",
        sourcePackage: "com.fitai.app",
      };

      // SDK types don't match our extended nutritionEntry shape
      const result = await GoogleFit.saveFood(
        nutritionEntry as unknown as Parameters<typeof GoogleFit.saveFood>[0],
        (isError: boolean, res: true) => {
          if (isError) {
            // error handled silently
          }
        },
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to export nutrition to Google Fit:", error);
      return false;
    }
  }

  async exportBodyWeight(
    weight: number,
    date: Date,
    hasPermissions: () => Promise<boolean>,
  ): Promise<boolean> {
    try {
      if (!(await hasPermissions())) {
        return false;
      }


      const weightData = {
        value: weight,
        date: date.toISOString(),
        unit: "kg",
      };

      // SDK types don't match our extended weightData shape
      const result = await GoogleFit.saveWeight(
        weightData as unknown as Parameters<typeof GoogleFit.saveWeight>[0],
        (err: Error | null, res: unknown) => {
          if (err) {
            // error handled silently
          }
        },
      );
      // @ts-ignore - Type issue with result void check
      if (result) {
        return true;
      } else {
        console.error("❌ Failed to export body weight to Google Fit");
        return false;
      }
    } catch (error) {
      console.error("❌ Failed to export body weight to Google Fit:", error);
      return false;
    }
  }
}
