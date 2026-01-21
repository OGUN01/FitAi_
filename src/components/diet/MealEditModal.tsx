/**
 * MealEditModal - Edit existing meals
 *
 * Features:
 * - Edit meal name
 * - Modify ingredients and portions
 * - Change meal type
 * - Adjust timing
 * - Recalculate nutrition
 * - Persist to database
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { ResponsiveTheme } from "../../utils/constants";
import { rf, rh, rw, rs, rp } from "../../utils/responsive";
import type { DayMeal } from "../../types/ai";
import { useNutritionStore } from "../../stores/nutritionStore";
import { supabase } from "../../services/supabase";
import { haptics } from "../../utils/haptics";

interface MealEditModalProps {
  visible: boolean;
  meal: DayMeal | null;
  onClose: () => void;
  onSave: (updatedMeal: DayMeal) => void;
  userId?: string;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

const MEAL_TIMES = {
  breakfast: "08:00",
  lunch: "12:00",
  dinner: "18:00",
  snack: "15:00",
};

export const MealEditModal: React.FC<MealEditModalProps> = ({
  visible,
  meal,
  onClose,
  onSave,
  userId,
}) => {
  const [mealName, setMealName] = useState("");
  const [mealType, setMealType] =
    useState<(typeof MEAL_TYPES)[number]>("lunch");
  const [mealTime, setMealTime] = useState("12:00");
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const { weeklyMealPlan, setWeeklyMealPlan, saveWeeklyMealPlan } =
    useNutritionStore();

  // Load meal data when modal opens
  useEffect(() => {
    if (visible && meal) {
      setMealName(meal.name || "");
      setMealType((meal.type as any) || "lunch");
      setMealTime(
        meal.timing ||
          MEAL_TIMES[meal.type as keyof typeof MEAL_TIMES] ||
          "12:00",
      );
      setIngredients(meal.items || []);
    }
  }, [visible, meal]);

  // Calculate total nutrition from ingredients
  const calculateNutrition = () => {
    return ingredients.reduce(
      (acc, item) => {
        const calories = item.calories || 0;
        const protein = item.macros?.protein || 0;
        const carbs = item.macros?.carbohydrates || 0;
        const fat = item.macros?.fat || 0;

        return {
          calories: acc.calories + calories,
          protein: acc.protein + protein,
          carbs: acc.carbs + carbs,
          fat: acc.fat + fat,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  };

  // Handle ingredient quantity change
  const handleQuantityChange = (index: number, newQuantity: number) => {
    const updatedIngredients = [...ingredients];
    const item = updatedIngredients[index];

    // Recalculate nutrition based on new quantity
    const ratio = newQuantity / (item.quantity || 100);

    updatedIngredients[index] = {
      ...item,
      quantity: newQuantity,
      calories: (item.calories || 0) * ratio,
      macros: {
        protein: (item.macros?.protein || 0) * ratio,
        carbohydrates: (item.macros?.carbohydrates || 0) * ratio,
        fat: (item.macros?.fat || 0) * ratio,
        fiber: (item.macros?.fiber || 0) * ratio,
      },
    };

    setIngredients(updatedIngredients);
  };

  // Handle ingredient removal
  const handleRemoveIngredient = (index: number) => {
    const updatedIngredients = ingredients.filter((_, i) => i !== index);
    setIngredients(updatedIngredients);
  };

  // Save changes
  const handleSave = async () => {
    if (!meal || !mealName.trim()) {
      Alert.alert("Error", "Please enter a meal name");
      return;
    }

    if (ingredients.length === 0) {
      Alert.alert("Error", "Please add at least one ingredient");
      return;
    }

    setIsSaving(true);
    haptics.light();

    try {
      const nutrition = calculateNutrition();

      // Create updated meal object
      const updatedMeal: DayMeal = {
        ...meal,
        name: mealName.trim(),
        type: mealType,
        timing: mealTime,
        items: ingredients,
        totalCalories: nutrition.calories,
        totalMacros: {
          protein: nutrition.protein,
          carbohydrates: nutrition.carbs,
          fat: nutrition.fat,
          fiber: ingredients.reduce(
            (sum, item) => sum + (item.macros?.fiber || 0),
            0,
          ),
        },
      };

      // Update in weekly meal plan
      if (weeklyMealPlan) {
        const updatedMeals = weeklyMealPlan.meals.map((m) =>
          m.id === meal.id ? updatedMeal : m,
        );

        const updatedPlan = {
          ...weeklyMealPlan,
          meals: updatedMeals,
        };

        // Save to store and database
        setWeeklyMealPlan(updatedPlan);
        await saveWeeklyMealPlan(updatedPlan);
      }

      // Update in database if meal has a log ID
      const { getMealProgress } = useNutritionStore.getState();
      const mealProgressData = getMealProgress(meal.id);

      if (mealProgressData?.logId && userId) {
        const { error } = await supabase
          .from("meals")
          .update({
            name: mealName.trim(),
            type: mealType,
            timing: mealTime,
            total_calories: nutrition.calories,
            total_protein: nutrition.protein,
            total_carbs: nutrition.carbs,
            total_fat: nutrition.fat,
            updated_at: new Date().toISOString(),
          })
          .eq("id", mealProgressData.logId);

        if (error) {
          console.error("Error updating meal in database:", error);
        }
      }

      haptics.success();
      Alert.alert("Success", "Meal updated successfully");
      onSave(updatedMeal);
      onClose();
    } catch (error) {
      console.error("Error saving meal:", error);
      Alert.alert("Error", "Failed to save changes. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!meal) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.modalContainer}>
          <GlassCard style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Edit Meal</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
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
            >
              {/* Meal Name */}
              <View style={styles.section}>
                <Text style={styles.label}>Meal Name</Text>
                <TextInput
                  style={styles.input}
                  value={mealName}
                  onChangeText={setMealName}
                  placeholder="Enter meal name"
                  placeholderTextColor={ResponsiveTheme.colors.textSecondary}
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
                        styles.typeButton,
                        mealType === type && styles.typeButtonActive,
                      ]}
                      onPress={() => {
                        setMealType(type);
                        setMealTime(MEAL_TIMES[type]);
                        haptics.light();
                      }}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          mealType === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Meal Time */}
              <View style={styles.section}>
                <Text style={styles.label}>Meal Time</Text>
                <TextInput
                  style={styles.input}
                  value={mealTime}
                  onChangeText={setMealTime}
                  placeholder="HH:MM"
                  placeholderTextColor={ResponsiveTheme.colors.textSecondary}
                />
              </View>

              {/* Ingredients */}
              <View style={styles.section}>
                <Text style={styles.label}>
                  Ingredients ({ingredients.length})
                </Text>
                {ingredients.map((item, index) => (
                  <View key={index} style={styles.ingredientRow}>
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>{item.name}</Text>
                      <View style={styles.quantityControl}>
                        <TouchableOpacity
                          onPress={() =>
                            handleQuantityChange(
                              index,
                              Math.max(0, item.quantity - 10),
                            )
                          }
                          style={styles.quantityButton}
                        >
                          <Ionicons
                            name="remove"
                            size={rf(16)}
                            color={ResponsiveTheme.colors.primary}
                          />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>
                          {item.quantity || 100}g
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            handleQuantityChange(index, item.quantity + 10)
                          }
                          style={styles.quantityButton}
                        >
                          <Ionicons
                            name="add"
                            size={rf(16)}
                            color={ResponsiveTheme.colors.primary}
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.ingredientCalories}>
                        {Math.round(item.calories || 0)} cal
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveIngredient(index)}
                      style={styles.removeButton}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={rf(20)}
                        color={ResponsiveTheme.colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Nutrition Summary */}
              <View style={styles.section}>
                <Text style={styles.label}>Nutrition Summary</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                    <Text style={styles.nutritionValue}>
                      {Math.round(calculateNutrition().calories)}
                    </Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                    <Text style={styles.nutritionValue}>
                      {Math.round(calculateNutrition().protein)}g
                    </Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                    <Text style={styles.nutritionValue}>
                      {Math.round(calculateNutrition().carbs)}g
                    </Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                    <Text style={styles.nutritionValue}>
                      {Math.round(calculateNutrition().fat)}g
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.footer}>
              <AnimatedPressable
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </AnimatedPressable>
              <AnimatedPressable
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </AnimatedPressable>
            </View>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    maxHeight: "85%",
  },
  modalContent: {
    borderRadius: rf(20),
    padding: rp(20),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: rh(20),
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
    maxHeight: rh(500),
  },
  section: {
    marginBottom: rh(20),
  },
  label: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(8),
  },
  input: {
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rf(12),
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
  typeButton: {
    flex: 1,
    paddingVertical: rh(12),
    paddingHorizontal: rw(16),
    borderRadius: rf(12),
    backgroundColor: ResponsiveTheme.colors.surface,
    borderWidth: 1,
    borderColor: ResponsiveTheme.colors.border,
    alignItems: "center",
  },
  typeButtonActive: {
    backgroundColor: ResponsiveTheme.colors.primary,
    borderColor: ResponsiveTheme.colors.primary,
  },
  typeButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rf(12),
    padding: rp(12),
    marginBottom: rh(8),
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: rf(16),
    fontWeight: "600",
    color: ResponsiveTheme.colors.text,
    marginBottom: rh(4),
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: rh(4),
  },
  quantityButton: {
    padding: rp(4),
  },
  quantityText: {
    fontSize: rf(14),
    color: ResponsiveTheme.colors.text,
    marginHorizontal: rw(8),
    minWidth: rw(50),
    textAlign: "center",
  },
  ingredientCalories: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
  },
  removeButton: {
    padding: rp(8),
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rw(12),
  },
  nutritionItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: ResponsiveTheme.colors.surface,
    borderRadius: rf(12),
    padding: rp(12),
    alignItems: "center",
  },
  nutritionLabel: {
    fontSize: rf(12),
    color: ResponsiveTheme.colors.textSecondary,
    marginBottom: rh(4),
  },
  nutritionValue: {
    fontSize: rf(18),
    fontWeight: "bold",
    color: ResponsiveTheme.colors.primary,
  },
  footer: {
    flexDirection: "row",
    gap: rw(12),
    marginTop: rh(20),
  },
  button: {
    flex: 1,
    paddingVertical: rh(14),
    borderRadius: rf(12),
    alignItems: "center",
    justifyContent: "center",
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
    color: "#fff",
  },
});

export default MealEditModal;
