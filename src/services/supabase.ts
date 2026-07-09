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
    } catch (error) {
      console.warn("[SecureStoreAdapter] getItem falling back to AsyncStorage for key:", key, error);
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
    } catch (error) {
      console.warn("[SecureStoreAdapter] setItem falling back to AsyncStorage for key:", key, error);
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
    } catch (error) {
      console.warn("[SecureStoreAdapter] removeItem falling back to AsyncStorage for key:", key, error);
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

// NOTE: Do NOT use optional chaining (`process.env?.X`) OR dynamic bracket
// access (`process.env[key]`) on EXPO_PUBLIC_* reads. babel-preset-expo's
// inline-env-vars plugin only statically substitutes `process.env.X` /
// `process.env['X']` (literal) forms — `?.` and dynamic keys defeat the static
// analysis, leaving the reference unsubstituted in the bundled JS, so it
// evaluates to `undefined` at runtime and throws "EXPO_PUBLIC_* is required" in
// the release APK (the #1 blocker for on-device QA — see
// src/docs/VERIFIED-FINDINGS.md "Build-1"). Use direct static member access.
const supabaseUrl =
  (typeof process !== "undefined" && process.env.EXPO_PUBLIC_SUPABASE_URL) ||
  (() => { throw new Error("EXPO_PUBLIC_SUPABASE_URL is required"); })();
const supabaseAnonKey =
  (typeof process !== "undefined" && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) ||
  "";

// P3-20: Surface a fatal error when the anon key is missing in production.
// Previously this only console.warn'd and then created a client anyway, which
// silently failed every request (RLS rejects with an empty key) while local
// state looked fine. In dev we still warn + create the client so the bundler
// can boot for offline work; in production we throw so a misconfigured deploy
// is caught at startup instead of producing a client that rejects everything.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && "EXPO_PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  ]
    .filter(Boolean)
    .join(", ");
  const message = `Missing Supabase environment variables: ${missing}. ` +
    `The client cannot authenticate and every request will be rejected by RLS.`;
  if (__DEV__) {
    console.warn(`⚠️ ${message}`);
  } else {
    // Production: fail fast so a misconfigured deploy is caught immediately.
    throw new Error(message);
  }
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
