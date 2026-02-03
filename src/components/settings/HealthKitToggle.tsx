import React from "react";
import { View, Text, Switch, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../utils/constants";

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
        backgroundColor: THEME.colors.surface,
        margin: 16,
        borderRadius: 12,
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "bold",
              color: THEME.colors.text,
            }}
          >
            Enable HealthKit Integration
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: THEME.colors.textSecondary,
              marginTop: 4,
            }}
          >
            Sync your health data with Apple Health
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color={THEME.colors.primary} />
        ) : (
          <Switch
            value={enabled && isAuthorized}
            onValueChange={onToggle}
            trackColor={{
              false: THEME.colors.border,
              true: THEME.colors.primary,
            }}
          />
        )}
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: THEME.colors.border,
        }}
      >
        <Ionicons
          name={isAuthorized ? "checkmark-circle" : "alert-circle"}
          size={16}
          color={isAuthorized ? THEME.colors.success : THEME.colors.warning}
        />
        <Text
          style={{
            fontSize: 14,
            color: isAuthorized ? THEME.colors.success : THEME.colors.warning,
            marginLeft: 8,
          }}
        >
          {isAuthorized ? "Connected to HealthKit" : "Not connected"}
        </Text>
      </View>
    </View>
  );
};
