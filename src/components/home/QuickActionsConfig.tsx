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
}

export const createQuickActions = ({
  isHealthKitAuthorized,
  isHealthConnectAuthorized,
  syncHealthData,
  syncFromHealthConnect,
  onLogWeight,
}: QuickActionsConfigProps): QuickAction[] => [
  {
    id: "log-weight",
    label: "Log Weight",
    icon: "scale-outline" as keyof typeof Ionicons.glyphMap,
    color: "#9C27B0",
    onPress: onLogWeight,
  },
  {
    id: "progress-photo",
    label: "Photo",
    icon: "camera-outline" as keyof typeof Ionicons.glyphMap,
    color: "#FF6B6B",
    onPress: () =>
      Alert.alert(
        "Coming Soon",
        "Progress photos feature will be available in the next update. This will allow you to take and compare before/after photos to track your transformation.",
        [{ text: "OK" }],
      ),
  },
  {
    id: "log-sleep",
    label: "Sleep",
    icon: "moon-outline" as keyof typeof Ionicons.glyphMap,
    color: "#667eea",
    onPress: () =>
      Alert.alert(
        "Coming Soon",
        "Sleep tracking will be available in the next update. Connect your wearable device in Settings to automatically sync sleep data.",
        [
          {
            text: "Go to Settings",
            onPress: () => {
              console.log("Navigate to Settings for wearables");
            },
          },
          { text: "OK" },
        ],
      ),
  },
  {
    id: "health-sync",
    label: "Sync",
    icon: "sync-outline" as keyof typeof Ionicons.glyphMap,
    color: "#4CAF50",
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
