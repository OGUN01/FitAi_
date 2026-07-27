// Analytics Card Component
// Displays key metrics and insights in a beautiful card format

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors } from "../../theme/aurora-tokens";
import { rf, rp, rbr, rh } from "../../utils/responsive";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  icon?: string;
  iconName?: string; // Added for compatibility with usage in AnalyticsScreen
  color?: string;
  onPress?: () => void;
  size?: "small" | "medium" | "large";
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color = "blue",
  onPress,
  size = "medium",
}) => {
  const getBackgroundColor = () => {
    const bgColors = {
      blue: colors.primary,
      green: colors.success,
      purple: colors.primary,
      orange: colors.warning,
      red: colors.error,
      gray: colors.neutral,
    };
    return bgColors[color as keyof typeof bgColors] || bgColors.blue;
  };

  const getTrendIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (trend) {
      case "up":
        return "trending-up";
      case "down":
        return "trending-down";
      case "stable":
        return "remove";
      default:
        return "remove";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          container: { padding: rp(16), minHeight: rh(80) },
          title: { fontSize: rf(14) },
          value: { fontSize: rf(20) },
          subtitle: { fontSize: rf(12) },
          icon: { fontSize: rf(24) },
        };
      case "large":
        return {
          container: { padding: rp(24), minHeight: rh(140) },
          title: { fontSize: rf(18) },
          value: { fontSize: rf(28) },
          subtitle: { fontSize: rf(16) },
          icon: { fontSize: rf(32) },
        };
      default:
        return {
          container: { padding: rp(20), minHeight: rh(110) },
          title: { fontSize: rf(16) },
          value: { fontSize: rf(24) },
          subtitle: { fontSize: rf(14) },
          icon: { fontSize: rf(28) },
        };
    }
  };

  const sizeStyles = getSizeStyles();

  const cardStyle = [
    styles.card,
    sizeStyles.container,
    { backgroundColor: getBackgroundColor() },
  ];

  const CardContent = () => (
    <View style={cardStyle}>
      {/* Header with title and icon */}
      <View style={styles.header}>
        <Text style={[styles.title, sizeStyles.title]}>{title}</Text>

        {icon && <Text style={[styles.icon, sizeStyles.icon]}>{icon}</Text>}
      </View>

      {/* Main value */}
      <Text style={[styles.value, sizeStyles.value]}>
        {typeof value === "number" && value % 1 !== 0
          ? value.toFixed(1)
          : value}
      </Text>

      {/* Subtitle and trend */}
      <View style={styles.footer}>
        {subtitle && (
          <Text style={[styles.subtitle, sizeStyles.subtitle]}>{subtitle}</Text>
        )}

        {trend && trendValue && (
          <View style={styles.trendContainer}>
            <Ionicons name={getTrendIcon()} size={rf(14)} color="#fff" />
            <Text style={[styles.trendValue, sizeStyles.subtitle]}>
              {trendValue}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        scaleValue={0.97}
        hapticType="light"
        style={styles.pressable}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        <CardContent />
      </AnimatedPressable>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: rbr(12),
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 3,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: rp(12),
  },
  title: {
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  icon: {
    color: "#fff",
  },
  value: {
    color: "#fff",
    fontWeight: "bold",
    marginBottom: rp(4),
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: rp(4),
  },
  trendValue: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  pressable: {
    opacity: 1,
  },
});

export default AnalyticsCard;
