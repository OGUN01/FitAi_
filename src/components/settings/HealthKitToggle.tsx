import React from "react";
import { View, Text, Switch, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors } from "../../theme/aurora-tokens";
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
        backgroundColor: colors.surface,
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
              color: colors.text,
            }}
          >
            Enable HealthKit Integration
          </Text>
          <Text
            style={{
              fontSize: rf(14),
              color: colors.textSecondary,
              marginTop: rp(4),
            }}
          >
            Sync your health data with Apple Health
          </Text>
        </View>
        {isLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Switch
            value={enabled && isAuthorized}
            onValueChange={onToggle}
            trackColor={{
              false: colors.border,
              true: colors.primary,
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
          borderTopColor: colors.border,
        }}
      >
        <Ionicons
          name={isAuthorized ? "checkmark-circle" : "alert-circle"}
          size={rs(16)}
          color={isAuthorized ? colors.success : colors.warning}
        />
        <Text
          style={{
            fontSize: rf(14),
            color: isAuthorized ? colors.success : colors.warning,
            marginLeft: rp(8),
          }}
        >
          {isAuthorized ? "Connected to HealthKit" : "Not connected"}
        </Text>
      </View>
    </View>
  );
};
