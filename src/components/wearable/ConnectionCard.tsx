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
import { rf, rp, rbr, rw } from "../../utils/responsive";

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
              { backgroundColor: isConnected ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.textTertiary },
            ]}
          >
            <Ionicons
              name={isIOS ? "fitness" : "heart"}
              size={rf(24)}
              color={ResponsiveTheme.colors.text}
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
          trackColor={{ false: ResponsiveTheme.colors.border, true: ResponsiveTheme.colors.success }}
          thumbColor={ResponsiveTheme.colors.white}
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
              <ActivityIndicator size="small" color={ResponsiveTheme.colors.text} />
            ) : (
              <Ionicons name="refresh" size={rf(18)} color={ResponsiveTheme.colors.text} />
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
            <ActivityIndicator size="small" color={ResponsiveTheme.colors.warning} />
          ) : (
            <Ionicons name="key" size={rf(16)} color={ResponsiveTheme.colors.warning} />
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
          <Ionicons name="alert-circle" size={rf(16)} color={ResponsiveTheme.colors.error} />
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
    borderRadius: rbr(24),
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
    color: ResponsiveTheme.colors.text,
  },
  status: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  syncSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.glassHighlight,
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
    color: ResponsiveTheme.colors.text,
    marginLeft: ResponsiveTheme.spacing.xs,
  },
  reauthorizeButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResponsiveTheme.colors.warningTint,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.warningTint,
    borderRadius: ResponsiveTheme.borderRadius.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.md,
    marginTop: ResponsiveTheme.spacing.sm,
  },
  reauthorizeText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.warning,
    marginTop: ResponsiveTheme.spacing.xs,
  },
  reauthorizeHint: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.errorTint,
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.sm,
    marginTop: ResponsiveTheme.spacing.md,
  },
  errorText: {
    fontSize: rf(13),
    color: ResponsiveTheme.colors.error,
    marginLeft: ResponsiveTheme.spacing.xs,
    flex: 1,
  },
});
