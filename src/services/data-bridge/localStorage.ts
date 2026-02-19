/**
 * Local Storage Operations
 * AsyncStorage utilities for DataBridge
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { ONBOARDING_DATA_KEY } from "./constants";

/**
 * Save a field to local storage
 */
export async function saveToLocal(field: string, data: any): Promise<void> {
  try {
    const existingDataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    const existingData = existingDataStr ? JSON.parse(existingDataStr) : {};

    const updatedData = {
      ...existingData,
      [field]: data,
      lastUpdatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(
      ONBOARDING_DATA_KEY,
      JSON.stringify(updatedData),
    );
    console.log(`[DataBridge] Saved ${field} to local storage`);
  } catch (error) {
    console.error(`[DataBridge] Failed to save ${field} to local:`, error);
    throw error;
  }
}

/**
 * Get onboarding data from local storage
 */
export async function getOnboardingData(): Promise<any | null> {
  try {
    const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    return dataStr ? JSON.parse(dataStr) : null;
  } catch (error) {
    console.error("[DataBridge] getOnboardingData error:", error);
    return null;
  }
}

/**
 * Store onboarding data to local storage
 */
export async function storeOnboardingData(data: any): Promise<boolean> {
  try {
    await AsyncStorage.setItem(
      ONBOARDING_DATA_KEY,
      JSON.stringify({
        ...data,
        lastUpdatedAt: new Date().toISOString(),
      }),
    );
    console.log("[DataBridge] Onboarding data stored");
    return true;
  } catch (error) {
    console.error("[DataBridge] storeOnboardingData error:", error);
    return false;
  }
}
