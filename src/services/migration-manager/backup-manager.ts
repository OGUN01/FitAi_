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
    const deleteFrom = async (table: string, idColumn: string = "user_id") => {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq(idColumn, userId);
      if (error) {
        console.error(
          `[BackupManager] rollback delete from ${table} failed:`,
          error,
        );
      }
    };

    switch (step) {
      case "uploadUserProfile":
        await deleteFrom("profiles", "id");
        await deleteFrom("fitness_goals");
        await deleteFrom("diet_preferences");
        await deleteFrom("workout_preferences");
        await deleteFrom("body_analysis");
        break;

      case "uploadFitnessData":
        await deleteFrom("workout_sessions");
        break;

      case "uploadNutritionData":
        await deleteFrom("meals");
        await deleteFrom("meal_logs");
        break;

      case "uploadProgressData":
        await deleteFrom("progress_entries");
        await deleteFrom("body_analysis");
        break;

      default:
    }
  }
}

export const backupManager = new BackupManager();
