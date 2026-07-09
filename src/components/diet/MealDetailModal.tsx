import React, { type ComponentProps } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { flatColors as colors, spacing, borderRadius, flatFontSize as fontSize } from "../../theme/aurora-tokens";
import { rf, rw, rp, rbr, rh } from "../../utils/responsive";
import { DayMeal } from "../../types/ai";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
interface MealDetailModalProps {
  visible: boolean;
  meal: DayMeal | null;
  onClose: () => void;
  onMarkComplete: (meal: DayMeal) => void;
  onDelete: (meal: DayMeal) => void;
  isCompleted?: boolean;
}

export const MealDetailModal: React.FC<MealDetailModalProps> = ({
  visible,
  meal,
  onClose,
  onMarkComplete,
  onDelete,
  isCompleted = false,
}) => {
  const protein = meal?.totalMacros?.protein ?? meal?.totalProtein ?? 0;
  const carbs = meal?.totalMacros?.carbohydrates ?? meal?.totalCarbs ?? 0;
  const fat = meal?.totalMacros?.fat ?? meal?.totalFat ?? 0;
  const fiber = meal?.totalMacros?.fiber ?? 0;

  const mealTypeLabel = meal ? meal.type.charAt(0).toUpperCase() + meal.type.slice(1) : "";

  const mealTypeIcons: Record<string, string> = {
    breakfast: "sunny",
    lunch: "restaurant",
    dinner: "moon",
    snack: "nutrition",
  };
  const iconName = meal ? (mealTypeIcons[meal.type] || "restaurant") : "restaurant";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {!meal ? (
        <View style={styles.overlay}>
          <Pressable style={{ flex: 1 }} onPress={onClose} />
        </View>
      ) : (
        <View style={styles.overlay}>
        <View style={styles.container}>
          <GlassCard
            elevation={3}
            blurIntensity="medium"
            padding="none"
            borderRadius="xl"
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.typeChip}>
                  <Ionicons
                    name={iconName as ComponentProps<typeof Ionicons>['name']}
                    size={rf(14)}
                    color={colors.primary}
                  />
                  <Text style={styles.typeChipText}>{mealTypeLabel}</Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons
                  name="close"
                  size={rf(22)}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Meal Name */}
              <Text style={styles.mealName}>{meal.name}</Text>

              {meal.description ? (
                <Text style={styles.description}>{meal.description}</Text>
              ) : null}

              {/* Time & Difficulty */}
              <View style={styles.metaRow}>
                {meal.timing ? (
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="time-outline"
                      size={rf(14)}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.metaText}>{meal.timing}</Text>
                  </View>
                ) : null}
                {meal.difficulty ? (
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="speedometer-outline"
                      size={rf(14)}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.metaText}>
                      {meal.difficulty.charAt(0).toUpperCase() +
                        meal.difficulty.slice(1)}
                    </Text>
                  </View>
                ) : null}
                {meal.preparationTime || meal.prepTime ? (
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="hourglass-outline"
                      size={rf(14)}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.metaText}>
                      {meal.preparationTime || meal.prepTime} min prep
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Calories */}
              <View style={styles.calorieSection}>
                <Text style={styles.calorieValue}>
                  {Math.round(meal.totalCalories)}
                </Text>
                <Text style={styles.calorieLabel}>calories</Text>
              </View>

              {/* Macros */}
              <View style={styles.macrosGrid}>
                <View style={styles.macroCard}>
                  <View
                    style={[styles.macroDot, { backgroundColor: colors.info }]}
                  />
                  <Text style={styles.macroValue}>{Math.round(protein)}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroCard}>
                  <View
                    style={[styles.macroDot, { backgroundColor: colors.warningAlt }]}
                  />
                  <Text style={styles.macroValue}>{Math.round(carbs)}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroCard}>
                  <View
                    style={[styles.macroDot, { backgroundColor: colors.amber }]}
                  />
                  <Text style={styles.macroValue}>{Math.round(fat)}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
                {fiber > 0 ? (
                  <View style={styles.macroCard}>
                    <View
                      style={[styles.macroDot, { backgroundColor: colors.successLight }]}
                    />
                    <Text style={styles.macroValue}>{Math.round(fiber)}g</Text>
                    <Text style={styles.macroLabel}>Fiber</Text>
                  </View>
                ) : null}
              </View>

              {/* Food Items */}
              {meal.items?.length || meal.foods?.length ? (
                <View style={styles.foodItemsSection}>
                  <Text style={styles.sectionLabel}>Ingredients</Text>
                  {(meal.items || meal.foods || []).map((item, index) => (
                    <View key={index} style={styles.foodItemRow}>
                      <Text style={styles.foodItemName}>{item.name}</Text>
                      {item.calories ? (
                        <Text style={styles.foodItemCal}>
                          {Math.round(item.calories)} cal
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>

            {/* Actions */}
            <View style={styles.actions}>
              {!isCompleted ? (
                <Pressable
                  style={styles.completeButton}
                  onPress={() => onMarkComplete(meal)}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={rf(20)}
                    color={colors.white}
                  />
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </Pressable>
              ) : (
                <View style={styles.completedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={rf(20)}
                    color={colors.primary}
                  />
                  <Text style={styles.completedBadgeText}>Completed</Text>
                </View>
              )}
              <Pressable
                style={styles.deleteButton}
                onPress={() => {
                  crossPlatformAlert(
                    "Delete Meal",
                    `Are you sure you want to delete "${meal.name}"?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Delete", style: "destructive", onPress: () => onDelete(meal) },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={rf(18)} color={colors.errorAlt} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  container: {
    maxHeight: rh(724),
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  typeChipText: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    color: colors.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
  },
  mealName: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: rf(20),
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  calorieSection: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  calorieValue: {
    fontSize: fontSize.xxl,
    fontWeight: "bold",
    color: colors.primary,
  },
  calorieLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  macrosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  macroCard: {
    flex: 1,
    minWidth: rw(70),
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: `${colors.border}40`,
  },
  macroDot: {
    width: rp(8),
    height: rp(8),
    borderRadius: rbr(4),
    marginBottom: spacing.xs,
  },
  macroValue: {
    fontSize: fontSize.md,
    fontWeight: "700",
    color: colors.text,
  },
  macroLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: rp(2),
  },
  foodItemsSection: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  foodItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  foodItemName: {
    fontSize: fontSize.sm,
    color: colors.text,
    flex: 1,
  },
  foodItemCal: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  completeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.white,
  },
  completedBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  completedBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.primary,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: `${colors.errorAlt}40`,
  },
  deleteButtonText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.errorAlt,
  },
});
