import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  typography,
  spacing,
  borderRadius,
} from "../../../theme/aurora-tokens";
import { rf, rw, rp } from "../../../utils/responsive";
import { DayMeal } from "../../../types/ai";

interface MealHeaderProps {
  meal: DayMeal;
  mealTime: string;
  mealConfig: { colors: readonly [string, string, ...string[]]; icon: string };
}

export const MealHeader: React.FC<MealHeaderProps> = ({
  meal,
  mealTime,
  mealConfig,
}) => {
  return (
    <View style={styles.headerRow}>
      {/* Meal Type Icon Container */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${mealConfig.colors[0]}20` },
        ]}
      >
        <Ionicons
          name={mealConfig.icon as any}
          size={rf(24)}
          color={mealConfig.colors[0]}
        />
      </View>

      {/* Meal Name & Type */}
      <View style={styles.titleContainer}>
        <Text style={styles.mealName} numberOfLines={2}>
          {meal.name}
        </Text>
        <View style={styles.typeRow}>
          <Text style={[styles.mealType, { color: mealConfig.colors[1] }]}>
            {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
          </Text>
          {meal.isPersonalized && (
            <View style={[styles.aiBadge, styles.personalizedBadge]}>
              <Text style={styles.personalizedBadgeText}>🎯 For You</Text>
            </View>
          )}
          {meal.aiGenerated && (
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>✨ AI</Text>
            </View>
          )}
        </View>
        {/* Description if exists */}
        {meal.description && meal.description.trim() !== "" && (
          <Text style={styles.mealDescription} numberOfLines={2}>
            {meal.description}
          </Text>
        )}
      </View>

      {/* Time Badge */}
      <View style={styles.timeBadge}>
        <Text style={styles.timeText}>{mealTime}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: rw(48),
    height: rw(48),
    borderRadius: borderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  mealName: {
    fontSize: typography.fontSize.h3,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    lineHeight: typography.fontSize.h3 * 1.3,
    marginBottom: spacing.xs,
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  mealType: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealDescription: {
    fontSize: typography.fontSize.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: typography.fontSize.caption * 1.4,
  },
  aiBadge: {
    backgroundColor: `${colors.primary[500]}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: rp(2),
    borderRadius: borderRadius.full,
  },
  aiBadgeText: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[500],
  },
  personalizedBadge: {
    backgroundColor: `${colors.success.DEFAULT}20`,
  },
  personalizedBadgeText: {
    fontSize: typography.fontSize.micro,
    fontWeight: typography.fontWeight.semibold,
    color: colors.success.DEFAULT,
  },
  timeBadge: {
    backgroundColor: colors.glass.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
    marginLeft: spacing.xs,
  },
  timeText: {
    fontSize: typography.fontSize.caption,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
});
