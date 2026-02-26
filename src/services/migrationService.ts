/**
 * Migration Service
 *
 * Handles data migrations between app versions to ensure compatibility
 * with new systems and features.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFitnessStore } from "../stores/fitnessStore";

class MigrationService {
  private static instance: MigrationService;
  private migrationKey = "app_migration_version";
  private currentVersion = "2.0.0"; // Bulletproof visual system version

  static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  /**
   * Check and run necessary migrations
   */
  async runMigrations(): Promise<void> {
    try {

      const lastMigrationVersion = await AsyncStorage.getItem(
        this.migrationKey,
      );

      if (
        !lastMigrationVersion ||
        lastMigrationVersion !== this.currentVersion
      ) {

        // Run migration to bulletproof visual system
        await this.migrateToBulletproofSystem();

        // Mark migration as complete
        await AsyncStorage.setItem(this.migrationKey, this.currentVersion);

      } else {
      }
    } catch (error) {
      console.error("❌ Migration failed:", error);
      // Don't throw - let app continue even if migration fails
    }
  }

  /**
   * Migrate to bulletproof visual system
   * Clears old workout data that used descriptive exercise names
   */
  private async migrateToBulletproofSystem(): Promise<void> {
    try {

      const fitnessStore = useFitnessStore.getState();

      // Check if there's old workout data
      const currentPlan = fitnessStore.weeklyWorkoutPlan;
      let hasOldData = false;

      if (currentPlan?.workouts && currentPlan.workouts.length > 0) {
        // Check if exercises use old descriptive format instead of database IDs
        const firstExercise = currentPlan.workouts[0]?.exercises?.[0];
        if (firstExercise?.exerciseId) {
          // Old format: descriptive names like "warm-up:_jumping_jacks_(light)"
          // New format: database IDs like "VPPtusI"
          const isOldFormat =
            firstExercise.exerciseId.includes("_") ||
            firstExercise.exerciseId.includes(":") ||
            firstExercise.exerciseId.includes("(") ||
            firstExercise.exerciseId.length > 15;

          if (isOldFormat) {
            hasOldData = true;
          }
        }
      }

      if (hasOldData) {
        await fitnessStore.clearOldWorkoutData();
      } else {
      }

    } catch (error) {
      console.error("❌ Bulletproof system migration failed:", error);
      throw error;
    }
  }

  /**
   * Force clear all data (emergency reset)
   */
  async emergencyReset(): Promise<void> {
    try {

      const fitnessStore = useFitnessStore.getState();
      await fitnessStore.clearOldWorkoutData();

      // Reset migration version to force re-migration
      await AsyncStorage.removeItem(this.migrationKey);

    } catch (error) {
      console.error("❌ Emergency reset failed:", error);
      throw error;
    }
  }

  /**
   * Get current migration status
   */
  async getMigrationStatus(): Promise<{
    currentVersion: string;
    lastMigrationVersion: string | null;
    needsMigration: boolean;
  }> {
    const lastMigrationVersion = await AsyncStorage.getItem(this.migrationKey);

    return {
      currentVersion: this.currentVersion,
      lastMigrationVersion,
      needsMigration:
        !lastMigrationVersion || lastMigrationVersion !== this.currentVersion,
    };
  }
}

export const migrationService = MigrationService.getInstance();
export default migrationService;
