import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useHealthKitSettings } from "../../hooks/useHealthKitSettings";
import { HealthKitToggle } from "../../components/settings/HealthKitToggle";
import { SyncStatusCard } from "../../components/settings/SyncStatusCard";
import { HealthSummaryCard } from "../../components/settings/HealthSummaryCard";
import { DataTypesSection } from "../../components/settings/DataTypesSection";
import { AdditionalSettingsCard } from "../../components/settings/AdditionalSettingsCard";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rs } from '../../utils/responsive';

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
      <SafeAreaView
        style={{ flex: 1, backgroundColor: ResponsiveTheme.colors.background }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: rp(20),
          }}
        >
          <Ionicons
            name="phone-portrait-outline"
            size={rs(64)}
            color={ResponsiveTheme.colors.textSecondary}
          />
          <Text
            style={{
              fontSize: rf(20),
              fontWeight: "bold",
              color: ResponsiveTheme.colors.text,
              marginTop: rp(16),
              textAlign: "center",
            }}
          >
            HealthKit Not Available
          </Text>
          <Text
            style={{
              fontSize: rf(16),
              color: ResponsiveTheme.colors.textSecondary,
              marginTop: rp(8),
              textAlign: "center",
            }}
          >
            HealthKit integration is only available on iOS devices. Android
            users can manually track their progress in FitAI.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ResponsiveTheme.colors.background }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: rp(16),
          borderBottomWidth: 1,
          borderBottomColor: ResponsiveTheme.colors.border,
        }}
      >
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={{
            marginRight: rp(16),
            minWidth: 44,
            minHeight: 44,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={rs(24)} color={ResponsiveTheme.colors.text} />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: rf(20),
            fontWeight: "bold",
            color: ResponsiveTheme.colors.text,
            flex: 1,
          }}
        >
          HealthKit Settings
        </Text>
        <Ionicons
          name="fitness-outline"
          size={rs(24)}
          color={ResponsiveTheme.colors.primary}
        />
      </View>

      <ScrollView style={{ flex: 1 }}>
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

        <View
          style={{
            marginHorizontal: rp(16),
            marginBottom: rp(32),
          }}
        >
          <TouchableOpacity
            onPress={handleOpenHealthApp}
            accessibilityRole="button"
            accessibilityLabel="Manage permissions in Health app"
            style={{
              backgroundColor: ResponsiveTheme.colors.surface,
              borderRadius: rbr(12),
              padding: rp(16),
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: ResponsiveTheme.colors.border,
            }}
          >
            <Ionicons
              name="help-circle-outline"
              size={rs(20)}
              color={ResponsiveTheme.colors.primary}
            />
            <Text
              style={{
                fontSize: rf(16),
                color: ResponsiveTheme.colors.primary,
                marginLeft: rp(8),
              }}
            >
              Manage Permissions in Health App
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
