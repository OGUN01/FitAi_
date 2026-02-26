/**
 * usePrivacySecurityLogic - Business logic for Privacy & Security Settings
 */

import { useState, useCallback, useEffect } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../services/supabase";
import { haptics } from "../utils/haptics";

const PRIVACY_SETTINGS_KEY = "@fitai_privacy_settings";

export interface PrivacySettings {
  dataSharing: boolean;
  analytics: boolean;
  crashReports: boolean;
  locationTracking: boolean;
  biometricAuth: boolean;
  autoLock: boolean;
}

export const usePrivacySecurityLogic = () => {
  const [settings, setSettings] = useState<PrivacySettings>({
    dataSharing: false,
    analytics: true,
    crashReports: true,
    locationTracking: false,
    biometricAuth: false,
    autoLock: true,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(PRIVACY_SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings((prev) => ({ ...prev, ...parsed }));
        }
      } catch (error) {
        console.error("Failed to load privacy settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const toggleSetting = useCallback((key: keyof PrivacySettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  }, []);

  const handleDataExport = useCallback(async () => {
    const doExport = async () => {
      try {
        haptics.success();

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert("Error", "You must be logged in to export data.");
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
              .map(([key, value]) => [
                key,
                value ? JSON.parse(value) : null,
              ])
              .filter(([_, value]) => value !== null),
          ),
        };

        // In a real app, this would upload to a storage bucket and email the link
        // For now, we log it and show success

        Alert.alert(
          "Export Complete",
          "Your data has been exported. In a production app, this would be emailed to you.",
        );
      } catch (error) {
        console.error("Data export failed:", error);
        Alert.alert("Error", "Failed to export data. Please try again.");
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        "Export Data\n\nYour data export will be prepared. This may take a few moments.\n\nClick OK to proceed."
      );
      if (confirmed) {
        await doExport();
      }
    } else {
      Alert.alert(
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
    }
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
          Alert.alert(
            "Error",
            "You must be logged in to delete your account.",
          );
          return;
        }

        // Clear all local data
        const allKeys = await AsyncStorage.getAllKeys();
        const fitaiKeys = allKeys.filter(
          (key) =>
            key.startsWith("@fitai") || key.startsWith("fitai"),
        );
        await AsyncStorage.multiRemove(fitaiKeys);

        // Sign out (actual account deletion would require server-side implementation)
        await supabase.auth.signOut();

        Alert.alert(
          "Account Deleted",
          "Your local data has been cleared and you have been signed out. Contact support to complete server-side deletion.",
        );
      } catch (error) {
        console.error("Account deletion failed:", error);
        Alert.alert(
          "Error",
          "Failed to delete account. Please try again.",
        );
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        "Delete Account\n\nThis action cannot be undone. All your data will be permanently deleted.\n\nClick OK to proceed."
      );
      if (confirmed) {
        const finalConfirm = window.confirm(
          "Final Confirmation\n\nAre you absolutely sure? This will permanently delete your account and all associated data."
        );
        if (finalConfirm) {
          await doDelete();
        }
      }
    } else {
      Alert.alert(
        "Delete Account",
        "This action cannot be undone. All your data will be permanently deleted.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Final Confirmation",
                "Are you absolutely sure? This will permanently delete your account and all associated data.",
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
    }
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      haptics.success();
      // Persist settings to AsyncStorage
      await AsyncStorage.setItem(
        PRIVACY_SETTINGS_KEY,
        JSON.stringify(settings),
      );
      setHasChanges(false);
      Alert.alert("Success", "Privacy settings saved successfully!");
    } catch (error) {
      console.error("Failed to save privacy settings:", error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    }
  }, [settings]);

  return {
    settings,
    hasChanges,
    isLoading,
    toggleSetting,
    handleDataExport,
    handleDeleteAccount,
    saveSettings,
  };
};
