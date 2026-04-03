import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Supabase configuration with safe environment variable access
// Use fallbacks to prevent bundle evaluation errors when process.env is undefined
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

const supabaseUrl = getEnvVar(
  "EXPO_PUBLIC_SUPABASE_URL",
  "https://mqfrwtmkokivoxgukgsz.supabase.co",
);
const supabaseAnonKey = getEnvVar(
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "",
);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Missing Supabase environment variables - using development fallbacks",
  );
}

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
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
