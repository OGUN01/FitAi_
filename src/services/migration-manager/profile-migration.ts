import { dataBridge } from "../DataBridge";
import { profileValidator } from "../profileValidator";
import { supabase } from "../supabase";
import { enhancedLocalStorage } from "../localStorage";
import { MigrationAttempt, MigrationResult, MigrationState } from "./types";

export class ProfileMigration {
  async checkProfileMigrationNeeded(userId: string): Promise<boolean> {
    try {
      console.log("🔍 Checking profile migration for user:", userId);

      dataBridge.setUserId(userId);

      if (typeof dataBridge.hasLocalData !== "function") {
        console.error("❌ hasLocalData method not found on dataManager");
        return false;
      }

      const hasLocalData = await dataBridge.hasLocalData();
      console.log("📊 Local data check result:", hasLocalData);

      if (!hasLocalData) {
        console.log("📊 No local profile data found, migration not needed");
        return false;
      }

      const { data: remoteProfile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("❌ Error checking remote profile data:", error);
        return false;
      }

      const migrationNeeded = hasLocalData && !remoteProfile;
      console.log(
        `📊 Profile migration needed: ${migrationNeeded} (local: ${hasLocalData}, remote: ${!!remoteProfile})`,
      );

      return migrationNeeded;
    } catch (error) {
      console.error("❌ Error checking profile migration status:", error);
      return false;
    }
  }

  async startProfileMigration(userId: string): Promise<MigrationResult> {
    console.log("🚀 Starting profile data migration for user:", userId);

    try {
      const result = await dataBridge.migrateGuestToUser(userId);

      if (result.success) {
        console.log("✅ Profile migration completed successfully");

        const attempt: MigrationAttempt = {
          id: `profile_${Date.now()}`,
          startTime: new Date(),
          endTime: new Date(),
          success: true,
          dataCount: {
            workouts: 0,
            meals: 0,
            measurements: 0,
          },
        };

        await this.storeMigrationAttempt(attempt);
      } else {
        console.error("❌ Profile migration failed:", result.errors);
      }

      return result as any;
    } catch (error) {
      console.error("❌ Profile migration error:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown migration error";

      return {
        success: false,
        migrationId: `profile_error_${Date.now()}`,
        errors: [errorMessage],
        migratedData: {},
        conflicts: [],
        duration: 0,
      } as any;
    }
  }

  async validateProfileData(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const personalInfo = await dataBridge.loadPersonalInfo();
      if (personalInfo) {
        const validation = profileValidator.validatePersonalInfo(personalInfo);
        if (!validation.isValid) {
          errors.push(...validation.errors.map((e) => `Personal Info: ${e}`));
        }
      }

      const fitnessGoals = await dataBridge.loadFitnessGoals();
      if (fitnessGoals) {
        const validation = profileValidator.validateFitnessGoals(fitnessGoals);
        if (!validation.isValid) {
          errors.push(...validation.errors.map((e) => `Fitness Goals: ${e}`));
        }
      }

      const dietPreferences = await dataBridge.loadDietPreferences();
      if (dietPreferences) {
        const validation =
          profileValidator.validateDietPreferences(dietPreferences);
        if (!validation.isValid) {
          errors.push(
            ...validation.errors.map((e) => `Diet Preferences: ${e}`),
          );
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [
          `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  private async storeMigrationAttempt(
    attempt: MigrationAttempt,
  ): Promise<void> {
    try {
      const currentState = await this.getState();
      const updatedHistory = [...currentState.migrationHistory, attempt];

      if (updatedHistory.length > 10) {
        updatedHistory.splice(0, updatedHistory.length - 10);
      }

      const newState: MigrationState = {
        ...currentState,
        lastMigrationAttempt: attempt.endTime || new Date(),
        migrationHistory: updatedHistory,
      };

      await enhancedLocalStorage.setItem("migration_state", newState);
    } catch (error) {
      console.error("❌ Failed to store migration attempt:", error);
    }
  }

  private async getState(): Promise<MigrationState> {
    try {
      const state =
        await enhancedLocalStorage.getData<MigrationState>("migration_state");
      return (
        state || {
          isActive: false,
          canStart: false,
          hasLocalData: false,
          hasIncompleteResumable: false,
          incompleteCheckpoint: null,
          lastMigrationAttempt: null,
          migrationHistory: [],
        }
      );
    } catch (error) {
      return {
        isActive: false,
        canStart: false,
        hasLocalData: false,
        hasIncompleteResumable: false,
        incompleteCheckpoint: null,
        lastMigrationAttempt: null,
        migrationHistory: [],
      };
    }
  }

  async testMigrationFlow(userId: string): Promise<void> {
    try {
      console.log("🧪 Testing complete migration flow for user:", userId);

      console.log("🧪 Step 0: Testing localStorage methods...");
      await dataBridge.testLocalStorageMethods();

      console.log("🧪 Step 1: Testing DataManager methods...");
      await dataBridge.testMigrationDetection();

      console.log("🧪 Step 2: Testing migration detection...");
      const migrationNeeded = await this.checkProfileMigrationNeeded(userId);
      console.log("📊 Migration needed result:", migrationNeeded);

      console.log("🧪 Step 3: Testing profile data validation...");
      const validationResult = await this.validateProfileData();
      console.log("📊 Validation result:", validationResult);

      console.log("✅ Migration flow test completed successfully");
    } catch (error) {
      console.error("❌ Migration flow test failed:", error);
    }
  }

  async setupTestEnvironment(userId: string): Promise<boolean> {
    try {
      console.log("🧪 Setting up test environment for migration...");

      dataBridge.setUserId(userId);

      const sampleCreated = await dataBridge.createSampleProfileData();

      if (sampleCreated) {
        console.log("✅ Test environment setup completed");
        return true;
      } else {
        console.error("❌ Failed to create sample data");
        return false;
      }
    } catch (error) {
      console.error("❌ Test environment setup failed:", error);
      return false;
    }
  }
}

export const profileMigration = new ProfileMigration();
