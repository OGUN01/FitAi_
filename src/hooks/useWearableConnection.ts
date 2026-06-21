import { logger } from '../utils/logger';
import { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { crossPlatformAlert } from "../utils/crossPlatformAlert";
import Constants from "expo-constants";
import { useHealthDataStore } from "../stores/healthDataStore";
import { useAuthStore } from "../stores/authStore";
import { healthConnectService } from "../services/healthConnect";
import { haptics } from "../utils/haptics";

const isExpoGo = Constants.appOwnership === "expo";

// One-time disclosure acknowledgement flag. Once the user has acknowledged the
// Health Connect data-use disclosure, we don't block them with it again on
// subsequent connects — but it ALWAYS shows the first time (flag absent).
const HC_DISCLOSURE_ACK_KEY = "fitai_hc_disclosure_acknowledged";

export const useWearableConnection = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [nativeModuleAvailable, setNativeModuleAvailable] = useState<
    boolean | null
  >(null);
  const [isReauthorizing, setIsReauthorizing] = useState(false);
  // Disclosure modal + the pending action to run once the user acknowledges.
  // Stores the continuation (the actual permission request) so the toggle
  // handler can resume after the user taps "Acknowledge & continue".
  const [disclosureVisible, setDisclosureVisible] = useState(false);
  const pendingPermissionRequestRef = useRef<(() => Promise<void>) | null>(
    null,
  );

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

  // Health Connect is "working" only when the module is available AND the user
  // has granted authorization. Used to decide whether the
  // UnsupportedWatchNotice (which is about watches WITHOUT HC support) should
  // be shown: if HC is working, the user has a supported watch — hide it.
  const isHealthConnectWorking =
    !!isHealthConnectAvailable && !!isHealthConnectAuthorized;

  // Guest-mode guard for the manual-entry path. Guests can open the manual
  // health entry screen and fill the form, but save fails with
  // "Not authenticated" because getCurrentUserId() is null for guests. Block
  // at the entry point instead and route them to sign-in.
  const isGuestMode = useAuthStore((s) => s.isGuestMode);

  const handleEnterManually = useCallback(
    (onNavigate: () => void) => {
      haptics.light();
      if (isGuestMode) {
        crossPlatformAlert(
          "Sign in to save health data",
          "Manual health entries are saved to your account. Please sign in or create an account to log health data.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign in",
              onPress: () => {
                // Exit guest mode; the app's root navigator observes
                // isGuestMode and will route to the auth flow.
                useAuthStore.getState().exitGuestMode();
              },
            },
          ],
        );
        return;
      }
      onNavigate();
    },
    [isGuestMode],
  );

  // Initialize on mount and check native module availability
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isAndroid) {
        const result = await initializeHealthConnect();
        if (!isMounted) return;
        setNativeModuleAvailable(result || isHealthConnectAvailable);
      } else if (isIOS) {
        const result = await initializeHealthKit();
        if (!isMounted) return;
        setNativeModuleAvailable(result || isHealthKitAvailable);
      }
    };
    init();
    return () => { isMounted = false; };
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
      crossPlatformAlert(
        "Development Build Required",
        `${platformName} integration requires a development or production build. It's not available in Expo Go.\n\nTo use this feature, build the app using:\n• EAS Build (eas build)\n• Local development build`,
        [{ text: "OK" }],
      );
      return;
    }

    try {
      if (isAndroid) {
        // 1. If the Health Connect provider APK isn't installed (Android <14
        //    without the provider, or any device where SDK_UNAVAILABLE),
        //    offer to install it from the Play Store instead of failing
        //    opaquely inside requestHealthConnectPermissions().
        const availability =
          await healthConnectService.getHealthConnectAvailability();
        if (availability === "SDK_UNAVAILABLE") {
          crossPlatformAlert(
            "Health Connect Required",
            "Health Connect isn't installed on this device. Install the Health Connect app from the Play Store to sync your watch or fitness tracker data with FitAI.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Install",
                onPress: async () => {
                  try {
                    await healthConnectService.promptInstallHealthConnect();
                  } catch (e) {
                    logger.error('Failed to open Health Connect Play Store listing', { error: String(e) });
                  }
                },
              },
            ],
          );
          return;
        }
        if (availability === "SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED") {
          crossPlatformAlert(
            "Update Health Connect",
            "Your Health Connect app needs an update before FitAI can sync data. Please update it from the Play Store.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: async () => {
                  try {
                    await healthConnectService.openSettings();
                  } catch (e) {
                    logger.error('Failed to open Health Connect settings', { error: String(e) });
                  }
                },
              },
            ],
          );
          return;
        }

        // 2. Play User Data policy: show the in-app disclosure BEFORE the
        //    system permission sheet. Gated by a one-time AsyncStorage flag so
        //    returning users aren't blocked on every connect — but it ALWAYS
        //    shows the first time (flag absent). Only after the user taps
        //    "Acknowledge & continue" do we proceed to the OS permission
        //    request.
        const alreadyAcknowledged =
          (await AsyncStorage.getItem(HC_DISCLOSURE_ACK_KEY)) === "true";
        if (!alreadyAcknowledged) {
          pendingPermissionRequestRef.current =
            runHealthConnectPermissionRequest;
          setDisclosureVisible(true);
          return;
        }

        await runHealthConnectPermissionRequest();
      } else if (isIOS) {
        const success = await requestHealthKitPermissions();
        if (success) {
          updateSettings({ healthKitEnabled: true });
          crossPlatformAlert(
            "Connected!",
            "HealthKit is now syncing your wearable data.",
          );
          await syncHealthData(true);
        } else {
          crossPlatformAlert(
            "Permission Required",
            "Please grant HealthKit permissions in the Health app to sync your wearable data.",
            [{ text: "OK" }],
          );
        }
      }
    } catch (error) {
      logger.error('Connection error', { error: String(error) });
      crossPlatformAlert("Connection Failed", "Unable to connect. Please try again.");
    }
  };

  // The actual Android Health Connect permission request, factored out so the
  // disclosure modal's "Acknowledge & continue" callback can resume the flow
  // after the user has seen the disclosure.
  const runHealthConnectPermissionRequest = async () => {
    try {
      const success = await requestHealthConnectPermissions();
      if (success) {
        updateSettings({ healthConnectEnabled: true });
        crossPlatformAlert(
          "Connected!",
          "Health Connect is now syncing your wearable data.",
        );
        await syncFromHealthConnect(7);
      } else {
        crossPlatformAlert(
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
                  logger.error('Failed to open Health Connect settings', { error: String(e) });
                  crossPlatformAlert(
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
    } catch (error) {
      logger.error('Health Connect permission request error', { error: String(error) });
      crossPlatformAlert("Connection Failed", "Unable to connect. Please try again.");
    }
  };

  // Called when the user taps "Acknowledge & continue" in the disclosure
  // modal. Persists the one-time acknowledgement, then resumes the pending
  // permission request.
  const handleDisclosureAcknowledge = useCallback(async () => {
    try {
      await AsyncStorage.setItem(HC_DISCLOSURE_ACK_KEY, "true");
    } catch (e) {
      logger.error('Failed to persist HC disclosure acknowledgement', { error: String(e) });
      // Non-fatal — still proceed; user will just see the disclosure again next time.
    }
    setDisclosureVisible(false);
    const pending = pendingPermissionRequestRef.current;
    pendingPermissionRequestRef.current = null;
    if (pending) {
      await pending();
    }
  }, []);

  // Called when the user dismisses the disclosure modal ("Not now" or back).
  // Clears the pending request so a later toggle starts fresh.
  const handleDisclosureDismiss = useCallback(() => {
    setDisclosureVisible(false);
    pendingPermissionRequestRef.current = null;
  }, []);

  // Handle manual sync
  const handleSyncNow = async () => {
    haptics.light();
    try {
      if (isAndroid) {
        await syncFromHealthConnect(7);
      } else if (isIOS) {
        await syncHealthData(true);
      }
      crossPlatformAlert("Sync Complete", "Your health data has been updated.");
    } catch (error) {
      crossPlatformAlert("Sync Failed", "Unable to sync data. Please try again.");
    }
  };

  // Handle re-authorization
  const handleReauthorize = async () => {
    if (!isAndroid) {
      crossPlatformAlert(
        "Info",
        "Re-authorization is only needed for Android Health Connect.",
      );
      return;
    }

    crossPlatformAlert(
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
                crossPlatformAlert(
                  "Success!",
                  "Health Connect has been re-authorized with all permissions. Your data will now sync correctly.",
                  [{ text: "OK" }],
                );
              } else {
                crossPlatformAlert(
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
              logger.error('Re-authorization error', { error: String(error) });
              crossPlatformAlert(
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
      logger.error('Refresh error', { error: String(error) });
    } finally {
      setRefreshing(false);
    }
  }, [isConnected, isAndroid, syncFromHealthConnect, syncHealthData]);

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
    isHealthConnectWorking,
    isGuestMode,
    platformName,
    isExpoGo,

    // Health Connect disclosure modal (Play policy: must render before the
    // system permission sheet). Consuming screen renders
    // <HealthConnectDisclosureModal visible={disclosureVisible} ... />.
    disclosureVisible,
    onDisclosureAcknowledge: handleDisclosureAcknowledge,
    onDisclosureDismiss: handleDisclosureDismiss,

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
    handleEnterManually,
    formatLastSync,
  };
};
