import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DayMeal } from "../../types/ai";
import MacroDashboard from "../nutrition/MacroDashboard";
import { colors } from "../../theme/aurora-tokens";
import { rf, rp, rbr } from '../../utils/responsive';
import { GlassCard } from "../ui/aurora";
import { AnimatedPressable } from "../ui/aurora";

interface IngredientsSectionProps {
  meal: DayMeal;
  onIngredientPress: (ingredient: string) => void;
}

export default function IngredientsSection({
  meal,
  onIngredientPress,
}: IngredientsSectionProps) {
  return (
    <GlassCard padding="lg" borderRadius="xl" style={styles.ingredientsSection}>
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
            <AnimatedPressable
              key={index}
              style={styles.ingredientChip}
              onPress={() => onIngredientPress(item.name || "")}
              scaleValue={0.95}
              springConfig="snappy"
              hapticType="light"
              accessibilityLabel={`View ${item.name} details`}
              accessibilityRole="button"
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
            </AnimatedPressable>
          )) || []}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  ingredientsSection: {
    marginBottom: rp(16),
  },
  sectionTitle: {
    fontSize: rf(18),
    fontWeight: "600",
    color: colors.text.primary,
    paddingBottom: rp(8),
  },
  macroDashboard: {
    marginBottom: rp(16),
  },
  ingredientsList: {
    marginTop: rp(8),
  },
  ingredientsTitle: {
    fontSize: rf(16),
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: rp(12),
  },
  ingredientsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: rp(8),
  },
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: rp(12),
    paddingVertical: rp(8),
    borderRadius: rbr(20),
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  ingredientText: {
    fontSize: rf(14),
    color: colors.text.secondary,
    marginRight: rp(6),
  },
  ingredientCalories: {
    fontSize: rf(12),
    color: colors.text.muted,
    marginRight: rp(8),
  },
});
