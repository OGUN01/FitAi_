import { useState, useEffect, useCallback } from "react";
import { Alert, Platform } from "react-native";
import Constants from "expo-constants";
import { useHealthDataStore } from "../stores/healthDataStore";
import { healthConnectService } from "../services/healthConnect";
import { haptics } from "../utils/haptics";

const isExpoGo = Constants.appOwnership === "expo";

export const useWearableConnection = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [nativeModuleAvailable, setNativeModuleAvailable] = useState<
    boolean | null
  >(null);
  const [isReauthorizing, setIsReauthorizing] = useState(false);

  const {
    metrics,
    isHealthKitAvailable,
    isHealthKitAuthorized,
    isHealthConnectAvailable,
    isHealthConnectAuthorized,
    syncStatus,
    lastSyncTime,
    syncError,
    settings,
    initializeHealthKit,
    requestHealthKitPermissions,
    initializeHealthConnect,
    requestHealthConnectPermissions,
    reauthorizeHealthConnect,
    syncFromHealthConnect,
    syncHealthData,
    updateSettings,
  } = useHealthDataStore();

  const isIOS = Platform.OS === "ios";
  const isAndroid = Platform.OS === "android";
  const isConnected = isIOS ? isHealthKitAuthorized : isHealthConnectAuthorized;
  const isAvailable = isIOS ? isHealthKitAvailable : isHealthConnectAvailable;
  const platformName = isIOS ? "HealthKit" : "Health Connect";

  // Initialize on mount and check native module availability
  useEffect(() => {
    const init = async () => {
      if (isAndroid) {
        const result = await initializeHealthConnect();
        setNativeModuleAvailable(result || isHealthConnectAvailable);
      } else if (isIOS) {
        const result = await initializeHealthKit();
        setNativeModuleAvailable(result || isHealthKitAvailable);
      }
    };
    init();
  }, []);

  // Handle connect/disconnect toggle
  const handleConnectionToggle = async (enabled: boolean) => {
    haptics.medium();

    if (!enabled) {
      updateSettings({
        healthKitEnabled: false,
        healthConnectEnabled: false,
      });
      return;
    }

    if (nativeModuleAvailable === false || isExpoGo) {
      Alert.alert(
        "Development Build Required",
        `${platformName} integration requires a development or production build. It's not available in Expo Go.\n\nTo use this feature, build the app using:\n• EAS Build (eas build)\n• Local development build`,
        [{ text: "OK" }],
      );
      return;
    }

    try {
      if (isAndroid) {
        const success = await requestHealthConnectPermissions();
        if (success) {
          updateSettings({ healthConnectEnabled: true });
          Alert.alert(
            "Connected!",
            "Health Connect is now syncing your wearable data.",
          );
          await syncFromHealthConnect(7);
        } else {
          Alert.alert(
            "Permission Required",
            "Health Connect permissions are needed to sync your health data.\n\nThe permission dialog may not have appeared. Please grant permissions manually in Health Connect settings.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: async () => {
                  try {
                    await healthConnectService.openSettings();
                  } catch (e) {
                    console.error("Failed to open Health Connect settings:", e);
                    Alert.alert(
                      "Open Health Connect",
                      "Please open the Health Connect app manually and grant FitAI permission to read your health data.",
                      [{ text: "OK" }],
                    );
                  }
                },
              },
            ],
          );
        }
      } else if (isIOS) {
        const success = await requestHealthKitPermissions();
        if (success) {
          updateSettings({ healthKitEnabled: true });
          Alert.alert(
            "Connected!",
            "HealthKit is now syncing your wearable data.",
          );
          await syncHealthData(true);
        } else {
          Alert.alert(
            "Permission Required",
            "Please grant HealthKit permissions in the Health app to sync your wearable data.",
            [{ text: "OK" }],
          );
        }
      }
    } catch (error) {
      console.error("Connection error:", error);
      Alert.alert("Connection Failed", "Unable to connect. Please try again.");
    }
  };

  // Handle manual sync
  const handleSyncNow = async () => {
    haptics.light();
    try {
      if (isAndroid) {
        await syncFromHealthConnect(7);
      } else if (isIOS) {
        await syncHealthData(true);
      }
      Alert.alert("Sync Complete", "Your health data has been updated.");
    } catch (error) {
      Alert.alert("Sync Failed", "Unable to sync data. Please try again.");
    }
  };

  // Handle re-authorization
  const handleReauthorize = async () => {
    if (!isAndroid) {
      Alert.alert(
        "Info",
        "Re-authorization is only needed for Android Health Connect.",
      );
      return;
    }

    Alert.alert(
      "Re-authorize Health Connect",
      "This will reset your Health Connect permissions and request fresh authorization.\n\nUse this if:\n• Calories are showing as 0\n• Some data types are missing\n• You recently updated the app\n\nYou will need to grant all permissions again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Re-authorize",
          style: "destructive",
          onPress: async () => {
            haptics.medium();
            setIsReauthorizing(true);
            try {
              const success = await reauthorizeHealthConnect();
              if (success) {
                Alert.alert(
                  "Success!",
                  "Health Connect has been re-authorized with all permissions. Your data will now sync correctly.",
                  [{ text: "OK" }],
                );
              } else {
                Alert.alert(
                  "Re-authorization Incomplete",
                  "Some permissions may not have been granted. Please check Health Connect settings and grant all permissions to FitAI.",
                  [
                    { text: "OK" },
                    {
                      text: "Open Settings",
                      onPress: () => healthConnectService.openSettings(),
                    },
                  ],
                );
              }
            } catch (error) {
              console.error("Re-authorization error:", error);
              Alert.alert(
                "Error",
                "Re-authorization failed. Please try again.",
              );
            } finally {
              setIsReauthorizing(false);
            }
          },
        },
      ],
    );
  };

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (isConnected) {
        if (isAndroid) {
          await syncFromHealthConnect(7);
        } else if (isIOS) {
          await syncHealthData(true);
        }
      }
    } catch (error) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, isAndroid]);

  // Handle data type toggle
  const handleDataTypeToggle = (dataType: string, enabled: boolean) => {
    updateSettings({
      dataTypesToSync: {
        ...settings.dataTypesToSync,
        [dataType]: enabled,
      },
    });
  };

  // Format last sync time
  const formatLastSync = (syncTime?: string) => {
    if (!syncTime) return "Never synced";

    const now = new Date();
    let sync: Date;

    if (/^\d+$/.test(syncTime)) {
      sync = new Date(parseInt(syncTime, 10));
    } else {
      sync = new Date(syncTime);
    }

    if (isNaN(sync.getTime())) return "Never synced";

    const diffMinutes = Math.floor((now.getTime() - sync.getTime()) / 60000);
    if (diffMinutes < 0) return "Just now";
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  return {
    // State
    refreshing,
    nativeModuleAvailable,
    isReauthorizing,
    isIOS,
    isAndroid,
    isConnected,
    isAvailable,
    platformName,
    isExpoGo,

    // Health data
    metrics,
    syncStatus,
    lastSyncTime,
    syncError,
    settings,

    // Actions
    handleConnectionToggle,
    handleSyncNow,
    handleReauthorize,
    onRefresh,
    handleDataTypeToggle,
    formatLastSync,
  };
};
