import React from "react";
import {
  View,
  Text,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useHealthKitSettings } from "../../hooks/useHealthKitSettings";
import { HealthKitToggle } from "../../components/settings/HealthKitToggle";
import { SyncStatusCard } from "../../components/settings/SyncStatusCard";
import { HealthSummaryCard } from "../../components/settings/HealthSummaryCard";
import { DataTypesSection } from "../../components/settings/DataTypesSection";
import { AdditionalSettingsCard } from "../../components/settings/AdditionalSettingsCard";
import { colors, spacing } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rs } from '../../utils/responsive';
import { AuroraBackground } from "../../components/ui/aurora";
import { AnimatedPressable } from "../../components/ui/aurora";

interface HealthKitSettingsScreenProps {
  onBack: () => void;
}

interface HealthDataType {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const HEALTH_DATA_TYPES: HealthDataType[] = [
  {
    key: "steps",
    title: "Steps & Activity",
    description: "Daily steps, distance, and movement data",
    icon: "walk-outline",
  },
  {
    key: "heartRate",
    title: "Heart Rate",
    description: "Heart rate measurements and variability",
    icon: "heart-outline",
  },
  {
    key: "workouts",
    title: "Workouts",
    description: "Exercise sessions and fitness activities",
    icon: "fitness-outline",
  },
  {
    key: "sleep",
    title: "Sleep Data",
    description: "Sleep duration, quality, and patterns",
    icon: "bed-outline",
  },
  {
    key: "weight",
    title: "Body Measurements",
    description: "Weight, body fat, and composition",
    icon: "body-outline",
  },
  {
    key: "nutrition",
    title: "Nutrition",
    description: "Calories, macros, and dietary information",
    icon: "nutrition-outline",
  },
];

export const HealthKitSettingsScreen: React.FC<
  HealthKitSettingsScreenProps
> = ({ onBack }) => {
  const {
    isAvailable,
    isAuthorized,
    isLoading,
    syncStatus,
    error,
    lastSyncTime,
    settings,
    summary,
    handleToggleHealthKit,
    handleDataTypeToggle,
    handleSyncNow,
    handleOpenHealthApp,
    formatLastSync,
    updateSettings,
  } = useHealthKitSettings();

  if (Platform.OS !== "ios") {
    return (
      <AuroraBackground theme="space" animated intensity={0.3}>
        <SafeAreaView style={styles.container}>
          <View style={styles.notAvailableContainer}>
            <Ionicons
              name="phone-portrait-outline"
              size={rs(64)}
              color={colors.text.secondary}
            />
            <Text style={styles.notAvailableTitle}>
              HealthKit Not Available
            </Text>
            <Text style={styles.notAvailableMessage}>
              HealthKit integration is only available on iOS devices. Android
              users can manually track their progress in FitAI.
            </Text>
          </View>
        </SafeAreaView>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground theme="space" animated intensity={0.3}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <AnimatedPressable
            onPress={onBack}
            scaleValue={0.9}
            springConfig="snappy"
            hapticType="light"
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.headerBackButton}
          >
            <Ionicons name="arrow-back" size={rs(24)} color={colors.text.primary} />
          </AnimatedPressable>
          <Text style={styles.headerTitle}>
            HealthKit Settings
          </Text>
          <Ionicons
            name="fitness-outline"
            size={rs(24)}
            color={colors.primary.DEFAULT}
          />
        </View>

        <ScrollView style={styles.scrollArea}>
          <HealthKitToggle
            enabled={settings.healthKitEnabled}
            isAuthorized={isAuthorized}
            isLoading={isLoading}
            onToggle={handleToggleHealthKit}
          />

          {isAuthorized && (
            <SyncStatusCard
              syncStatus={syncStatus}
              lastSyncTime={lastSyncTime}
              error={error}
              onSyncNow={handleSyncNow}
              formatLastSync={formatLastSync}
            />
          )}

          {isAuthorized && summary && <HealthSummaryCard summary={summary} />}

          {isAuthorized && (
            <DataTypesSection
              dataTypes={HEALTH_DATA_TYPES}
              enabledDataTypes={settings.dataTypesToSync}
              onToggle={handleDataTypeToggle}
            />
          )}

          {isAuthorized && (
            <AdditionalSettingsCard
              exportToHealthKit={settings.exportToHealthKit}
              backgroundSyncEnabled={settings.backgroundSyncEnabled}
              onToggleExport={(value) =>
                updateSettings({ exportToHealthKit: value })
              }
              onToggleBackgroundSync={(value) =>
                updateSettings({ backgroundSyncEnabled: value })
              }
            />
          )}

          <View style={styles.managePermissionsWrap}>
            <AnimatedPressable
              onPress={handleOpenHealthApp}
              scaleValue={0.97}
              springConfig="smooth"
              hapticType="light"
              accessibilityRole="button"
              accessibilityLabel="Manage permissions in Health app"
              style={styles.managePermissionsButton}
            >
              <Ionicons
                name="help-circle-outline"
                size={rs(20)}
                color={colors.primary.DEFAULT}
              />
              <Text style={styles.managePermissionsText}>
                Manage Permissions in Health App
              </Text>
            </AnimatedPressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuroraBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notAvailableContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: rp(spacing.lg),
  },
  notAvailableTitle: {
    fontSize: rf(20),
    fontWeight: "bold",
    color: colors.text.primary,
    marginTop: rp(spacing.lg),
    textAlign: "center",
  },
  notAvailableMessage: {
    fontSize: rf(16),
    color: colors.text.secondary,
    marginTop: rp(spacing.sm),
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: rp(spacing.lg),
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  headerBackButton: {
    marginRight: rp(spacing.lg),
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: rf(20),
    fontWeight: "bold",
    color: colors.text.primary,
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  managePermissionsWrap: {
    marginHorizontal: rp(spacing.lg),
    marginBottom: rp(spacing.xxxl),
  },
  managePermissionsButton: {
    backgroundColor: colors.background.secondary,
    borderRadius: rbr(spacing.lg),
    padding: rp(spacing.lg),
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  managePermissionsText: {
    fontSize: rf(16),
    color: colors.primary.DEFAULT,
    marginLeft: rp(spacing.sm),
  },
});
