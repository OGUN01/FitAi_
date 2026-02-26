/**
 * LogMealModal - Manually log a meal with macros
 *
 * Features:
 * - Enter meal name, calories, protein, carbs, fat
 * - Select meal type (breakfast/lunch/dinner/snack)
 * - Saves to nutritionStore (weekly plan + marks complete)
 * - Validation: meal name + calories required
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rh, rw, rp, rbr } from "../../utils/responsive";
import { useNutritionStore } from "../../stores/nutritionStore";
import { haptics } from "../../utils/haptics";

import { crossPlatformAlert } from "../../utils/crossPlatformAlert";
interface LogMealModalProps {
  visible: boolean;
  onClose: () => void;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_ICONS: Record<MealType, string> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "cafe-outline",
};

export const LogMealModal: React.FC<LogMealModalProps> = ({
  visible,
  onClose,
}) => {
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { weeklyMealPlan, setWeeklyMealPlan, completeMeal } =
    useNutritionStore();

  const resetForm = () => {
    setMealName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setMealType("lunch");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    const trimmedName = mealName.trim();
    if (!trimmedName) {
      crossPlatformAlert("Missing Info", "Please enter a meal name.");
      return;
    }

    const parsedCalories = parseFloat(calories);
    if (!calories || isNaN(parsedCalories) || parsedCalories <= 0) {
      crossPlatformAlert("Missing Info", "Please enter a valid calorie amount.");
      return;
    }

    setIsSubmitting(true);

    const parsedProtein = parseFloat(protein) || 0;
    const parsedCarbs = parseFloat(carbs) || 0;
    const parsedFat = parseFloat(fat) || 0;

    haptics.light();

    const today = new Date();
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[today.getDay()];
    const mealId = `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Build a DayMeal-compatible object for the weekly plan
    const newMeal = {
      id: mealId,
      type: mealType,
      name: trimmedName,
      description: `Manually logged ${mealType}`,
      items: [],
      totalCalories: parsedCalories,
      totalMacros: {
        protein: parsedProtein,
        carbohydrates: parsedCarbs,
        fat: parsedFat,
        fiber: 0,
      },
      preparationTime: 0,
      difficulty: "easy" as const,
      tags: ["manual"],
      dayOfWeek: todayName,
      isPersonalized: false,
      aiGenerated: false,
      createdAt: today.toISOString(),
      isCompleted: true,
      completedAt: today.toISOString(),
    };

    try {
      // Add meal to weekly plan so it appears in the meal list
      const currentPlan = weeklyMealPlan || {
        id: `plan_${Date.now()}`,
        weekNumber: 1,
        meals: [],
        planTitle: "Manual Meals",
      };

      const updatedPlan = {
        ...currentPlan,
        meals: [...currentPlan.meals, newMeal],
      };

      setWeeklyMealPlan(updatedPlan);

      // Mark meal as complete so it counts in getTodaysConsumedNutrition
      await completeMeal(mealId);

      haptics.success();
      resetForm();
      onClose();
    } catch (error) {
      console.error("Failed to log meal:", error);
      crossPlatformAlert("Error", "Failed to log meal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          <GlassCard style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Log Meal</Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={rf(24)}
                  color={ResponsiveTheme.colors.text}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Meal Name */}
              <View style={styles.section}>
                <Text style={styles.label}>Meal Name</Text>
                <TextInput
                  style={styles.input}
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="e.g. Grilled Chicken Salad"
                  placeholderTextColor={ResponsiveTheme.colors.textSecondary}
                  autoFocus
                />
              </View>

              {/* Meal Type */}
              <View style={styles.section}>
                <Text style={styles.label}>Meal Type</Text>
                <View style={styles.typeSelector}>
                  {MEAL_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeChip,
                        mealType === type && styles.typeChipActive,
                      ]}
                      onPress={() => {
                        setMealType(type);
                        haptics.light();
                      }}
                    >
                      <Ionicons
                        name={
                          MEAL_ICONS[type] as keyof typeof Ionicons.glyphMap
                        }
                        size={rf(14)}
                        color={
                          mealType === type
                            ? ResponsiveTheme.colors.white
                            : ResponsiveTheme.colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.typeChipText,
                          mealType === type && styles.typeChipTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Calories */}
              <View style={styles.section}>
                <Text style={styles.label}>
                  Calories <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  value={calories}
                  onChangeText={setCalories}
                  placeholder="0"
                  placeholderTextColor={ResponsiveTheme.colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              {/* Macros Row */}
              <View style={styles.section}>
                <Text style={styles.label}>Macros (optional)</Text>
                <View style={styles.macroRow}>
                  <View style={styles.macroField}>
                    <Text style={styles.macroLabel}>Protein (g)</Text>
                    <TextInput
                      style={styles.macroInput}
                      value={protein}
                      onChangeText={setProtein}
                      placeholder="0"
                      placeholderTextColor={
                        ResponsiveTheme.colors.textSecondary
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.macroField}>
                    <Text style={styles.macroLabel}>Carbs (g)</Text>
                    <TextInput
                      style={styles.macroInput}
                      value={carbs}
                      onChangeText={setCarbs}
                      placeholder="0"
                      placeholderTextColor={
                        ResponsiveTheme.colors.textSecondary
                      }
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.macroField}>
                    <Text style={styles.macroLabel}>Fat (g)</Text>
                    <TextInput
                      style={styles.macroInput}
                      value={fat}
                      onChangeText={setFat}
                      placeholder="0"
                      placeholderTextColor={
                        ResponsiveTheme.colors.textSecondary
                      }
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.footer}>
              <AnimatedPressable
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <Ionicons name="checkmark" size={rf(18)} color={ResponsiveTheme.colors.white} />
                <Text style={styles.saveButtonText}>{isSubmitting ? "Logging..." : "Log Meal"}</Text>
              </AnimatedPressable>
            </View>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: ResponsiveTheme.colors.overlay,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  container: {
    width: "90%",
    maxHeight: "85%",
  },
  content: {
    borderRadius: rbr(20),
    padding: rp(20),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: rh(16),
  },
  title: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.text,
  },
  closeButton: {
    padding: rp(8),
  },
  scrollView: {
    maxHeight: rh(420),
  },
  section: {
    marginBottom: rh(18),
  },
  label: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(8),
  },
  required: {
    color: ResponsiveTheme.colors.error,
  },
  input: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(12),
    padding: rp(12),
    fontSize: rf(16),
    color: ResponsiveTheme.colors.text,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  typeSelector: {
    flexDirection: "row",
    gap: rw(8),
  },
  typeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: rw(4),
    paddingVertical: rh(10),
    paddingHorizontal: rw(8),
    borderRadius: rbr(12),
    backgroundColor: ResponsiveTheme.colors.surface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  typeChipActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  typeChipText: {
    fontSize: rf(12),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  typeChipTextActive: {
    color: ResponsiveTheme.colors.white,
  },
  macroRow: {
    flexDirection: "row",
    gap: rw(10),
  },
  macroField: {
    flex: 1,
  },
  macroLabel: {
    fontSize: rf(11),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rh(4),
  },
  macroInput: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rbr(10),
    padding: rp(10),
    fontSize: rf(15),
    color: ResponsiveTheme.colors.text,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    textAlign: "center" as const,
  },
  footer: {
    flexDirection: "row",
    gap: rw(12),
    marginTop: rh(16),
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: rw(6),
    paddingVertical: rh(14),
    borderRadius: rbr(12),
  },
  cancelButton: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
  },
  cancelButtonText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  saveButton: {
    backgroundColor: ResponsiveTheme.colors.primary,
  },
  saveButtonText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.white,
  },
});

export default LogMealModal;
