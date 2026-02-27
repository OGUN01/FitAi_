// Analytics Card Component
// Displays key metrics and insights in a beautiful card format

import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr, rh } from "../../utils/responsive";

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
    const colors = {
      blue: ResponsiveTheme.colors.primary,
      green: "#10B981",
      purple: "#FF8A5C",
      orange: "#F59E0B",
      red: "#EF4444",
      gray: "#6B7280",
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return "📈";
      case "down":
        return "📉";
      case "stable":
        return "➡️";
      default:
        return "";
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
            <Text style={styles.trendIcon}>{getTrendIcon()}</Text>
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
      <Pressable onPress={onPress} style={styles.pressable} accessibilityRole="button" accessibilityLabel={title}>
        <CardContent />
      </Pressable>
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
  },
  trendIcon: {
    fontSize: rf(14),
    marginRight: rp(4),
    color: "#fff",
  },
  trendValue: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  pressable: {
    opacity: 1,
  },
});

export default AnalyticsCard;
