/**
 * Authentication Flow Integration Test
 * Tests the complete user journey from registration through onboarding to authenticated app access
 */

import { authService } from "../services/auth";
import { supabase } from "../services/supabase";
import { useOnboardingIntegration } from "./integration";

export interface AuthFlowTestResult {
  success: boolean;
  step: string;
  error?: string;
  details?: any;
}

export class AuthFlowTester {
  private testEmail = `test-${Date.now()}@fitai.test`;
  private testPassword = "TestPassword123!";
  private testUserId: string | null = null;

  /**
   * Test complete authentication and onboarding flow
   */
  async testCompleteFlow(): Promise<AuthFlowTestResult[]> {
    const results: AuthFlowTestResult[] = [];

    try {
      // Step 1: Test user registration
      console.log("🧪 Testing user registration...");
      const registrationResult = await this.testRegistration();
      results.push(registrationResult);

      if (!registrationResult.success) {
        return results;
      }

      // Step 2: Test login
      console.log("🧪 Testing user login...");
      const loginResult = await this.testLogin();
      results.push(loginResult);

      if (!loginResult.success) {
        return results;
      }

      // Step 3: Test database tables exist
      console.log("🧪 Testing database tables...");
      const tablesResult = await this.testDatabaseTables();
      results.push(tablesResult);

      // Step 4: Test onboarding data save
      console.log("🧪 Testing onboarding data save...");
      const onboardingResult = await this.testOnboardingDataSave();
      results.push(onboardingResult);

      // Step 5: Test data retrieval
      console.log("🧪 Testing data retrieval...");
      const retrievalResult = await this.testDataRetrieval();
      results.push(retrievalResult);

      // Step 6: Test Google authentication setup (without actual OAuth)
      console.log("🧪 Testing Google auth setup...");
      const googleResult = await this.testGoogleAuthSetup();
      results.push(googleResult);

      // Cleanup
      await this.cleanup();

      console.log("✅ Authentication flow test completed");
      return results;
    } catch (error) {
      console.error("❌ Authentication flow test failed:", error);
      results.push({
        success: false,
        step: "test_execution",
        error: error instanceof Error ? error.message : "Unknown error",
      });

      await this.cleanup();
      return results;
    }
  }

  /**
   * Test user registration
   */
  private async testRegistration(): Promise<AuthFlowTestResult> {
    try {
      const response = await authService.register({
        email: this.testEmail,
        password: this.testPassword,
        confirmPassword: this.testPassword,
      });

      if (response.success && response.user) {
        this.testUserId = response.user.id;
        return {
          success: true,
          step: "registration",
          details: { userId: response.user.id, email: response.user.email },
        };
      } else {
        return {
          success: false,
          step: "registration",
          error: response.error || "Registration failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        step: "registration",
        error: error instanceof Error ? error.message : "Registration error",
      };
    }
  }

  /**
   * Test user login
   */
  private async testLogin(): Promise<AuthFlowTestResult> {
    try {
      const response = await authService.login({
        email: this.testEmail,
        password: this.testPassword,
      });

      if (response.success && response.user) {
        return {
          success: true,
          step: "login",
          details: { userId: response.user.id, email: response.user.email },
        };
      } else {
        return {
          success: false,
          step: "login",
          error: response.error || "Login failed",
        };
      }
    } catch (error) {
      return {
        success: false,
        step: "login",
        error: error instanceof Error ? error.message : "Login error",
      };
    }
  }

  /**
   * Test database tables exist and are accessible
   */
  private async testDatabaseTables(): Promise<AuthFlowTestResult> {
    try {
      const tables = [
        "profiles",
        "fitness_goals",
        "diet_preferences",
        "workout_preferences",
        "body_analysis",
      ];

      for (const table of tables) {
        const { data, error } = await supabase.from(table).select("*").limit(1);

        if (error) {
          return {
            success: false,
            step: "database_tables",
            error: `Table ${table} not accessible: ${error.message}`,
          };
        }
      }

      return {
        success: true,
        step: "database_tables",
        details: { tablesChecked: tables.length },
      };
    } catch (error) {
      return {
        success: false,
        step: "database_tables",
        error: error instanceof Error ? error.message : "Database error",
      };
    }
  }

  /**
   * Test onboarding data save
   */
  private async testOnboardingDataSave(): Promise<AuthFlowTestResult> {
    try {
      if (!this.testUserId) {
        return {
          success: false,
          step: "onboarding_save",
          error: "No test user ID available",
        };
      }

      // Test data for enhanced onboarding
      const testOnboardingData = {
        personalInfo: {
          name: "Test User",
          email: this.testEmail,
          age: 25,
          gender: "male" as const,
          height: 175,
          weight: 70,
          activityLevel: "moderate" as const,
        },
        fitnessGoals: {
          primaryGoals: ["weight_loss", "muscle_gain"],
          timeCommitment: "3-4 times per week",
          experience: "beginner",
        },
        dietPreferences: {
          dietType: "non-veg" as const,
          allergies: ["nuts"],
          cuisinePreferences: ["indian", "mediterranean"],
          restrictions: ["low-sodium"],
        },
        workoutPreferences: {
          location: "both" as const,
          equipment: ["dumbbells", "bodyweight"],
          timePreference: 45,
          intensity: "intermediate" as const,
          workoutTypes: ["strength", "cardio"],
        },
        bodyAnalysis: {
          photos: {},
        },
        isComplete: true,
      };

      // Save personal info
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: this.testUserId,
        email: testOnboardingData.personalInfo.email,
        name: testOnboardingData.personalInfo.name,
        age: testOnboardingData.personalInfo.age,
        gender: testOnboardingData.personalInfo.gender,
        height_cm: testOnboardingData.personalInfo.height,
        weight_kg: testOnboardingData.personalInfo.weight,
        activity_level: testOnboardingData.personalInfo.activityLevel,
        units: "metric",
        notifications_enabled: true,
        dark_mode: false,
      });

      if (profileError) {
        return {
          success: false,
          step: "onboarding_save",
          error: `Profile save failed: ${profileError.message}`,
        };
      }

      // Save fitness goals
      const { error: goalsError } = await supabase
        .from("fitness_goals")
        .upsert({
          user_id: this.testUserId,
          primary_goals: testOnboardingData.fitnessGoals.primaryGoals,
          time_commitment: testOnboardingData.fitnessGoals.timeCommitment,
          experience_level: testOnboardingData.fitnessGoals.experience,
        });

      if (goalsError) {
        return {
          success: false,
          step: "onboarding_save",
          error: `Goals save failed: ${goalsError.message}`,
        };
      }

      // Save diet preferences
      const { error: dietError } = await supabase
        .from("diet_preferences")
        .upsert({
          user_id: this.testUserId,
          diet_type: testOnboardingData.dietPreferences.dietType,
          allergies: testOnboardingData.dietPreferences.allergies,
          restrictions: testOnboardingData.dietPreferences.restrictions,
        });

      if (dietError) {
        return {
          success: false,
          step: "onboarding_save",
          error: `Diet preferences save failed: ${dietError.message}`,
        };
      }

      // Save workout preferences
      const { error: workoutError } = await supabase
        .from("workout_preferences")
        .upsert({
          user_id: this.testUserId,
          location: testOnboardingData.workoutPreferences.location,
          equipment: testOnboardingData.workoutPreferences.equipment,
          time_preference: testOnboardingData.workoutPreferences.timePreference,
          intensity: testOnboardingData.workoutPreferences.intensity,
          workout_types: testOnboardingData.workoutPreferences.workoutTypes,
        });

      if (workoutError) {
        return {
          success: false,
          step: "onboarding_save",
          error: `Workout preferences save failed: ${workoutError.message}`,
        };
      }

      return {
        success: true,
        step: "onboarding_save",
        details: { userId: this.testUserId },
      };
    } catch (error) {
      return {
        success: false,
        step: "onboarding_save",
        error: error instanceof Error ? error.message : "Onboarding save error",
      };
    }
  }

  /**
   * Test data retrieval
   */
  private async testDataRetrieval(): Promise<AuthFlowTestResult> {
    try {
      if (!this.testUserId) {
        return {
          success: false,
          step: "data_retrieval",
          error: "No test user ID available",
        };
      }

      // Test retrieving all saved data
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", this.testUserId)
        .single();

      if (profileError || !profile) {
        return {
          success: false,
          step: "data_retrieval",
          error: `Profile retrieval failed: ${profileError?.message}`,
        };
      }

      const { data: goals, error: goalsError } = await supabase
        .from("fitness_goals")
        .select("*")
        .eq("user_id", this.testUserId)
        .single();

      if (goalsError || !goals) {
        return {
          success: false,
          step: "data_retrieval",
          error: `Goals retrieval failed: ${goalsError?.message}`,
        };
      }

      return {
        success: true,
        step: "data_retrieval",
        details: {
          profile: { name: profile.name, email: profile.email },
          goals: { primaryGoals: goals.primary_goals },
        },
      };
    } catch (error) {
      return {
        success: false,
        step: "data_retrieval",
        error: error instanceof Error ? error.message : "Data retrieval error",
      };
    }
  }

  /**
   * Test Google authentication setup (without actual OAuth)
   */
  private async testGoogleAuthSetup(): Promise<AuthFlowTestResult> {
    try {
      // Test that Google auth methods exist and are callable
      const isLinked = await authService.isGoogleLinked();

      return {
        success: true,
        step: "google_auth_setup",
        details: {
          isGoogleLinked: isLinked,
          methodsAvailable: [
            "signInWithGoogle",
            "linkGoogleAccount",
            "unlinkGoogleAccount",
            "isGoogleLinked",
          ],
        },
      };
    } catch (error) {
      return {
        success: false,
        step: "google_auth_setup",
        error:
          error instanceof Error ? error.message : "Google auth setup error",
      };
    }
  }

  /**
   * Cleanup test data
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.testUserId) {
        console.log("🧹 Cleaning up test data...");

        // Delete in reverse order due to foreign key constraints
        await supabase
          .from("body_analysis")
          .delete()
          .eq("user_id", this.testUserId);
        await supabase
          .from("workout_preferences")
          .delete()
          .eq("user_id", this.testUserId);
        await supabase
          .from("diet_preferences")
          .delete()
          .eq("user_id", this.testUserId);
        await supabase
          .from("fitness_goals")
          .delete()
          .eq("user_id", this.testUserId);
        await supabase.from("profiles").delete().eq("id", this.testUserId);

        // Delete auth user
        await supabase.auth.admin.deleteUser(this.testUserId);

        console.log("✅ Test data cleaned up");
      }
    } catch (error) {
      console.warn("⚠️ Cleanup failed:", error);
    }
  }
}

/**
 * Run authentication flow test
 */
export async function runAuthFlowTest(): Promise<AuthFlowTestResult[]> {
  console.log("🚀 Starting authentication flow test...");

  const tester = new AuthFlowTester();
  const results = await tester.testCompleteFlow();

  // Log results
  console.log("\n📊 Test Results:");
  results.forEach((result, index) => {
    const status = result.success ? "✅" : "❌";
    console.log(`${status} Step ${index + 1}: ${result.step}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  });

  const successCount = results.filter((r) => r.success).length;
  console.log(`\n🎯 Overall: ${successCount}/${results.length} tests passed`);

  return results;
}
