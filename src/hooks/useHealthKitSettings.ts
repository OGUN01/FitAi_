// Custom hook for HealthKit settings logic
// Extracted from HealthKitSettingsScreen.tsx

import { useState, useEffect } from "react";
import { Alert } from "react-native";
import { useHealthKitSync } from "./useHealthKitSync";

export const useHealthKitSettings = () => {
  const {
    isAvailable,
    isAuthorized,
    isLoading,
    syncStatus,
    error,
    lastSyncTime,
    healthMetrics,
    settings,
    requestPermissions,
    syncNow,
    updateSettings,
    getHealthSummary,
  } = useHealthKitSync();

  const [summary, setSummary] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    const loadSummary = async () => {
      if (isAuthorized) {
        setLoadingSummary(true);
        try {
          const summaryData = await getHealthSummary();
          setSummary(summaryData);
        } catch (error) {
          console.error("Failed to load health summary:", error);
        } finally {
          setLoadingSummary(false);
        }
      }
    };

    loadSummary();
  }, [isAuthorized, getHealthSummary]);

  const handleToggleHealthKit = async (enabled: boolean) => {
    if (enabled) {
      if (!isAvailable) {
        Alert.alert(
          "HealthKit Unavailable",
          "HealthKit is not available on this device. This feature requires an iOS device with HealthKit support.",
          [{ text: "OK" }],
        );
        return;
      }

      if (!isAuthorized) {
        const granted = await requestPermissions();
        if (!granted) {
          Alert.alert(
            "Permissions Required",
            "To use HealthKit integration, please grant permissions in the Health app or try again.",
            [{ text: "OK" }],
          );
          return;
        }
      }
    }

    updateSettings({ healthKitEnabled: enabled });
  };

  const handleDataTypeToggle = (
    dataType: keyof typeof settings.dataTypesToSync,
    enabled: boolean,
  ) => {
    updateSettings({
      dataTypesToSync: {
        ...settings.dataTypesToSync,
        [dataType]: enabled,
      },
    });
  };

  const handleSyncNow = async () => {
    try {
      await syncNow(true);
      Alert.alert(
        "Sync Complete",
        "Your health data has been synchronized successfully.",
      );

      const summaryData = await getHealthSummary();
      setSummary(summaryData);
    } catch (error) {
      Alert.alert(
        "Sync Failed",
        "Failed to sync health data. Please try again.",
      );
    }
  };

  const handleOpenHealthApp = () => {
    Alert.alert(
      "Open Health App",
      "To manage detailed HealthKit permissions, please open the Health app on your device.",
      [{ text: "Cancel", style: "cancel" }, { text: "OK" }],
    );
  };

  const formatLastSync = (syncTime?: string) => {
    if (!syncTime) return "Never";

    const now = new Date();
    const sync = new Date(syncTime);
    const diffMinutes = Math.floor((now.getTime() - sync.getTime()) / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  return {
    // State
    isAvailable,
    isAuthorized,
    isLoading,
    syncStatus,
    error,
    lastSyncTime,
    settings,
    summary,
    loadingSummary,

    // Handlers
    handleToggleHealthKit,
    handleDataTypeToggle,
    handleSyncNow,
    handleOpenHealthApp,
    formatLastSync,
    updateSettings,
  };
};
