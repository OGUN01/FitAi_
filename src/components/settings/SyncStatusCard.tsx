import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../utils/constants";

interface SyncStatusCardProps {
  syncStatus: "idle" | "syncing" | "success" | "error";
  lastSyncTime?: string;
  error?: string;
  onSyncNow: () => void;
  formatLastSync: (syncTime?: string) => string;
}

export const SyncStatusCard: React.FC<SyncStatusCardProps> = ({
  syncStatus,
  lastSyncTime,
  error,
  onSyncNow,
  formatLastSync,
}) => {
  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case "success":
        return THEME.colors.success;
      case "error":
        return THEME.colors.error;
      case "syncing":
        return THEME.colors.warning;
      default:
        return THEME.colors.text;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case "success":
        return "Sync successful";
      case "error":
        return error || "Sync failed";
      case "syncing":
        return "Syncing data...";
      default:
        return "Ready to sync";
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "alert-circle";
      case "syncing":
        return "time";
      default:
        return "help-circle";
    }
  };

  return (
    <View
      style={{
        backgroundColor: THEME.colors.surface,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: THEME.colors.text,
          }}
        >
          Sync Status
        </Text>
        <TouchableOpacity
          onPress={onSyncNow}
          disabled={syncStatus === "syncing"}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 6,
            paddingHorizontal: 12,
            backgroundColor: THEME.colors.primary,
            borderRadius: 8,
            opacity: syncStatus === "syncing" ? 0.6 : 1,
          }}
        >
          {syncStatus === "syncing" ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="refresh" size={16} color="white" />
          )}
          <Text
            style={{
              color: "white",
              fontSize: 14,
              fontWeight: "600",
              marginLeft: 4,
            }}
          >
            {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <Ionicons
          name="time-outline"
          size={16}
          color={THEME.colors.textSecondary}
        />
        <Text
          style={{
            fontSize: 14,
            color: THEME.colors.textSecondary,
            marginLeft: 8,
          }}
        >
          Last sync: {formatLastSync(lastSyncTime)}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Ionicons
          name={getSyncStatusIcon()}
          size={16}
          color={getSyncStatusColor()}
        />
        <Text
          style={{
            fontSize: 14,
            color: getSyncStatusColor(),
            marginLeft: 8,
            flex: 1,
          }}
        >
          {getSyncStatusText()}
        </Text>
      </View>
    </View>
  );
};
