/**
 * SectionHeader Component (analytics-local)
 * Standardized section header with icon, title, and optional action button.
 * Lives here (not src/screens/main/home/) because that's where the three
 * analytics call sites (MetricSummaryGrid, TrendCharts, AchievementShowcase)
 * actually are — the old "../home/SectionHeader" import pointed at a file
 * that doesn't exist in this repo.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AnimatedPressable } from "../../../components/ui/aurora/AnimatedPressable";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../../theme/aurora-tokens";
import { rf } from "../../../utils/responsive";

interface SectionHeaderProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  actionText?: string;
  onActionPress?: () => void;
  accessibilityLabel?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  iconColor = colors.primary,
  actionText,
  onActionPress,
  accessibilityLabel,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        {icon && (
          <Ionicons
            name={icon}
            size={rf(20)}
            color={iconColor}
            style={styles.icon}
          />
        )}
        <Text
          style={styles.title}
          accessibilityRole="header"
          accessibilityLabel={accessibilityLabel || title}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>
      {actionText && onActionPress && (
        <AnimatedPressable
          onPress={onActionPress}
          scaleValue={0.95}
          hapticFeedback={true}
          hapticType="light"
          accessibilityLabel={actionText}
          accessibilityRole="button"
          hitSlop={{ top: 10, bottom: 10, left: 12, right: 4 }}
        >
          <Text style={styles.actionText}>{actionText}</Text>
        </AnimatedPressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  icon: {
    marginRight: spacing.xs,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
});

export default SectionHeader;
