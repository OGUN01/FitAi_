import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../../utils/constants";
import { rf, rw, rh, rp, rbr } from "../../../utils/responsive";
import { TrendData } from "../../../hooks/useProgressTrendsLogic";
import { haptics } from "../../../utils/haptics";

interface SimpleTrendCardProps {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend: TrendData | null;
  unit: string;
  color: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}

export const SimpleTrendCard: React.FC<SimpleTrendCardProps> = ({
  title,
  icon,
  trend,
  unit,
  color,
  ctaLabel,
  onCtaPress,
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
                  { color: trend.change >= 0 ? ResponsiveTheme.colors.success : ResponsiveTheme.colors.error },
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
          {ctaLabel && onCtaPress ? (
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                haptics.light();
                onCtaPress();
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.ctaButtonText}>{ctaLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  trendCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(16),
    padding: rp(16),
  },
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: rp(12),
  },
  trendIconContainer: {
    width: rw(36),
    height: rw(36),
    borderRadius: rbr(10),
    alignItems: "center",
    justifyContent: "center",
    marginRight: rp(12),
  },
  trendTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  trendStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: rp(12),
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
    marginTop: rp(2),
  },
  miniChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: rh(50),
    paddingTop: rp(10),
  },
  chartBar: {
    width: rw(8),
    borderRadius: rbr(4),
    opacity: 0.8,
  },
  noDataContainer: {
    alignItems: "flex-start",
    paddingVertical: rp(20),
  },
  noDataText: {
    fontSize: rf(14),
    fontWeight: "500",
    color: ResponsiveTheme.colors.text,
  },
  noDataSubtext: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(4),
  },
  ctaButton: {
    marginTop: rp(12),
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(24),
    paddingHorizontal: rp(20),
    paddingVertical: rp(10),
    alignSelf: "flex-start",
  },
  ctaButtonText: {
    fontSize: rf(13),
    fontWeight: "600",
    color: ResponsiveTheme.colors.background,
    letterSpacing: 0.3,
  },
});
