import React from "react";
import { rf, rp, rbr } from '../../utils/responsive';
import { View, Text, Switch } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";

interface AdditionalSettingsCardProps {
  exportToHealthKit: boolean;
  backgroundSyncEnabled: boolean;
  onToggleExport: (enabled: boolean) => void;
  onToggleBackgroundSync: (enabled: boolean) => void;
}

export const AdditionalSettingsCard: React.FC<AdditionalSettingsCardProps> = ({
  exportToHealthKit,
  backgroundSyncEnabled,
  onToggleExport,
  onToggleBackgroundSync,
}) => {
  return (
    <View
      style={{
        backgroundColor: ResponsiveTheme.colors.surface,
        marginHorizontal: rp(16),
        marginBottom: rp(16),
        borderRadius: rbr(12),
        padding: rp(16),
      }}
    >
      <Text
        style={{
          fontSize: rf(16),
          fontWeight: "600",
          color: ResponsiveTheme.colors.text,
          marginBottom: rp(12),
        }}
      >
        Additional Settings
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: rp(8),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: rf(16),
              color: ResponsiveTheme.colors.text,
            }}
          >
            Export FitAI Data to HealthKit
          </Text>
          <Text
            style={{
              fontSize: rf(14),
              color: ResponsiveTheme.colors.textSecondary,
              marginTop: rp(2),
            }}
          >
            Share your FitAI workouts and nutrition with Health app
          </Text>
        </View>
        <Switch
          value={exportToHealthKit}
          onValueChange={onToggleExport}
          trackColor={{
            false: ResponsiveTheme.colors.border,
            true: ResponsiveTheme.colors.primary,
          }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: rp(8),
          marginTop: rp(8),
          borderTopWidth: 1,
          borderTopColor: ResponsiveTheme.colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: rf(16),
              color: ResponsiveTheme.colors.text,
            }}
          >
            Background Sync
          </Text>
          <Text
            style={{
              fontSize: rf(14),
              color: ResponsiveTheme.colors.textSecondary,
              marginTop: rp(2),
            }}
          >
            Automatically sync when app becomes active
          </Text>
        </View>
        <Switch
          value={backgroundSyncEnabled}
          onValueChange={onToggleBackgroundSync}
          trackColor={{
            false: ResponsiveTheme.colors.border,
            true: ResponsiveTheme.colors.primary,
          }}
        />
      </View>
    </View>
  );
};
