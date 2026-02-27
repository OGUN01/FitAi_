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
        return;
      }
      throw error;
    }

  } catch (error) {
  }
}

export async function loadPreferencesFromSupabase(): Promise<NotificationPreferences | null> {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      if (error.code === "42703" || error.code === "PGRST116") {
        return null;
      }
      throw error;
    }

    if (data?.notification_preferences) {
      return data.notification_preferences as NotificationPreferences;
    }

    return null;
  } catch (error) {
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
