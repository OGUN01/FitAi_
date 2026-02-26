import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rs } from '../../utils/responsive';

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
        return ResponsiveTheme.colors.success;
      case "error":
        return ResponsiveTheme.colors.error;
      case "syncing":
        return ResponsiveTheme.colors.warning;
      default:
        return ResponsiveTheme.colors.text;
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
        backgroundColor: ResponsiveTheme.colors.surface,
        marginHorizontal: rp(16),
        marginBottom: rp(16),
        borderRadius: rbr(12),
        padding: rp(16),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: rp(12),
        }}
      >
        <Text
          style={{
            fontSize: rf(16),
            fontWeight: "600",
            color: ResponsiveTheme.colors.text,
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
            paddingVertical: rp(6),
            paddingHorizontal: rp(12),
            backgroundColor: ResponsiveTheme.colors.primary,
            borderRadius: rbr(8),
            opacity: syncStatus === "syncing" ? 0.6 : 1,
          }}
        >
          {syncStatus === "syncing" ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="refresh" size={rs(16)} color="white" />
          )}
          <Text
            style={{
              color: "white",
              fontSize: rf(14),
              fontWeight: "600",
              marginLeft: rp(4),
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
          marginBottom: rp(8),
        }}
      >
        <Ionicons
          name="time-outline"
          size={rs(16)}
          color={ResponsiveTheme.colors.textSecondary}
        />
        <Text
          style={{
            fontSize: rf(14),
            color: ResponsiveTheme.colors.textSecondary,
            marginLeft: rp(8),
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
          size={rs(16)}
          color={getSyncStatusColor()}
        />
        <Text
          style={{
            fontSize: rf(14),
            color: getSyncStatusColor(),
            marginLeft: rp(8),
            flex: 1,
          }}
        >
          {getSyncStatusText()}
        </Text>
      </View>
    </View>
  );
};
