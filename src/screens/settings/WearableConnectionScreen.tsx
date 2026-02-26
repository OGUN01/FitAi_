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
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rh, rp, rbr } from "../../utils/responsive";
import { haptics } from "../../utils/haptics";
import { useWearableConnection } from "../../hooks/useWearableConnection";
import { WarningBanner } from "../../components/wearable/WarningBanner";
import { ConnectionCard } from "../../components/wearable/ConnectionCard";
import { HealthSummaryCard } from "../../components/wearable/HealthSummaryCard";
import { DataTypesCard } from "../../components/wearable/DataTypesCard";
import { CompatibleDevicesCard } from "../../components/wearable/CompatibleDevicesCard";
import { HowItWorksCard } from "../../components/wearable/HowItWorksCard";

interface WearableConnectionScreenProps {
  onBack?: () => void;
}

export const WearableConnectionScreen: React.FC<
  WearableConnectionScreenProps
> = ({ onBack }) => {
  const {
    refreshing,
    nativeModuleAvailable,
    isReauthorizing,
    isIOS,
    isAndroid,
    isConnected,
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
    formatLastSync,
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
            <Ionicons name="arrow-back" size={rf(24)} color={ResponsiveTheme.colors.text} />
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
              tintColor={ResponsiveTheme.colors.text}
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

        </ScrollView>
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
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  backButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.glassHighlight,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: rf(20),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
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
    paddingHorizontal: ResponsiveTheme.spacing.md,
    paddingTop: ResponsiveTheme.spacing.md,
    paddingBottom: rp(100),
  },
});

export default WearableConnectionScreen;
