import React from "react";
import {
  View,
  Text,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw } from "../../utils/responsive";

interface ConnectionCardProps {
  platformName: string;
  isConnected: boolean;
  isIOS: boolean;
  healthKitEnabled: boolean;
  healthConnectEnabled: boolean;
  syncStatus: string;
  lastSyncTime?: string;
  syncError?: string;
  isReauthorizing: boolean;
  isAndroid: boolean;
  formatLastSync: (syncTime?: string) => string;
  onConnectionToggle: (enabled: boolean) => void;
  onSyncNow: () => void;
  onReauthorize: () => void;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  platformName,
  isConnected,
  isIOS,
  healthKitEnabled,
  healthConnectEnabled,
  syncStatus,
  lastSyncTime,
  syncError,
  isReauthorizing,
  isAndroid,
  formatLastSync,
  onConnectionToggle,
  onSyncNow,
  onReauthorize,
}) => {
  return (
    <GlassCard elevation={2} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.info}>
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
          <View style={styles.text}>
            <Text style={styles.platformName}>{platformName}</Text>
            <Text style={styles.status}>
              {isConnected ? "Connected" : "Not connected"}
            </Text>
          </View>
        </View>
        <Switch
          value={
            isConnected && (isIOS ? healthKitEnabled : healthConnectEnabled)
          }
          onValueChange={onConnectionToggle}
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
            onPress={onSyncNow}
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

      {isConnected && isAndroid && (
        <AnimatedPressable
          onPress={onReauthorize}
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
            {isReauthorizing ? "Re-authorizing..." : "Re-authorize Permissions"}
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
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: ResponsiveTheme.spacing.md,
    padding: ResponsiveTheme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  info: {
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
  text: {
    flex: 1,
  },
  platformName: {
    fontSize: rf(18),
    fontWeight: "600",
    color: "#fff",
  },
  status: {
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
});
