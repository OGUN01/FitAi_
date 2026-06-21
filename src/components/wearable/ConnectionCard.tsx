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
import { flatColors as colors, spacing, borderRadius } from "../../theme/aurora-tokens";
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
              { backgroundColor: isConnected ? colors.success : colors.textTertiary },
            ]}
          >
            <Ionicons
              name={isIOS ? "fitness" : "heart"}
              size={rf(24)}
              color={colors.text}
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
          trackColor={{ false: colors.border, true: colors.success }}
          thumbColor={colors.white}
        />
      </View>

      {isConnected && (
        <View style={styles.syncSection}>
          <View style={styles.syncInfo}>
            <Ionicons
              name="time-outline"
              size={rf(16)}
              color={colors.textSecondary}
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
              <ActivityIndicator size="small" color={colors.text} />
            ) : (
              <Ionicons name="refresh" size={rf(18)} color={colors.text} />
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
            <ActivityIndicator size="small" color={colors.warning} />
          ) : (
            <Ionicons name="key" size={rf(16)} color={colors.warning} />
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
          <Ionicons name="alert-circle" size={rf(16)} color={colors.error} />
          <Text style={styles.errorText}>{syncError}</Text>
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.lg,
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
    marginRight: spacing.md,
  },
  text: {
    flex: 1,
  },
  platformName: {
    fontSize: rf(18),
    fontWeight: "600",
    color: colors.text,
  },
  status: {
    fontSize: rf(14),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  syncSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassHighlight,
  },
  syncInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  syncTime: {
    fontSize: rf(14),
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  syncButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.xs,
  },
  reauthorizeButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.warningTint,
    borderWidth: 1,
    borderColor: colors.warningTint,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  reauthorizeText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: colors.warning,
    marginTop: spacing.xs,
  },
  reauthorizeHint: {
    fontSize: rf(11),
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.errorTint,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: rf(13),
    color: colors.error,
    marginLeft: spacing.xs,
    flex: 1,
  },
});
