import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { THEME } from "../../ui";
import { MealItem } from "../../../types/ai";

interface ServingDetailsProps {
  ingredientData: MealItem;
}

export const ServingDetails: React.FC<ServingDetailsProps> = ({
  ingredientData,
}) => {
  return (
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
            (ingredientData.calories / Number(ingredientData.quantity)) * 100,
          ) / 100}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  quantityCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: THEME.fontSize.lg,
    fontWeight: "700",
    color: THEME.colors.text,
    marginBottom: THEME.spacing.md,
  },
  quantityInfo: {
    gap: THEME.spacing.sm,
  },
  quantityText: {
    fontSize: THEME.fontSize.md,
    color: THEME.colors.text,
    lineHeight: 22,
  },
});
