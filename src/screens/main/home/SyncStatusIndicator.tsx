/**
 * SyncStatusIndicator Component
 * Shows wearable sync status with last sync time and quick sync action
 */

import React from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AnimatedPressable } from '../../../components/ui/aurora/AnimatedPressable';
import { GlassCard } from '../../../components/ui/aurora/GlassCard';
import { ResponsiveTheme } from '../../../utils/constants';
import { rf, rw } from '../../../utils/responsive';
import { useHealthDataStore } from '../../../stores/healthDataStore';
import { haptics } from '../../../utils/haptics';

interface SyncStatusIndicatorProps {
  onPress?: () => void;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({ onPress }) => {
  const {
    isHealthKitAuthorized,
    isHealthConnectAuthorized,
    syncStatus,
    lastSyncTime,
    syncError,
    syncHealthData,
    syncFromHealthConnect,
    settings,
  } = useHealthDataStore();

  const isConnected = isHealthKitAuthorized || isHealthConnectAuthorized;
  const isIOS = Platform.OS === 'ios';
  const isSyncing = syncStatus === 'syncing';

  // Format last sync time
  const formatLastSync = (syncTime?: string) => {
    if (!syncTime) return 'Not synced';
    const now = new Date();
    const sync = new Date(syncTime);
    const diffMinutes = Math.floor((now.getTime() - sync.getTime()) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  // Handle sync tap
  const handleSync = async () => {
    haptics.light();
    if (onPress) {
      onPress();
      return;
    }

    // Perform sync
    if (isIOS && isHealthKitAuthorized) {
      await syncHealthData(true);
    } else if (!isIOS && isHealthConnectAuthorized) {
      await syncFromHealthConnect(7);
    }
  };

  // If not connected, show connect prompt
  if (!isConnected) {
    return null; // Don't show if not connected
  }

  // Get status color
  const getStatusColor = () => {
    if (isSyncing) return '#FF9800';
    if (syncStatus === 'error') return '#F44336';
    if (syncStatus === 'success') return '#4CAF50';
    return ResponsiveTheme.colors.textSecondary;
  };

  // Get status icon
  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    if (isSyncing) return 'sync';
    if (syncStatus === 'error') return 'alert-circle';
    if (syncStatus === 'success') return 'checkmark-circle';
    return 'time-outline';
  };

  return (
    <AnimatedPressable onPress={handleSync} scaleValue={0.98} hapticFeedback disabled={isSyncing}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          {isSyncing ? (
            <ActivityIndicator size="small" color={getStatusColor()} />
          ) : (
            <Ionicons name={getStatusIcon()} size={rf(16)} color={getStatusColor()} />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.label}>
            {isIOS ? 'HealthKit' : 'Health Connect'}
          </Text>
          <Text style={[styles.status, { color: getStatusColor() }]}>
            {isSyncing ? 'Syncing...' : formatLastSync(lastSyncTime)}
          </Text>
        </View>
        <Ionicons 
          name="refresh" 
          size={rf(16)} 
          color={isSyncing ? ResponsiveTheme.colors.textSecondary : ResponsiveTheme.colors.primary} 
        />
      </View>
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.md,
    gap: ResponsiveTheme.spacing.xs,
  },
  iconContainer: {
    width: rw(24),
    height: rw(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: rf(12),
    fontWeight: '600',
    color: ResponsiveTheme.colors.text,
  },
  status: {
    fontSize: rf(10),
    fontWeight: '500',
  },
});

export default SyncStatusIndicator;
