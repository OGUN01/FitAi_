/**
 * Storage Operations
 * Workout sessions, meal logs, and body measurements storage
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  WORKOUT_SESSIONS_KEY,
  MEAL_LOGS_KEY,
  BODY_ANALYSIS_KEY,
  ONBOARDING_DATA_KEY,
} from "./constants";

// ============================================================================
// WORKOUT SESSIONS
// ============================================================================

export async function storeWorkoutSession(session: any): Promise<boolean> {
  try {
    const existingStr = await AsyncStorage.getItem(WORKOUT_SESSIONS_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : [];
    existing.unshift({
      ...session,
      id: session.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      WORKOUT_SESSIONS_KEY,
      JSON.stringify(existing.slice(0, 100)),
    ); // Keep last 100
    return true;
  } catch (error) {
    console.error("[DataBridge] storeWorkoutSession error:", error);
    return false;
  }
}

export async function getWorkoutSessions(limit: number = 10): Promise<any[]> {
  try {
    const dataStr = await AsyncStorage.getItem(WORKOUT_SESSIONS_KEY);
    const sessions = dataStr ? JSON.parse(dataStr) : [];
    return sessions.slice(0, limit);
  } catch (error) {
    console.error("[DataBridge] getWorkoutSessions error:", error);
    return [];
  }
}

export async function updateWorkoutSession(
  sessionId: string,
  updates: any,
): Promise<boolean> {
  try {
    const dataStr = await AsyncStorage.getItem(WORKOUT_SESSIONS_KEY);
    const sessions = dataStr ? JSON.parse(dataStr) : [];
    const index = sessions.findIndex((s: any) => s.id === sessionId);
    if (index !== -1) {
      sessions[index] = {
        ...sessions[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(
        WORKOUT_SESSIONS_KEY,
        JSON.stringify(sessions),
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("[DataBridge] updateWorkoutSession error:", error);
    return false;
  }
}

// ============================================================================
// MEAL LOGS
// ============================================================================

export async function storeMealLog(mealLog: any): Promise<boolean> {
  try {
    const existingStr = await AsyncStorage.getItem(MEAL_LOGS_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : [];
    existing.unshift({
      ...mealLog,
      id: mealLog.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      MEAL_LOGS_KEY,
      JSON.stringify(existing.slice(0, 500)),
    ); // Keep last 500
    return true;
  } catch (error) {
    console.error("[DataBridge] storeMealLog error:", error);
    return false;
  }
}

export async function getMealLogs(
  date?: string,
  limit: number = 50,
): Promise<any[]> {
  try {
    const dataStr = await AsyncStorage.getItem(MEAL_LOGS_KEY);
    let logs = dataStr ? JSON.parse(dataStr) : [];
    if (date) {
      logs = logs.filter(
        (log: any) => log.date === date || log.createdAt?.startsWith(date),
      );
    }
    return logs.slice(0, limit);
  } catch (error) {
    console.error("[DataBridge] getMealLogs error:", error);
    return [];
  }
}

// ============================================================================
// BODY ANALYSIS
// ============================================================================

export async function storeBodyMeasurement(measurement: any): Promise<boolean> {
  try {
    const existingStr = await AsyncStorage.getItem(BODY_ANALYSIS_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : [];
    existing.unshift({
      ...measurement,
      id: measurement.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
    });
    await AsyncStorage.setItem(
      BODY_ANALYSIS_KEY,
      JSON.stringify(existing.slice(0, 100)),
    );
    return true;
  } catch (error) {
    console.error("[DataBridge] storeBodyMeasurement error:", error);
    return false;
  }
}

export async function getBodyMeasurements(limit: number = 10): Promise<any[]> {
  try {
    const dataStr = await AsyncStorage.getItem(BODY_ANALYSIS_KEY);
    const measurements = dataStr ? JSON.parse(dataStr) : [];
    return measurements.slice(0, limit);
  } catch (error) {
    console.error("[DataBridge] getBodyMeasurements error:", error);
    return [];
  }
}

// ============================================================================
// CLEAR DATA
// ============================================================================

export async function clearAllStorageData(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
    await AsyncStorage.removeItem(WORKOUT_SESSIONS_KEY);
    await AsyncStorage.removeItem(MEAL_LOGS_KEY);
    await AsyncStorage.removeItem(BODY_ANALYSIS_KEY);
    await AsyncStorage.removeItem("body_measurements");
  } catch (error) {
    console.error("[DataBridge] clearAllStorageData error:", error);
  }
}

// ============================================================================
// STORAGE INFO
// ============================================================================

export async function getStorageInfo(): Promise<any> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return {
      totalKeys: keys.length,
    };
  } catch (error) {
    console.error("[DataBridge] getStorageInfo error:", error);
    return { totalKeys: 0 };
  }
}

export async function isQuotaExceeded(): Promise<boolean> {
  // AsyncStorage doesn't have a quota limit in the same way
  return false;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export async function getUserPreferences(): Promise<any | null> {
  try {
    const dataStr = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    if (dataStr) {
      const data = JSON.parse(dataStr);
      return data.userPreferences || null;
    }
    return null;
  } catch (error) {
    console.error("[DataBridge] getUserPreferences error:", error);
    return null;
  }
}
