import { ConflictDetectionResult, ConflictResolution } from "./types";

export function detectConflicts(
  localData: any,
  remoteData: any,
  type: string,
): ConflictDetectionResult {
  const conflictFields: string[] = [];
  const recommendations: string[] = [];

  switch (type) {
    case "profile":
      if (localData.name !== remoteData.name) {
        conflictFields.push("name");
        recommendations.push("Consider which name is more current");
      }
      if (localData.weight_kg !== remoteData.weight_kg) {
        conflictFields.push("weight");
        recommendations.push("Use the more recent weight measurement");
      }
      break;

    case "workout":
      if (localData.duration_minutes !== remoteData.duration_minutes) {
        conflictFields.push("duration");
        recommendations.push(
          "Use the local duration if workout was completed offline",
        );
      }
      if (localData.rating !== remoteData.rating) {
        conflictFields.push("rating");
        recommendations.push("Use the most recent rating");
      }
      break;

    case "meal":
      if (localData.total_calories !== remoteData.total_calories) {
        conflictFields.push("calories");
        recommendations.push("Recalculate calories based on food items");
      }
      break;

    case "progress":
      if (Math.abs(localData.weight_kg - remoteData.weight_kg) > 0.1) {
        conflictFields.push("weight");
        recommendations.push(
          "Use the measurement with the more recent timestamp",
        );
      }
      break;
  }

  return {
    hasConflicts: conflictFields.length > 0,
    conflictFields,
    recommendations,
  };
}

export function mergeConflictedData(
  localData: any,
  remoteData: any,
  resolution: ConflictResolution,
  type: string,
): any {
  switch (resolution) {
    case "local":
      return { ...localData, updated_at: new Date().toISOString() };

    case "remote":
      return remoteData;

    case "merge":
      return performIntelligentMerge(localData, remoteData, type);

    default:
      return localData;
  }
}

function performIntelligentMerge(
  localData: any,
  remoteData: any,
  type: string,
): any {
  const merged = { ...remoteData };

  switch (type) {
    case "profile":
      if (
        localData.weight_kg &&
        new Date(localData.updated_at) > new Date(remoteData.updated_at)
      ) {
        merged.weight_kg = localData.weight_kg;
      }
      if (localData.units) {
        merged.units = localData.units;
      }
      if (typeof localData.notifications_enabled === "boolean") {
        merged.notifications_enabled = localData.notifications_enabled;
      }
      break;

    case "workout":
      if (localData.is_completed && !remoteData.is_completed) {
        merged.is_completed = true;
        merged.completed_at = localData.completed_at;
        merged.duration_minutes = localData.duration_minutes;
        merged.calories_burned = localData.calories_burned;
        merged.rating = localData.rating;
      }
      break;

    case "meal":
      let localFoods: unknown[] = [];
      let remoteFoods: unknown[] = [];

      if (localData.food_items) {
        if (typeof localData.food_items === "string") {
          try {
            localFoods = JSON.parse(localData.food_items);
          } catch {
            localFoods = [];
          }
        } else if (Array.isArray(localData.food_items)) {
          localFoods = localData.food_items;
        }
      }

      if (remoteData.food_items) {
        if (typeof remoteData.food_items === "string") {
          try {
            remoteFoods = JSON.parse(remoteData.food_items);
          } catch {
            remoteFoods = [];
          }
        } else if (Array.isArray(remoteData.food_items)) {
          remoteFoods = remoteData.food_items;
        }
      }

      if (localFoods.length > remoteFoods.length) {
        merged.food_items = localData.food_items;
        merged.total_calories = localData.total_calories;
        merged.total_protein = localData.total_protein;
        merged.total_carbohydrates = localData.total_carbohydrates;
        merged.total_fat = localData.total_fat;
      }
      break;

    case "progress":
      const localTime = new Date(localData.created_at).getTime();
      const remoteTime = new Date(remoteData.created_at).getTime();

      if (localTime > remoteTime) {
        merged.weight_kg = localData.weight_kg;
        merged.body_fat_percentage = localData.body_fat_percentage;
        merged.muscle_mass_kg = localData.muscle_mass_kg;
        merged.measurements = localData.measurements;
      }
      break;
  }

  merged.updated_at = new Date().toISOString();
  return merged;
}
