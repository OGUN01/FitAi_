/**
 * WearableConnectionScreen - Unified Health Integration Settings
 *
 * Provides a single interface for connecting to:
 * - Health Connect (Android) - Samsung, Pixel Watch, Fitbit, Garmin, etc.
 * - HealthKit (iOS) - Apple Watch, Fitbit, Garmin, etc.
 *
 * Data synced: Steps, Heart Rate, Calories Burned, Sleep, Weight, Workouts
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

import { useHealthDataStore } from "../../stores/healthDataStore";
import { healthConnectService } from "../../services/healthConnect";
import { GlassCard } from "../../components/ui/aurora/GlassCard";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { gradients, toLinearGradientProps } from "../../theme/gradients";

// Data types that can be synced
interface HealthDataType {
  key:
    | "steps"
    | "heartRate"
    | "workouts"
    | "sleep"
    | "weight"
    | "nutrition"
    | "hrv"
    | "spo2"
    | "bodyFat";
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const HEALTH_DATA_TYPES: HealthDataType[] = [
  {
    key: "steps",
    title: "Steps & Activity",
    description: "Daily steps, distance walked",
    icon: "walk-outline",
    color: "#4CAF50",
  },
  {
    key: "heartRate",
    title: "Heart Rate",
    description: "Heart rate and resting HR",
    icon: "heart-outline",
    color: "#F44336",
  },
  {
    key: "workouts",
    title: "Workouts",
    description: "Exercise sessions from watch",
    icon: "fitness-outline",
    color: "#FF9800",
  },
  {
    key: "sleep",
    title: "Sleep Data",
    description: "Sleep duration and quality",
    icon: "bed-outline",
    color: "#9C27B0",
  },
  {
    key: "weight",
    title: "Body Weight",
    description: "Weight measurements",
    icon: "body-outline",
    color: "#2196F3",
  },
  {
    key: "nutrition",
    title: "Nutrition",
    description: "Calorie tracking from apps",
    icon: "nutrition-outline",
    color: "#00BCD4",
  },
  {
    key: "hrv",
    title: "Heart Rate Variability",
    description: "HRV for recovery analysis",
    icon: "pulse-outline",
    color: "#673AB7",
  },
  {
    key: "spo2",
    title: "Blood Oxygen (SpO2)",
    description: "Oxygen saturation levels",
    icon: "water-outline",
    color: "#009688",
  },
  {
    key: "bodyFat",
    title: "Body Fat",
    description: "Body composition from scales",
    icon: "analytics-outline",
    color: "#E91E63",
  },
];

// Compatible devices by platform
const COMPATIBLE_DEVICES = {
  android: [
    { name: "Samsung Galaxy Watch", icon: "watch-outline" },
    { name: "Google Pixel Watch", icon: "watch-outline" },
    { name: "Fitbit (via app)", icon: "fitness-outline" },
    { name: "Garmin (via app)", icon: "fitness-outline" },
    { name: "Xiaomi Mi Band", icon: "fitness-outline" },
    { name: "Wear OS devices", icon: "watch-outline" },
  ],
  ios: [
    { name: "Apple Watch", icon: "watch-outline" },
    { name: "Fitbit (via app)", icon: "fitness-outline" },
    { name: "Garmin (via app)", icon: "fitness-outline" },
    { name: "Oura Ring", icon: "ellipse-outline" },
    { name: "Whoop", icon: "fitness-outline" },
  ],
};

// Detect Expo Go environment - only true when actually running in Expo Go app
// appOwnership === 'expo' is the definitive check for Expo Go
const isExpoGo = Constants.appOwnership === "expo";

interface WearableConnectionScreenProps {
  onBack?: () => void;
}

export const WearableConnectionScreen: React.FC<
  WearableConnectionScreenProps
> = ({ onBack }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [nativeModuleAvailable, setNativeModuleAvailable] = useState<
    boolean | null
  >(null);

  // Health store state
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

  // State for re-authorization
  const [isReauthorizing, setIsReauthorizing] = useState(false);

  // Platform detection
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
      // Disconnect
      updateSettings({
        healthKitEnabled: false,
        healthConnectEnabled: false,
      });
      return;
    }

    // Check if native module is available
    if (nativeModuleAvailable === false || isExpoGo) {
      Alert.alert(
        "Development Build Required",
        `${platformName} integration requires a development or production build. It's not available in Expo Go.\n\nTo use this feature, build the app using:\n• EAS Build (eas build)\n• Local development build`,
        [{ text: "OK" }],
      );
      return;
    }

    // Connect
    try {
      if (isAndroid) {
        const success = await requestHealthConnectPermissions();
        if (success) {
          updateSettings({ healthConnectEnabled: true });
          Alert.alert(
            "Connected!",
            "Health Connect is now syncing your wearable data.",
          );
          // Initial sync
          await syncFromHealthConnect(7);
        } else {
          // Permissions were not granted - offer to open Health Connect settings
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
          // Initial sync
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

  // Handle re-authorization (for new permissions like TotalCaloriesBurned)
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
  const handleDataTypeToggle = (
    dataType: HealthDataType["key"],
    enabled: boolean,
  ) => {
    updateSettings({
      dataTypesToSync: {
        ...settings.dataTypesToSync,
        [dataType]: enabled,
      },
    });
  };

  // Format last sync time - handles both ISO strings and legacy timestamp strings
  const formatLastSync = (syncTime?: string) => {
    if (!syncTime) return "Never synced";

    const now = new Date();
    let sync: Date;

    // Handle legacy format (numeric timestamp string like "1736675000000")
    if (/^\d+$/.test(syncTime)) {
      sync = new Date(parseInt(syncTime, 10));
    } else {
      sync = new Date(syncTime);
    }

    // Validate the date
    if (isNaN(sync.getTime())) return "Never synced";

    const diffMinutes = Math.floor((now.getTime() - sync.getTime()) / 60000);
    if (diffMinutes < 0) return "Just now"; // Future date protection
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
  };

  return (
    <AuroraBackground>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable
            onPress={() => {
              haptics.light();
              onBack?.();
            }}
            style={styles.backButton}
            scaleValue={0.9}
            hapticFeedback={false}
          >
            <Ionicons name="arrow-back" size={rf(24)} color="#fff" />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Connect Wearables</Text>
          <View style={styles.headerRight}>
            <Ionicons
              name={isIOS ? "logo-apple" : "logo-google"}
              size={rf(24)}
              color={ResponsiveTheme.colors.primary}
            />
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
            />
          }
        >
          {/* Expo Go Warning Banner */}
          {(isExpoGo || nativeModuleAvailable === false) && (
            <GlassCard elevation={1} style={styles.warningCard}>
              <View style={styles.warningContent}>
                <Ionicons
                  name="information-circle"
                  size={rf(24)}
                  color="#FFA726"
                />
                <View style={styles.warningText}>
                  <Text style={styles.warningTitle}>
                    Development Build Required
                  </Text>
                  <Text style={styles.warningDescription}>
                    {platformName} integration requires a development or
                    production build. Running in Expo Go - wearable features are
                    simulated.
                  </Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Connection Card */}
          <GlassCard elevation={2} style={styles.connectionCard}>
            <View style={styles.connectionHeader}>
              <View style={styles.connectionInfo}>
                <View
                  style={[
                    styles.platformIcon,
                    { backgroundColor: isConnected ? "#4CAF50" : "#666" },
                  ]}
                >
                  <Ionicons
                    name={isIOS ? "fitness" : "heart"}
                    size={rf(24)}
                    color="#fff"
                  />
                </View>
                <View style={styles.connectionText}>
                  <Text style={styles.platformName}>{platformName}</Text>
                  <Text style={styles.connectionStatus}>
                    {isConnected ? "Connected" : "Not connected"}
                  </Text>
                </View>
              </View>
              <Switch
                value={
                  isConnected &&
                  (isIOS
                    ? settings.healthKitEnabled
                    : settings.healthConnectEnabled)
                }
                onValueChange={handleConnectionToggle}
                trackColor={{ false: "#444", true: "#4CAF50" }}
                thumbColor="#fff"
              />
            </View>

            {isConnected && (
              <View style={styles.syncSection}>
                <View style={styles.syncInfo}>
                  <Ionicons
                    name="time-outline"
                    size={rf(16)}
                    color={ResponsiveTheme.colors.textSecondary}
                  />
                  <Text style={styles.syncTime}>
                    Last sync: {formatLastSync(lastSyncTime)}
                  </Text>
                </View>
                <AnimatedPressable
                  onPress={handleSyncNow}
                  style={styles.syncButton}
                  disabled={syncStatus === "syncing" || isReauthorizing}
                  scaleValue={0.95}
                >
                  {syncStatus === "syncing" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="refresh" size={rf(18)} color="#fff" />
                  )}
                  <Text style={styles.syncButtonText}>
                    {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
                  </Text>
                </AnimatedPressable>
              </View>
            )}

            {/* Re-authorize button - for Android only, when new permissions are needed */}
            {isConnected && isAndroid && (
              <AnimatedPressable
                onPress={handleReauthorize}
                style={styles.reauthorizeButton}
                disabled={isReauthorizing || syncStatus === "syncing"}
                scaleValue={0.98}
              >
                {isReauthorizing ? (
                  <ActivityIndicator size="small" color="#FF9800" />
                ) : (
                  <Ionicons name="key" size={rf(16)} color="#FF9800" />
                )}
                <Text style={styles.reauthorizeText}>
                  {isReauthorizing
                    ? "Re-authorizing..."
                    : "Re-authorize Permissions"}
                </Text>
                <Text style={styles.reauthorizeHint}>
                  Use if calories show 0 or data is missing
                </Text>
              </AnimatedPressable>
            )}

            {syncError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={rf(16)} color="#F44336" />
                <Text style={styles.errorText}>{syncError}</Text>
              </View>
            )}
          </GlassCard>

          {/* Health Summary */}
          {isConnected && (
            <GlassCard elevation={1} style={styles.summaryCard}>
              <Text style={styles.sectionTitle}>Today's Health Data</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Ionicons name="walk" size={rf(24)} color="#4CAF50" />
                  <Text style={styles.summaryValue}>
                    {metrics.steps.toLocaleString()}
                  </Text>
                  <Text style={styles.summaryLabel}>Steps</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="flame" size={rf(24)} color="#FF9800" />
                  <Text style={styles.summaryValue}>
                    {metrics.totalCalories || metrics.activeCalories || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Calories</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="heart" size={rf(24)} color="#F44336" />
                  <Text style={styles.summaryValue}>
                    {metrics.heartRate || "--"}
                  </Text>
                  <Text style={styles.summaryLabel}>BPM</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="bed" size={rf(24)} color="#9C27B0" />
                  <Text style={styles.summaryValue}>
                    {metrics.sleepHours
                      ? `${metrics.sleepHours.toFixed(1)}h`
                      : "--"}
                  </Text>
                  <Text style={styles.summaryLabel}>Sleep</Text>
                </View>
              </View>
            </GlassCard>
          )}

          {/* Data Types */}
          {isConnected && (
            <GlassCard elevation={1} style={styles.dataTypesCard}>
              <Text style={styles.sectionTitle}>Data to Sync</Text>
              {HEALTH_DATA_TYPES.map((dataType, index) => (
                <View
                  key={dataType.key}
                  style={[
                    styles.dataTypeRow,
                    index > 0 && styles.dataTypeRowBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.dataTypeIcon,
                      { backgroundColor: `${dataType.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={dataType.icon}
                      size={rf(20)}
                      color={dataType.color}
                    />
                  </View>
                  <View style={styles.dataTypeInfo}>
                    <Text style={styles.dataTypeTitle}>{dataType.title}</Text>
                    <Text style={styles.dataTypeDesc}>
                      {dataType.description}
                    </Text>
                  </View>
                  <Switch
                    value={settings.dataTypesToSync[dataType.key]}
                    onValueChange={(value) =>
                      handleDataTypeToggle(dataType.key, value)
                    }
                    trackColor={{ false: "#444", true: dataType.color }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </GlassCard>
          )}

          {/* Compatible Devices */}
          <GlassCard elevation={1} style={styles.devicesCard}>
            <Text style={styles.sectionTitle}>Compatible Devices</Text>
            <Text style={styles.devicesSubtitle}>
              {platformName} automatically syncs data from these devices:
            </Text>
            <View style={styles.devicesList}>
              {(isIOS
                ? COMPATIBLE_DEVICES.ios
                : COMPATIBLE_DEVICES.android
              ).map((device, index) => (
                <View key={index} style={styles.deviceItem}>
                  <Ionicons
                    name={device.icon as keyof typeof Ionicons.glyphMap}
                    size={rf(18)}
                    color={ResponsiveTheme.colors.primary}
                  />
                  <Text style={styles.deviceName}>{device.name}</Text>
                </View>
              ))}
            </View>
          </GlassCard>

          {/* How it Works */}
          <GlassCard elevation={1} style={styles.infoCard}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Your smartwatch syncs data to {platformName}
              </Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                FitAI reads your steps, heart rate, and workouts
              </Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Your progress updates automatically in the app
              </Text>
            </View>
          </GlassCard>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: rf(20),
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  headerRight: {
    width: rw(40),
    alignItems: "flex-end",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
  },
  connectionCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  connectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  connectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  platformIcon: {
    width: rw(48),
    height: rw(48),
    borderRadius: rw(24),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },
  connectionText: {
    flex: 1,
  },
  platformName: {
    fontSize: rf(18),
    fontWeight: "600",
    color: "#fff",
  },
  connectionStatus: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  syncSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  syncInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  syncTime: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  syncButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#fff",
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  reauthorizeButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.3)",
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  reauthorizeText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: "#FF9800",
    marginTop: ResponsiveTheme.spacing.xs,
  },
  reauthorizeHint: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginTop: ResponsiveTheme.spacing.md,
  },
  errorText: {
    fontSize: rf(13),
    color: "#F44336",
    marginLeft: ResponsiveTheme.spacing.xs,
    flex: 1,
  },
  warningCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.md,
    backgroundColor: "rgba(255, 167, 38, 0.15)",
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  warningText: {
    flex: 1,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  warningTitle: {
    fontSize: rf(14),
    fontWeight: "600",
    color: "#FFA726",
    marginBottom: 4,
  },
  warningDescription: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(18),
  },
  summaryCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  sectionTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: "#fff",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: rf(20),
    fontWeight: "700",
    color: "#fff",
    marginTop: ResponsiveTheme.spacing.xs,
  },
  summaryLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  dataTypesCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  dataTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  dataTypeRowBorder: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  dataTypeIcon: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(10),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },
  dataTypeInfo: {
    flex: 1,
  },
  dataTypeTitle: {
    fontSize: rf(15),
    fontWeight: "500",
    color: "#fff",
  },
  dataTypeDesc: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: 2,
  },
  devicesCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  devicesSubtitle: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  devicesList: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  deviceItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginRight: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  deviceName: {
    fontSize: rf(13),
    color: "#fff",
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  infoCard: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  infoStep: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  stepNumber: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    backgroundColor: ResponsiveTheme.colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },
  stepNumberText: {
    fontSize: rf(14),
    fontWeight: "700",
    color: "#fff",
  },
  stepText: {
    flex: 1,
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
  },
  bottomSpacing: {
    height: rh(40),
  },
});

export default WearableConnectionScreen;
