/**
 * usePrivacySecurityLogic - Business logic for Privacy & Security Settings
 *
 * Account deletion: routes through the FitAI Workers DELETE /api/account
 * endpoint, which uses the Supabase service role to wipe rows across every
 * user-data table AND removes the auth.users credential via
 * auth.admin.deleteUser. Client-side per-table deletion was retired — RLS
 * blocked several tables and the auth credential was never removable.
 *
 * Confirmation for this irreversible action is owned by the caller (a typed
 * "DELETE" confirmation modal on PrivacySecurityScreen) — this hook exposes
 * `deleteAccount` as a plain async action plus `isDeletingAccount` loading
 * state, rather than gating the deletion behind its own alert chain.
 */

import { useCallback, useState } from "react";
import { Share } from "react-native";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";
import { accountService } from "../services/accountService";
import { haptics } from "../utils/haptics";

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

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const deleteAccount = useCallback(async () => {
    setIsDeletingAccount(true);
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

      // Server-side wipe — service role deletes rows in every user-data
      // table AND removes the auth.users credential. Client no longer
      // loops per-table (RLS denied several; auth was unreachable).
      const result = await accountService.deleteAccount();

      if (!result.success) {
        if (result.isOffline) {
          crossPlatformAlert(
            "You're Offline",
            "Account deletion requires a network connection. Please try again when you're back online.",
          );
          return;
        }
        crossPlatformAlert(
          "Deletion Failed",
          result.error ||
            "The server could not delete your account. Please try again or contact support@fitai.app.",
        );
        return;
      }

      // Server confirmed deletion. Wipe local storage and sign out — the
      // refresh token is already invalid server-side, but signOut clears
      // the in-memory session so the auth gate routes to Welcome.
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const fitaiKeys = allKeys.filter(
          (key) =>
            key.startsWith("@fitai") || key.startsWith("fitai"),
        );
        await AsyncStorage.multiRemove(fitaiKeys);
      } catch (storageErr) {
        console.error(
          "Account deletion: local storage wipe failed:",
          storageErr,
        );
      }

      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.error(
          "Account deletion: signOut failed (session already invalid server-side):",
          signOutErr,
        );
      }

      if (result.authDeletionRequired) {
        crossPlatformAlert(
          "Data Deleted",
          "Your FitAI data has been permanently deleted. Your sign-in credential is being removed and will be fully gone shortly.",
        );
      } else if (result.failedTables && result.failedTables.length > 0) {
        crossPlatformAlert(
          "Account Deleted",
          "Your account has been permanently deleted. A small number of records are being cleaned up in the background.",
        );
      } else {
        crossPlatformAlert(
          "Account Deleted",
          "Your FitAI account and all associated data have been permanently deleted.",
        );
      }
    } catch (error) {
      console.error("Account deletion failed:", error);
      crossPlatformAlert(
        "Error",
        "Failed to delete account. Please try again.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  }, []);

  return {
    handleDataExport,
    deleteAccount,
    isDeletingAccount,
  };
};
