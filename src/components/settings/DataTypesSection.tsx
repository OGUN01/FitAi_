import React from "react";
import { View, Text, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { THEME } from "../../utils/constants";

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
        Data Types to Sync
      </Text>

      {dataTypes.map((dataType, index) => (
        <View
          key={dataType.key}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 12,
            borderTopWidth: index > 0 ? 1 : 0,
            borderTopColor: THEME.colors.border,
          }}
        >
          <Ionicons
            name={dataType.icon}
            size={24}
            color={THEME.colors.primary}
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "500",
                color: THEME.colors.text,
              }}
            >
              {dataType.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: THEME.colors.textSecondary,
                marginTop: 2,
              }}
            >
              {dataType.description}
            </Text>
          </View>
          <Switch
            value={enabledDataTypes[dataType.key]}
            onValueChange={(value) => onToggle(dataType.key, value)}
            trackColor={{
              false: THEME.colors.border,
              true: THEME.colors.primary,
            }}
          />
        </View>
      ))}
    </View>
  );
};
