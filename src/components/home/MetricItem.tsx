import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rp } from "../../utils/responsive";

interface MetricItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  subvalue?: string;
  color: string;
  trend?: "up" | "down" | "stable";
  onPress?: () => void;
  delay?: number;
}

export const MetricItem: React.FC<MetricItemProps> = ({
  icon,
  label,
  value,
  subvalue,
  color,
  trend,
  onPress,
  delay = 0,
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    const icons = {
      up: "trending-up" as const,
      down: "trending-down" as const,
      stable: "remove" as const,
    };
    const colors = {
      up: ResponsiveTheme.colors.error, // HR going up is usually bad
      down: ResponsiveTheme.colors.success, // HR going down is usually good
      stable: ResponsiveTheme.colors.neutral,
    };
    return (
      <Ionicons
        name={icons[trend]}
        size={rf(12)}
        color={colors[trend]}
        style={styles.trendIcon}
      />
    );
  };

  return (
    <Animated.View entering={FadeInRight.delay(delay).springify()}>
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.96}
        hapticFeedback={true}
        hapticType="light"
        style={styles.metricItem}
      >
        <View
          style={[
            styles.metricIconContainer,
            { backgroundColor: `${color}20` },
          ]}
        >
          <Ionicons name={icon} size={rf(16)} color={color} />
        </View>
        <View style={styles.metricContent}>
          <Text style={styles.metricLabel}>{label}</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>{value}</Text>
            {subvalue && <Text style={styles.metricSubvalue}>{subvalue}</Text>}
            {getTrendIcon()}
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingVertical: ResponsiveTheme.spacing.xs,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  metricIconContainer: {
    width: rw(28),
    height: rw(28),
    borderRadius: rw(14),
    justifyContent: "center",
    alignItems: "center",
  },
  metricContent: {
    flex: 1,
  },
  metricLabel: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: rp(2),
  },
  metricValue: {
    fontSize: rf(14),
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  metricSubvalue: {
    fontSize: rf(10),
    fontWeight: "500",
    color: ResponsiveTheme.colors.textSecondary,
  },
  trendIcon: {
    marginLeft: ResponsiveTheme.spacing.xs,
  },
});
