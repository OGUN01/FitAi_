import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../supabase";
import type { NotificationPreferences } from "./types";

export async function savePreferencesToSupabase(
  preferences: NotificationPreferences,
): Promise<void> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("📱 No authenticated user - skipping Supabase sync");
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        notification_preferences: preferences,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      if (error.code === "42703") {
        console.log(
          "📱 notification_preferences column not in schema - storing locally only",
        );
        return;
      }
      throw error;
    }

    console.log("✅ Notification preferences synced to Supabase");
  } catch (error) {
    console.warn("Could not sync notification preferences to Supabase:", error);
  }
}

export async function loadPreferencesFromSupabase(): Promise<NotificationPreferences | null> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("📱 No authenticated user - loading from local storage");
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", user.id)
      .single();

    if (error) {
      if (error.code === "42703" || error.code === "PGRST116") {
        console.log(
          "📱 notification_preferences not in schema - using local storage",
        );
        return null;
      }
      throw error;
    }

    if (data?.notification_preferences) {
      console.log("✅ Loaded notification preferences from Supabase");
      return data.notification_preferences as NotificationPreferences;
    }

    return null;
  } catch (error) {
    console.warn(
      "Could not load notification preferences from Supabase:",
      error,
    );
    return null;
  }
}

export async function savePreferences(
  preferences: NotificationPreferences,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      "notification_preferences",
      JSON.stringify(preferences),
    );

    await savePreferencesToSupabase(preferences);

    console.log("Notification preferences saved");
  } catch (error) {
    console.error("Failed to save notification preferences:", error);
  }
}

export async function loadPreferences(): Promise<NotificationPreferences | null> {
  try {
    const supabasePreferences = await loadPreferencesFromSupabase();
    if (supabasePreferences) {
      await AsyncStorage.setItem(
        "notification_preferences",
        JSON.stringify(supabasePreferences),
      );
      return supabasePreferences;
    }

    const saved = await AsyncStorage.getItem("notification_preferences");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error("Failed to load notification preferences:", error);
    return null;
  }
}
