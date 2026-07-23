/**
 * SyncStatusIndicator Component
 * Shows wearable sync status with last sync time and quick sync action
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { AuroraSpinner } from "../../../components/ui/aurora/AuroraSpinner";
import { flatColors as colors, spacing, borderRadius } from "../../../theme/aurora-tokens";
import { rf, rw } from "../../../utils/responsive";
import { useHealthDataStore } from "../../../stores/healthDataStore";
import { haptics } from "../../../utils/haptics";

interface SyncStatusIndicatorProps {
  onPress?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  onPress,
}) => {
  const {
    isHealthKitAuthorized,
    isHealthConnectAuthorized,
    syncStatus,
    lastSyncTime,
    syncError,
    syncHealthData,
    syncFromHealthConnect,
    metrics,
  } = useHealthDataStore();

  const isConnected = isHealthKitAuthorized || isHealthConnectAuthorized;
  const isIOS = Platform.OS === "ios";
  const isSyncing = syncStatus === "syncing";
  const isError = syncStatus === "error";

  // Get primary data source from metrics
  const primarySource = metrics?.sources?.steps || metrics?.sources?.heartRate;

  // Format last sync time - handles both ISO strings and legacy timestamp strings
  const formatLastSync = (syncTime?: string) => {
    if (!syncTime) return "Not synced";

    const now = new Date();
    let sync: Date;

    // Handle legacy format (numeric timestamp string like "1736675000000")
    if (/^\d+$/.test(syncTime)) {
      sync = new Date(parseInt(syncTime, 10));
    } else {
      sync = new Date(syncTime);
    }

    // Validate the date
    if (isNaN(sync.getTime())) return "Not synced";

    const diffMinutes = Math.floor((now.getTime() - sync.getTime()) / 60000);
    if (diffMinutes < 0) return "Just now"; // Future date protection
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  // Handle sync tap. In the error state the chip itself must trigger a
  // re-sync (not just delegate to onPress) so the "Tap to retry" affordance
  // actually retries. When onPress is provided and we're not in an error
  // state, defer to the parent's handler (existing behavior).
  const handleSync = async () => {
    haptics.light();
    if (onPress && !isError) {
      onPress();
      return;
    }

    // Perform sync (force=true so a retry actually re-fetches)
    try {
      if (isIOS && isHealthKitAuthorized) {
        await syncHealthData(true);
      } else if (!isIOS && isHealthConnectAuthorized) {
        await syncFromHealthConnect(7);
      } else if (onPress) {
        // No platform authorization but parent supplied a handler — let it
        // decide (e.g. navigate to connection screen).
        onPress();
      }
    } catch (err) {
      // Store sets syncError on failure; log here so it's never swallowed.
      console.error(
        "[SyncStatusIndicator] retry sync failed:",
        err instanceof Error ? err.message : String(err),
      );
    }
  };

  // If not connected, show connect prompt
  if (!isConnected) {
    return null; // Don't show if not connected
  }

  // Get status color
  const getStatusColor = () => {
    if (isSyncing) return colors.warning;
    if (syncStatus === "error") return colors.error;
    if (syncStatus === "success") return colors.success;
    return colors.textSecondary;
  };

  // Get status icon
  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isSyncing) return "sync";
    if (syncStatus === "error") return "alert-circle";
    if (syncStatus === "success") return "checkmark-circle";
    return "time-outline";
  };

  // Truncate long error strings so the chip stays compact.
  const truncateError = (msg: string, max = 48) =>
    msg.length > max ? `${msg.slice(0, max).trimEnd()}…` : msg;

  return (
    <AnimatedPressable
      onPress={handleSync}
      scaleValue={0.98}
      hapticFeedback
      disabled={isSyncing}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          {isSyncing ? (
            <AuroraSpinner customSize={rf(16)} theme="primary" />
          ) : (
            <Ionicons
              name={getStatusIcon()}
              size={rf(16)}
              color={getStatusColor()}
            />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>
            {primarySource
              ? primarySource.name
              : isIOS
                ? "HealthKit"
                : "Health Connect"}
          </Text>
          {isError ? (
            <>
              <Text
                style={[styles.status, { color: getStatusColor() }]}
                numberOfLines={1}
              >
                {syncError ? truncateError(syncError) : "Sync failed"}
              </Text>
              <Text style={[styles.retryHint, { color: getStatusColor() }]}>
                Tap to retry
              </Text>
            </>
          ) : (
            <Text style={[styles.status, { color: getStatusColor() }]}>
              {isSyncing ? "Syncing..." : formatLastSync(lastSyncTime)}
              {primarySource && !isSyncing && ` • Tier ${primarySource.tier}`}
            </Text>
          )}
        </View>
        <Ionicons
          name={isError ? "refresh-circle" : "refresh"}
          size={rf(16)}
          color={
            isError
              ? getStatusColor()
              : isSyncing
                ? colors.textSecondary
                : colors.primary
          }
        />
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
    minHeight: 44,
  },
  iconContainer: {
    width: rw(24),
    height: rw(24),
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: rf(12),
    fontWeight: "600",
    color: colors.text,
  },
  status: {
    fontSize: rf(10),
    fontWeight: "500",
  },
  retryHint: {
    fontSize: rf(9),
    fontWeight: "700",
    marginTop: 1,
    textTransform: "uppercase",
  },
});

export default SyncStatusIndicator;
