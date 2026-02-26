import AsyncStorage from "@react-native-async-storage/async-storage";
import { dataBridge } from "../DataBridge";
import { supabase } from "../supabase";
import { MIGRATION_BACKUP_KEY } from "./constants";

export class BackupManager {
  async createMigrationBackup(): Promise<boolean> {
    try {
      const localData = await dataBridge.exportAllData();
      if (!localData) {
        return false;
      }
      await AsyncStorage.setItem(
        MIGRATION_BACKUP_KEY,
        JSON.stringify(localData),
      );
      return true;
    } catch (error) {
      console.error("Failed to create migration backup:", error);
      return false;
    }
  }

  async restoreFromBackup(): Promise<boolean> {
    try {
      const backupJson = await AsyncStorage.getItem(MIGRATION_BACKUP_KEY);
      if (!backupJson) {
        return false;
      }

      const backupData = JSON.parse(backupJson);
      await dataBridge.importAllData(backupData);
      return true;
    } catch (error) {
      console.error("Failed to restore from backup:", error);
      return false;
    }
  }

  async clearBackup(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MIGRATION_BACKUP_KEY);
    } catch (error) {
      console.error("Failed to clear migration backup:", error);
    }
  }

  async rollbackStep(step: string, userId: string): Promise<void> {
    switch (step) {
      case "uploadUserProfile":
        await supabase.from("profiles").delete().eq("id", userId);
        await supabase.from("fitness_goals").delete().eq("user_id", userId);
        await supabase.from("diet_preferences").delete().eq("user_id", userId);
        await supabase
          .from("workout_preferences")
          .delete()
          .eq("user_id", userId);
        await supabase.from("body_analysis").delete().eq("user_id", userId);
        break;

      case "uploadFitnessData":
        await supabase.from("workouts").delete().eq("user_id", userId);
        await supabase.from("workout_sessions").delete().eq("user_id", userId);
        break;

      case "uploadNutritionData":
        await supabase.from("meals").delete().eq("user_id", userId);
        await supabase.from("meal_logs").delete().eq("user_id", userId);
        break;

      case "uploadProgressData":
        await supabase.from("progress_entries").delete().eq("user_id", userId);
        await supabase.from("body_measurements").delete().eq("user_id", userId);
        break;

      default:
    }
  }
}

export const backupManager = new BackupManager();
