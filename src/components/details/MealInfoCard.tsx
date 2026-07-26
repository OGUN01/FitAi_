import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "../ui";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize, typography } from '../../theme/aurora-tokens';
import { rf, rw } from '../../utils/responsive';
import { hexToRgba, TINT_ALPHA_SOFT, TINT_ALPHA_MEDIUM } from '../../utils/colors';
import { MealData } from "../../hooks/useMealDetailLogic";

interface MealInfoCardProps {
  meal: MealData;
  mealIcon: string;
  formattedDate: string;
}

// Map emoji meal icons (from useMealDetailLogic.getMealIcon) to Ionicon names.
// The hook is shared across screens, so it keeps its emoji contract; the UI
// layer translates to a vector icon per the no-emoji rule.
const EMOJI_TO_IONICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  '🌅': 'sunny-outline',
  '☀️': 'sunny-outline',
  '🌙': 'moon-outline',
  '🍎': 'nutrition-outline',
  '🍽️': 'restaurant-outline',
};

const resolveMealIcon = (emoji: string): keyof typeof Ionicons.glyphMap =>
  EMOJI_TO_IONICON[emoji] ?? 'restaurant-outline';

export const MealInfoCard: React.FC<MealInfoCardProps> = ({
  meal,
  mealIcon,
  formattedDate,
}) => {
  return (
    <Card style={styles.mealCard} variant="elevated">
      <View style={styles.mealHeader}>
        <View style={styles.mealInfo}>
          <View style={styles.mealTitleRow}>
            <Ionicons
              name={resolveMealIcon(mealIcon)}
              size={rf(22)}
              color={colors.primary}
              style={styles.mealIcon}
            />
            <Text
              style={styles.mealName}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {meal.name}
            </Text>
            {meal.isCompleted && (
              <Ionicons
                name="checkmark-circle"
                size={rf(18)}
                color={colors.success}
                style={styles.completedBadge}
              />
            )}
          </View>
          <Text style={styles.mealTime} numberOfLines={1}>
            {meal.time ? `${meal.time} • ` : ""}
            {formattedDate}
          </Text>
        </View>

        <View style={styles.caloriesContainer}>
          <Text
            style={styles.caloriesValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {meal.totalCalories}
          </Text>
          <Text style={styles.caloriesLabel}>calories</Text>
        </View>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.statItem} accessibilityRole="summary">
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {meal.totalProtein}g
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>Protein</Text>
        </View>
        <View style={styles.statItem} accessibilityRole="summary">
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {meal.totalCarbs}g
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>Carbs</Text>
        </View>
        <View style={styles.statItem} accessibilityRole="summary">
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {meal.totalFat}g
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>Fat</Text>
        </View>
        <View style={styles.statItem} accessibilityRole="summary">
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {meal.foods.length}
          </Text>
          <Text style={styles.statLabel} numberOfLines={1}>Items</Text>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  mealCard: {
    marginVertical: spacing.md,
  },

  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },

  mealInfo: {
    flex: 1,
    minWidth: 0,
  },

  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginBottom: spacing.xs,
  },

  mealIcon: {
    marginRight: spacing.sm,
  },

  mealName: {
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
  },

  completedBadge: {
    marginLeft: spacing.sm,
  },

  mealTime: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },

  caloriesContainer: {
    flexShrink: 0,
    marginLeft: spacing.sm,
    alignItems: "center" as const,
    backgroundColor: hexToRgba(colors.primary, TINT_ALPHA_SOFT),
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: Math.max(rw(1), 1),
    borderColor: hexToRgba(colors.primary, TINT_ALPHA_MEDIUM),
    minWidth: rf(72),
  },

  caloriesValue: {
    fontSize: fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },

  caloriesLabel: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginTop: spacing.xs / 2,
  },

  quickStats: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    paddingTop: spacing.md,
    borderTopWidth: Math.max(rw(1), 1),
    borderTopColor: colors.border,
  },

  statItem: {
    flex: 1,
    alignItems: "center" as const,
    paddingHorizontal: spacing.xs / 2,
  },

  statValue: {
    fontSize: fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },

  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
  },
});
