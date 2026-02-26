import AsyncStorage from "@react-native-async-storage/async-storage";
import { StateStorage } from "zustand/middleware";

/**
 * A safe wrapper around AsyncStorage that catches JSON parse errors
 * and other storage failures. Used by all Zustand persisted stores
 * to prevent "SyntaxError: [object Object] is not valid JSON" crashes
 * during sign-out, rehydration, or storage corruption.
 */
export const safeAsyncStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await AsyncStorage.getItem(name);
      if (value === null || value === undefined) return null;

      // Validate that the stored value is valid JSON before returning
      // This catches cases where "[object Object]" was stored
      try {
        JSON.parse(value);
        return value;
      } catch {
        // Corrupt data detected, clearing key
        await AsyncStorage.removeItem(name);
        return null;
      }
    } catch (e) {
      // Storage read failed, clearing key
      try {
        await AsyncStorage.removeItem(name);
      } catch {
        // ignore cleanup failure
      }
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch (e) {
      // Storage write failed
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (e) {
      // Storage remove failed
    }
  },
};
