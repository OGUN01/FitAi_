/**
 * MealEditModal - Edit an already-logged meal
 *
 * All state/logic lives in useMealEdit (src/hooks/useMealEdit.ts) — this
 * component is presentational only. Recreated after the original was
 * accidentally deleted in an unrelated onboarding-redesign commit
 * (5929d42b), which left useMealEdit orphaned with no UI ever calling it —
 * editing a logged meal was silently unreachable from the app. useMealEdit
 * itself was independently fixed since the deletion (it used to write to a
 * "meals" table with columns that don't exist there instead of the real
 * meal_logs table/columns, so even when this modal existed the edit never
 * actually persisted) — do not reintroduce that inline logic here.
 */

import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "../ui/aurora/GlassCard";
import { AnimatedPressable } from "../ui/aurora/AnimatedPressable";
import { flatColors as colors } from "../../theme/aurora-tokens";
import { rf, rh, rw, rp, rbr } from "../../utils/responsive";
import type { DayMeal } from "../../types/ai";
import { haptics } from "../../utils/haptics";
import { useMealEdit } from "../../hooks/useMealEdit";

interface MealEditModalProps {
  visible: boolean;
  meal: DayMeal | null;
  onClose: () => void;
  onSave: (updatedMeal: DayMeal) => void;
  userId?: string;
}

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

export const MealEditModal: React.FC<MealEditModalProps> = ({
  visible,
  meal,
  onClose,
  onSave,
  userId,
}) => {
  const {
    mealName,
    setMealName,
    mealType,
    mealTime,
    setMealTime,
    ingredients,
    isSaving,
    calculateNutrition,
    handleQuantityChange,
    handleRemoveIngredient,
    handleMealTypeChange,
    handleSave,
  } = useMealEdit(visible, meal, onSave, onClose, userId);

  if (!meal) {
    return null;
  }

  const nutrition = calculateNutrition();

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
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Close edit meal"
              >
                <Ionicons name="close" size={rf(24)} color={colors.text} />
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
                  placeholder="Enter meal name"
                  placeholderTextColor={colors.textSecondary}
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
                      onPress={() => handleMealTypeChange(type)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        type.charAt(0).toUpperCase() + type.slice(1)
                      }
                      accessibilityState={{ selected: mealType === type }}
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
                  placeholderTextColor={colors.textSecondary}
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
                              Math.max(0, (item.quantity || 100) - 10),
                            )
                          }
                          style={styles.quantityButton}
                          accessibilityRole="button"
                          accessibilityLabel="Decrease quantity by 10 grams"
                        >
                          <Ionicons
                            name="remove"
                            size={rf(16)}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>
                          {item.quantity || 100}g
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            handleQuantityChange(
                              index,
                              (item.quantity || 100) + 10,
                            )
                          }
                          style={styles.quantityButton}
                          accessibilityRole="button"
                          accessibilityLabel="Increase quantity by 10 grams"
                        >
                          <Ionicons
                            name="add"
                            size={rf(16)}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.ingredientCalories}>
                        {Math.round(item.calories || 0)} cal
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        haptics.light();
                        handleRemoveIngredient(index);
                      }}
                      style={styles.removeButton}
                      accessibilityRole="button"
                      accessibilityLabel="Remove ingredient"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={rf(20)}
                        color={colors.error}
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
                      {Math.round(nutrition.calories)}
                    </Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                    <Text style={styles.nutritionValue}>
                      {Math.round(nutrition.protein)}g
                    </Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                    <Text style={styles.nutritionValue}>
                      {Math.round(nutrition.carbs)}g
                    </Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                    <Text style={styles.nutritionValue}>
                      {Math.round(nutrition.fat)}g
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
                  <ActivityIndicator color={colors.white} />
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
    backgroundColor: colors.overlay,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalContainer: {
    width: "90%",
    maxHeight: rh(724),
  },
  modalContent: {
    borderRadius: rbr(20),
    padding: rp(20),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: rh(20),
  },
  title: {
    fontSize: rf(24),
    fontWeight: "bold",
    color: colors.text,
  },
  closeButton: {
    padding: rp(8),
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
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
    color: colors.text,
    marginBottom: rh(8),
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: rbr(12),
    padding: rp(12),
    fontSize: rf(16),
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeSelector: {
    flexDirection: "row",
    gap: rw(8),
  },
  typeButton: {
    flex: 1,
    paddingVertical: rh(12),
    paddingHorizontal: rw(16),
    borderRadius: rbr(12),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center" as const,
  },
  typeButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeButtonText: {
    fontSize: rf(14),
    fontWeight: "600",
    color: colors.text,
  },
  typeButtonTextActive: {
    color: colors.white,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: colors.surface,
    borderRadius: rbr(12),
    padding: rp(12),
    marginBottom: rh(8),
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text,
    marginBottom: rh(4),
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center" as const,
    marginVertical: rh(4),
  },
  quantityButton: {
    padding: rp(4),
  },
  quantityText: {
    fontSize: rf(14),
    color: colors.text,
    marginHorizontal: rw(8),
    minWidth: rw(50),
    textAlign: "center",
  },
  ingredientCalories: {
    fontSize: rf(12),
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
    borderRadius: rbr(12),
    padding: rp(12),
    alignItems: "center" as const,
  },
  nutritionLabel: {
    fontSize: rf(12),
    color: colors.textSecondary,
    marginBottom: rh(4),
  },
  nutritionValue: {
    fontSize: rf(18),
    fontWeight: "bold",
    color: colors.primary,
  },
  footer: {
    flexDirection: "row",
    gap: rw(12),
    marginTop: rh(20),
  },
  button: {
    flex: 1,
    paddingVertical: rh(14),
    borderRadius: rbr(12),
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.white,
  },
});

export default MealEditModal;
