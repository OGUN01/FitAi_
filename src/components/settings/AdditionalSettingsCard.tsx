import React from "react";
import { View, Text, Switch } from "react-native";
import { THEME } from "../../utils/constants";

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
        backgroundColor: THEME.colors.surface,
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "600",
          color: THEME.colors.text,
          marginBottom: 12,
        }}
      >
        Additional Settings
      </Text>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              color: THEME.colors.text,
            }}
          >
            Export FitAI Data to HealthKit
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: THEME.colors.textSecondary,
              marginTop: 2,
            }}
          >
            Share your FitAI workouts and nutrition with Health app
          </Text>
        </View>
        <Switch
          value={exportToHealthKit}
          onValueChange={onToggleExport}
          trackColor={{
            false: THEME.colors.border,
            true: THEME.colors.primary,
          }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 8,
          marginTop: 8,
          borderTopWidth: 1,
          borderTopColor: THEME.colors.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              color: THEME.colors.text,
            }}
          >
            Background Sync
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: THEME.colors.textSecondary,
              marginTop: 2,
            }}
          >
            Automatically sync when app becomes active
          </Text>
        </View>
        <Switch
          value={backgroundSyncEnabled}
          onValueChange={onToggleBackgroundSync}
          trackColor={{
            false: THEME.colors.border,
            true: THEME.colors.primary,
          }}
        />
      </View>
    </View>
  );
};
