import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ResponsiveTheme } from "../../../utils/constants";
import { rbr } from "../../../utils/responsive";
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
          {(() => {
            const qty = Number(ingredientData.quantity);
            const calsPerUnit = qty > 0 ? (ingredientData.calories / qty) * 100 : null;
            return calsPerUnit != null ? Math.round(calsPerUnit * 100) / 100 : '—';
          })()}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  sectionTitle: {
    fontSize: ResponsiveTheme.fontSize.lg,
    fontWeight: "700",
    color: ResponsiveTheme.colors.text,
    marginBottom: ResponsiveTheme.spacing.md,
  },
  quantityInfo: {
    gap: ResponsiveTheme.spacing.sm,
  },
  quantityText: {
    fontSize: ResponsiveTheme.fontSize.md,
    color: ResponsiveTheme.colors.text,
    lineHeight: 22,
  },
});
