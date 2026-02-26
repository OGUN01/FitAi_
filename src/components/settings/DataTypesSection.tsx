import React from "react";
import { View, Text, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rs } from '../../utils/responsive';

interface HealthDataType {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface DataTypesSectionProps {
  dataTypes: HealthDataType[];
  enabledDataTypes: Record<string, boolean>;
  onToggle: (key: string, enabled: boolean) => void;
}

export const DataTypesSection: React.FC<DataTypesSectionProps> = ({
  dataTypes,
  enabledDataTypes,
  onToggle,
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
        Data Types to Sync
      </Text>

      {dataTypes.map((dataType, index) => (
        <View
          key={dataType.key}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: rp(12),
            borderTopWidth: index > 0 ? 1 : 0,
            borderTopColor: ResponsiveTheme.colors.border,
          }}
        >
          <Ionicons
            name={dataType.icon}
            size={rs(24)}
            color={ResponsiveTheme.colors.primary}
            style={{ marginRight: rp(12) }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: rf(16),
                fontWeight: "500",
              color: ResponsiveTheme.colors.text,
              }}
            >
              {dataType.title}
            </Text>
            <Text
              style={{
                fontSize: rf(14),
              color: ResponsiveTheme.colors.textSecondary,
                marginTop: rp(2),
              }}
            >
              {dataType.description}
            </Text>
          </View>
          <Switch
            value={enabledDataTypes[dataType.key]}
            onValueChange={(value) => onToggle(dataType.key, value)}
            trackColor={{
              false: ResponsiveTheme.colors.border,
              true: ResponsiveTheme.colors.primary,
            }}
          />
        </View>
      ))}
    </View>
  );
};
