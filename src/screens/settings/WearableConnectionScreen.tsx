import React from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../components/ui/aurora/AnimatedPressable";
import { AuroraBackground } from "../../components/ui/aurora/AuroraBackground";
import { flatColors as colors, spacing } from "../../theme/aurora-tokens";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
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
        <View style={styles.header}>
          <AnimatedPressable
            onPress={() => {
              haptics.light();
              onBack?.();
            }}
            style={styles.backButton}
            scaleValue={0.9}
            hapticFeedback={false}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={rf(24)} color={colors.text} />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>Connect Wearables</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(20),
    backgroundColor: colors.glassHighlight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: rf(20),
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  headerRight: {
    width: rw(40),
    alignItems: "flex-end",
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
