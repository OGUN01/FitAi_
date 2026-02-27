import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rp, rbr } from "../../utils/responsive";
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

const { width: screenWidth } = Dimensions.get("window");

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

  const handleMarkComplete = async () => {
    if (isCompleted || isCompleting) {
      return;
    }

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

        crossPlatformAlert("🎉 Meal Completed!", completionMessage, [
          {
            text: "Awesome! 🍽️",
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
      console.error("❌ Failed to complete meal from ingredient modal:", error);
      crossPlatformAlert(
        "❌ Error",
        "Failed to mark meal as completed. Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setIsCompleting(false);
    }
  };

  if (!ingredientData) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={ResponsiveTheme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.errorText}>
              Ingredient information not available for "{ingredientName}"
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={28} color={ResponsiveTheme.colors.text} />
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
              color={ResponsiveTheme.colors.success}
            />
            <Text style={styles.completionBannerText}>
              🎉 This meal has been completed!
            </Text>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Ingredient Header */}
          <View style={styles.ingredientHeader}>
            <View style={styles.ingredientIcon}>
              <Text style={styles.iconText}>🥘</Text>
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
                percentage={
                  (((ingredientData.macros?.protein || 0) * 4) /
                    ingredientData.calories) *
                  100
                }
              />
              <NutritionRow
                label="Carbohydrates"
                value={ingredientData.macros?.carbohydrates || 0}
                unit="g"
                color="#45B7D1"
                percentage={
                  (((ingredientData.macros?.carbohydrates || 0) * 4) /
                    ingredientData.calories) *
                  100
                }
              />
              <NutritionRow
                label="Fat"
                value={ingredientData.macros?.fat || 0}
                unit="g"
                color="#96CEB4"
                percentage={
                  (((ingredientData.macros?.fat || 0) * 9) /
                    ingredientData.calories) *
                  100
                }
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
              <Text style={styles.contextText}>🍽️ Part of: {meal.name}</Text>
              <Text style={styles.contextText}>
                📊 Contributes{" "}
                {Math.round(
                  (ingredientData.calories / meal.totalCalories) * 100,
                )}
                % of total calories
              </Text>
              <Text style={styles.contextText}>
                💪 Provides {Math.round(ingredientData.macros?.protein || 0)}g
                of the meal's {Math.round(meal.totalMacros?.protein || 0)}g
                protein
              </Text>
            </View>
          </View>

          {/* Quantity Information */}
          <View style={styles.quantityCard}>
            <Text style={styles.sectionTitle}>Serving Details</Text>
            <View style={styles.quantityInfo}>
              <Text style={styles.quantityText}>
                📏 Quantity: {ingredientData.quantity}{" "}
                {ingredientData.unit || "grams"}
              </Text>
              <Text style={styles.quantityText}>
                ⚖️ Calories per gram:{" "}
                {Math.round(
                  (ingredientData.calories / Number(ingredientData.quantity)) *
                    100,
                ) / 100}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <View style={styles.navigationButtons}>
            <TouchableOpacity
              style={[styles.navButton, styles.previousButton]}
              onPress={onClose}
            >
              <Ionicons name="chevron-back" size={24} color="#6B7280" />
              <Text style={[styles.navButtonText, styles.previousButtonText]}>
                Previous
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
            >
              {isCompleting ? (
                <>
                  <ActivityIndicator size="small" color={ResponsiveTheme.colors.white} />
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
                    color={ResponsiveTheme.colors.white}
                  />
                  <Text
                    style={[styles.navButtonText, styles.completeButtonText]}
                  >
                    {isCompleted ? "✅ Completed" : "Mark Complete"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={() => {
                // For future use - could navigate to next ingredient or step
                onClose();
              }}
            >
              <Text style={[styles.navButtonText, styles.nextButtonText]}>
                Next Step
              </Text>
              <Ionicons name="chevron-forward" size={24} color={ResponsiveTheme.colors.white} />
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
    backgroundColor: ResponsiveTheme.colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.overlay,
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(16),
    padding: ResponsiveTheme.spacing.lg,
    width: screenWidth - rp(40),
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ResponsiveTheme.colors.border,
  },
  closeButton: {
    padding: ResponsiveTheme.spacing.sm,
  },
  headerTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
  },
  content: {
    flex: 1,
    padding: ResponsiveTheme.spacing.lg,
  },
  ingredientHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.xl,
  },
  ingredientIcon: {
    width: rp(80),
    height: rp(80),
    borderRadius: rbr(20),
    backgroundColor: ResponsiveTheme.colors.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: ResponsiveTheme.spacing.lg,
  },
  iconText: {
    fontSize: rf(40),
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  ingredientCategory: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.primary,
    fontWeight: "600",
    marginBottom: ResponsiveTheme.spacing.xs,
  },
  quantityText: {
    fontSize: ResponsiveTheme.fontSize.sm,
    color: ResponsiveTheme.colors.textSecondary,
  },
  nutritionCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(16),
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  calorieSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: ResponsiveTheme.spacing.md,
  },
  calorieLabel: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  calorieValue: {
    fontSize: ResponsiveTheme.fontSize.xxl,
    fontWeight: "700",
    color: ResponsiveTheme.colors.errorLight,
  },
  divider: {
    height: 1,
    backgroundColor: ResponsiveTheme.colors.border,
    marginVertical: ResponsiveTheme.spacing.md,
  },
  macroSection: {
    gap: ResponsiveTheme.spacing.sm,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: ResponsiveTheme.spacing.sm,
  },
  nutritionLabel: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    fontWeight: "500",
    flex: 1,
  },
  nutritionValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
    justifyContent: "flex-end",
  },
  nutritionValue: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "700",
    marginRight: ResponsiveTheme.spacing.md,
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
    marginRight: ResponsiveTheme.spacing.sm,
  },
  percentageFill: {
    height: "100%",
    borderRadius: rbr(3),
  },
  percentageText: {
    fontSize: ResponsiveTheme.fontSize.xs,
    color: ResponsiveTheme.colors.textSecondary,
    width: rp(30),
  },
  contextCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(16),
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  contextInfo: {
    gap: ResponsiveTheme.spacing.sm,
  },
  contextText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    lineHeight: 22,
  },
  quantityCard: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(16),
    padding: ResponsiveTheme.spacing.lg,
    marginBottom: ResponsiveTheme.spacing.lg,
    shadowColor: ResponsiveTheme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 4,
  },
  quantityInfo: {
    gap: ResponsiveTheme.spacing.sm,
  },
  errorText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.error,
    textAlign: "center",
  },

  // Action Section Styles
  actionSection: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: ResponsiveTheme.colors.border,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    paddingVertical: ResponsiveTheme.spacing.md,
  },

  navigationButtons: {
    flexDirection: "row",
    gap: ResponsiveTheme.spacing.sm,
  },

  navButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.sm,
    borderRadius: rbr(12),
    minHeight: rp(48),
  },

  previousButton: {
    backgroundColor: ResponsiveTheme.colors.background,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },

  completeButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },

  completedButton: {
    backgroundColor: ResponsiveTheme.colors.success,
  },

  loadingButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
    opacity: 0.7,
  },

  nextButton: {
    backgroundColor: "#6B7280",
  },

  navButtonText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    marginHorizontal: ResponsiveTheme.spacing.xs,
  },

  previousButtonText: {
    color: ResponsiveTheme.colors.textSecondary,
  },

  completeButtonText: {
    color: ResponsiveTheme.colors.surface,
  },

  nextButtonText: {
    color: ResponsiveTheme.colors.surface,
  },

  // Completion Banner Styles
  completionBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ResponsiveTheme.colors.success + "15",
    paddingVertical: ResponsiveTheme.spacing.md,
    paddingHorizontal: ResponsiveTheme.spacing.lg,
    marginHorizontal: ResponsiveTheme.spacing.lg,
    marginTop: ResponsiveTheme.spacing.sm,
    borderRadius: rbr(12),
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.success + "30",
  },

  completionBannerText: {
    fontSize: ResponsiveTheme.fontSize.md,
    fontWeight: "600",
    color: ResponsiveTheme.colors.success,
    marginLeft: ResponsiveTheme.spacing.sm,
  },
});

export default IngredientDetailModal;
