import React from "react";
import { View, Text } from "react-native";
import { THEME } from "../../utils/constants";

interface HealthSummary {
  dailySteps?: number;
  dailyCalories?: number;
  lastWeight?: number;
  sleepHours?: number;
}

interface HealthSummaryCardProps {
  summary: HealthSummary;
}

export const HealthSummaryCard: React.FC<HealthSummaryCardProps> = ({
  summary,
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
        Today's Health Summary
      </Text>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <View
          style={{
            alignItems: "center",
            minWidth: "45%",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: THEME.colors.primary,
            }}
          >
            {summary.dailySteps?.toLocaleString() || "0"}
          </Text>
          <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>
            Steps
          </Text>
        </View>

        <View
          style={{
            alignItems: "center",
            minWidth: "45%",
            marginBottom: 12,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: THEME.colors.secondary,
            }}
          >
            {summary.dailyCalories || "0"}
          </Text>
          <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>
            Calories
          </Text>
        </View>

        {summary.lastWeight && (
          <View
            style={{
              alignItems: "center",
              minWidth: "45%",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: THEME.colors.success,
              }}
            >
              {summary.lastWeight.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>
              kg
            </Text>
          </View>
        )}

        {summary.sleepHours && (
          <View
            style={{
              alignItems: "center",
              minWidth: "45%",
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: THEME.colors.info,
              }}
            >
              {summary.sleepHours.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 14, color: THEME.colors.textSecondary }}>
              Sleep (h)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
