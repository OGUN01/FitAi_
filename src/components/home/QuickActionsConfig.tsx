import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../utils/haptics";
import { ResponsiveTheme } from "../../utils/constants";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

interface QuickActionsConfigProps {
  isHealthKitAuthorized: boolean;
  isHealthConnectAuthorized: boolean;
  syncHealthData: (force?: boolean) => Promise<void>;
  syncFromHealthConnect: (days: number) => Promise<void>;
  onLogWeight: () => void;
  onScanFood?: () => void;
  onLogMeal?: () => void;
  onLogWater?: () => void;
  onBarcodeScan?: () => void;
  onScanLabel?: () => void;
  onRecipes?: () => void;
}

export const createQuickActions = ({
  isHealthKitAuthorized,
  isHealthConnectAuthorized,
  syncHealthData,
  syncFromHealthConnect,
  onLogWeight,
  onScanFood,
  onLogMeal,
  onLogWater,
  onBarcodeScan,
  onScanLabel,
  onRecipes,
}: QuickActionsConfigProps): QuickAction[] => [
  {
    id: "log-weight",
    label: "Log Weight",
    icon: "scale-outline" as keyof typeof Ionicons.glyphMap,
    color: ResponsiveTheme.colors.primary,
    onPress: onLogWeight,
  },
  ...(onScanFood
    ? [
        {
          id: "scan-food",
          label: "Scan Food",
          icon: "camera-outline" as keyof typeof Ionicons.glyphMap,
          color: ResponsiveTheme.colors.errorLight,
          onPress: onScanFood,
        },
      ]
    : []),
  ...(onLogMeal
    ? [
        {
          id: "log-meal",
          label: "Log Meal",
          icon: "restaurant-outline" as keyof typeof Ionicons.glyphMap,
          color: ResponsiveTheme.colors.success,
          onPress: onLogMeal,
        },
      ]
    : []),
  ...(onLogWater
    ? [
        {
          id: "log-water",
          label: "Water",
          icon: "water-outline" as keyof typeof Ionicons.glyphMap,
          color: ResponsiveTheme.colors.info,
          onPress: onLogWater,
        },
      ]
    : []),
  ...(onBarcodeScan
    ? [
        {
          id: "barcode-scan",
          label: "Barcode",
          icon: "barcode-outline" as keyof typeof Ionicons.glyphMap,
          color: ResponsiveTheme.colors.teal,
          onPress: onBarcodeScan,
        },
      ]
    : []),
  ...(onScanLabel
    ? [
        {
          id: "scan-label",
          label: "Scan Label",
          icon: "scan-outline" as keyof typeof Ionicons.glyphMap,
          color: ResponsiveTheme.colors.purple,
          onPress: onScanLabel,
        },
      ]
    : []),
  ...(onRecipes
    ? [
        {
          id: "recipes",
          label: "Recipes",
          icon: "book-outline" as keyof typeof Ionicons.glyphMap,
          color: ResponsiveTheme.colors.warning,
          onPress: onRecipes,
        },
      ]
    : []),
  {
    id: "health-sync",
    label: "Sync",
    icon: "sync-outline" as keyof typeof Ionicons.glyphMap,
    color: ResponsiveTheme.colors.successAlt,
    onPress: async () => {
      haptics.medium();
      if (Platform.OS === "ios" && isHealthKitAuthorized) {
        await syncHealthData(true);
        crossPlatformAlert("Synced", "Health data synced successfully");
      } else if (Platform.OS === "android" && isHealthConnectAuthorized) {
        await syncFromHealthConnect(7);
        crossPlatformAlert("Synced", "Health data synced successfully");
      } else {
        crossPlatformAlert("Health Sync", "Connect to Health app in settings");
      }
    },
  },
];
