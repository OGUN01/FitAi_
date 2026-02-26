import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../utils/constants";
import { colors } from "../../theme/aurora-tokens";
import { rf, rw, rh, rbr } from "../../utils/responsive";

interface HealthScoreIndicatorProps {
  score: number;
  category: "excellent" | "good" | "moderate" | "poor" | "unhealthy";
  size?: "small" | "medium" | "large";
  showLabel?: boolean;
}

export const HealthScoreIndicator: React.FC<HealthScoreIndicatorProps> = ({
  score,
  category,
  size = "medium",
  showLabel = true,
}) => {
  const getColorForCategory = (category: string) => {
    switch (category) {
      case "excellent":
        return "#22c55e"; // Green
      case "good":
        return "#84cc16"; // Light green
      case "moderate":
        return "#eab308"; // Yellow
      case "poor":
        return "#f97316"; // Orange
      case "unhealthy":
        return "#ef4444"; // Red
      default:
        return "#6b7280"; // Gray
    }
  };

  const getIconForCategory = (category: string) => {
    switch (category) {
      case "excellent":
        return "🟢";
      case "good":
        return "🟡";
      case "moderate":
        return "🟠";
      case "poor":
        return "🔴";
      case "unhealthy":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const getSizeStyles = (size: string) => {
    switch (size) {
      case "small":
        return {
          container: { width: rw(60), height: rh(60) },
          scoreText: { fontSize: rf(14) },
          labelText: { fontSize: rf(10) },
        };
      case "large":
        return {
          container: { width: rw(100), height: rh(100) },
          scoreText: { fontSize: rf(24) },
          labelText: { fontSize: rf(14) },
        };
      default:
        return {
          container: { width: rw(80), height: rh(80) },
          scoreText: { fontSize: rf(18) },
          labelText: { fontSize: rf(12) },
        };
    }
  };

  const color = getColorForCategory(category);
  const icon = getIconForCategory(category);
  const sizeStyles = getSizeStyles(size);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.scoreCircle,
          sizeStyles.container,
          { borderColor: color },
        ]}
      >
        <Text style={[styles.scoreText, sizeStyles.scoreText, { color }]}>
          {score}
        </Text>
        <Text style={styles.scoreUnit}>%</Text>
      </View>

      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={styles.iconText}>{icon}</Text>
          <Text style={[styles.labelText, sizeStyles.labelText, { color }]}>
            {category.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },

  scoreCircle: {
    borderRadius: rbr(50),
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background.secondary,
  },

  scoreText: {
    fontWeight: ResponsiveTheme.fontWeight.bold as "700",
    lineHeight: rf(20),
  },

  scoreUnit: {
    fontSize: rf(8),
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: -2,
  },

  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: ResponsiveTheme.spacing.xs,
  },

  iconText: {
    fontSize: rf(12),
    marginRight: ResponsiveTheme.spacing.xs,
  },

  labelText: {
    fontWeight: ResponsiveTheme.fontWeight.semibold as "600",
    textAlign: "center",
  },
});

export default HealthScoreIndicator;
