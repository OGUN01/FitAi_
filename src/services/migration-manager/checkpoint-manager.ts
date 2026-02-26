import AsyncStorage from "@react-native-async-storage/async-storage";
import { MigrationCheckpoint } from "./types";
import { MIGRATION_CHECKPOINT_KEY } from "./constants";

export class CheckpointManager {
  async loadCheckpoint(): Promise<MigrationCheckpoint | null> {
    try {
      const checkpointJson = await AsyncStorage.getItem(
        MIGRATION_CHECKPOINT_KEY,
      );
      if (!checkpointJson) return null;
      return JSON.parse(checkpointJson);
    } catch (error) {
      console.error("Failed to load migration checkpoint:", error);
      return null;
    }
  }

  async saveCheckpoint(checkpoint: MigrationCheckpoint): Promise<void> {
    try {
      await AsyncStorage.setItem(
        MIGRATION_CHECKPOINT_KEY,
        JSON.stringify(checkpoint),
      );
    } catch (error) {
      console.error("Failed to save migration checkpoint:", error);
    }
  }

  async clearCheckpoint(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MIGRATION_CHECKPOINT_KEY);
    } catch (error) {
      console.error("Failed to clear migration checkpoint:", error);
    }
  }
}

export const checkpointManager = new CheckpointManager();
