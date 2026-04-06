import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore has a 2KB limit per key — chunk large values
const CHUNK_SIZE = 1800; // bytes, safely under 2KB limit

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    try {
      const numChunks = await SecureStore.getItemAsync(`${key}_numChunks`);
      if (numChunks) {
        const count = parseInt(numChunks, 10);
        const chunks: string[] = [];
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (chunk) chunks.push(chunk);
        }
        return chunks.join("");
      }
      return await SecureStore.getItemAsync(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") return AsyncStorage.setItem(key, value);
    try {
      if (value.length > CHUNK_SIZE) {
        const chunks = [];
        for (let i = 0; i < value.length; i += CHUNK_SIZE) {
          chunks.push(value.slice(i, i + CHUNK_SIZE));
        }
        await SecureStore.setItemAsync(`${key}_numChunks`, String(chunks.length));
        for (let i = 0; i < chunks.length; i++) {
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunks[i]);
        }
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch {
      return AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") return AsyncStorage.removeItem(key);
    try {
      const numChunks = await SecureStore.getItemAsync(`${key}_numChunks`);
      if (numChunks) {
        const count = parseInt(numChunks, 10);
        await SecureStore.deleteItemAsync(`${key}_numChunks`);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      return AsyncStorage.removeItem(key);
    }
  },
};

// Supabase configuration with safe environment variable access
const getEnvVar = (key: string, fallback: string) => {
  try {
    return (
      (typeof process !== "undefined" && process.env && process.env[key]) ||
      fallback
    );
  } catch (error) {
    console.warn(`Environment variable ${key} not available, using fallback`);
    return fallback;
  }
};

const supabaseUrl =
  (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_SUPABASE_URL) ||
  (() => { throw new Error("EXPO_PUBLIC_SUPABASE_URL is required"); })();
const supabaseAnonKey = getEnvVar(
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "",
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Missing Supabase environment variables",
  );
}

// Create Supabase client with SecureStore for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Database types — auto-generated from the live Supabase schema.
 * Re-exported from supabase-types.generated.ts (generated via `npx supabase gen types typescript`).
 * Do NOT hand-edit — regenerate instead.
 */
export type { Database } from "./supabase-types.generated";
