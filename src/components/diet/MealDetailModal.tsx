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
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rw, rp, rbr } from "../../utils/responsive";
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
                    color={ResponsiveTheme.colors.primary}
                  />
                  <Text style={styles.typeChipText}>{mealTypeLabel}</Text>
                </View>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons
                  name="close"
                  size={rf(22)}
                  color={ResponsiveTheme.colors.textSecondary}
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
                      color={ResponsiveTheme.colors.textSecondary}
                    />
                    <Text style={styles.metaText}>{meal.timing}</Text>
                  </View>
                ) : null}
                {meal.difficulty ? (
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="speedometer-outline"
                      size={rf(14)}
                      color={ResponsiveTheme.colors.textSecondary}
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
                      color={ResponsiveTheme.colors.textSecondary}
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
                    style={[styles.macroDot, { backgroundColor: ResponsiveTheme.colors.info }]}
                  />
                  <Text style={styles.macroValue}>{Math.round(protein)}g</Text>
                  <Text style={styles.macroLabel}>Protein</Text>
                </View>
                <View style={styles.macroCard}>
                  <View
                    style={[styles.macroDot, { backgroundColor: ResponsiveTheme.colors.warningAlt }]}
                  />
                  <Text style={styles.macroValue}>{Math.round(carbs)}g</Text>
                  <Text style={styles.macroLabel}>Carbs</Text>
                </View>
                <View style={styles.macroCard}>
                  <View
                    style={[styles.macroDot, { backgroundColor: ResponsiveTheme.colors.amber }]}
                  />
                  <Text style={styles.macroValue}>{Math.round(fat)}g</Text>
                  <Text style={styles.macroLabel}>Fat</Text>
                </View>
                {fiber > 0 ? (
                  <View style={styles.macroCard}>
                    <View
                      style={[styles.macroDot, { backgroundColor: ResponsiveTheme.colors.successLight }]}
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
                    color={ResponsiveTheme.colors.white}
                  />
                  <Text style={styles.completeButtonText}>Mark Complete</Text>
                </Pressable>
              ) : (
                <View style={styles.completedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={rf(20)}
                    color={ResponsiveTheme.colors.primary}
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
                <Ionicons name="trash-outline" size={rf(18)} color={ResponsiveTheme.colors.errorAlt} />
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
    backgroundColor: ResponsiveTheme.colors.overlay,
    justifyContent: "flex-end",
  },
  container: {
    maxHeight: "85%",
    marginHorizontal: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingTop: ResponsiveTheme.spacing.lg,
    paddingBottom: ResponsiveTheme.spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
    backgroundColor: `${ResponsiveTheme.colors.primary}20`,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderRadius: ResponsiveTheme.borderRadius.sm,
  },
  typeChipText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  closeButton: {
    padding: ResponsiveTheme.spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: ResponsiveTheme.spacing.lg,
  },
  mealName: {
    fontSize: ResponsiveTheme.fontSize.xl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  description: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: ResponsiveTheme.spacing.md,
    lineHeight: rf(20),
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.md,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.xs,
  },
  metaText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
  },
  calorieSection: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: ResponsiveTheme.spacing.xs,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  calorieValue: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
  calorieLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
  macrosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ResponsiveTheme.spacing.sm,
    marginBottom: ResponsiveTheme.spacing.lg,
  },
  macroCard: {
    flex: 1,
    minWidth: rw(70),
    alignItems: "center",
    padding: ResponsiveTheme.spacing.sm,
    borderRadius: ResponsiveTheme.borderRadius.md,
    backgroundColor: `${ResponsiveTheme.colors.border}40`,
  },
  macroDot: {
    width: rp(8),
    height: rp(8),
    borderRadius: rbr(4),
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  macroValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  macroLabel: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginTop: rp(2),
  },
  foodItemsSection: {
    marginBottom: ResponsiveTheme.spacing.md,
  },
  sectionLabel: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.sm,
  },
  foodItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ResponsiveTheme.colors.border,
  },
  foodItemName: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.text,
    flex: 1,
  },
  foodItemCal: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: ResponsiveTheme.spacing.sm,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ResponsiveTheme.colors.border,
  },
  completeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.xs,
    backgroundColor: ResponsiveTheme.colors.primary,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
  },
  completeButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
  completedBadge: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.xs,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.primary,
  },
  completedBadgeText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    color: ResponsiveTheme.colors.primary,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: ResponsiveTheme.spacing.xs,
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    borderRadius: ResponsiveTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: `${ResponsiveTheme.colors.errorAlt}40`,
  },
  deleteButtonText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    fontWeight: "600",
    color: ResponsiveTheme.colors.errorAlt,
  },
});
