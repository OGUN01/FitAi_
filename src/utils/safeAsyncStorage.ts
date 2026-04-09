import AsyncStorage from "@react-native-async-storage/async-storage";
import { StateStorage } from "zustand/middleware";
import type { PersistStorage, StorageValue } from "zustand/middleware";

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
      try {
        JSON.parse(value);
        return value;
      } catch {
        await AsyncStorage.removeItem(name);
        return null;
      }
    } catch (e) {
      console.error('[SafeAsyncStorage] Read failed for key:', name, e);
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
      console.error('[SafeAsyncStorage] Write failed for key:', name, e);
    }
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch (e) {
      console.error('[SafeAsyncStorage] Remove failed for key:', name, e);
    }
  },
};

/**
 * PERF: Debounced PersistStorage for Zustand.
 *
 * Unlike createJSONStorage(() => safeAsyncStorage), this defers BOTH
 * JSON.stringify AND the AsyncStorage.setItem write. With createJSONStorage,
 * every set() call runs JSON.stringify synchronously on the JS thread
 * (even if the actual I/O is debounced). With 15+ persisted stores,
 * this causes 100-400ms of JS thread blocking per button press.
 *
 * This adapter stores the raw object reference and only serializes
 * once the debounce timer fires — so rapid set() calls pay zero
 * serialization cost for intermediate states.
 *
 * Usage: Replace `storage: createJSONStorage(() => safeAsyncStorage)`
 * with `storage: createDebouncedStorage()` in persist options.
 */
const pendingWrites = new Map<
  string,
  { timer: ReturnType<typeof setTimeout>; value: any }
>();
const DEBOUNCE_MS = 1000;

export function createDebouncedStorage<S>(): PersistStorage<S> {
  return {
    getItem: async (name: string): Promise<StorageValue<S> | null> => {
      try {
        const value = await AsyncStorage.getItem(name);
        if (value === null || value === undefined) return null;
        try {
          return JSON.parse(value) as StorageValue<S>;
        } catch {
          await AsyncStorage.removeItem(name);
          return null;
        }
      } catch {
        try {
          await AsyncStorage.removeItem(name);
        } catch {
          /* ignore */
        }
        return null;
      }
    },

    setItem: (name: string, value: StorageValue<S>): void => {
      // Store raw object reference — do NOT serialize yet
      const existing = pendingWrites.get(name);
      if (existing) {
        clearTimeout(existing.timer);
      }

      const timer = setTimeout(() => {
        pendingWrites.delete(name);
        try {
          const serialized = JSON.stringify(value);
          AsyncStorage.setItem(name, serialized).catch((err) => {
            console.warn("[safeAsyncStorage] Storage write failed:", err);
          });
        } catch (err) {
          console.warn("[safeAsyncStorage] Serialization failed:", err);
        }
      }, DEBOUNCE_MS);

      pendingWrites.set(name, { timer, value });
    },

    removeItem: async (name: string): Promise<void> => {
      const existing = pendingWrites.get(name);
      if (existing) {
        clearTimeout(existing.timer);
        pendingWrites.delete(name);
      }
      try {
        await AsyncStorage.removeItem(name);
      } catch (err) {
        console.warn("[safeAsyncStorage] Storage remove failed:", err);
      }
    },
  };
}
