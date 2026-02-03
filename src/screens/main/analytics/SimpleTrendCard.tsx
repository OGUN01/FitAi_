import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh } from "../../../utils/responsive";
import { TrendData } from "../../../hooks/useProgressTrendsLogic";

interface SimpleTrendCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend: TrendData | null;
  unit: string;
  color: string;
}

export const SimpleTrendCard: React.FC<SimpleTrendCardProps> = ({
  title,
  icon,
  trend,
  unit,
  color,
}) => {
  return (
    <Animated.View
      entering={FadeInDown.delay(200).duration(400)}
      style={styles.trendCard}
    >
      <View style={styles.trendHeader}>
        <View
          style={[styles.trendIconContainer, { backgroundColor: color + "20" }]}
        >
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.trendTitle}>{title}</Text>
      </View>

      {trend ? (
        <>
          <View style={styles.trendStats}>
            <View style={styles.trendStatItem}>
              <Text style={styles.trendStatLabel}>Current</Text>
              <Text style={styles.trendStatValue}>
                {trend.data[trend.data.length - 1]?.toFixed(1)} {unit}
              </Text>
            </View>
            <View style={styles.trendStatItem}>
              <Text style={styles.trendStatLabel}>Avg</Text>
              <Text style={styles.trendStatValue}>
                {trend.avg.toFixed(1)} {unit}
              </Text>
            </View>
            <View style={styles.trendStatItem}>
              <Text style={styles.trendStatLabel}>Change</Text>
              <Text
                style={[
                  styles.trendStatValue,
                  { color: trend.change >= 0 ? "#4CAF50" : "#FF5252" },
                ]}
              >
                {trend.change >= 0 ? "+" : ""}
                {trend.change.toFixed(1)} {unit}
              </Text>
            </View>
          </View>

          <View style={styles.miniChart}>
            {trend.data.slice(-7).map((value, index, arr) => {
              const max = Math.max(...arr);
              const min = Math.min(...arr);
              const range = max - min || 1;
              const height = ((value - min) / range) * 40 + 10;
              return (
                <View
                  key={index}
                  style={[styles.chartBar, { height, backgroundColor: color }]}
                />
              );
            })}
          </View>
        </>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>Not enough data yet</Text>
          <Text style={styles.noDataSubtext}>
            Keep tracking to see your trends
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  trendCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: 16,
    padding: rw(16),
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rh(12),
  },
  trendIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: rw(12),
  },
  trendTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  trendStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: rh(12),
  },
  trendStatItem: {
    alignItems: "center",
  },
  trendStatLabel: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
  },
  trendStatValue: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginTop: rh(2),
  },
  miniChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 50,
    paddingTop: rh(10),
  },
  chartBar: {
    width: 8,
    borderRadius: 4,
    opacity: 0.8,
  },
  noDataContainer: {
    alignItems: "center",
    paddingVertical: rh(20),
  },
  noDataText: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  noDataSubtext: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rh(4),
  },
});
