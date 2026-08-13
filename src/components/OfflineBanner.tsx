/**
 * OfflineBanner
 *
 * Presentation-only indicator for the app-data offline queue (NOT the
 * wearable-device sync covered by SyncStatusIndicator — see
 * src/screens/main/home/SyncStatusIndicator.tsx). Surfaces the state that
 * already exists in offline.ts / offlineStore.ts but was never rendered
 * anywhere: whether the device is offline, whether queued writes are still
 * syncing, and whether any writes permanently failed to sync (exhausted
 * retries and were rolled back locally).
 *
 * Visual language matches the existing hairline-card banner pattern used by
 * ErrorBanner and DatabaseDownloadBanner: flatColors surface fill, 1px
 * hairline border, spacing/borderRadius tokens — no new visual language.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  flatColors as colors,
  spacing,
  borderRadius,
  flatFontSize as fontSize,
  typography,
} from '../theme/aurora-tokens';
import { AuroraSpinner } from './ui/aurora/AuroraSpinner';
import { hexToRgba, TINT_ALPHA_LOW } from '../utils/colors';
import {
  useIsOnline,
  useSyncInProgress,
  useSyncQueueLength,
  useSyncFailedCount,
} from '../hooks/useOffline';

export const OfflineBanner: React.FC = () => {
  const isOnline = useIsOnline();
  const syncInProgress = useSyncInProgress();
  const queueLength = useSyncQueueLength();
  const failedCount = useSyncFailedCount();

  let headline: string;
  let tint: string;
  let icon: keyof typeof Ionicons.glyphMap;
  let showSpinner = false;

  if (!isOnline) {
    tint = colors.warningAlt;
    icon = 'cloud-offline-outline';
    headline =
      queueLength > 0
        ? `You're offline — ${queueLength} action${queueLength === 1 ? '' : 's'} will sync when you're back online`
        : "You're offline";
  } else if (syncInProgress) {
    tint = colors.primary;
    icon = 'sync-outline';
    showSpinner = true;
    headline =
      queueLength > 0 ? `Syncing ${queueLength} item${queueLength === 1 ? '' : 's'}…` : 'Syncing…';
  } else if (failedCount > 0) {
    tint = colors.errorAlt;
    icon = 'alert-circle-outline';
    headline = `${failedCount} action${failedCount === 1 ? '' : 's'} failed to sync`;
  } else {
    // Fully online, nothing queued, nothing failed — no indicator needed.
    return null;
  }

  return (
    <Reanimated.View entering={FadeInDown.duration(250)} style={styles.wrapper}>
      <View
        style={[
          styles.card,
          { borderColor: hexToRgba(tint, 0.35), backgroundColor: hexToRgba(tint, TINT_ALPHA_LOW) },
        ]}
      >
        {showSpinner ? (
          <AuroraSpinner customSize={16} theme="primary" />
        ) : (
          <Ionicons name={icon} size={16} color={tint} />
        )}
        <Text style={[styles.text, { color: tint }]} numberOfLines={2}>
          {headline}
        </Text>
      </View>
    </Reanimated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
  },
  text: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default OfflineBanner;
