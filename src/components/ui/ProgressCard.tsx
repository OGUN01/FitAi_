import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { rf, rp } from "../../utils/responsive";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { LargeProgressRing } from "./LargeProgressRing";

interface ProgressCardProps {
  title: string;
  value: number;
  maxValue?: number;
  description?: string;
  icon?: React.ReactNode;
  gradient?: string[];
  size?: number;
  strokeWidth?: number;
  showGlow?: boolean;
  style?: ViewStyle;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({
  title,
  value,
  maxValue = 100,
  description,
  icon,
  gradient = [colors.success, "#45A049"],
  size = 120,
  strokeWidth = 12,
  showGlow = true,
  style,
}) => {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={[
          colors.backgroundSecondary,
          colors.background,
        ]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Progress Ring */}
        <View style={styles.ringContainer}>
          <LargeProgressRing
            value={value}
            maxValue={maxValue}
            size={size}
            strokeWidth={strokeWidth}
            gradient={gradient}
            showGlow={showGlow}
            showValue={false}
          />
          {icon && <View style={styles.iconContainer}>{icon}</View>}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>

          <View style={styles.valueContainer}>
            <Text style={styles.value}>{Math.round(value)}</Text>
            <Text style={styles.maxValue}>/{maxValue}</Text>
          </View>

          {description && (
            <Text style={styles.description} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    boxShadow: '0px 4px 8px rgba(0,0,0,0.1)',
    elevation: 5,
  },

  gradient: {
    padding: spacing.lg,
    alignItems: "center",
  },

  ringContainer: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  iconContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  content: {
    alignItems: "center",
    width: "100%",
  },

  title: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.xs,
  },

  valueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: spacing.xs,
  },

  value: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },

  maxValue: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textSecondary,
    marginLeft: rp(2),
  },

  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: rf(18),
  },
});
