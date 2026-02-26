import React from "react";
import { View, Text, Switch, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rs } from '../../utils/responsive';

interface HealthKitToggleProps {
  enabled: boolean;
  isAuthorized: boolean;
  isLoading: boolean;
  onToggle: (enabled: boolean) => void;
}

export const HealthKitToggle: React.FC<HealthKitToggleProps> = ({
  enabled,
  isAuthorized,
  isLoading,
  onToggle,
}) => {
  return (
    <View
      style={{
        backgroundColor: ResponsiveTheme.colors.surface,
        margin: rp(16),
        borderRadius: rbr(12),
        padding: rp(16),
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: rp(8),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: rf(18),
              fontWeight: "bold",
              color: ResponsiveTheme.colors.text,
            }}
          >
            Enable HealthKit Integration
          </Text>
          <Text
            style={{
              fontSize: rf(14),
              color: ResponsiveTheme.colors.textSecondary,
              marginTop: rp(4),
            }}
          >
            Sync your health data with Apple Health
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color={ResponsiveTheme.colors.primary} />
        ) : (
          <Switch
            value={enabled && isAuthorized}
            onValueChange={onToggle}
            trackColor={{
              false: ResponsiveTheme.colors.border,
              true: ResponsiveTheme.colors.primary,
            }}
          />
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: rp(12),
          paddingTop: rp(12),
          borderTopWidth: 1,
          borderTopColor: ResponsiveTheme.colors.border,
        }}
      >
        <Ionicons
          name={isAuthorized ? "checkmark-circle" : "alert-circle"}
          size={rs(16)}
          color={isAuthorized ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.warning}
        />
        <Text
          style={{
            fontSize: rf(14),
            color: isAuthorized ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.warning,
            marginLeft: rp(8),
          }}
        >
          {isAuthorized ? "Connected to HealthKit" : "Not connected"}
        </Text>
      </View>
    </View>
  );
};
