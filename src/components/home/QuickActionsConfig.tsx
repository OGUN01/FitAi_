import { Platform, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { haptics } from "../../utils/haptics";

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
}: QuickActionsConfigProps): QuickAction[] => [
  {
    id: "log-weight",
    label: "Log Weight",
    icon: "scale-outline" as keyof typeof Ionicons.glyphMap,
    color: "#FF6B35",
    onPress: onLogWeight,
  },
  ...(onScanFood
    ? [
        {
          id: "scan-food",
          label: "Scan Food",
          icon: "camera-outline" as keyof typeof Ionicons.glyphMap,
          color: "#FF6B6B",
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
          color: "#4CAF50",
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
          color: "#2196F3",
          onPress: onLogWater,
        },
      ]
    : []),
  {
    id: "health-sync",
    label: "Sync",
    icon: "sync-outline" as keyof typeof Ionicons.glyphMap,
    color: "#10b981",
    onPress: async () => {
      haptics.medium();
      if (Platform.OS === "ios" && isHealthKitAuthorized) {
        await syncHealthData(true);
        Alert.alert("Synced", "Health data synced successfully");
      } else if (Platform.OS === "android" && isHealthConnectAuthorized) {
        await syncFromHealthConnect(7);
        Alert.alert("Synced", "Health data synced successfully");
      } else {
        Alert.alert("Health Sync", "Connect to Health app in settings");
      }
    },
  },
];
