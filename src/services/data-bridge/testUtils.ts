/**
 * Test/Debug Utilities
 * Testing and debugging utilities for DataBridge
 */

import { AllDataResult, PersonalInfoData } from "./types";
import { saveToLocal, getOnboardingData } from "./localStorage";
import { hasLocalData } from "./sync";

/**
 * Test local storage methods
 */
export async function testLocalStorageMethods(): Promise<{
  success: boolean;
  results: any[];
}> {
  const results: any[] = [];
  try {
    // Test save
    const testData = { test: true, timestamp: Date.now() };
    await saveToLocal("testData", testData);
    results.push({ method: "saveToLocal", success: true });

    // Test load
    const loaded = await getOnboardingData();
    results.push({ method: "getOnboardingData", success: !!loaded });

    // Test hasLocalData
    const hasData = await hasLocalData();
    results.push({ method: "hasLocalData", success: true, hasData });

    return { success: true, results };
  } catch (error) {
    results.push({ method: "error", success: false, error: String(error) });
    return { success: false, results };
  }
}

/**
 * Test migration detection
 */
export async function testMigrationDetection(
  loadAllDataFn: () => Promise<AllDataResult>,
): Promise<{
  hasData: boolean;
  dataTypes: string[];
}> {
  const dataTypes: string[] = [];
  const data = await loadAllDataFn();
  if (data.personalInfo) dataTypes.push("personalInfo");
  if (data.dietPreferences) dataTypes.push("dietPreferences");
  if (data.bodyAnalysis) dataTypes.push("bodyAnalysis");
  if (data.workoutPreferences) dataTypes.push("workoutPreferences");
  if (data.advancedReview) dataTypes.push("advancedReview");
  return { hasData: dataTypes.length > 0, dataTypes };
}

/**
 * Create sample profile data for testing
 */
export async function createSampleProfileData(
  savePersonalInfoFn: (data: any) => Promise<any>,
): Promise<boolean> {
  try {
    const samplePersonalInfo: Partial<PersonalInfoData> = {
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      age: 25,
      gender: "male" as const,
      country: "US",
      state: "CA",
    };
    await savePersonalInfoFn(samplePersonalInfo);
    console.log("[DataBridge] Sample profile data created");
    return true;
  } catch (error) {
    console.error("[DataBridge] createSampleProfileData error:", error);
    return false;
  }
}
