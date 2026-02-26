import React, { memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Card } from "../ui";
import { ResponsiveTheme } from "../../utils/constants";
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
          return ResponsiveTheme.colors.success;
        case "medium":
          return ResponsiveTheme.colors.warning;
        case "hard":
          return ResponsiveTheme.colors.error;
        default:
          return ResponsiveTheme.colors.textSecondary;
      }
    };

    const getMealTypeColor = (type: string) => {
      switch (type) {
        case "breakfast":
          return ResponsiveTheme.colors.warning;
        case "lunch":
          return ResponsiveTheme.colors.success;
        case "dinner":
          return ResponsiveTheme.colors.info;
        case "snack":
          return ResponsiveTheme.colors.error;
        default:
          return ResponsiveTheme.colors.primary;
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
    marginBottom: ResponsiveTheme.spacing.lg,
    overflow: "hidden",
    borderRadius: rbr(16),
    backgroundColor: ResponsiveTheme.colors.surface,
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  progressContainer: {
    height: rp(4),
    backgroundColor: ResponsiveTheme.colors.border,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },

  progressBar: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.primary,
    borderRadius: rbr(2),
  },

  cardContent: {
    padding: ResponsiveTheme.spacing.xl,
  },

  header: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  titleSection: {
    flex: 1,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: ResponsiveTheme.spacing.md,
  },

  iconContainer: {
    width: rp(48),
    height: rp(48),
    borderRadius: rbr(12),
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.md,
  },

  mealTypeIcon: {
    fontSize: rf(24),
  },

  titleContainer: {
    flex: 1,
  },

  title: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    lineHeight: rf(28),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  mealTypeBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: rbr(6),
  },

  mealTypeText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600",
  },

  difficultyBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: rbr(6),
  },

  difficultyText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600",
    color: ResponsiveTheme.colors.surface,
  },

  aiPillBadge: {
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    backgroundColor: ResponsiveTheme.colors.primary + "20",
    borderRadius: rbr(12),
  },

  aiPillText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },

  description: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    lineHeight: rf(20),
  },

  nutritionSection: {
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  nutritionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: ResponsiveTheme.colors.background,
    borderRadius: rbr(12),
    padding: ResponsiveTheme.spacing.md,
  },

  nutritionItem: {
    alignItems: "center",
  },

  nutritionValue: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },

  nutritionLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: ResponsiveTheme.spacing.xs,
  },

  detailsSection: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: ResponsiveTheme.spacing.lg,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  detailIcon: {
    fontSize: rf(16),
    marginRight: ResponsiveTheme.spacing.sm,
  },

  detailText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    fontWeight: "500",
  },

  progressSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },

  mealProgressBar: {
    height: rp(6),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    borderRadius: rbr(3),
    marginBottom: ResponsiveTheme.spacing.xs,
  },

  progressFill: {
    height: "100%",
    backgroundColor: ResponsiveTheme.colors.success,
    borderRadius: rbr(3),
  },

  progressText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    textAlign: "center",
  },

  actionSection: {
    marginTop: ResponsiveTheme.spacing.md,
  },

  actionButton: {
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: rbr(12),
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  completedButton: {
    backgroundColor: ResponsiveTheme.colors.success,
  },

  actionButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
  },

  primaryButtonText: {
    color: ResponsiveTheme.colors.surface,
  },

  completedButtonText: {
    color: ResponsiveTheme.colors.surface,
  },

  completedBanner: {
    backgroundColor: ResponsiveTheme.colors.success + "15",
    borderRadius: rbr(8),
    padding: ResponsiveTheme.spacing.sm,
    marginTop: ResponsiveTheme.spacing.md,
    alignItems: "center",
  },

  completedBannerText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.success,
    fontWeight: "600",
  },
});
