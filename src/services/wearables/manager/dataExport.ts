import { healthKitService } from "../../healthKit";
import { googleFitService } from "../../googleFit";
import { WearableExportData, NutritionExportData, PlatformType } from "./types";

export class DataExportService {
  constructor(private getPlatform: () => PlatformType) {}

  async exportWorkout(workout: WearableExportData): Promise<boolean> {
    try {
      const platform = this.getPlatform();

      switch (platform) {
        case "ios":
          return await healthKitService.exportWorkoutToHealthKit(workout);

        case "android":
          return await googleFitService.exportWorkoutToGoogleFit(workout);

        default:
          return false;
      }
    } catch (error) {
      console.error("❌ Failed to export workout:", error);
      return false;
    }
  }

  async exportNutrition(nutrition: NutritionExportData): Promise<boolean> {
    try {
      const platform = this.getPlatform();

      switch (platform) {
        case "ios":
          return await healthKitService.exportNutritionToHealthKit(nutrition);

        case "android":
          return await googleFitService.exportNutritionToGoogleFit(nutrition);

        default:
          return false;
      }
    } catch (error) {
      console.error("❌ Failed to export nutrition:", error);
      return false;
    }
  }

  async exportBodyWeight(
    weight: number,
    date: Date = new Date(),
  ): Promise<boolean> {
    try {
      const platform = this.getPlatform();

      switch (platform) {
        case "ios":
          return await healthKitService.exportBodyWeightToHealthKit(
            weight,
            date,
          );

        case "android":
          return await googleFitService.exportBodyWeightToGoogleFit(
            weight,
            date,
          );

        default:
          return false;
      }
    } catch (error) {
      console.error("❌ Failed to export body weight:", error);
      return false;
    }
  }
}
