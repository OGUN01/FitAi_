import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { flatColors as colors, spacing, flatFontSize as fontSize, typography } from "../../theme/aurora-tokens";
import { rf, rp, rw, rbr, rh } from "../../utils/responsive";
import { DayMeal } from "../../types/ai";
import { completionTrackingService } from "../../services/completionTracking";
import { mealMotivationService } from "../../features/nutrition/MealMotivation";
import { crossPlatformAlert } from "../../utils/crossPlatformAlert";

interface IngredientDetailModalProps {
  visible: boolean;
  onClose: () => void;
  ingredientName: string;
  meal: DayMeal;
  onMealComplete?: (mealId: string) => void;
  mealProgress?: number;
}

export const IngredientDetailModal: React.FC<IngredientDetailModalProps> = ({
  visible,
  onClose,
  ingredientName,
  meal,
  onMealComplete,
  mealProgress = 0,
}) => {
  const [isCompleting, setIsCompleting] = useState(false);
  const isCompleted = mealProgress >= 100;

  // Find the ingredient in the meal's items array
  const ingredientData = meal.items?.find(
    (item) =>
      item.name?.toLowerCase().includes(ingredientName.toLowerCase()) ||
      ingredientName.toLowerCase().includes(item.name?.toLowerCase() || ""),
  );

  const performMarkComplete = async () => {
    try {
      setIsCompleting(true);

      // Use the completion tracking service to mark meal as complete
      const success = await completionTrackingService.completeMeal(meal.id, {
        completedAt: new Date().toISOString(),
        source: "ingredient_detail_modal",
        quickComplete: true,
      });

      if (success) {
        // Generate dynamic completion message
        const completionMessage = mealMotivationService.getCompletionMessage(
          meal,
          {},
        );

        crossPlatformAlert("Meal Completed!", completionMessage, [
          {
            text: "Awesome!",
            onPress: () => {

              // Call the completion callback
              if (onMealComplete) {
                onMealComplete(meal.id);
              }

              // Close the modal
              onClose();
            },
          },
        ]);

      } else {
        throw new Error("Failed to complete meal");
      }
    } catch (error) {
      console.error("Failed to complete meal from ingredient modal:", error);
      crossPlatformAlert(
        "Error",
        "Failed to mark meal as completed. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setIsCompleting(false);
    }
  };

  // This action completes the WHOLE meal, not just the tapped ingredient —
  // confirm before firing it, matching the confirm-before-destructive-action
  // pattern used elsewhere in Diet (e.g. CookingSessionScreen's exit alert).
  const handleMarkComplete = () => {
    if (isCompleted || isCompleting) {
      return;
    }

    crossPlatformAlert(
      "Mark Meal Complete?",
      `This marks the entire "${meal.name}" meal as complete, not just ${ingredientData?.name || ingredientName}.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark Complete", onPress: () => performMarkComplete() },
      ],
    );
  };

  if (!ingredientData) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.errorText}>
              Ingredient information not available for "{ingredientName}"
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  // Percentage of calories each macro contributes — guarded against
  // divide-by-zero so a 0-calorie ingredient renders nothing instead of
  // NaN/Infinity. Defined after the !ingredientData early return so the
  // closure captures a narrowed (non-null) ingredientData.
  const macroPercent = (grams: number, kcalPerGram: number) => {
    const cals = ingredientData.calories;
    if (!cals || !Number.isFinite(cals) || cals <= 0) return undefined;
    return ((grams * kcalPerGram) / cals) * 100;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ingredient Details</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Completion Status Banner */}
        {isCompleted && (
          <View style={styles.completionBanner}>
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.success}
            />
            <Text style={styles.completionBannerText}>
              This meal has been completed!
            </Text>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Ingredient Header */}
          <View style={styles.ingredientHeader}>
            <View style={styles.ingredientIcon}>
              <Ionicons name="restaurant" size={rf(36)} color={colors.primary} />
            </View>
            <View style={styles.ingredientInfo}>
              <Text style={styles.ingredientName}>{ingredientData.name}</Text>
              <Text style={styles.ingredientCategory}>
                AI-Generated Ingredient
              </Text>
              <Text style={styles.quantityText}>
                {ingredientData.quantity}
                {ingredientData.unit || "g"} in this meal
              </Text>
            </View>
          </View>

          {/* Main Nutrition Facts */}
          <View style={styles.nutritionCard}>
            <Text style={styles.sectionTitle}>Nutrition Facts</Text>

            {/* Calories - Featured */}
            <View style={styles.calorieSection}>
              <Text style={styles.calorieLabel}>Calories</Text>
              <Text style={styles.calorieValue}>
                {Math.round(ingredientData.calories)}
              </Text>
            </View>

            <View style={styles.divider} />

            {/* Macronutrients */}
            <View style={styles.macroSection}>
              <NutritionRow
                label="Protein"
                value={ingredientData.macros?.protein || 0}
                unit="g"
                color="#4ECDC4"
                percentage={macroPercent(ingredientData.macros?.protein || 0, 4)}
              />
              <NutritionRow
                label="Carbohydrates"
                value={ingredientData.macros?.carbohydrates || 0}
                unit="g"
                color="#45B7D1"
                percentage={macroPercent(ingredientData.macros?.carbohydrates || 0, 4)}
              />
              <NutritionRow
                label="Fat"
                value={ingredientData.macros?.fat || 0}
                unit="g"
                color="#96CEB4"
                percentage={macroPercent(ingredientData.macros?.fat || 0, 9)}
              />
              <NutritionRow
                label="Fiber"
                value={ingredientData.macros?.fiber || 0}
                unit="g"
                color="#FF8A5C"
              />
            </View>
          </View>

          {/* Meal Context */}
          <View style={styles.contextCard}>
            <Text style={styles.sectionTitle}>In This Meal</Text>
            <View style={styles.contextInfo}>
              <View style={styles.iconTextRow}>
                <Ionicons name="restaurant-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.contextText}>Part of: {meal.name}</Text>
              </View>
              <View style={styles.iconTextRow}>
                <Ionicons name="stats-chart-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.contextText}>
                  Contributes{" "}
                  {meal.totalCalories > 0
                    ? Math.round(
                        (ingredientData.calories / meal.totalCalories) * 100,
                      )
                    : 0}
                  % of total calories
                </Text>
              </View>
              <View style={styles.iconTextRow}>
                <Ionicons name="barbell-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.contextText}>
                  Provides {Math.round(ingredientData.macros?.protein || 0)}g
                  of the meal's {Math.round(meal.totalMacros?.protein || 0)}g
                  protein
                </Text>
              </View>
            </View>
          </View>

          {/* Quantity Information */}
          <View style={styles.quantityCard}>
            <Text style={styles.sectionTitle}>Serving Details</Text>
            <View style={styles.quantityInfo}>
              <View style={styles.iconTextRow}>
                <Ionicons name="resize-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.quantityText}>
                  Quantity: {ingredientData.quantity}{" "}
                  {ingredientData.unit || "grams"}
                </Text>
              </View>
              <View style={styles.iconTextRow}>
                <Ionicons name="scale-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.quantityText}>
                  Calories per 100g:{" "}
                  {(() => {
                    const qty = Number(ingredientData.quantity);
                    const calsPerUnit = qty > 0 ? (ingredientData.calories / qty) * 100 : null;
                    return calsPerUnit != null ? Math.round(calsPerUnit * 100) / 100 : '—';
                  })()}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, styles.previousButton]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={24} color="#6B7280" />
              <Text style={[styles.navButtonText, styles.previousButtonText]}>
                Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navButton,
                styles.completeButton,
                isCompleted && styles.completedButton,
                isCompleting && styles.loadingButton,
              ]}
              onPress={handleMarkComplete}
              disabled={isCompleted || isCompleting}
              activeOpacity={isCompleted ? 1.0 : 0.8}
              accessibilityRole="button"
              accessibilityLabel="Mark meal complete"
              accessibilityState={{
                disabled: isCompleted || isCompleting,
                busy: isCompleting,
              }}
            >
              {isCompleting ? (
                <>
                  <ActivityIndicator size="small" color={colors.white} />
                  <Text
                    style={[styles.navButtonText, styles.completeButtonText]}
                  >
                    Completing...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name={
                      isCompleted
                        ? "checkmark-circle"
                        : "checkmark-circle-outline"
                    }
                    size={24}
                    color={colors.white}
                  />
                  <Text
                    style={[styles.navButtonText, styles.completeButtonText]}
                  >
                    {isCompleted ? "Completed" : "Mark Complete"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

// Helper Components
const NutritionRow: React.FC<{
  label: string;
  value: number;
  unit: string;
  color: string;
  percentage?: number;
}> = ({ label, value, unit, color, percentage }) => (
  <View style={styles.nutritionRow}>
    <Text style={styles.nutritionLabel}>{label}</Text>
    <View style={styles.nutritionValueContainer}>
      <Text style={[styles.nutritionValue, { color }]}>
        {Math.round(value * 10) / 10}
        {unit}
      </Text>
      {percentage && percentage > 0 && (
        <View style={styles.percentageContainer}>
          <View
            style={[styles.percentageBar, { backgroundColor: color + "20" }]}
          >
            <View
              style={[
                styles.percentageFill,
                {
                  backgroundColor: color,
                  width: `${Math.min(percentage, 100)}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.percentageText}>{Math.round(percentage)}%</Text>
        </View>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: rbr(16),
    padding: spacing.lg,
    // Constrain to the phone-width column (rw clamps at 480 on web/tablet).
    // rp(40) reserves horizontal margin so the modal never touches the edges.
    width: rw(393) - rp(40),
    maxWidth: "92%",
    maxHeight: rh(682),
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  ingredientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  ingredientIcon: {
    width: rp(80),
    height: rp(80),
    borderRadius: rbr(20),
    backgroundColor: colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.lg,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: fontSize.xxl,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ingredientCategory: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: String(typography.fontWeight.semibold) as any,
    marginBottom: spacing.xs,
  },
  quantityText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  nutritionCard: {
    backgroundColor: colors.surface,
    borderRadius: rbr(16),
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
    marginBottom: spacing.md,
  },
  calorieSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  calorieLabel: {
    fontSize: fontSize.lg,
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.text,
  },
  calorieValue: {
    fontSize: fontSize.xxl,
    fontWeight: String(typography.fontWeight.bold) as any,
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  macroSection: {
    gap: spacing.sm,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  nutritionLabel: {
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: String(typography.fontWeight.medium) as any,
    flex: 1,
  },
  nutritionValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
    justifyContent: "flex-end",
  },
  nutritionValue: {
    fontSize: fontSize.md,
    fontWeight: String(typography.fontWeight.bold) as any,
    marginRight: spacing.md,
  },
  percentageContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  percentageBar: {
    height: 6,
    flex: 1,
    borderRadius: rbr(3),
    marginRight: spacing.sm,
  },
  percentageFill: {
    height: "100%",
    borderRadius: rbr(3),
  },
  percentageText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    width: rp(30),
  },
  contextCard: {
    backgroundColor: colors.surface,
    borderRadius: rbr(16),
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  contextInfo: {
    gap: spacing.sm,
  },
  iconTextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  contextText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
  },
  quantityCard: {
    backgroundColor: colors.surface,
    borderRadius: rbr(16),
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  quantityInfo: {
    gap: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.md,
    color: colors.error,
    textAlign: "center",
  },

  // Action Section Styles
  actionSection: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },

  navigationButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: rbr(12),
    minHeight: rp(48),
  },

  previousButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },

  completeButton: {
    backgroundColor: colors.primary,
  },

  completedButton: {
    backgroundColor: colors.success,
  },

  loadingButton: {
    backgroundColor: colors.primary,
    opacity: 0.7,
  },

  nextButton: {
    backgroundColor: "#6B7280",
  },

  navButtonText: {
    fontSize: fontSize.md,
    fontWeight: String(typography.fontWeight.semibold) as any,
    marginHorizontal: spacing.xs,
  },

  previousButtonText: {
    color: colors.textSecondary,
  },

  completeButtonText: {
    color: colors.surface,
  },

  nextButtonText: {
    color: colors.surface,
  },

  // Completion Banner Styles
  completionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success + "15",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: colors.success + "30",
  },

  completionBannerText: {
    fontSize: fontSize.md,
    fontWeight: String(typography.fontWeight.semibold) as any,
    color: colors.success,
    marginLeft: spacing.sm,
  },
});

export default IngredientDetailModal;
