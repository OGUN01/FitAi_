/**
 * usePrivacySecurityLogic - Business logic for Privacy & Security Settings
 */

import { useCallback } from "react";
import { Share } from "react-native";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";
import { haptics } from "../utils/haptics";

/**
 * User-data tables keyed by user_id with user-scoped RLS
 * (auth.uid() = user_id). Client-side deletion is best-effort per table;
 * the profiles row (keyed by id = auth.uid()) is deleted last and its
 * ON DELETE CASCADE wipes any remaining child rows. Removing the
 * auth.users credential itself requires a server-side (service role)
 * endpoint — flagged as follow-up work.
 */
const USER_DATA_TABLES = [
  "diet_preferences",
  "workout_preferences",
  "fitness_goals",
  "nutrition_goals",
  "analytics_metrics",
  "health_metrics",
  "meal_recognition_metadata",
  "user_food_contributions",
  "meal_logs",
  "water_logs",
  "user_meal_plans",
  "weekly_meal_plans",
  "user_workout_plans",
  "weekly_workout_plans",
  "workout_sessions",
  "body_analysis",
  "progress_entries",
  "progress_goals",
  "chat_messages",
  "device_tokens",
  "onboarding_progress",
  "generation_history",
  "subscriptions",
] as const;

export const usePrivacySecurityLogic = () => {
  const handleDataExport = useCallback(async () => {
    const doExport = async () => {
      try {
        haptics.success();

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          crossPlatformAlert("Error", "You must be logged in to export data.");
          return;
        }

        // Collect all user data from local storage
        const allKeys = await AsyncStorage.getAllKeys();
        const fitaiKeys = allKeys.filter(
          (key) => key.startsWith("@fitai") || key.startsWith("fitai"),
        );
        const userData = await AsyncStorage.multiGet(fitaiKeys);

        // Create export object
        const exportData = {
          exportDate: new Date().toISOString(),
          userId: user.id,
          email: user.email,
          localData: Object.fromEntries(
            userData
              .map(([key, value]) => {
                try {
                  return [key, value ? JSON.parse(value) : null];
                } catch {
                  return [key, value]; // keep raw string if not valid JSON
                }
              })
              .filter(([_, value]) => value !== null),
          ),
        };

        // Share the exported data via the native share sheet
        await Share.share({
          message: JSON.stringify(exportData, null, 2),
          title: "Your FitAI Data Export",
        });
      } catch (error) {
        console.error("Data export failed:", error);
        crossPlatformAlert("Error", "Failed to export data. Please try again.");
      }
    };

    crossPlatformAlert(
      "Export Data",
      "Your data export will be prepared. This may take a few moments.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Export",
          onPress: doExport,
        },
      ],
    );
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    const doDelete = async () => {
      try {
        haptics.medium();

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          crossPlatformAlert(
            "Error",
            "You must be logged in to delete your account.",
          );
          return;
        }

        // Best-effort deletion of the user's rows in every user-data table.
        // RLS limits each delete to the caller's own rows. Tables without a
        // DELETE policy will error — logged, not swallowed.
        const failedTables: string[] = [];
        for (const table of USER_DATA_TABLES) {
          const { error } = await supabase
            .from(table)
            .delete()
            .eq("user_id", user.id);
          if (error) {
            failedTables.push(table);
            console.error(
              `Account deletion: failed to delete from ${table}:`,
              error.message,
            );
          }
        }

        // profiles is keyed by id (= auth.uid()) and cascades to any
        // remaining child rows that reference it.
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", user.id);
        if (profileError) {
          failedTables.push("profiles");
          console.error(
            "Account deletion: failed to delete profile:",
            profileError.message,
          );
        }

        // Clear all local data
        const allKeys = await AsyncStorage.getAllKeys();
        const fitaiKeys = allKeys.filter(
          (key) =>
            key.startsWith("@fitai") || key.startsWith("fitai"),
        );
        await AsyncStorage.multiRemove(fitaiKeys);

        // Sign out. Removing the auth credential itself requires a
        // server-side (service role) endpoint — surfaced honestly below.
        await supabase.auth.signOut();

        if (failedTables.length === 0) {
          crossPlatformAlert(
            "Data Deleted",
            "Your app data has been deleted and you have been signed out. " +
              "Your sign-in credential still exists on our servers — contact support@fitai.app to remove it permanently.",
          );
        } else {
          crossPlatformAlert(
            "Partial Deletion",
            "Your local data was cleared and you have been signed out, but some server data could not be deleted. " +
              "Contact support@fitai.app to complete deletion of your account.",
          );
        }
      } catch (error) {
        console.error("Account deletion failed:", error);
        crossPlatformAlert(
          "Error",
          "Failed to delete account. Please try again.",
        );
      }
    };

    crossPlatformAlert(
      "Delete Account Data",
      "This will delete your FitAI data (profile, plans, logs) and sign you out. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            crossPlatformAlert(
              "Final Confirmation",
              "Are you absolutely sure? Your workout plans, meal logs, and profile data will be permanently deleted.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete Forever",
                  style: "destructive",
                  onPress: doDelete,
                },
              ],
            );
          },
        },
      ],
    );
  }, []);

  return {
    handleDataExport,
    handleDeleteAccount,
  };
};
