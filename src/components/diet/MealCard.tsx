import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Card } from "../ui";
import { flatColors as colors, spacing, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { rf, rp, rbr } from "../../utils/responsive";
import { DayMeal } from "../../types/ai";

interface MealCardProps {
  meal: DayMeal;
  onViewDetails?: (meal: DayMeal) => void;
  onStartMeal?: (meal: DayMeal) => void;
  progress?: number;
  style?: StyleProp<ViewStyle>;
}

// PERF-010 FIX: Wrap component in React.memo to prevent unnecessary re-renders in FlatList
export const MealCard: React.FC<MealCardProps> = memo(
  ({ meal, onViewDetails, onStartMeal, progress = 0, style }) => {
    const getMealTypeIcon = (type: string) => {
      switch (type) {
        case "breakfast":
          return "🌅";
        case "lunch":
          return "☀️";
        case "dinner":
          return "🌙";
        case "snack":
          return "🍎";
        default:
          return "🍽️";
      }
    };

    const getDifficultyColor = (difficulty: string) => {
      switch (difficulty) {
        case "easy":
          return colors.success;
        case "medium":
          return colors.warning;
        case "hard":
          return colors.error;
        default:
          return colors.textSecondary;
      }
    };

    const getMealTypeColor = (type: string) => {
      switch (type) {
        case "breakfast":
          return colors.warning;
        case "lunch":
          return colors.success;
        case "dinner":
          return colors.info;
        case "snack":
          return colors.error;
        default:
          return colors.primary;
      }
    };

    const isCompleted = progress >= 100;
    const isInProgress = progress > 0 && progress < 100;

    return (
      <Card style={StyleSheet.flatten([styles.card, style])} variant="elevated">
        {/* Progress Bar */}
        {progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        )}

        <View style={styles.cardContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <View style={styles.titleRow}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: getMealTypeColor(meal.type) + "15" },
                  ]}
                >
                  <Text style={styles.mealTypeIcon}>
                    {getMealTypeIcon(meal.type)}
                  </Text>
                </View>
                <View style={styles.titleContainer}>
                  <Text style={styles.title} numberOfLines={2}>
                    {meal.name}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.mealTypeBadge}>
                      <Text
                        style={[
                          styles.mealTypeText,
                          { color: getMealTypeColor(meal.type) },
                        ]}
                      >
                        {meal.type.toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.difficultyBadge,
                        {
                          backgroundColor: getDifficultyColor(meal.difficulty),
                        },
                      ]}
                    >
                      <Text style={styles.difficultyText}>
                        {meal.difficulty.toUpperCase()}
                      </Text>
                    </View>
                    {meal.aiGenerated && (
                      <View style={styles.aiPillBadge}>
                        <Text style={styles.aiPillText}>✨ AI</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <Text style={styles.description} numberOfLines={3}>
                {meal.description}
              </Text>
            </View>
          </View>

          {/* Nutrition Stats */}
          <View style={styles.nutritionSection}>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{meal.totalCalories}</Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(meal.totalMacros.protein)}g
                </Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(meal.totalMacros.carbohydrates)}g
                </Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>
                  {Math.round(meal.totalMacros.fat)}g
                </Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            </View>
          </View>

          {/* Meal Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>⏱️</Text>
              <Text style={styles.detailText}>{meal.preparationTime} min</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>🥘</Text>
              <Text style={styles.detailText}>
                {meal.items?.length ?? 0} ingredients
              </Text>
            </View>
          </View>

          {/* Progress Bar (if meal is in progress) */}
          {isInProgress && (
            <View style={styles.progressSection}>
              <View style={styles.mealProgressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progress)}% complete
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            {onStartMeal && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.primaryButton,
                  isCompleted && styles.completedButton,
                ]}
                onPress={() => {
                  if (isCompleted) {
                    return;
                  }
                  if (onStartMeal) {
                    onStartMeal(meal);
                  } else {
                    console.error(
                      "❌ MealCard: onStartMeal function not provided",
                    );
                  }
                }}
                activeOpacity={isCompleted ? 1.0 : 0.8}
                disabled={isCompleted}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    styles.primaryButtonText,
                    isCompleted && styles.completedButtonText,
                  ]}
                >
                  {isCompleted
                    ? "✅ Completed"
                    : isInProgress
                      ? "Continue"
                      : "Start Meal"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Completed Status Banner */}
          {isCompleted && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedBannerText}>
                🎉 Meal completed! Great job!
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.lg,
    overflow: "hidden",
    borderRadius: rbr(16),
    backgroundColor: colors.surface,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    elevation: 8,
  },

  progressContainer: {
    height: rp(4),
    backgroundColor: colors.border,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },

  progressBar: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: rbr(2),
  },

  cardContent: {
    padding: spacing.xl,
  },

  header: {
    marginBottom: spacing.lg,
  },

  titleSection: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },

  iconContainer: {
    width: rp(48),
    height: rp(48),
    borderRadius: rbr(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },

  mealTypeIcon: {
    fontSize: rf(24),
  },

  titleContainer: {
    flex: 1,
  },

  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    lineHeight: rf(28),
    marginBottom: spacing.xs,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },

  mealTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: rbr(6),
  },

  mealTypeText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
  },

  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: rbr(6),
  },

  difficultyText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.surface,
  },

  aiPillBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary + "20",
    borderRadius: rbr(12),
  },

  aiPillText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.primary,
  },

  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: rf(20),
  },

  nutritionSection: {
    marginBottom: spacing.lg,
  },

  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: rbr(12),
    padding: spacing.md,
  },

  nutritionItem: {
    alignItems: "center",
  },

  nutritionValue: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    color: colors.text,
  },

  nutritionLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  detailsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing.lg,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  detailIcon: {
    fontSize: rf(16),
    marginRight: spacing.sm,
  },

  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: "500",
  },

  progressSection: {
    marginBottom: spacing.md,
  },

  mealProgressBar: {
    height: rp(6),
    backgroundColor: colors.backgroundSecondary,
    borderRadius: rbr(3),
    marginBottom: spacing.xs,
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: rbr(3),
  },

  progressText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: "center",
  },

  actionSection: {
    marginTop: spacing.md,
  },

  actionButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: rbr(12),
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButton: {
    backgroundColor: colors.primary,
  },

  completedButton: {
    backgroundColor: colors.success,
  },

  actionButtonText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },

  primaryButtonText: {
    color: colors.surface,
  },

  completedButtonText: {
    color: colors.surface,
  },

  completedBanner: {
    backgroundColor: colors.success + "15",
    borderRadius: rbr(8),
    padding: spacing.sm,
    marginTop: spacing.md,
    alignItems: "center",
  },

  completedBannerText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: "600",
  },
});
