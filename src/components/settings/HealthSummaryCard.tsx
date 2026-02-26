import React from "react";
import { View, Text } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr } from '../../utils/responsive';

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
            marginBottom: rp(12),
          }}
        >
          <Text
            style={{
              fontSize: rf(24),
              fontWeight: "bold",
              color: ResponsiveTheme.colors.primary,
            }}
          >
            {summary.dailySteps?.toLocaleString() || "0"}
          </Text>
          <Text style={{ fontSize: rf(14), color: ResponsiveTheme.colors.textSecondary }}>
            Steps
          </Text>
        </View>

        <View
          style={{
            alignItems: "center",
            minWidth: "45%",
            marginBottom: rp(12),
          }}
        >
          <Text
            style={{
              fontSize: rf(24),
              fontWeight: "bold",
              color: ResponsiveTheme.colors.secondary,
            }}
          >
            {summary.dailyCalories || "0"}
          </Text>
          <Text style={{ fontSize: rf(14), color: ResponsiveTheme.colors.textSecondary }}>
            Calories
          </Text>
        </View>

        {summary.lastWeight && (
          <View
            style={{
              alignItems: "center",
              minWidth: "45%",
              marginBottom: rp(12),
            }}
          >
            <Text
              style={{
                fontSize: rf(24),
                fontWeight: "bold",
                color: ResponsiveTheme.colors.success,
              }}
            >
              {summary.lastWeight.toFixed(1)}
            </Text>
            <Text style={{ fontSize: rf(14), color: ResponsiveTheme.colors.textSecondary }}>
              kg
            </Text>
          </View>
        )}

        {summary.sleepHours && (
          <View
            style={{
              alignItems: "center",
              minWidth: "45%",
              marginBottom: rp(12),
            }}
          >
            <Text
              style={{
                fontSize: rf(24),
                fontWeight: "bold",
                color: ResponsiveTheme.colors.info,
              }}
            >
              {summary.sleepHours.toFixed(1)}
            </Text>
            <Text style={{ fontSize: rf(14), color: ResponsiveTheme.colors.textSecondary }}>
              Sleep (h)
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
