import React from "react";
import {
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { GlassHeader } from "../../components/ui/aurora/GlassHeader";
import { colors, spacing } from "../../theme/aurora-tokens";
import { rp } from "../../utils/responsive";
import { useWearableConnection } from "../../hooks/useWearableConnection";
import { WarningBanner } from "../../components/wearable/WarningBanner";
import { ConnectionCard } from "../../components/wearable/ConnectionCard";
import { HealthSummaryCard } from "../../components/wearable/HealthSummaryCard";
import { DataTypesCard } from "../../components/wearable/DataTypesCard";
import { CompatibleDevicesCard } from "../../components/wearable/CompatibleDevicesCard";
import { HowItWorksCard } from "../../components/wearable/HowItWorksCard";
import { UnsupportedWatchNotice } from "../../components/health/UnsupportedWatchNotice";
import { HealthConnectDisclosureModal } from "../../components/health/HealthConnectDisclosureModal";

interface WearableConnectionScreenProps {
  onBack?: () => void;
  /** Navigate to the manual health-data entry screen. */
  onEnterManually?: () => void;
}

export const WearableConnectionScreen: React.FC<
  WearableConnectionScreenProps
> = ({ onBack, onEnterManually }) => {
  const {
    refreshing,
    nativeModuleAvailable,
    isReauthorizing,
    isIOS,
    isAndroid,
    isConnected,
    isHealthConnectWorking,
    isGuestMode,
    platformName,
    isExpoGo,
    metrics,
    syncStatus,
    lastSyncTime,
    syncError,
    settings,
    handleConnectionToggle,
    handleSyncNow,
    handleReauthorize,
    onRefresh,
    handleDataTypeToggle,
    handleEnterManually,
    formatLastSync,
    disclosureVisible,
    onDisclosureAcknowledge,
    onDisclosureDismiss,
  } = useWearableConnection();

  return (
    <AuroraBackground>
      <SafeAreaView style={styles.container}>
        <GlassHeader
          title="Connect Wearables"
          titleIcon="watch-outline"
          onBack={onBack}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text.primary}
            />
          }
        >
          {(isExpoGo || nativeModuleAvailable === false) && (
            <WarningBanner platformName={platformName} />
          )}

          <ConnectionCard
            platformName={platformName}
            isConnected={isConnected}
            isIOS={isIOS}
            healthKitEnabled={settings.healthKitEnabled}
            healthConnectEnabled={settings.healthConnectEnabled}
            syncStatus={syncStatus}
            lastSyncTime={lastSyncTime}
            syncError={syncError}
            isReauthorizing={isReauthorizing}
            isAndroid={isAndroid}
            formatLastSync={formatLastSync}
            onConnectionToggle={handleConnectionToggle}
            onSyncNow={handleSyncNow}
            onReauthorize={handleReauthorize}
          />

          {isConnected && <HealthSummaryCard metrics={metrics} />}

          {isConnected && (
            <DataTypesCard
              dataTypesToSync={settings.dataTypesToSync}
              onDataTypeToggle={handleDataTypeToggle}
            />
          )}

          <CompatibleDevicesCard platformName={platformName} isIOS={isIOS} />

          <HowItWorksCard platformName={platformName} />

          {/* Manual-entry fallback for watches without Health Connect support
              (Noise, boAt, Fire-Boltt, Huawei). Only shown on Android AND only
              when Health Connect is NOT working — if the user has HC authorized
              and syncing, they have a supported watch and this notice would be
              confusing. The manual-entry CTA is guest-guarded: guests see a
              sign-in prompt instead of the form (which would fail on save). */}
          {isAndroid && !isHealthConnectWorking && onEnterManually && (
            <UnsupportedWatchNotice
              onEnterManually={() => handleEnterManually(onEnterManually)}
            />
          )}

        </ScrollView>

        {/* Play User Data policy: prominent in-app disclosure shown BEFORE the
            system Health Connect permission sheet. Visibility + handlers come
            from useWearableConnection (gated by a one-time AsyncStorage flag). */}
        <HealthConnectDisclosureModal
          visible={disclosureVisible}
          onAcknowledge={onDisclosureAcknowledge}
          onDismiss={onDisclosureDismiss}
        />
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: rp(100),
  },
});

export default WearableConnectionScreen;
