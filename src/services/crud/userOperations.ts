import { dataBridge } from "../DataBridge";
import { OnboardingData, UserPreferences } from "../../types/localData";

export async function createOnboardingData(
  data: OnboardingData,
): Promise<void> {
  try {
    await dataBridge.storeOnboardingData(data);
    console.log("Onboarding data created successfully");
  } catch (error) {
    console.error("Failed to create onboarding data:", error);
    throw error;
  }
}

export async function readOnboardingData(): Promise<OnboardingData | null> {
  try {
    return await dataBridge.getOnboardingData();
  } catch (error) {
    console.error("Failed to read onboarding data:", error);
    return null;
  }
}

export async function updateOnboardingData(
  updates: Partial<OnboardingData>,
): Promise<void> {
  try {
    const existing = await dataBridge.getOnboardingData();
    if (!existing) {
      throw new Error("No existing onboarding data to update");
    }

    const updated: OnboardingData = {
      ...existing,
      ...updates,
    };

    await dataBridge.storeOnboardingData(updated);
    console.log("Onboarding data updated successfully");
  } catch (error) {
    console.error("Failed to update onboarding data:", error);
    throw error;
  }
}

export async function updateUserPreferences(
  preferences: Partial<UserPreferences>,
): Promise<void> {
  try {
    await dataBridge.updateUserPreferences(preferences);
    console.log("User preferences updated successfully");
  } catch (error) {
    console.error("Failed to update user preferences:", error);
    throw error;
  }
}

export async function readUserPreferences(): Promise<UserPreferences | null> {
  try {
    return await dataBridge.getUserPreferences();
  } catch (error) {
    console.error("Failed to read user preferences:", error);
    return null;
  }
}
