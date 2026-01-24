import { api } from "../services/api";
import { authService } from "../services/auth";
import { userProfileService } from "../services/userProfile";
import { offlineService } from "../services/offline";

/**
 * Comprehensive backend test suite
 * Run this to verify all backend functionality is working
 */

export interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  duration: number;
}

export interface TestSuite {
  name: string;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
}

class BackendTester {
  private testEmail = `test_${Date.now()}@fitai.test`;
  private testPassword = "TestPassword123!";
  private testUserId: string | null = null;

  async runAllTests(): Promise<TestSuite> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    console.log("🧪 Starting FitAI Backend Test Suite...");

    // Test 1: Health Check
    results.push(await this.runTest("Health Check", this.testHealthCheck));

    // Test 2: User Registration
    results.push(
      await this.runTest("User Registration", this.testUserRegistration),
    );

    // Test 3: User Login
    results.push(await this.runTest("User Login", this.testUserLogin));

    // Test 4: Create User Profile
    results.push(
      await this.runTest("Create User Profile", this.testCreateUserProfile),
    );

    // Test 5: Update User Profile
    results.push(
      await this.runTest("Update User Profile", this.testUpdateUserProfile),
    );

    // Test 6: Create Fitness Goals
    results.push(
      await this.runTest("Create Fitness Goals", this.testCreateFitnessGoals),
    );

    // Test 7: Get Complete Profile
    results.push(
      await this.runTest("Get Complete Profile", this.testGetCompleteProfile),
    );

    // Test 8: Database Queries
    results.push(
      await this.runTest("Database Queries", this.testDatabaseQueries),
    );

    // Test 9: Offline Functionality
    results.push(
      await this.runTest(
        "Offline Functionality",
        this.testOfflineFunctionality,
      ),
    );

    // Test 10: Utility Functions
    results.push(
      await this.runTest("Utility Functions", this.testUtilityFunctions),
    );

    // Test 11: User Logout
    results.push(await this.runTest("User Logout", this.testUserLogout));

    // Test 12: Cleanup
    results.push(await this.runTest("Cleanup", this.testCleanup));

    const totalDuration = Date.now() - startTime;
    const passedTests = results.filter((r) => r.success).length;
    const failedTests = results.filter((r) => !r.success).length;

    const suite: TestSuite = {
      name: "FitAI Backend Test Suite",
      results,
      totalTests: results.length,
      passedTests,
      failedTests,
      totalDuration,
    };

    this.printTestResults(suite);
    return suite;
  }

  private async runTest(
    name: string,
    testFn: () => Promise<void>,
  ): Promise<TestResult> {
    const startTime = Date.now();
    try {
      await testFn.call(this);
      const duration = Date.now() - startTime;
      console.log(`✅ ${name} - ${duration}ms`);
      return { name, success: true, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.log(`❌ ${name} - ${errorMessage} - ${duration}ms`);
      return { name, success: false, error: errorMessage, duration };
    }
  }

  private async testHealthCheck(): Promise<void> {
    const result = await api.healthCheck();
    if (!result.success) {
      throw new Error(result.error || "Health check failed");
    }
  }

  private async testUserRegistration(): Promise<void> {
    const result = await authService.register({
      email: this.testEmail,
      password: this.testPassword,
      confirmPassword: this.testPassword,
    });

    if (!result.success || !result.user) {
      throw new Error(result.error || "Registration failed");
    }

    this.testUserId = result.user.id;
  }

  private async testUserLogin(): Promise<void> {
    const result = await authService.login({
      email: this.testEmail,
      password: this.testPassword,
    });

    if (!result.success || !result.user) {
      throw new Error(result.error || "Login failed");
    }
  }

  private async testCreateUserProfile(): Promise<void> {
    if (!this.testUserId) {
      throw new Error("No test user ID available");
    }

    const result = await userProfileService.createProfile({
      id: this.testUserId,
      email: this.testEmail,
      name: "Test User",
      age: 25,
      gender: "male",
      height_cm: 175,
      weight_kg: 70,
      activity_level: "moderate",
    });

    if (!result.success) {
      throw new Error(result.error || "Profile creation failed");
    }
  }

  private async testUpdateUserProfile(): Promise<void> {
    if (!this.testUserId) {
      throw new Error("No test user ID available");
    }

    const result = await userProfileService.updateProfile(this.testUserId, {
      age: 26,
      weight_kg: 72,
    });

    if (!result.success) {
      throw new Error(result.error || "Profile update failed");
    }
  }

  private async testCreateFitnessGoals(): Promise<void> {
    if (!this.testUserId) {
      throw new Error("No test user ID available");
    }

    const result = await userProfileService.createFitnessGoals({
      user_id: this.testUserId,
      primary_goals: ["weight_loss", "strength"],
      time_commitment: "30-45",
      experience_level: "beginner",
    });

    if (!result.success) {
      throw new Error(result.error || "Fitness goals creation failed");
    }
  }

  private async testGetCompleteProfile(): Promise<void> {
    if (!this.testUserId) {
      throw new Error("No test user ID available");
    }

    const result = await userProfileService.getCompleteProfile(this.testUserId);

    if (!result.success || !result.data) {
      throw new Error(result.error || "Get complete profile failed");
    }

    // Verify profile data
    const profile = result.data;
    if (profile.personalInfo.name !== "Test User") {
      throw new Error("Profile data mismatch");
    }

    if (
      !profile.fitnessGoals ||
      profile.fitnessGoals.primaryGoals.length === 0
    ) {
      throw new Error("Fitness goals not found");
    }
  }

  private async testDatabaseQueries(): Promise<void> {
    // Test exercises query
    const { data: exercises, error: exercisesError } = await api.supabase
      .from("exercises")
      .select("*")
      .limit(5);

    if (exercisesError) {
      throw new Error(`Exercises query failed: ${exercisesError.message}`);
    }

    if (!exercises || exercises.length === 0) {
      throw new Error("No exercises found in database");
    }

    // Test foods query
    const { data: foods, error: foodsError } = await api.supabase
      .from("foods")
      .select("*")
      .limit(5);

    if (foodsError) {
      throw new Error(`Foods query failed: ${foodsError.message}`);
    }

    if (!foods || foods.length === 0) {
      throw new Error("No foods found in database");
    }
  }

  private async testOfflineFunctionality(): Promise<void> {
    // Test offline data storage
    await offlineService.storeOfflineData("test_key", { test: "data" });

    const retrievedData = offlineService.getOfflineData("test_key");
    if (!retrievedData || retrievedData.test !== "data") {
      throw new Error("Offline data storage/retrieval failed");
    }

    // Test offline action queueing
    if (!this.testUserId) {
      throw new Error("No test user ID available");
    }

    await offlineService.queueAction({
      type: "UPDATE",
      table: "profiles",
      data: { id: this.testUserId, test_field: "test_value" },
      userId: this.testUserId,
      maxRetries: 3,
    });

    const status = offlineService.getSyncStatus();
    if (status.queueLength === 0) {
      throw new Error("Offline action was not queued");
    }

    // Clean up
    await offlineService.removeOfflineData("test_key");
  }

  private async testUtilityFunctions(): Promise<void> {
    // Test email validation
    if (!api.utils.isValidEmail("test@example.com")) {
      throw new Error("Email validation failed for valid email");
    }

    if (api.utils.isValidEmail("invalid-email")) {
      throw new Error("Email validation failed for invalid email");
    }

    // Test password validation
    const passwordResult = api.utils.validatePassword("TestPassword123!");
    if (!passwordResult.isValid) {
      throw new Error("Password validation failed for valid password");
    }

    // Test BMI calculation
    const bmi = api.utils.calculateBMI(70, 175);
    if (Math.abs(bmi - 22.86) > 0.1) {
      throw new Error("BMI calculation incorrect");
    }

    // Test calorie calculation
    const calories = api.utils.calculateDailyCalories(
      70,
      175,
      25,
      "male",
      "moderate",
    );
    if (calories < 2000 || calories > 3000) {
      throw new Error("Calorie calculation seems incorrect");
    }

    // Test unit conversion
    const weightInLbs = api.utils.convertWeight(70, "kg", "lbs");
    if (Math.abs(weightInLbs - 154.32) > 1) {
      throw new Error("Weight conversion incorrect");
    }
  }

  private async testUserLogout(): Promise<void> {
    const result = await authService.logout();
    if (!result.success) {
      throw new Error(result.error || "Logout failed");
    }
  }

  private async testCleanup(): Promise<void> {
    // Clear offline data
    await offlineService.clearOfflineData();

    // Note: In a real test environment, you might want to clean up the test user
    // For now, we'll leave it as the database will be reset periodically
  }

  private printTestResults(suite: TestSuite): void {
    console.log("\n📊 Test Results Summary:");
    console.log(`Total Tests: ${suite.totalTests}`);
    console.log(`✅ Passed: ${suite.passedTests}`);
    console.log(`❌ Failed: ${suite.failedTests}`);
    console.log(`⏱️ Total Duration: ${suite.totalDuration}ms`);
    console.log(
      `📈 Success Rate: ${Math.round((suite.passedTests / suite.totalTests) * 100)}%`,
    );

    if (suite.failedTests > 0) {
      console.log("\n❌ Failed Tests:");
      suite.results
        .filter((r) => !r.success)
        .forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
    }

    console.log("\n🎉 Backend test suite completed!");
  }
}

export const backendTester = new BackendTester();

/**
 * Run the complete backend test suite
 */
export const runBackendTests = () => backendTester.runAllTests();

/**
 * Quick health check
 */
export const quickHealthCheck = async (): Promise<boolean> => {
  try {
    const result = await api.healthCheck();
    return result.success;
  } catch {
    return false;
  }
};
