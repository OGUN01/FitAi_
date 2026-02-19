import { healthKitService } from "../../healthKit";
import { googleFitService } from "../../googleFit";
import { WearableExportData, NutritionExportData, PlatformType } from "./types";

export class DataExportService {
  constructor(private getPlatform: () => PlatformType) {}

  async exportWorkout(workout: WearableExportData): Promise<boolean> {
    try {
      const platform = this.getPlatform();
      console.log(`📤 Exporting workout to ${platform} wearables...`);

      switch (platform) {
        case "ios":
          return await healthKitService.exportWorkoutToHealthKit(workout);

        case "android":
          return await googleFitService.exportWorkoutToGoogleFit(workout);

        default:
          console.warn("⚠️ Workout export not supported on this platform");
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
      console.log(`📤 Exporting nutrition to ${platform} wearables...`);

      switch (platform) {
        case "ios":
          return await healthKitService.exportNutritionToHealthKit(nutrition);

        case "android":
          return await googleFitService.exportNutritionToGoogleFit(nutrition);

        default:
          console.warn("⚠️ Nutrition export not supported on this platform");
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
      console.log(`📤 Exporting body weight to ${platform} wearables...`);

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
          console.warn("⚠️ Body weight export not supported on this platform");
          return false;
      }
    } catch (error) {
      console.error("❌ Failed to export body weight:", error);
      return false;
    }
  }
}
