import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DayMeal } from "../../types/ai";
import MacroDashboard from "../nutrition/MacroDashboard";
import { colors } from "../../theme/aurora-tokens";

interface IngredientsSectionProps {
  meal: DayMeal;
  onIngredientPress: (ingredient: string) => void;
}

export default function IngredientsSection({
  meal,
  onIngredientPress,
}: IngredientsSectionProps) {
  return (
    <View style={styles.ingredientsSection}>
      <Text style={styles.sectionTitle}>Ingredients & Nutrition</Text>

      <MacroDashboard
        meal={meal}
        compact={true}
        showTitle={false}
        style={styles.macroDashboard}
      />

      <View style={styles.ingredientsList}>
        <Text style={styles.ingredientsTitle}>
          Tap ingredients for details:
        </Text>
        <View style={styles.ingredientsGrid}>
          {meal.items?.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.ingredientChip}
              onPress={() => onIngredientPress(item.name || "")}
              activeOpacity={0.7}
            >
              <Text style={styles.ingredientText}>🥘 {item.name}</Text>
              <Text style={styles.ingredientCalories}>
                {Math.round(item.calories)} cal
              </Text>
              <Ionicons
                name="information-circle"
                size={16}
                color={colors.text.muted}
              />
            </TouchableOpacity>
          )) || []}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ingredientsSection: {
    backgroundColor: colors.background.secondary,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
    paddingBottom: 8,
  },
  macroDashboard: {
    marginBottom: 16,
  },
  ingredientsList: {
    marginTop: 8,
  },
  ingredientsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 12,
  },
  ingredientsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  ingredientText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginRight: 6,
  },
  ingredientCalories: {
    fontSize: 12,
    color: colors.text.muted,
    marginRight: 8,
  },
});
